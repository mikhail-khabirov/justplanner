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
            WHERE is_verified = true
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

async function getPaymentStats() {
    try {
        const result = await pool.query(`
            SELECT 
                -- Регистрации (verified users)
                (SELECT COUNT(*) FROM users WHERE is_verified = true AND created_at >= (CURRENT_DATE AT TIME ZONE 'Europe/Moscow')) AS reg_today,
                (SELECT COUNT(*) FROM users WHERE is_verified = true AND created_at >= NOW() - INTERVAL '24 hours') AS reg_24h,
                (SELECT COUNT(*) FROM users WHERE is_verified = true AND created_at >= NOW() - INTERVAL '7 days') AS reg_week,
                (SELECT COUNT(*) FROM users WHERE is_verified = true) AS reg_total,

                -- Триалы (1₽)
                COUNT(*) FILTER (WHERE p.created_at >= (CURRENT_DATE AT TIME ZONE 'Europe/Moscow') AND p.status = 'succeeded' AND p.description = 'Trial 7 days') AS trial_today,
                COUNT(*) FILTER (WHERE p.created_at >= NOW() - INTERVAL '24 hours' AND p.status = 'succeeded' AND p.description = 'Trial 7 days') AS trial_24h,
                COUNT(*) FILTER (WHERE p.created_at >= NOW() - INTERVAL '7 days' AND p.status = 'succeeded' AND p.description = 'Trial 7 days') AS trial_week,
                COUNT(*) FILTER (WHERE p.status = 'succeeded' AND p.description = 'Trial 7 days') AS trial_total,

                -- Подписки (полная стоимость — любая сумма)
                COUNT(*) FILTER (WHERE p.created_at >= (CURRENT_DATE AT TIME ZONE 'Europe/Moscow') AND p.status = 'succeeded' AND p.description = 'Premium subscription') AS sub_today,
                COALESCE(SUM(p.amount) FILTER (WHERE p.created_at >= (CURRENT_DATE AT TIME ZONE 'Europe/Moscow') AND p.status = 'succeeded' AND p.description = 'Premium subscription'), 0) AS sub_sum_today,
                COUNT(*) FILTER (WHERE p.created_at >= NOW() - INTERVAL '24 hours' AND p.status = 'succeeded' AND p.description = 'Premium subscription') AS sub_24h,
                COALESCE(SUM(p.amount) FILTER (WHERE p.created_at >= NOW() - INTERVAL '24 hours' AND p.status = 'succeeded' AND p.description = 'Premium subscription'), 0) AS sub_sum_24h,
                COUNT(*) FILTER (WHERE p.created_at >= NOW() - INTERVAL '7 days' AND p.status = 'succeeded' AND p.description = 'Premium subscription') AS sub_week,
                COALESCE(SUM(p.amount) FILTER (WHERE p.created_at >= NOW() - INTERVAL '7 days' AND p.status = 'succeeded' AND p.description = 'Premium subscription'), 0) AS sub_sum_week,
                COUNT(*) FILTER (WHERE p.status = 'succeeded' AND p.description = 'Premium subscription') AS sub_total,
                COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'succeeded' AND p.description = 'Premium subscription'), 0) AS sub_sum_total,

                -- Продления (автопродление + после триала)
                COUNT(*) FILTER (WHERE p.created_at >= (CURRENT_DATE AT TIME ZONE 'Europe/Moscow') AND p.status = 'succeeded' AND ((p.description LIKE '%автопродление%' OR p.description LIKE '%после триала%') AND p.description NOT LIKE '%годов%')) AS renew_today,
                COALESCE(SUM(p.amount) FILTER (WHERE p.created_at >= (CURRENT_DATE AT TIME ZONE 'Europe/Moscow') AND p.status = 'succeeded' AND ((p.description LIKE '%автопродление%' OR p.description LIKE '%после триала%') AND p.description NOT LIKE '%годов%')), 0) AS renew_sum_today,
                COUNT(*) FILTER (WHERE p.created_at >= NOW() - INTERVAL '24 hours' AND p.status = 'succeeded' AND ((p.description LIKE '%автопродление%' OR p.description LIKE '%после триала%') AND p.description NOT LIKE '%годов%')) AS renew_24h,
                COALESCE(SUM(p.amount) FILTER (WHERE p.created_at >= NOW() - INTERVAL '24 hours' AND p.status = 'succeeded' AND ((p.description LIKE '%автопродление%' OR p.description LIKE '%после триала%') AND p.description NOT LIKE '%годов%')), 0) AS renew_sum_24h,
                COUNT(*) FILTER (WHERE p.created_at >= NOW() - INTERVAL '7 days' AND p.status = 'succeeded' AND ((p.description LIKE '%автопродление%' OR p.description LIKE '%после триала%') AND p.description NOT LIKE '%годов%')) AS renew_week,
                COALESCE(SUM(p.amount) FILTER (WHERE p.created_at >= NOW() - INTERVAL '7 days' AND p.status = 'succeeded' AND ((p.description LIKE '%автопродление%' OR p.description LIKE '%после триала%') AND p.description NOT LIKE '%годов%')), 0) AS renew_sum_week,
                COUNT(*) FILTER (WHERE p.status = 'succeeded' AND ((p.description LIKE '%автопродление%' OR p.description LIKE '%после триала%') AND p.description NOT LIKE '%годов%')) AS renew_total,
                COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'succeeded' AND ((p.description LIKE '%автопродление%' OR p.description LIKE '%после триала%') AND p.description NOT LIKE '%годов%')), 0) AS renew_sum_total,

                -- Годовые (любая сумма — суммируется всё)
                COUNT(*) FILTER (WHERE p.created_at >= (CURRENT_DATE AT TIME ZONE 'Europe/Moscow') AND p.status = 'succeeded' AND (p.description = 'Annual Pro 365 days' OR p.description LIKE '%годов%')) AS annual_today,
                COALESCE(SUM(p.amount) FILTER (WHERE p.created_at >= (CURRENT_DATE AT TIME ZONE 'Europe/Moscow') AND p.status = 'succeeded' AND (p.description = 'Annual Pro 365 days' OR p.description LIKE '%годов%')), 0) AS annual_sum_today,
                COUNT(*) FILTER (WHERE p.created_at >= NOW() - INTERVAL '24 hours' AND p.status = 'succeeded' AND (p.description = 'Annual Pro 365 days' OR p.description LIKE '%годов%')) AS annual_24h,
                COALESCE(SUM(p.amount) FILTER (WHERE p.created_at >= NOW() - INTERVAL '24 hours' AND p.status = 'succeeded' AND (p.description = 'Annual Pro 365 days' OR p.description LIKE '%годов%')), 0) AS annual_sum_24h,
                COUNT(*) FILTER (WHERE p.created_at >= NOW() - INTERVAL '7 days' AND p.status = 'succeeded' AND (p.description = 'Annual Pro 365 days' OR p.description LIKE '%годов%')) AS annual_week,
                COALESCE(SUM(p.amount) FILTER (WHERE p.created_at >= NOW() - INTERVAL '7 days' AND p.status = 'succeeded' AND (p.description = 'Annual Pro 365 days' OR p.description LIKE '%годов%')), 0) AS annual_sum_week,
                COUNT(*) FILTER (WHERE p.status = 'succeeded' AND (p.description = 'Annual Pro 365 days' OR p.description LIKE '%годов%')) AS annual_total,
                COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'succeeded' AND (p.description = 'Annual Pro 365 days' OR p.description LIKE '%годов%')), 0) AS annual_sum_total
            FROM payments p
        `);
        return result.rows[0];
    } catch (err) {
        console.error('Failed to get payment stats:', err.message);
        return null;
    }
}

function formatPeriod(s, suffix) {
    return (
        `Рег — ${s['reg_' + suffix]}\n` +
        `1₽ — ${s['trial_' + suffix]}\n` +
        `Подписка — ${s['sub_' + suffix]} (${s['sub_sum_' + suffix]}₽)\n` +
        `🔄 Продление — ${s['renew_' + suffix]} (${s['renew_sum_' + suffix]}₽)\n` +
        `📅 Годовая — ${s['annual_' + suffix]} (${s['annual_sum_' + suffix]}₽)`
    );
}

// ─── Telegram Bot Polling (commands) ─────────────────────

let lastUpdateId = 0;

async function pollTelegramUpdates() {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;

    try {
        const res = await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates?offset=${lastUpdateId + 1}&timeout=30`,
            { signal: AbortSignal.timeout(35000) }
        );
        const data = await res.json();
        if (!data.ok || !data.result) return;

        for (const update of data.result) {
            lastUpdateId = update.update_id;
            const msg = update.message;
            if (!msg || !msg.text) continue;
            if (msg.chat.id.toString() !== TELEGRAM_CHAT_ID) continue;

            const text = msg.text.trim();

            if (text === '/pay') {
                const stats = await getPaymentStats();
                if (!stats) {
                    await sendTelegramReply(msg.chat.id, '❌ Ошибка получения статистики');
                    continue;
                }
                const reply =
                    `💰 <b>Статистика платежей</b>\n\n` +
                    `<b>📌 Сегодня</b>\n` +
                    formatPeriod(stats, 'today') + `\n\n` +
                    `<b>🕐 24 часа</b>\n` +
                    formatPeriod(stats, '24h') + `\n\n` +
                    `<b>📅 Неделя</b>\n` +
                    formatPeriod(stats, 'week') + `\n\n` +
                    `<b>📊 Всего</b>\n` +
                    formatPeriod(stats, 'total');
                await sendTelegramReply(msg.chat.id, reply);
            }
        }
    } catch (err) {
        if (err.name !== 'TimeoutError') {
            console.error('Telegram polling error:', err.message);
        }
    }
}

async function sendTelegramReply(chatId, text) {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' })
    });
}

// Start polling loop
(async function botLoop() {
    // Delete any existing webhook so polling works
    if (TELEGRAM_BOT_TOKEN) {
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteWebhook`).catch(() => { });
        console.log('🤖 Telegram bot polling started');
    }
    while (true) {
        await pollTelegramUpdates();
    }
})();
