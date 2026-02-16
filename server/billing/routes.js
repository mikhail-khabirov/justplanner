import express from 'express';
import pool from '../config/db.js';
import { authenticateToken } from '../middleware/auth.js';
import { createTrialPayment, getPaymentStatus, createCardBindingPayment, createAnnualPayment, refundPayment } from './yookassa.js';
import { notifyPayment } from '../utils/telegram.js';

const router = express.Router();

// Get current subscription
router.get('/subscription', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                s.id, s.plan, s.status, s.yookassa_subscription_id,
                s.current_period_end, s.auto_renew, s.created_at,
                s.payment_method_title, s.is_trial,
                u.plan as user_plan, u.email
            FROM users u
            LEFT JOIN subscriptions s ON s.user_id = u.id
            WHERE u.id = $1`,
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const row = result.rows[0];

        // If no subscription record, return free plan info
        if (!row.id) {
            return res.json({
                id: null,
                userId: req.user.id,
                plan: 'free',
                status: 'active',
                autoRenew: false,
                currentPeriodEnd: null
            });
        }

        res.json({
            id: row.id,
            userId: req.user.id,
            plan: row.plan,
            status: row.status,
            yookassaSubscriptionId: row.yookassa_subscription_id,
            currentPeriodEnd: row.current_period_end,
            autoRenew: row.auto_renew,
            paymentMethodTitle: row.payment_method_title || null,
            isTrial: row.is_trial || false,
            createdAt: row.created_at
        });
    } catch (error) {
        console.error('Error fetching subscription:', error);
        res.status(500).json({ error: 'Failed to fetch subscription' });
    }
});

// Create trial payment (1 RUB for 7 days Pro)
router.post('/create-payment', authenticateToken, async (req, res) => {
    try {
        // Get user email
        const userResult = await pool.query(
            'SELECT email FROM users WHERE id = $1',
            [req.user.id]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userEmail = userResult.rows[0].email;

        // Create trial payment via Yookassa (1 RUB)
        const { confirmationUrl, paymentId } = await createTrialPayment(
            req.user.id,
            userEmail
        );

        // Log payment attempt
        await pool.query(
            `INSERT INTO payments (user_id, yookassa_payment_id, amount, currency, status, description)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [req.user.id, paymentId, 1, 'RUB', 'pending', 'Trial 7 days']
        );

        res.json({ confirmationUrl, paymentId });
    } catch (error) {
        console.error('Error creating payment:', error);
        res.status(500).json({ error: 'Failed to create payment', message: error.message });
    }
});

// Create annual payment (594 RUB for 365 days Pro)
router.post('/create-annual-payment', authenticateToken, async (req, res) => {
    try {
        const userResult = await pool.query(
            'SELECT email FROM users WHERE id = $1',
            [req.user.id]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userEmail = userResult.rows[0].email;

        const { confirmationUrl, paymentId } = await createAnnualPayment(
            req.user.id,
            userEmail
        );

        await pool.query(
            `INSERT INTO payments (user_id, yookassa_payment_id, amount, currency, status, description)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [req.user.id, paymentId, 594, 'RUB', 'pending', 'Annual Pro 365 days']
        );

        res.json({ confirmationUrl, paymentId });
    } catch (error) {
        console.error('Error creating annual payment:', error);
        res.status(500).json({ error: 'Failed to create payment', message: error.message });
    }
});

// Create payment for linking a card (1 RUB)
router.post('/bind-card', authenticateToken, async (req, res) => {
    try {
        // Get user email
        const userResult = await pool.query(
            'SELECT email FROM users WHERE id = $1',
            [req.user.id]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userEmail = userResult.rows[0].email;

        // Create card binding payment via Yookassa
        const { confirmationUrl, paymentId } = await createCardBindingPayment(
            req.user.id,
            userEmail
        );

        // Log payment attempt (1 RUB)
        await pool.query(
            `INSERT INTO payments (user_id, yookassa_payment_id, amount, currency, status, description)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [req.user.id, paymentId, 1, 'RUB', 'pending', 'Card binding']
        );

        res.json({ confirmationUrl, paymentId });
    } catch (error) {
        console.error('Error creating binding payment:', error);
        res.status(500).json({ error: 'Failed to create payment', message: error.message });
    }
});

// Verify payment status (fallback when webhook is delayed/missing)
router.post('/verify-payment', authenticateToken, async (req, res) => {
    try {
        // Get the latest pending payment for this user
        const paymentResult = await pool.query(
            `SELECT yookassa_payment_id FROM payments WHERE user_id = $1 AND status = 'pending' ORDER BY created_at DESC LIMIT 1`,
            [req.user.id]
        );

        if (paymentResult.rows.length === 0) {
            return res.json({ status: 'no_pending_payment' });
        }

        const yookassaPaymentId = paymentResult.rows[0].yookassa_payment_id;
        const payment = await getPaymentStatus(yookassaPaymentId);

        if (payment.status === 'succeeded') {
            // Update payment status
            await pool.query(
                `UPDATE payments SET status = 'succeeded' WHERE yookassa_payment_id = $1`,
                [payment.id]
            );

            // Determine payment type from metadata (fallback to amount for old payments)
            const paymentType = payment.metadata?.type || (parseFloat(payment.amount.value) === 1.00 ? 'card_binding' : 'recurring_payment');

            if (paymentType === 'card_binding') {
                // Card binding: save card + refund, no period change
                console.log(`💳 Card binding payment verified for user ${req.user.id}`);

                if (payment.payment_method?.saved) {
                    await pool.query(
                        `UPDATE subscriptions SET 
                            yookassa_subscription_id = $1, 
                            payment_method_title = $2, 
                            auto_renew = TRUE,
                            updated_at = NOW()
                         WHERE user_id = $3`,
                        [payment.payment_method.id, payment.payment_method.title || null, req.user.id]
                    );
                }

                try {
                    await refundPayment(payment.id, '1.00');
                    console.log(`↩️ Refunded 1 RUB for card binding to user ${req.user.id}`);
                } catch (refundError) {
                    console.error('Failed to auto-refund card binding:', refundError);
                }

                return res.json({ status: 'activated', plan: 'pro', type: 'card_binding' });
            } else if (paymentType === 'trial') {
                // Trial: Pro for 7 days, NO refund, save card
                const periodEnd = new Date();
                periodEnd.setDate(periodEnd.getDate() + 7);

                await pool.query(
                    `INSERT INTO subscriptions (user_id, plan, status, current_period_end, auto_renew, is_trial)
                     VALUES ($1, 'pro', 'active', $2, TRUE, TRUE)
                     ON CONFLICT (user_id) DO UPDATE SET 
                        plan = 'pro', 
                        status = 'active', 
                        current_period_end = $2,
                        auto_renew = TRUE,
                        is_trial = TRUE,
                        updated_at = NOW()`,
                    [req.user.id, periodEnd]
                );

                await pool.query(
                    `UPDATE users SET plan = 'pro' WHERE id = $1`,
                    [req.user.id]
                );

                if (payment.payment_method?.saved) {
                    await pool.query(
                        `UPDATE subscriptions SET yookassa_subscription_id = $1, payment_method_title = $2 WHERE user_id = $3`,
                        [payment.payment_method.id, payment.payment_method.title || null, req.user.id]
                    );
                }

                console.log(`🆓 Trial verified and Pro activated for user ${req.user.id}`);
                return res.json({ status: 'activated', plan: 'pro', type: 'trial' });
            } else if (paymentType === 'annual') {
                // Annual: Pro for 365 days, with auto-renew
                const periodEnd = new Date();
                periodEnd.setDate(periodEnd.getDate() + 365);

                await pool.query(
                    `INSERT INTO subscriptions (user_id, plan, status, current_period_end, auto_renew, is_trial, is_annual)
                     VALUES ($1, 'pro', 'active', $2, TRUE, FALSE, TRUE)
                     ON CONFLICT (user_id) DO UPDATE SET 
                        plan = 'pro', 
                        status = 'active', 
                        current_period_end = $2,
                        auto_renew = TRUE,
                        is_trial = FALSE,
                        is_annual = TRUE,
                        updated_at = NOW()`,
                    [req.user.id, periodEnd]
                );

                await pool.query(
                    `UPDATE users SET plan = 'pro' WHERE id = $1`,
                    [req.user.id]
                );

                if (payment.payment_method?.saved) {
                    await pool.query(
                        `UPDATE subscriptions SET yookassa_subscription_id = $1, payment_method_title = $2 WHERE user_id = $3`,
                        [payment.payment_method.id, payment.payment_method.title || null, req.user.id]
                    );
                }

                console.log(`📅 Annual Pro verified for user ${req.user.id} until ${periodEnd}`);
                return res.json({ status: 'activated', plan: 'pro', type: 'annual' });
            } else {
                // Regular/recurring payment: Pro for 30 days
                const periodEnd = new Date();
                periodEnd.setDate(periodEnd.getDate() + 30);

                await pool.query(
                    `INSERT INTO subscriptions (user_id, plan, status, current_period_end, auto_renew, is_trial)
                     VALUES ($1, 'pro', 'active', $2, TRUE, FALSE)
                     ON CONFLICT (user_id) DO UPDATE SET 
                        plan = 'pro', 
                        status = 'active', 
                        current_period_end = $2,
                        auto_renew = TRUE,
                        is_trial = FALSE,
                        updated_at = NOW()`,
                    [req.user.id, periodEnd]
                );

                await pool.query(
                    `UPDATE users SET plan = 'pro' WHERE id = $1`,
                    [req.user.id]
                );

                if (payment.payment_method?.saved) {
                    await pool.query(
                        `UPDATE subscriptions SET yookassa_subscription_id = $1, payment_method_title = $2 WHERE user_id = $3`,
                        [payment.payment_method.id, payment.payment_method.title || null, req.user.id]
                    );
                }

                console.log(`✅ Payment verified and Pro activated for user ${req.user.id}`);
                return res.json({ status: 'activated', plan: 'pro' });
            }
        }

        res.json({ status: payment.status });
    } catch (error) {
        console.error('Error verifying payment:', error);
        res.status(500).json({ error: 'Failed to verify payment' });
    }
});

// Webhook handler for Yookassa events
router.post('/webhook', async (req, res) => {
    try {
        const event = req.body;
        console.log('Yookassa webhook received:', JSON.stringify(event, null, 2));

        if (event.event === 'payment.succeeded') {
            const payment = event.object;
            const userId = parseInt(payment.metadata?.userId);

            if (!userId) {
                console.error('No userId in payment metadata');
                return res.status(400).json({ error: 'Invalid payment metadata' });
            }

            // Update payment status
            await pool.query(
                `UPDATE payments SET status = 'succeeded' WHERE yookassa_payment_id = $1`,
                [payment.id]
            );

            // Determine payment type from metadata (fallback to amount for old payments)
            const paymentType = payment.metadata?.type || (parseFloat(payment.amount.value) === 1.00 ? 'card_binding' : 'recurring_payment');

            if (paymentType === 'card_binding') {
                // Card binding: save card + refund, no period change
                console.log(`💳 Card binding webhook processed for user ${userId}`);

                if (payment.payment_method?.saved) {
                    await pool.query(
                        `UPDATE subscriptions SET 
                            yookassa_subscription_id = $1, 
                            payment_method_title = $2, 
                            auto_renew = TRUE,
                            updated_at = NOW()
                         WHERE user_id = $3`,
                        [payment.payment_method.id, payment.payment_method.title || null, userId]
                    );
                }

                // Auto-refund the 1 RUB
                try {
                    await refundPayment(payment.id, '1.00');
                    console.log(`↩️ Refunded 1 RUB for card binding to user ${userId}`);
                } catch (refundError) {
                    console.error('Failed to auto-refund card binding in webhook:', refundError);
                }
            } else if (paymentType === 'trial') {
                // Trial: Pro for 7 days, NO refund, save card
                const periodEnd = new Date();
                periodEnd.setDate(periodEnd.getDate() + 7);

                await pool.query(
                    `INSERT INTO subscriptions (user_id, plan, status, current_period_end, auto_renew, is_trial)
                     VALUES ($1, 'pro', 'active', $2, TRUE, TRUE)
                     ON CONFLICT (user_id) 
                     DO UPDATE SET 
                        plan = 'pro', 
                        status = 'active', 
                        current_period_end = $2,
                        auto_renew = TRUE,
                        is_trial = TRUE,
                        updated_at = NOW()`,
                    [userId, periodEnd]
                );

                await pool.query(
                    `UPDATE users SET plan = 'pro' WHERE id = $1`,
                    [userId]
                );

                if (payment.payment_method?.saved) {
                    await pool.query(
                        `UPDATE subscriptions SET yookassa_subscription_id = $1, payment_method_title = $2 WHERE user_id = $3`,
                        [payment.payment_method.id, payment.payment_method.title || null, userId]
                    );
                }

                console.log(`🆓 Trial activated for user ${userId} until ${periodEnd}`);

                const userResult = await pool.query('SELECT email FROM users WHERE id = $1', [userId]);
                const userEmail = userResult.rows[0]?.email || `user#${userId}`;
                notifyPayment(userEmail, payment.amount.value, 'Триал Pro 7 дней');
            } else if (paymentType === 'annual' || paymentType === 'annual_recurring') {
                // Annual: Pro for 365 days, with auto-renew
                const periodEnd = new Date();
                periodEnd.setDate(periodEnd.getDate() + 365);

                await pool.query(
                    `INSERT INTO subscriptions (user_id, plan, status, current_period_end, auto_renew, is_trial, is_annual)
                     VALUES ($1, 'pro', 'active', $2, TRUE, FALSE, TRUE)
                     ON CONFLICT (user_id) 
                     DO UPDATE SET 
                        plan = 'pro', 
                        status = 'active', 
                        current_period_end = $2,
                        auto_renew = TRUE,
                        is_trial = FALSE,
                        is_annual = TRUE,
                        renewal_retries = 0,
                        updated_at = NOW()`,
                    [userId, periodEnd]
                );

                await pool.query(
                    `UPDATE users SET plan = 'pro' WHERE id = $1`,
                    [userId]
                );

                if (payment.payment_method?.saved) {
                    await pool.query(
                        `UPDATE subscriptions SET yookassa_subscription_id = $1, payment_method_title = $2 WHERE user_id = $3`,
                        [payment.payment_method.id, payment.payment_method.title || null, userId]
                    );
                }

                const label = paymentType === 'annual_recurring' ? 'Автопродление годовой' : 'Годовая подписка Pro';
                console.log(`📅 ${label} activated for user ${userId} until ${periodEnd}`);

                const userResult = await pool.query('SELECT email FROM users WHERE id = $1', [userId]);
                const userEmail = userResult.rows[0]?.email || `user#${userId}`;
                notifyPayment(userEmail, payment.amount.value, label);
            } else {
                // Regular/recurring payment: Pro for 30 days
                const periodEnd = new Date();
                periodEnd.setDate(periodEnd.getDate() + 30);

                await pool.query(
                    `INSERT INTO subscriptions (user_id, plan, status, current_period_end, auto_renew, is_trial)
                     VALUES ($1, 'pro', 'active', $2, TRUE, FALSE)
                     ON CONFLICT (user_id) 
                     DO UPDATE SET 
                        plan = 'pro', 
                        status = 'active', 
                        current_period_end = $2,
                        auto_renew = TRUE,
                        is_trial = FALSE,
                        updated_at = NOW()`,
                    [userId, periodEnd]
                );

                await pool.query(
                    `UPDATE users SET plan = 'pro' WHERE id = $1`,
                    [userId]
                );

                if (payment.payment_method?.saved) {
                    await pool.query(
                        `UPDATE subscriptions SET yookassa_subscription_id = $1, payment_method_title = $2 WHERE user_id = $3`,
                        [payment.payment_method.id, payment.payment_method.title || null, userId]
                    );
                }

                console.log(`✅ Premium activated for user ${userId} until ${periodEnd}`);

                const userResult = await pool.query('SELECT email FROM users WHERE id = $1', [userId]);
                const userEmail = userResult.rows[0]?.email || `user#${userId}`;
                notifyPayment(userEmail, payment.amount.value, 'Подписка Pro');
            }
        }
        else if (event.event === 'payment.canceled') {
            const payment = event.object;
            await pool.query(
                `UPDATE payments SET status = 'cancelled' WHERE yookassa_payment_id = $1`,
                [payment.id]
            );

            // If payment method access was revoked, disable auto-renewal
            if (payment.cancellation_details?.reason === 'permission_revoked' && payment.metadata?.userId) {
                const userId = parseInt(payment.metadata.userId);
                await pool.query(
                    `UPDATE subscriptions SET yookassa_subscription_id = NULL, auto_renew = FALSE, updated_at = NOW() WHERE user_id = $1`,
                    [userId]
                );
                console.log(`⚠️ Payment method revoked for user ${userId}, auto-renew disabled`);
            }

            console.log(`Payment cancelled: ${payment.id}`);
        }
        else if (event.event === 'refund.succeeded') {
            const refund = event.object;
            const paymentId = refund.payment_id;

            // Skip downgrade for card-binding refunds (1 RUB)
            const refundAmount = parseFloat(refund.amount?.value || '0');
            if (refundAmount <= 1.00) {
                console.log(`↩️ Card-binding refund received for payment ${paymentId}, skipping downgrade`);
                await pool.query(
                    `UPDATE payments SET status = 'refunded' WHERE yookassa_payment_id = $1`,
                    [paymentId]
                );
                // Don't downgrade — this was just a card binding refund
            } else {
                // Get payment to find user
                const paymentResult = await pool.query(
                    `SELECT user_id FROM payments WHERE yookassa_payment_id = $1`,
                    [paymentId]
                );

                if (paymentResult.rows.length > 0) {
                    const userId = paymentResult.rows[0].user_id;

                    // Downgrade to free
                    await pool.query(
                        `UPDATE subscriptions SET plan = 'free', status = 'cancelled' WHERE user_id = $1`,
                        [userId]
                    );
                    await pool.query(
                        `UPDATE users SET plan = 'free' WHERE id = $1`,
                        [userId]
                    );

                    await pool.query(
                        `UPDATE payments SET status = 'refunded' WHERE yookassa_payment_id = $1`,
                        [paymentId]
                    );

                    console.log(`Refund processed for user ${userId}`);
                }
            }
        }

        res.status(200).json({ received: true });
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

// Cancel auto-renewal (keeps card bound for easy re-enable)
router.post('/cancel-auto-renew', authenticateToken, async (req, res) => {
    try {
        await pool.query(
            `UPDATE subscriptions SET auto_renew = FALSE, updated_at = NOW() WHERE user_id = $1`,
            [req.user.id]
        );
        res.json({ success: true, message: 'Auto-renewal cancelled' });
    } catch (error) {
        console.error('Error cancelling auto-renewal:', error);
        res.status(500).json({ error: 'Failed to cancel auto-renewal' });
    }
});

// Resume auto-renewal
router.post('/resume-auto-renew', authenticateToken, async (req, res) => {
    try {
        await pool.query(
            `UPDATE subscriptions SET auto_renew = TRUE, updated_at = NOW() WHERE user_id = $1`,
            [req.user.id]
        );
        res.json({ success: true, message: 'Auto-renewal resumed' });
    } catch (error) {
        console.error('Error resuming auto-renewal:', error);
        res.status(500).json({ error: 'Failed to resume auto-renewal' });
    }
});

// Unbind saved card (also disables auto-renew)
router.post('/unbind-card', authenticateToken, async (req, res) => {
    try {
        await pool.query(
            `UPDATE subscriptions SET yookassa_subscription_id = NULL, payment_method_title = NULL, auto_renew = FALSE, updated_at = NOW() WHERE user_id = $1`,
            [req.user.id]
        );
        res.json({ success: true, message: 'Card unbound, auto-renewal disabled' });
    } catch (error) {
        console.error('Error unbinding card:', error);
        res.status(500).json({ error: 'Failed to unbind card' });
    }
});

export default router;
