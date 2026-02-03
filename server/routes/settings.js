import express from 'express';
import pool from '../config/db.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Auth middleware
const auth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.userId;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

// Get user settings
router.get('/', auth, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT settings FROM users WHERE id = $1',
            [req.userId]
        );

        if (!result.rows[0]) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            settings: result.rows[0].settings || { dayStartHour: 8 }
        });
    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({ error: 'Failed to get settings' });
    }
});

// Update user settings
router.put('/', auth, async (req, res) => {
    try {
        const settings = req.body;

        await pool.query(
            'UPDATE users SET settings = $1 WHERE id = $2',
            [JSON.stringify(settings), req.userId]
        );

        res.json({ success: true, settings });
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

export default router;
