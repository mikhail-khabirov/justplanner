import express from 'express';
import pool from '../config/db.js';
import { authenticateToken } from '../middleware/auth.js';
import { createPayment as createYookassaPayment, getPaymentStatus } from './yookassa.js';

const router = express.Router();

// Get current subscription
router.get('/subscription', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                s.id, s.plan, s.status, s.yookassa_subscription_id,
                s.current_period_end, s.auto_renew, s.created_at,
                s.payment_method_title,
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
            createdAt: row.created_at
        });
    } catch (error) {
        console.error('Error fetching subscription:', error);
        res.status(500).json({ error: 'Failed to fetch subscription' });
    }
});

// Create payment for premium subscription
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

        // Create payment via Yookassa
        const { confirmationUrl, paymentId } = await createYookassaPayment(
            req.user.id,
            userEmail
        );

        // Log payment attempt
        await pool.query(
            `INSERT INTO payments (user_id, yookassa_payment_id, amount, currency, status, description)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [req.user.id, paymentId, 99, 'RUB', 'pending', 'Premium subscription']
        );

        res.json({ confirmationUrl, paymentId });
    } catch (error) {
        console.error('Error creating payment:', error);
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

            const periodEnd = new Date();
            periodEnd.setDate(periodEnd.getDate() + 30);

            // Create or update subscription
            await pool.query(
                `INSERT INTO subscriptions (user_id, plan, status, current_period_end, auto_renew)
                 VALUES ($1, 'pro', 'active', $2, TRUE)
                 ON CONFLICT (user_id) DO UPDATE SET 
                    plan = 'pro', 
                    status = 'active', 
                    current_period_end = $2,
                    auto_renew = TRUE,
                    updated_at = NOW()`,
                [req.user.id, periodEnd]
            );

            // Update user plan
            await pool.query(
                `UPDATE users SET plan = 'pro' WHERE id = $1`,
                [req.user.id]
            );

            // Save payment method if available
            if (payment.payment_method?.saved) {
                await pool.query(
                    `UPDATE subscriptions SET yookassa_subscription_id = $1, payment_method_title = $2 WHERE user_id = $3`,
                    [payment.payment_method.id, payment.payment_method.title || null, req.user.id]
                );
            }

            console.log(`✅ Payment verified and Pro activated for user ${req.user.id}`);
            return res.json({ status: 'activated', plan: 'pro' });
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

            // Calculate subscription end date (30 days from now)
            const periodEnd = new Date();
            periodEnd.setDate(periodEnd.getDate() + 30);

            // Create or update subscription
            await pool.query(
                `INSERT INTO subscriptions (user_id, plan, status, current_period_end, auto_renew)
                 VALUES ($1, 'pro', 'active', $2, TRUE)
                 ON CONFLICT (user_id) 
                 DO UPDATE SET 
                    plan = 'pro', 
                    status = 'active', 
                    current_period_end = $2,
                    auto_renew = TRUE,
                    updated_at = NOW()`,
                [userId, periodEnd]
            );

            // Update user's plan for quick access
            await pool.query(
                `UPDATE users SET plan = 'pro' WHERE id = $1`,
                [userId]
            );

            // Save payment method ID and card title for recurring payments
            if (payment.payment_method?.saved) {
                await pool.query(
                    `UPDATE subscriptions SET yookassa_subscription_id = $1, payment_method_title = $2 WHERE user_id = $3`,
                    [payment.payment_method.id, payment.payment_method.title || null, userId]
                );
            }

            console.log(`✅ Premium activated for user ${userId} until ${periodEnd}`);
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

        res.status(200).json({ received: true });
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

// Cancel auto-renewal (also unbinds saved card)
router.post('/cancel-auto-renew', authenticateToken, async (req, res) => {
    try {
        await pool.query(
            `UPDATE subscriptions SET auto_renew = FALSE, yookassa_subscription_id = NULL, payment_method_title = NULL, updated_at = NOW() WHERE user_id = $1`,
            [req.user.id]
        );
        res.json({ success: true, message: 'Auto-renewal cancelled, card unbound' });
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

export default router;
