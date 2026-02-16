// Subscription Renewal Cron Job
// Runs daily at 3:00 AM (MSK) to auto-renew expired subscriptions

import pool from '../config/db.js';
import { createRecurringPayment, createAnnualRecurringPayment } from './yookassa.js';

const MAX_RETRIES = 3;

/**
 * Process all expired subscriptions that have auto_renew enabled
 * and a saved payment method (yookassa_subscription_id)
 */
export async function processRenewals() {
    console.log('🔄 Starting subscription renewal check...');

    try {
        // Find all expired active subscriptions with auto_renew and saved payment method
        const result = await pool.query(`
            SELECT s.user_id, s.yookassa_subscription_id, s.renewal_retries, s.is_trial, s.is_annual, u.email
            FROM subscriptions s
            JOIN users u ON u.id = s.user_id
            WHERE s.auto_renew = TRUE
              AND s.status = 'active'
              AND s.current_period_end <= NOW()
              AND s.yookassa_subscription_id IS NOT NULL
              AND (s.renewal_retries < $1)
              AND (s.last_renewal_attempt IS NULL OR s.last_renewal_attempt < NOW() - INTERVAL '24 hours')
        `, [MAX_RETRIES]);

        console.log(`📋 Found ${result.rows.length} subscription(s) to renew`);

        for (const sub of result.rows) {
            await processOneRenewal(sub);
        }

        console.log('✅ Subscription renewal check completed');
    } catch (error) {
        console.error('❌ Renewal process error:', error);
    }
}

/**
 * Process a single subscription renewal
 */
async function processOneRenewal({ user_id, yookassa_subscription_id, renewal_retries, is_trial, is_annual, email }) {
    try {
        const label = is_trial ? 'trial→paid' : is_annual ? 'annual renewal' : 'renewal';
        console.log(`🔄 Renewing subscription for user ${user_id} [${label}] (attempt ${renewal_retries + 1}/${MAX_RETRIES})`);

        // Update last attempt timestamp
        await pool.query(
            `UPDATE subscriptions SET last_renewal_attempt = NOW(), updated_at = NOW() WHERE user_id = $1`,
            [user_id]
        );

        let payment;
        let amount;
        let description;
        let interval;

        if (is_annual) {
            // Annual renewal: 1188 RUB for 365 days
            payment = await createAnnualRecurringPayment(yookassa_subscription_id, user_id, email);
            amount = 1188;
            description = 'Pro — автопродление годовой подписки';
            interval = '365 days';
        } else {
            // Monthly renewal: 99 RUB for 30 days
            payment = await createRecurringPayment(yookassa_subscription_id, user_id, email);
            amount = 99;
            description = is_trial ? 'Pro — первая оплата после триала' : 'Premium — автопродление';
            interval = '30 days';
        }

        // Log payment
        await pool.query(
            `INSERT INTO payments (user_id, yookassa_payment_id, amount, currency, status, description)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [user_id, payment.id, amount, 'RUB', payment.status, description]
        );

        if (payment.status === 'succeeded') {
            // Extend subscription, clear trial flag
            await pool.query(
                `UPDATE subscriptions 
                 SET current_period_end = NOW() + INTERVAL '${interval}',
                     renewal_retries = 0,
                     is_trial = FALSE,
                     last_renewal_attempt = NOW(),
                     updated_at = NOW()
                 WHERE user_id = $1`,
                [user_id]
            );
            console.log(`✅ Subscription renewed for user ${user_id} [${label}]`);
        } else if (payment.status === 'pending') {
            // Payment is pending — webhook will handle success/failure
            console.log(`⏳ Recurring payment pending for user ${user_id}: ${payment.id}`);
        } else {
            // Payment failed
            await handleFailedRenewal(user_id, renewal_retries);
        }
    } catch (error) {
        console.error(`❌ Renewal failed for user ${user_id}:`, error.message);
        await handleFailedRenewal(user_id, renewal_retries);
    }
}

/**
 * Handle a failed renewal attempt — increment retries or downgrade
 */
async function handleFailedRenewal(userId, currentRetries) {
    const newRetries = currentRetries + 1;

    if (newRetries >= MAX_RETRIES) {
        // Max retries reached — downgrade to free
        console.log(`⚠️ Max retries reached for user ${userId}, downgrading to free`);

        await pool.query(
            `UPDATE subscriptions 
             SET plan = 'free', status = 'cancelled', auto_renew = FALSE,
                 renewal_retries = $2, updated_at = NOW()
             WHERE user_id = $1`,
            [userId, newRetries]
        );
        await pool.query(
            `UPDATE users SET plan = 'free' WHERE id = $1`,
            [userId]
        );
    } else {
        // Increment retry counter — will try again next day
        console.log(`⚠️ Renewal attempt ${newRetries}/${MAX_RETRIES} failed for user ${userId}, will retry`);

        await pool.query(
            `UPDATE subscriptions SET renewal_retries = $2, updated_at = NOW() WHERE user_id = $1`,
            [userId, newRetries]
        );
    }
}
