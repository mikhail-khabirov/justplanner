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
                -- Регистрации (users)
                (SELECT COUNT(*) FROM users WHERE is_verified = true AND created_at >= NOW() - INTERVAL '24 hours') AS reg_24h,
                (SELECT COUNT(*) FROM users WHERE is_verified = true) AS reg_total,

                -- 1₽ триалы
                COUNT(*) FILTER (WHERE p.created_at >= NOW() - INTERVAL '24 hours' AND p.status = 'succeeded' AND p.description = 'Trial 7 days') AS trial_24h,
                COALESCE(SUM(p.amount) FILTER (WHERE p.created_at >= NOW() - INTERVAL '24 hours' AND p.status = 'succeeded' AND p.description = 'Trial 7 days'), 0) AS trial_sum_24h,
                COUNT(*) FILTER (WHERE p.status = 'succeeded' AND p.description = 'Trial 7 days') AS trial_total,
                COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'succeeded' AND p.description = 'Trial 7 days'), 0) AS trial_sum_total,

                -- 99₽ первые подписки
                COUNT(*) FILTER (WHERE p.created_at >= NOW() - INTERVAL '24 hours' AND p.status = 'succeeded' AND p.description = 'Premium subscription') AS sub_24h,
                COALESCE(SUM(p.amount) FILTER (WHERE p.created_at >= NOW() - INTERVAL '24 hours' AND p.status = 'succeeded' AND p.description = 'Premium subscription'), 0) AS sub_sum_24h,
                COUNT(*) FILTER (WHERE p.status = 'succeeded' AND p.description = 'Premium subscription') AS sub_total,
                COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'succeeded' AND p.description = 'Premium subscription'), 0) AS sub_sum_total,

                -- Продления (автопродление + первая оплата после триала)
                COUNT(*) FILTER (WHERE p.created_at >= NOW() - INTERVAL '24 hours' AND p.status = 'succeeded' AND (p.description LIKE '%автопродление%' OR p.description LIKE '%после триала%')) AS renewal_24h,
                COALESCE(SUM(p.amount) FILTER (WHERE p.created_at >= NOW() - INTERVAL '24 hours' AND p.status = 'succeeded' AND (p.description LIKE '%автопродление%' OR p.description LIKE '%после триала%')), 0) AS renewal_sum_24h,
                COUNT(*) FILTER (WHERE p.status = 'succeeded' AND (p.description LIKE '%автопродление%' OR p.description LIKE '%после триала%')) AS renewal_total,
                COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'succeeded' AND (p.description LIKE '%автопродление%' OR p.description LIKE '%после триала%')), 0) AS renewal_sum_total,

                -- 594₽ годовая 50%
                COUNT(*) FILTER (WHERE p.created_at >= NOW() - INTERVAL '24 hours' AND p.status = 'succeeded' AND p.description = 'Annual Pro 365 days') AS annual_24h,
                COALESCE(SUM(p.amount) FILTER (WHERE p.created_at >= NOW() - INTERVAL '24 hours' AND p.status = 'succeeded' AND p.description = 'Annual Pro 365 days'), 0) AS annual_sum_24h,
                COUNT(*) FILTER (WHERE p.status = 'succeeded' AND p.description = 'Annual Pro 365 days') AS annual_total,
                COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'succeeded' AND p.description = 'Annual Pro 365 days'), 0) AS annual_sum_total
            FROM payments p
        `);
        return result.rows[0];
    } catch (err) {
        console.error('Failed to get payment stats:', err.message);
        return null;
    }
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
                    `<b>24 часа</b>\n` +
                    `Рег — ${stats.reg_24h}\n` +
                    `1₽ — ${stats.trial_24h} (${stats.trial_sum_24h}₽)\n` +
                    `99₽ — ${stats.sub_24h} (${stats.sub_sum_24h}₽)\n` +
                    `🔄 — ${stats.renewal_24h} (${stats.renewal_sum_24h}₽)\n` +
                    `594₽ — ${stats.annual_24h} (${stats.annual_sum_24h}₽)\n\n` +
                    `<b>Всего</b>\n` +
                    `Рег — ${stats.reg_total}\n` +
                    `1₽ — ${stats.trial_total} (${stats.trial_sum_total}₽)\n` +
                    `99₽ — ${stats.sub_total} (${stats.sub_sum_total}₽)\n` +
                    `🔄 — ${stats.renewal_total} (${stats.renewal_sum_total}₽)\n` +
                    `594₽ — ${stats.annual_total} (${stats.annual_sum_total}₽)`;
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
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteWebhook`).catch(() => {});
        console.log('🤖 Telegram bot polling started');
    }
    while (true) {
        await pollTelegramUpdates();
    }
})();
