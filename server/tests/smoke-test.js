/**
 * Smoke tests — автоматическая проверка JustPlanner
 * 
 * Запуск кроном каждые 5 мин.
 * При ошибках — мгновенный алерт в Telegram (не чаще раз в 30 мин).
 * Результаты сохраняются в лог-файл для ежедневного отчёта.
 */

import 'dotenv/config';
import { appendFileSync, readFileSync, writeFileSync } from 'fs';

const BASE_URL = process.env.TEST_BASE_URL || 'https://justplanner.ru';
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const LOG_FILE = '/var/log/justplanner-tests.json';
const ALERT_COOLDOWN_FILE = '/tmp/justplanner-test-alert';

const results = [];
let passed = 0;
let failed = 0;

async function test(name, fn) {
    try {
        await fn();
        results.push({ name, status: 'ok' });
        passed++;
    } catch (err) {
        results.push({ name, status: 'fail', error: err.message });
        failed++;
    }
}

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

async function fetchJSON(url, options = {}) {
    const res = await fetch(url, { ...options, signal: AbortSignal.timeout(10000) });
    return { status: res.status, body: await res.json().catch(() => null) };
}

// ─── Tests ───────────────────────────────────────────────

await test('Сервер отвечает', async () => {
    const { status, body } = await fetchJSON(`${BASE_URL}/api/health`);
    assert(status === 200, `HTTP ${status}`);
    assert(body.status === 'ok', `status: ${body.status}`);
});

await test('БД подключена', async () => {
    const { body } = await fetchJSON(`${BASE_URL}/api/health`);
    assert(body.checks.database === 'ok', `database: ${body.checks.database}`);
});

await test('Email настроен', async () => {
    const { body } = await fetchJSON(`${BASE_URL}/api/health`);
    assert(body.checks.email === 'ok', `email: ${body.checks.email}`);
});

await test('API регистрации', async () => {
    const { status } = await fetchJSON(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
    });
    assert(status === 400, `Expected 400, got ${status}`);
});

await test('API подписки (auth)', async () => {
    const { status } = await fetchJSON(`${BASE_URL}/api/billing/subscription`);
    assert(status === 401, `Expected 401, got ${status}`);
});

await test('API задач (auth)', async () => {
    const { status } = await fetchJSON(`${BASE_URL}/api/tasks`);
    assert(status === 401, `Expected 401, got ${status}`);
});

await test('Фронтенд загружается', async () => {
    const res = await fetch(BASE_URL, { signal: AbortSignal.timeout(10000) });
    assert(res.status === 200, `HTTP ${res.status}`);
    const html = await res.text();
    assert(html.includes('JustPlanner'), 'HTML не содержит JustPlanner');
});

// DB tests
let pool = null;
try {
    const db = await import('../config/db.js');
    pool = db.default;
} catch (e) {}

if (pool) {
    await test('БД: таблица users', async () => {
        const r = await pool.query("SELECT COUNT(*) FROM users");
        assert(parseInt(r.rows[0].count) >= 0, 'Query failed');
    });

    await test('БД: annual_offer_reminder_sent', async () => {
        await pool.query("SELECT annual_offer_reminder_sent FROM users LIMIT 1");
    });

    await test('БД: is_annual', async () => {
        await pool.query("SELECT is_annual FROM subscriptions LIMIT 1");
    });

    await test('БД: SQL крона напоминаний', async () => {
        const r = await pool.query(`
            SELECT u.id FROM users u
            LEFT JOIN subscriptions s ON s.user_id = u.id
            WHERE u.is_verified = true
              AND u.annual_offer_reminder_sent = false
              AND u.created_at <= NOW() - INTERVAL '19 hours'
              AND u.created_at > NOW() - INTERVAL '24 hours'
              AND (s.plan IS NULL OR s.plan = 'free')
        `);
        assert(Array.isArray(r.rows), 'Expected array');
    });
}

// ─── Save results to log ─────────────────────────────────

const now = new Date().toISOString();
const entry = { time: now, total: passed + failed, passed, failed };

try {
    appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n');
} catch (e) {}

// ─── Console output ──────────────────────────────────────

const time = new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' });
console.log(`[${time}] Тесты: ${passed + failed} | ✅ ${passed} | ❌ ${failed}`);
if (failed > 0) {
    results.filter(r => r.status === 'fail').forEach(r => {
        console.log(`  ❌ ${r.name} — ${r.error}`);
    });
}

// ─── Alert to Telegram on failures (cooldown 30 min) ─────

if (failed > 0 && TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
    let shouldAlert = true;
    try {
        const ts = parseInt(readFileSync(ALERT_COOLDOWN_FILE, 'utf8'));
        if (Date.now() - ts < 30 * 60 * 1000) shouldAlert = false;
    } catch {}

    if (shouldAlert) {
        const failedTests = results.filter(r => r.status === 'fail');
        const message =
            `🚨 <b>Тесты: ${failed} ошибок!</b>\n\n` +
            failedTests.map(r => `❌ ${r.name}\n   <i>${r.error}</i>`).join('\n\n') +
            `\n\n📊 Проведено: ${passed + failed} | Успешных: ${passed} | Ошибок: ${failed}\n🕐 ${time}`;

        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message, parse_mode: 'HTML' })
        }).catch(() => {});
        try { writeFileSync(ALERT_COOLDOWN_FILE, Date.now().toString()); } catch {}
    }
}

if (pool) await pool.end();
process.exit(failed > 0 ? 1 : 0);
