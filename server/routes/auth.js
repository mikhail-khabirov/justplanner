import express from 'express';
import { User } from '../models/User.js';
import { generateToken } from '../middleware/auth.js';
import passport from 'passport';
import { addContactToUnisender } from '../utils/unisender.js';

const router = express.Router();

// Register
// Register
router.post('/register', async (req, res) => {
    try {
        const { email, password, utmSource, utmCampaign } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email и пароль обязательны' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Пароль должен быть минимум 6 символов' });
        }

        // Check if user exists
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
        }

        // Generate 6-digit code
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

        await User.create(email, password, verificationCode, utmSource, utmCampaign);

        // Send Email
        const { sendVerificationCode } = await import('../utils/email.js');
        const emailSent = await sendVerificationCode(email, verificationCode);

        if (!emailSent) {
            return res.status(500).json({ error: 'Не удалось отправить письмо с кодом' });
        }

        res.json({
            needVerification: true,
            email,
            message: 'Код подтверждения отправлен на почту'
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Ошибка при регистрации' });
    }
});

// Verify Email
router.post('/verify', async (req, res) => {
    try {
        const { email, code } = req.body;
        const user = await User.findByEmail(email);

        if (!user) {
            return res.status(400).json({ error: 'Пользователь не найден' });
        }

        if (user.is_verified) {
            return res.status(400).json({ error: 'Почта уже подтверждена' });
        }

        if (user.verification_code !== code) {
            return res.status(400).json({ error: 'Неверный код подтверждения' });
        }

        // Verify User
        await User.verifyEmail(email);

        // Welcome email disabled - handled by Unisender

        addContactToUnisender(email).catch(console.error);

        // Login user
        await User.updateLastLogin(user.id);
        const token = generateToken(user);
        res.json({
            user: { id: user.id, email: user.email },
            token
        });

    } catch (error) {
        console.error('Verification error:', error);
        res.status(500).json({ error: 'Ошибка при подтверждении' });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email и пароль обязательны' });
        }

        const user = await User.findByEmail(email);
        if (!user) {
            return res.status(401).json({ error: 'Неверный email или пароль' });
        }

        if (!user.is_verified) {
            // Check if it's a social login user who somehow hasn't verified? 
            // Social users usually default verify, but for manual:
            // return res.status(403).json({ error: 'Почта не подтверждена', needVerification: true });

            // For now, let's treat unverified as valid but prompt? Or block?
            // Requirement says "Make sure all emails are verified". So block.
            return res.status(403).json({ error: 'Почта не подтверждена. Пожалуйста, подтвердите email.', needVerification: true });
        }

        const isValid = await User.verifyPassword(user, password);
        if (!isValid) {
            return res.status(401).json({ error: 'Неверный email или пароль' });
        }

        const token = generateToken(user);
        await User.updateLastLogin(user.id);

        res.json({
            user: { id: user.id, email: user.email },
            token
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Ошибка при входе' });
    }
});

// Google OAuth - redirect to Google
router.get('/google', passport.authenticate('google', {
    scope: ['profile', 'email']
}));

// Google OAuth - callback
router.get('/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: '/login' }),
    (req, res) => {
        const token = generateToken(req.user);
        const isNew = req.user.isNew ? '&newUser=1' : '';
        // Redirect to frontend with token
        res.redirect(`${process.env.FRONTEND_URL}?token=${token}${isNew}`);
    }
);

// Get current user
router.get('/me', async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ error: 'Не авторизован' });
        }

        const jwt = await import('jsonwebtoken');
        const decoded = jwt.default.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);

        if (!user) {
            return res.status(401).json({ error: 'Пользователь не найден' });
        }

        res.json({ user: { id: user.id, email: user.email } });
    } catch (error) {
        res.status(401).json({ error: 'Недействительный токен' });
    }
});

// Forgot Password
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findByEmail(email);

        if (!user) {
            // Return success even if user not found to prevent enumeration
            return res.json({ message: 'Если такой email существует, мы отправили на него инструкцию.' });
        }

        const crypto = await import('crypto');
        const token = crypto.randomBytes(32).toString('hex');

        await User.setResetToken(email, token);

        const link = `${process.env.FRONTEND_URL || 'https://justplanner.ru'}?resetToken=${token}`;

        const { sendPasswordResetEmail } = await import('../utils/email.js');
        await sendPasswordResetEmail(email, link);

        res.json({ message: 'Ссылка для сброса пароля отправлена на почту' });

    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ error: 'Ошибка отправки письма' });
    }
});

// Reset Password
router.post('/reset-password', async (req, res) => {
    try {
        const { token, password } = req.body;

        if (!token || !password || password.length < 6) {
            return res.status(400).json({ error: 'Некорректные данные' });
        }

        const success = await User.resetPassword(token, password);

        if (!success) {
            return res.status(400).json({ error: 'Ссылка устарела или недействительна' });
        }

        res.json({ message: 'Пароль успешно изменен' });

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Ошибка сброса пароля' });
    }
});

export default router;
