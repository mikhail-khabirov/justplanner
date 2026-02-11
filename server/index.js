import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { User } from './models/User.js';
import { notifyNewUser } from './utils/telegram.js';
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

            // Extract UTM params from cookies
            const utmSource = req.cookies?.utm_source || null;
            const utmCampaign = req.cookies?.utm_campaign || null;

            const { user, isNew } = await User.findOrCreateByGoogle(profile.id, email, utmSource, utmCampaign);

            if (isNew) {
                const { sendWelcomeEmail } = await import('./utils/email.js');
                sendWelcomeEmail(email).catch(console.error);
                notifyNewUser(email, 'google');
            }

            await User.updateLastLogin(user.id);
            done(null, user);
        } catch (error) {
            done(error);
        }
    }));
}

app.use(passport.initialize());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', tasksRoutes);

// Admin routes - import dynamically to avoid issues if file doesn't exist
import adminRoutes from './routes/admin.js';
app.use('/api/admin', adminRoutes);

// Settings routes
import settingsRoutes from './routes/settings.js';
app.use('/api/settings', settingsRoutes);

// Billing routes
import billingRoutes from './billing/routes.js';
app.use('/api/billing', billingRoutes);

// Subscription renewal cron job
import cron from 'node-cron';
import { processRenewals } from './billing/renewal.js';

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Admin: force renewal (for testing)
import { authenticateToken } from './middleware/auth.js';
app.post('/api/billing/force-renewal', authenticateToken, async (req, res) => {
    // Simple admin check — you may want to enhance this
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

// Auto-migration helper
async function updateSchema() {
    try {
        const { default: pool } = await import('./config/db.js');
        await pool.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS registration_source VARCHAR(255),
            ADD COLUMN IF NOT EXISTS registration_campaign VARCHAR(255);
        `);
        // Add renewal tracking columns for recurring payments
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


        console.log('✅ Database schema updated');
    } catch (err) {
        console.error('⚠️ Schema update failed:', err.message);
    }
}

// Start server
app.listen(PORT, async () => {
    await updateSchema();

    // Schedule renewal cron: every day at 3:00 AM (server time)
    cron.schedule('0 3 * * *', async () => {
        console.log('⏰ Cron: Starting scheduled subscription renewal...');
        await processRenewals();
    });

    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log('📅 Subscription renewal cron scheduled: daily at 3:00 AM');
});
