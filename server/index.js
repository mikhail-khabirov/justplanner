import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { User } from './models/User.js';
import { sendWelcomeEmail } from './utils/email.js';
import { startUserBotPolling, sendUserReminder } from './utils/userBot.js';
import authRoutes from './routes/auth.js';
import tasksRoutes from './routes/tasks.js';

const app = express();
const PORT = process.env.PORT || 3001;

import cookieParser from 'cookie-parser';

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Passport Google Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.FRONTEND_URL + '/api/auth/google/callback',
        passReqToCallback: true
    }, async (req, accessToken, refreshToken, profile, done) => {
        try {
            const email = profile.emails?.[0]?.value;
            if (!email) {
                return done(new Error('Email not provided by Google'));
            }

            const utmSource = req.cookies?.utm_source || null;
            const utmCampaign = req.cookies?.utm_campaign || null;

            const { user, isNew } = await User.findOrCreateByGoogle(profile.id, email, utmSource, utmCampaign);

            if (isNew) {
                sendWelcomeEmail(email).catch(err => console.error('Welcome email failed:', err.message));
            }

            await User.updateLastLogin(user.id);
            done(null, { ...user, isNew });
        } catch (error) {
            done(error);
        }
    }));
}

app.use(passport.initialize());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', tasksRoutes);

import adminRoutes from './routes/admin.js';
app.use('/api/admin', adminRoutes);

import settingsRoutes from './routes/settings.js';
app.use('/api/settings', settingsRoutes);

import billingRoutes from './billing/routes.js';
app.use('/api/billing', billingRoutes);

import cron from 'node-cron';
import { processRenewals } from './billing/renewal.js';

// Health check
app.get('/api/health', async (req, res) => {
    const checks = { server: 'ok', database: 'fail', email: 'fail' };
    try {
        const { default: p } = await import('./config/db.js');
        await p.query('SELECT 1');
        checks.database = 'ok';
    } catch (e) { checks.database = e.message; }
    checks.email = process.env.SMTP_HOST ? 'ok' : 'not configured';
    const allOk = checks.server === 'ok' && checks.database === 'ok' && checks.email === 'ok';
    res.status(allOk ? 200 : 503).json({ status: allOk ? 'ok' : 'degraded', checks, timestamp: new Date().toISOString() });
});

import { authenticateToken } from './middleware/auth.js';
app.post('/api/billing/force-renewal', authenticateToken, async (req, res) => {
    const { default: poolDb } = await import('./config/db.js');
    const userResult = await poolDb.query('SELECT plan FROM users WHERE id = $1', [req.user.id]);
    if (userResult.rows.length === 0) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    try {
        await processRenewals();
        res.json({ success: true, message: 'Renewal process completed' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

async function updateSchema() {
    try {
        const { default: pool } = await import('./config/db.js');
        await pool.query(`
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS registration_source VARCHAR(255),
            ADD COLUMN IF NOT EXISTS registration_campaign VARCHAR(255);
        `);
        await pool.query(`
            ALTER TABLE subscriptions
            ADD COLUMN IF NOT EXISTS renewal_retries INTEGER DEFAULT 0;
        `);
        await pool.query(`
            ALTER TABLE subscriptions
            ADD COLUMN IF NOT EXISTS last_renewal_attempt TIMESTAMP;
        `);
        await pool.query(`
            ALTER TABLE subscriptions
            ADD COLUMN IF NOT EXISTS payment_method_title VARCHAR(255);
        `);
        await pool.query(`
            ALTER TABLE subscriptions
            ADD COLUMN IF NOT EXISTS is_trial BOOLEAN DEFAULT FALSE;
        `);
        await pool.query(`
            ALTER TABLE subscriptions
            ADD COLUMN IF NOT EXISTS is_annual BOOLEAN DEFAULT FALSE;
        `);
        await pool.query(`
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS annual_offer_reminder_sent BOOLEAN DEFAULT FALSE;
        `);
        await pool.query(`
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS no_task_reminder_sent BOOLEAN DEFAULT FALSE;
        `);
        await pool.query(`
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS inactivity_reminder_sent BOOLEAN DEFAULT FALSE;
        `);
        await pool.query(`
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS notification_survey_shown BOOLEAN DEFAULT FALSE;
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS survey_responses (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                answer VARCHAR(50) NOT NULL,
                custom_text TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        await pool.query(`
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS telegram_chat_id VARCHAR(50),
            ADD COLUMN IF NOT EXISTS telegram_link_token VARCHAR(100),
            ADD COLUMN IF NOT EXISTS telegram_link_token_created TIMESTAMP,
            ADD COLUMN IF NOT EXISTS telegram_linked_at TIMESTAMP;
        `);
        await pool.query(`
            ALTER TABLE tasks
            ADD COLUMN IF NOT EXISTS reminder_offset VARCHAR(20),
            ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT FALSE;
        `);
        await pool.query(`
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS monthly_price INTEGER DEFAULT 299;
        `);

        console.log('✅ Database schema updated');
    } catch (err) {
        console.error('⚠️ Schema update failed:', err.message);
    }
}

app.listen(PORT, async () => {
    await updateSchema();

    console.log(`🚀 Server running on http://localhost:${PORT}`);

    if (process.env.STANDBY_MODE === 'true') {
        console.log('🛑 STANDBY_MODE=true: crons, Telegram bot polling, and background tasks are DISABLED.');
        return;
    }

    if (process.env.DISABLE_RENEWAL_CRON === 'true') {
        console.log('⏸  Renewal cron DISABLED via DISABLE_RENEWAL_CRON env var');
    } else {
        cron.schedule('0 3 * * *', async () => {
            console.log('⏰ Cron: Starting scheduled subscription renewal...');
            await processRenewals();
        });
    }

    cron.schedule('*/30 * * * *', async () => {
        try {
            const { default: pool } = await import('./config/db.js');
            const { sendAnnualOfferReminder } = await import('./utils/email.js');
            const result = await pool.query(`
                SELECT u.id, u.email FROM users u
                LEFT JOIN subscriptions s ON s.user_id = u.id
                WHERE u.is_verified = true
                  AND u.annual_offer_reminder_sent = false
                  AND u.created_at <= NOW() - INTERVAL '19 hours'
                  AND u.created_at > NOW() - INTERVAL '24 hours'
                  AND (s.plan IS NULL OR s.plan = 'free')
            `);
            for (const user of result.rows) {
                await sendAnnualOfferReminder(user.email).catch(console.error);
                await pool.query('UPDATE users SET annual_offer_reminder_sent = true WHERE id = $1', [user.id]);
                console.log(`📧 Annual offer reminder sent to ${user.email}`);
            }
        } catch (err) {
            console.error('❌ Annual offer reminder cron error:', err.message);
        }
    });

    cron.schedule('* * * * *', async () => {
        try {
            const { default: pool } = await import('./config/db.js');
            const result = await pool.query(`
                SELECT t.id, t.content, t.column_id, t.hour, t.reminder_offset,
                       u.telegram_chat_id
                FROM tasks t
                JOIN users u ON u.id = t.user_id
                WHERE t.reminder_offset IS NOT NULL
                  AND t.reminder_sent = FALSE
                  AND t.completed = FALSE
                  AND u.telegram_chat_id IS NOT NULL
                  AND t.column_id ~ '^\\\\d{4}-\\\\d{2}-\\\\d{2}$'
                  AND t.hour IS NOT NULL
                  AND (
                    (t.column_id || ' ' || LPAD(t.hour::text, 2, '0') || ':00:00')::timestamp
                    - (CASE t.reminder_offset
                        WHEN '0min' THEN INTERVAL '0 minutes'
                        WHEN '15min' THEN INTERVAL '15 minutes'
                        WHEN '30min' THEN INTERVAL '30 minutes'
                        WHEN '1h' THEN INTERVAL '1 hour'
                        WHEN '2h' THEN INTERVAL '2 hours'
                        WHEN '12h' THEN INTERVAL '12 hours'
                      END)
                  ) <= NOW() AT TIME ZONE 'Europe/Moscow'
            `);

            for (const task of result.rows) {
                await sendUserReminder(task.telegram_chat_id, task.content, task.column_id, task.hour);
                await pool.query('UPDATE tasks SET reminder_sent = TRUE WHERE id = $1', [task.id]);
                console.log(`🔔 Reminder sent: task ${task.id} → chat ${task.telegram_chat_id}`);
            }
        } catch (err) {
            console.error('❌ Reminder cron error:', err.message);
        }
    });

    startUserBotPolling();

    console.log('📅 Subscription renewal cron scheduled: daily at 3:00 AM');
    console.log('📧 Annual offer reminder cron scheduled: every 30 min');
    console.log('🔔 Task reminder cron scheduled: every minute');
    console.log('🤖 User Telegram bot: ' + (process.env.TELEGRAM_USER_BOT_TOKEN ? 'enabled' : 'disabled'));
});
