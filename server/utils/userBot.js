/**
 * User-facing Telegram bot for task reminders.
 *
 * Commands:
 *   /start TOKEN — link Telegram account to JustPlanner user
 *   /stop        — unlink Telegram account
 */

import pool from '../config/db.js';

const BOT_TOKEN = process.env.TELEGRAM_USER_BOT_TOKEN;

// ─── Send message to a specific chat ─────────────────────

export async function sendUserMessage(chatId, text) {
    if (!BOT_TOKEN) {
        console.warn('⚠️ User bot disabled: missing TELEGRAM_USER_BOT_TOKEN');
        return;
    }

    try {
        const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text,
                parse_mode: 'HTML'
            })
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('User bot send error:', error);
        }
    } catch (err) {
        console.error('User bot notification failed:', err.message);
    }
}

// ─── Send task reminder ──────────────────────────────────

export async function sendUserReminder(chatId, taskContent, taskDate, taskHour) {
    const hourStr = String(taskHour).padStart(2, '0') + ':00';
    const dateFormatted = new Date(taskDate + 'T00:00:00').toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        weekday: 'short'
    });

    const text =
        `🔔 <b>Напоминание</b>\n\n` +
        `📋 ${taskContent}\n` +
        `📅 ${dateFormatted}\n` +
        `🕐 ${hourStr}\n\n` +
        `👉 <a href="https://justplanner.ru">Открыть JustPlanner</a>`;

    await sendUserMessage(chatId, text);
}

// ─── Long polling for /start and /stop commands ──────────

let lastUpdateId = 0;

async function pollUpdates() {
    if (!BOT_TOKEN) return;

    try {
        const res = await fetch(
            `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=${lastUpdateId + 1}&timeout=30`,
            { signal: AbortSignal.timeout(35000) }
        );
        const data = await res.json();
        if (!data.ok || !data.result) return;

        for (const update of data.result) {
            lastUpdateId = update.update_id;
            const msg = update.message;
            if (!msg || !msg.text) continue;

            const text = msg.text.trim();
            const chatId = msg.chat.id.toString();

            // /start TOKEN — link account
            if (text.startsWith('/start ')) {
                const token = text.slice(7).trim();
                if (!token) {
                    await sendUserMessage(chatId, '❌ Неверная ссылка. Попробуйте ещё раз из приложения.');
                    continue;
                }

                try {
                    // Find user by link token (valid for 10 minutes)
                    const result = await pool.query(
                        `SELECT id, email FROM users 
                         WHERE telegram_link_token = $1 
                           AND telegram_link_token_created > NOW() - INTERVAL '10 minutes'`,
                        [token]
                    );

                    if (result.rows.length === 0) {
                        await sendUserMessage(chatId, '❌ Ссылка устарела или недействительна.\nПопробуйте заново из приложения.');
                        continue;
                    }

                    const user = result.rows[0];

                    // Save chat ID, clear token
                    await pool.query(
                        `UPDATE users 
                         SET telegram_chat_id = $1, 
                             telegram_link_token = NULL,
                             telegram_link_token_created = NULL,
                             telegram_linked_at = NOW() 
                         WHERE id = $2`,
                        [chatId, user.id]
                    );

                    const maskedEmail = user.email.replace(/(.{2})(.*)(@.*)/, '$1***$3');
                    await sendUserMessage(chatId,
                        `✅ <b>Telegram подключён!</b>\n\n` +
                        `Аккаунт: ${maskedEmail}\n\n` +
                        `Теперь вы можете включить напоминания для задач в JustPlanner.\n\n` +
                        `Для отключения отправьте /stop`
                    );

                    console.log(`🔗 Telegram linked: user ${user.id} → chat ${chatId}`);
                } catch (err) {
                    console.error('Telegram link error:', err.message);
                    await sendUserMessage(chatId, '❌ Произошла ошибка. Попробуйте позже.');
                }
            }

            // /start without token
            else if (text === '/start') {
                await sendUserMessage(chatId,
                    `👋 <b>JustPlanner — напоминания</b>\n\n` +
                    `Чтобы получать напоминания о задачах, подключите Telegram в приложении:\n\n` +
                    `1. Откройте justplanner.ru\n` +
                    `2. Нажмите «Подключить Telegram»\n` +
                    `3. Перейдите по ссылке сюда\n\n` +
                    `Если у вас уже подключен Telegram, просто зайдите в задачу и включите напоминание.`
                );
            }

            // /stop — unlink
            else if (text === '/stop') {
                try {
                    const result = await pool.query(
                        `UPDATE users SET telegram_chat_id = NULL, telegram_linked_at = NULL 
                         WHERE telegram_chat_id = $1 RETURNING email`,
                        [chatId]
                    );

                    if (result.rows.length > 0) {
                        // Clear all pending reminders for this user
                        await pool.query(
                            `UPDATE tasks SET reminder_offset = NULL, reminder_sent = FALSE 
                             WHERE user_id = (SELECT id FROM users WHERE email = $1)`,
                            [result.rows[0].email]
                        );
                        await sendUserMessage(chatId, '❌ Telegram отключён. Напоминания больше не будут приходить.');
                        console.log(`🔓 Telegram unlinked: chat ${chatId}`);
                    } else {
                        await sendUserMessage(chatId, 'ℹ️ Ваш Telegram не был подключён.');
                    }
                } catch (err) {
                    console.error('Telegram unlink error:', err.message);
                    await sendUserMessage(chatId, '❌ Произошла ошибка. Попробуйте позже.');
                }
            }
        }
    } catch (err) {
        if (err.name !== 'TimeoutError') {
            console.error('User bot polling error:', err.message);
        }
    }
}

// Start polling loop
export function startUserBotPolling() {
    if (!BOT_TOKEN) {
        console.warn('⚠️ User bot not started: missing TELEGRAM_USER_BOT_TOKEN');
        return;
    }

    (async function botLoop() {
        // Delete any existing webhook so polling works
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook`).catch(() => { });
        console.log('🤖 User Telegram bot polling started');

        while (true) {
            await pollUpdates();
        }
    })();
}
