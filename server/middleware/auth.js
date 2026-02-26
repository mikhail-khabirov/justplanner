import jwt from 'jsonwebtoken';

export const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = (authHeader && authHeader.split(' ')[1]) || req.query.token; // Bearer TOKEN or ?token=

    if (!token) {
        return res.status(401).json({ error: 'Требуется авторизация' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Недействительный токен' });
        }
        req.user = user;

        // Update last active time (fire and forget to not slow down response)
        // We need to dynamic import User because of potential circular dependency if User uses auth? 
        // User.js doesn't seem to use auth.js, but let's be safe or just import at top.
        // User.js is available.
        import('../models/User.js').then(({ User }) => {
            User.updateLastLogin(user.id).catch(err => console.error('Error updating last login:', err));
        });

        next();
    });
};

export const generateToken = (user) => {
    return jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
};
