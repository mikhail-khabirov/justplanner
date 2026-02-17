/**
 * Лёгкий health-check — запускается кроном каждые 5 мин.
 * Проверяет только доступность сервера и БД.
 * При сбое — уведомление в Telegram (не чаще раза в 30 мин).
 */

import 'dotenv/config';

const BASE_URL = process.env.TEST_BASE_URL || 'https://justplanner.ru';
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const COOLDOWN_FILE = '/tmp/justplanner-alert-sent';

import { readFileSync, writeFileSync } from 'fs';

function recentlyAlerted() {
    try {
        const ts = parseInt(readFileSync(COOLDOWN_FILE, 'utf8'));
        return Date.now() - ts < 30 * 60 * 1000; // 30 min cooldown
    } catch { return false; }
}

async function sendAlert(text) {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
    if (recentlyAlerted()) return;
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, parse_mode: 'HTML' })
    }).catch(() => {});
    writeFileSync(COOLDOWN_FILE, Date.now().toString());
}

try {
    const res = await fetch(`${BASE_URL}/api/health`, { signal: AbortSignal.timeout(15000) });
    const body = await res.json();

    if (res.status !== 200 || body.status !== 'ok') {
        const issues = Object.entries(body.checks || {})
            .filter(([, v]) => v !== 'ok')
            .map(([k, v]) => `${k}: ${v}`)
            .join(', ');
        await sendAlert(
            `🔴 <b>JustPlanner DOWN</b>\n\n` +
            `Проблемы: ${issues || 'unknown'}\n` +
            `HTTP: ${res.status}\n` +
            `🕐 ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}`
        );
        process.exit(1);
    }
} catch (err) {
    await sendAlert(
        `🔴 <b>JustPlanner НЕДОСТУПЕН</b>\n\n` +
        `Ошибка: ${err.message}\n` +
        `🕐 ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}`
    );
    process.exit(1);
}

process.exit(0);
