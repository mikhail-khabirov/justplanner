import pool from '../config/db.js';
import bcrypt from 'bcrypt';

export const User = {
    // Create new user
    async create(email, password, verificationCode, source = null, campaign = null) {
        const passwordHash = await bcrypt.hash(password, 10);
        const result = await pool.query(
            'INSERT INTO users (email, password_hash, verification_code, is_verified, registration_source, registration_campaign) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, email, created_at',
            [email, passwordHash, verificationCode, false, source || null, campaign || null]
        );
        return result.rows[0];
    },

    // Verify User Email
    async verifyEmail(email) {
        await pool.query(
            'UPDATE users SET is_verified = TRUE, verification_code = NULL WHERE email = $1',
            [email]
        );
    },

    // Update Last Login
    async updateLastLogin(id) {
        await pool.query(
            'UPDATE users SET last_login = NOW() WHERE id = $1',
            [id]
        );
    },

    // Set Password Reset Token
    async setResetToken(email, token) {
        // Expires in 1 hour
        await pool.query(
            "UPDATE users SET reset_token = $1, reset_expires = NOW() + INTERVAL '1 hour' WHERE email = $2",
            [token, email]
        );
    },

    // Reset Password
    async resetPassword(token, newPassword) {
        // Find user with valid token and not expired
        const findResult = await pool.query(
            'SELECT id FROM users WHERE reset_token = $1 AND reset_expires > NOW()',
            [token]
        );

        if (!findResult.rows[0]) {
            return false;
        }

        const userId = findResult.rows[0].id;
        const passwordHash = await bcrypt.hash(newPassword, 10);

        await pool.query(
            'UPDATE users SET password_hash = $1, reset_token = NULL, reset_expires = NULL WHERE id = $2',
            [passwordHash, userId]
        );

        return true;
    },

    // Find by email
    async findByEmail(email) {
        const result = await pool.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );
        return result.rows[0];
    },

    // Find by ID
    async findById(id) {
        const result = await pool.query(
            'SELECT id, email, created_at FROM users WHERE id = $1',
            [id]
        );
        return result.rows[0];
    },

    // Find or create by Google ID
    async findOrCreateByGoogle(googleId, email, source = null, campaign = null) {
        // First try to find by google_id
        let result = await pool.query(
            'SELECT * FROM users WHERE google_id = $1',
            [googleId]
        );

        if (result.rows[0]) {
            return { user: result.rows[0], isNew: false };
        }

        // Try to find by email and link google account
        result = await pool.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );

        if (result.rows[0]) {
            // Link Google to existing account
            await pool.query(
                'UPDATE users SET google_id = $1, is_verified = TRUE WHERE id = $2',
                [googleId, result.rows[0].id]
            );
            return { user: result.rows[0], isNew: false };
        }

        // Create new user with Google
        result = await pool.query(
            'INSERT INTO users (email, google_id, is_verified, registration_source, registration_campaign) VALUES ($1, $2, TRUE, $3, $4) RETURNING id, email, created_at',
            [email, googleId, source || null, campaign || null]
        );
        return { user: result.rows[0], isNew: true };
    },

    // Verify password
    async verifyPassword(user, password) {
        if (!user.password_hash) return false;
        return bcrypt.compare(password, user.password_hash);
    }
};
