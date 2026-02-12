import express from 'express';
import pool from '../config/db.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Admin credentials (hardcoded for simplicity - in production use env vars)
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'JustPlannerAdmin2026!';

// Admin login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
            return res.status(401).json({ error: 'Неверные данные для входа' });
        }

        const token = jwt.sign({ admin: true }, process.env.JWT_SECRET, { expiresIn: '24h' });
        res.json({ token });
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ error: 'Ошибка входа' });
    }
});

// Admin auth middleware
const adminAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Не авторизован' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded.admin) {
            return res.status(403).json({ error: 'Нет доступа' });
        }
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Недействительный токен' });
    }
};

// Get all users
router.get('/users', adminAuth, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                u.id, 
                u.email, 
                u.created_at, 
                u.last_login, 
                u.google_id, 
                u.plan,
                u.registration_source, 
                u.registration_campaign,
                u.is_verified,
                COUNT(t.id) as total_tasks,
                COUNT(CASE WHEN t.created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as tasks_24h
            FROM users u
            LEFT JOIN tasks t ON u.id = t.user_id
            GROUP BY u.id
            ORDER BY u.created_at DESC
        `);

        const users = result.rows.map(user => ({
            id: user.id,
            email: user.email,
            created_at: user.created_at,
            lastSession: user.last_login,
            registrationType: user.google_id ? 'Google' : 'Email',
            plan: user.plan || 'free',
            source: user.registration_source || 'direct/organic',
            campaign: user.registration_campaign || '-',
            isVerified: user.is_verified,
            totalTasks: parseInt(user.total_tasks || 0),
            tasks24h: parseInt(user.tasks_24h || 0)
        }));

        res.json({ users });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Ошибка получения пользователей' });
    }
});

// Get stats
router.get('/stats', adminAuth, async (req, res) => {
    try {
        const usersResult = await pool.query('SELECT COUNT(*) as count FROM users WHERE is_verified = true');
        const unverifiedResult = await pool.query('SELECT COUNT(*) as count FROM users WHERE is_verified = false');
        const tasksResult = await pool.query("SELECT COUNT(*) as count FROM tasks WHERE created_at > NOW() - INTERVAL '24 hours'");

        res.json({
            totalUsers: parseInt(usersResult.rows[0].count),
            unverifiedUsers: parseInt(unverifiedResult.rows[0].count),
            totalTasks: parseInt(tasksResult.rows[0].count)
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ error: 'Ошибка получения статистики' });
    }
});

// Delete user
router.delete('/users/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Prevent deleting self? Or special admin check?
        // For now, simple delete.

        await pool.query('DELETE FROM users WHERE id = $1', [id]);

        res.json({ message: 'Пользователь удален' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Ошибка удаления пользователя' });
    }
});

export default router;
