import pool from '../config/db.js';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function sendTelegramMessage(text) {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
        console.warn('⚠️ Telegram notifications disabled: missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID');
        return;
    }

    try {
        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text,
                parse_mode: 'HTML'
            })
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('Telegram send error:', error);
        }
    } catch (err) {
        console.error('Telegram notification failed:', err.message);
    }
}

async function getRegistrationStats() {
    try {
        const result = await pool.query(`
            SELECT 
                COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE AT TIME ZONE 'Europe/Moscow') AS today,
                COUNT(*) FILTER (WHERE created_at >= (CURRENT_DATE - INTERVAL '1 day') AT TIME ZONE 'Europe/Moscow' 
                    AND created_at < CURRENT_DATE AT TIME ZONE 'Europe/Moscow') AS yesterday,
                COUNT(*) AS total
            FROM users
        `);
        return result.rows[0];
    } catch (err) {
        console.error('Failed to get registration stats:', err.message);
        return { today: '?', yesterday: '?', total: '?' };
    }
}

export async function notifyNewUser(email, type = 'email') {
    const icon = type === 'google' ? '🔵' : '📧';
    const method = type === 'google' ? 'Google' : 'Email';
    const now = new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' });
    const stats = await getRegistrationStats();

    sendTelegramMessage(
        `${icon} <b>Новый пользователь</b>\n\n` +
        `📩 ${email}\n` +
        `🔑 Вход: ${method}\n` +
        `🕐 ${now}\n\n` +
        `📊 <b>Регистрации:</b>\n` +
        `  Сегодня: ${stats.today} | Вчера: ${stats.yesterday} | Всего: ${stats.total}`
    );
}

export function notifyPayment(email, amount, description = '') {
    const now = new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' });

    sendTelegramMessage(
        `💰 <b>Оплата получена</b>\n\n` +
        `📩 ${email}\n` +
        `💵 ${amount} ₽\n` +
        `📝 ${description}\n` +
        `🕐 ${now}`
    );
}
