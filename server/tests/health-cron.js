/**
 * Лёгкий health-check — запускается кроном каждые 5 мин.
 * Проверяет только доступность сервера и БД.
 * При сбое — exit 1 (cron MAILTO подхватит, если настроено).
 */

import 'dotenv/config';

const BASE_URL = process.env.TEST_BASE_URL || 'https://justplanner.ru';

try {
    const res = await fetch(`${BASE_URL}/api/health`, { signal: AbortSignal.timeout(15000) });
    const body = await res.json();

    if (res.status !== 200 || body.status !== 'ok') {
        const issues = Object.entries(body.checks || {})
            .filter(([, v]) => v !== 'ok')
            .map(([k, v]) => `${k}: ${v}`)
            .join(', ');
        console.error(`🔴 JustPlanner DOWN — ${issues || 'unknown'} (HTTP ${res.status})`);
        process.exit(1);
    }
} catch (err) {
    console.error(`🔴 JustPlanner НЕДОСТУПЕН: ${err.message}`);
    process.exit(1);
}

process.exit(0);
