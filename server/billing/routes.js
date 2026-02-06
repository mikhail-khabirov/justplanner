import express from 'express';
import pool from '../config/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get current subscription
router.get('/subscription', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                s.id, s.plan, s.status, s.yookassa_subscription_id,
                s.current_period_end, s.auto_renew, s.created_at,
                u.plan as user_plan
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
            createdAt: row.created_at
        });
    } catch (error) {
        console.error('Error fetching subscription:', error);
        res.status(500).json({ error: 'Failed to fetch subscription' });
    }
});

// Create payment (will be implemented in Phase 2 with Yookassa)
router.post('/create-payment', authenticateToken, async (req, res) => {
    // Placeholder - will be implemented when Yookassa credentials are provided
    res.status(501).json({
        error: 'Payment integration not yet configured',
        message: 'Yookassa integration pending'
    });
});

// Webhook handler (will be implemented in Phase 2)
router.post('/webhook', async (req, res) => {
    // Placeholder for Yookassa webhooks
    console.log('Webhook received:', req.body);
    res.status(200).json({ received: true });
});

// Cancel auto-renewal
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

export default router;
