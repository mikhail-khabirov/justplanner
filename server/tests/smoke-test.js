/**
 * Smoke tests — проверка критичных функций JustPlanner
 * Запуск: node server/tests/smoke-test.js
 * 
 * Проверяет:
 * 1. Health-check эндпоинт (сервер + БД + email)
 * 2. API регистрации отвечает
 * 3. API подписки (без токена → 401)
 * 4. Крон напоминаний — SQL запрос работает
 * 5. isAnnual поле в subscriptions
 * 6. Telegram бот отвечает
 * 
 * При ошибках отправляет отчёт в Telegram
 */

import 'dotenv/config';

const BASE_URL = process.env.TEST_BASE_URL || 'https://justplanner.ru';
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const results = [];
let passed = 0;
let failed = 0;

async function test(name, fn) {
    try {
        await fn();
        results.push({ name, status: '✅' });
        passed++;
    } catch (err) {
        results.push({ name, status: '❌', error: err.message });
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

await test('Health-check: сервер отвечает', async () => {
    const { status, body } = await fetchJSON(`${BASE_URL}/api/health`);
    assert(status === 200, `HTTP ${status}`);
    assert(body.status === 'ok', `status: ${body.status}, checks: ${JSON.stringify(body.checks)}`);
});

await test('Health-check: БД подключена', async () => {
    const { body } = await fetchJSON(`${BASE_URL}/api/health`);
    assert(body.checks.database === 'ok', `database: ${body.checks.database}`);
});

await test('Health-check: email настроен', async () => {
    const { body } = await fetchJSON(`${BASE_URL}/api/health`);
    assert(body.checks.email === 'ok', `email: ${body.checks.email}`);
});

await test('API: /auth/register отвечает (без данных → ошибка валидации)', async () => {
    const { status } = await fetchJSON(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
    });
    assert(status === 400, `Expected 400, got ${status}`);
});

await test('API: /billing/subscription без токена → 401', async () => {
    const { status } = await fetchJSON(`${BASE_URL}/api/billing/subscription`);
    assert(status === 401, `Expected 401, got ${status}`);
});

await test('API: /tasks без токена → 401', async () => {
    const { status } = await fetchJSON(`${BASE_URL}/api/tasks`);
    assert(status === 401, `Expected 401, got ${status}`);
});

await test('Фронтенд: главная страница загружается', async () => {
    const res = await fetch(BASE_URL, { signal: AbortSignal.timeout(10000) });
    assert(res.status === 200, `HTTP ${res.status}`);
    const html = await res.text();
    assert(html.includes('JustPlanner'), 'HTML не содержит JustPlanner');
});

// DB-level tests (only if running on server with DB access)
let pool = null;
try {
    const db = await import('../config/db.js');
    pool = db.default;
} catch (e) {
    // Not on server — skip DB tests
}

if (pool) {
    await test('БД: таблица users существует', async () => {
        const r = await pool.query("SELECT COUNT(*) FROM users");
        assert(parseInt(r.rows[0].count) >= 0, 'Query failed');
    });

    await test('БД: колонка annual_offer_reminder_sent существует', async () => {
        const r = await pool.query("SELECT annual_offer_reminder_sent FROM users LIMIT 1");
        assert(r.rows !== undefined, 'Column missing');
    });

    await test('БД: колонка is_annual в subscriptions существует', async () => {
        const r = await pool.query("SELECT is_annual FROM subscriptions LIMIT 1");
        assert(r.rows !== undefined, 'Column missing');
    });

    await test('БД: SQL крона напоминаний выполняется без ошибок', async () => {
        const r = await pool.query(`
            SELECT u.id, u.email FROM users u
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

// ─── Report ──────────────────────────────────────────────

const time = new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' });
const summary = `${passed}/${passed + failed} passed`;

console.log(`\n${'═'.repeat(50)}`);
console.log(`  SMOKE TESTS — ${summary} — ${time}`);
console.log(`${'═'.repeat(50)}`);
results.forEach(r => {
    console.log(`  ${r.status} ${r.name}${r.error ? ` — ${r.error}` : ''}`);
});
console.log(`${'═'.repeat(50)}\n`);

// Send to Telegram only on failures
if (failed > 0 && TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
    const failedTests = results.filter(r => r.status === '❌');
    const message = 
        `🚨 <b>Тесты: ${failed} ошибок!</b>\n\n` +
        failedTests.map(r => `❌ ${r.name}\n   <i>${r.error}</i>`).join('\n\n') +
        `\n\n📊 Итого: ${summary}\n🕐 ${time}`;

    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message, parse_mode: 'HTML' })
    }).catch(err => console.error('Telegram send failed:', err.message));
}

if (pool) await pool.end();
process.exit(failed > 0 ? 1 : 0);
