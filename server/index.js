import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { User } from './models/User.js';
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

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
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
        console.log('✅ Database schema updated (UTM columns)');
    } catch (err) {
        console.error('⚠️ Schema update failed:', err.message);
    }
}

// Start server
app.listen(PORT, async () => {
    await updateSchema();
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
