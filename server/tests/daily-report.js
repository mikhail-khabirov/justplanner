/**
 * Ежедневный отчёт по тестам — отправляет сводку в Telegram.
 * Запуск кроном раз в день в 09:00 МСК.
 * 
 * Читает /var/log/justplanner-tests.json, агрегирует за сутки,
 * отправляет отчёт и очищает лог.
 */

import 'dotenv/config';
import { readFileSync, writeFileSync } from 'fs';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const LOG_FILE = '/var/log/justplanner-tests.json';

if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.error('TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set');
    process.exit(1);
}

// Read log
let lines = [];
try {
    const raw = readFileSync(LOG_FILE, 'utf8').trim();
    if (raw) lines = raw.split('\n').map(l => JSON.parse(l));
} catch (e) {
    // No log file — no tests ran
}

const totalRuns = lines.length;
const totalTests = lines.reduce((s, e) => s + e.total, 0);
const totalPassed = lines.reduce((s, e) => s + e.passed, 0);
const totalFailed = lines.reduce((s, e) => s + e.failed, 0);
const failedRuns = lines.filter(e => e.failed > 0).length;

const time = new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' });

let status, icon;
if (totalRuns === 0) {
    status = 'Нет данных';
    icon = '⚪';
} else if (totalFailed === 0) {
    status = 'Всё в порядке';
    icon = '✅';
} else {
    status = `${failedRuns} запусков с ошибками`;
    icon = '⚠️';
}

const message =
    `📊 <b>Отчёт за день</b>\n\n` +
    `${icon} Статус: ${status}\n\n` +
    `Запусков тестов: <b>${totalRuns}</b>\n` +
    `Проведено тестов: <b>${totalTests}</b>\n` +
    `Успешных: <b>${totalPassed}</b>\n` +
    `Ошибок: <b>${totalFailed}</b>\n\n` +
    `🕐 ${time}`;

await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message, parse_mode: 'HTML' })
}).catch(err => console.error('Telegram failed:', err.message));

// Clear log for next day
try { writeFileSync(LOG_FILE, ''); } catch {}

console.log(`[${time}] Daily report sent. Runs: ${totalRuns}, Tests: ${totalTests}, Passed: ${totalPassed}, Failed: ${totalFailed}`);
process.exit(0);
