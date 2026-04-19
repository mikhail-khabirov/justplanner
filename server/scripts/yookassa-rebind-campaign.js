#!/usr/bin/env node
// Кампания перепривязки карт после смены YooKassa-магазина.
//
// Что делает:
// 1. Находит всех Pro-юзеров с привязанной картой (yookassa_subscription_id IS NOT NULL)
// 2. Очищает их payment_method_id и выключает auto_renew (Pro остаётся до current_period_end)
// 3. Шлёт каждому email с просьбой перепривязать карту
//
// Запуск:
//   node server/scripts/yookassa-rebind-campaign.js --dry-run    # просто посчитать, ничего не менять
//   node server/scripts/yookassa-rebind-campaign.js              # реально выполнить
//
// ⚠ Запускать только ПОСЛЕ:
//   - Новые YOOKASSA_SHOP_ID / YOOKASSA_SECRET_KEY прописаны в .env
//   - В кабинете нового YooKassa настроен webhook на https://justplanner.ru/api/billing/webhook
//   - pm2 restart justplanner-api сделан

import 'dotenv/config';
import pool from '../config/db.js';
import { sendRebindCardEmail } from '../utils/email.js';

const DRY_RUN = process.argv.includes('--dry-run');

(async () => {
    try {
        const { rows: targets } = await pool.query(`
            SELECT u.id, u.email
            FROM users u
            JOIN subscriptions s ON s.user_id = u.id
            WHERE s.plan = 'pro'
              AND s.yookassa_subscription_id IS NOT NULL
            ORDER BY u.id
        `);

        console.log(`Найдено Pro-подписок с активной картой: ${targets.length}`);

        if (targets.length === 0) {
            console.log('Некого уведомлять, выходим.');
            process.exit(0);
        }

        if (DRY_RUN) {
            console.log('--dry-run: ничего не меняем. Первые 5 email из списка:');
            targets.slice(0, 5).forEach(u => console.log(`  ${u.email}`));
            process.exit(0);
        }

        // Шаг 1: Инвалидация старых payment_method_id + выключение auto_renew
        const { rowCount: invalidated } = await pool.query(`
            UPDATE subscriptions
            SET yookassa_subscription_id = NULL,
                auto_renew = FALSE,
                updated_at = NOW()
            WHERE plan = 'pro'
              AND yookassa_subscription_id IS NOT NULL
        `);
        console.log(`✓ Инвалидировано payment-методов: ${invalidated}`);

        // Шаг 2: Рассылка
        let sent = 0, failed = 0;
        for (const user of targets) {
            try {
                await sendRebindCardEmail(user.email);
                sent++;
                console.log(`  ✓ ${user.email}`);
            } catch (err) {
                failed++;
                console.error(`  ✗ ${user.email}: ${err.message}`);
            }
            // Простой rate-limit, чтобы SMTP не отверг как спам
            await new Promise(r => setTimeout(r, 400));
        }

        console.log(`\nГотово: отправлено ${sent}, ошибок ${failed}`);
        process.exit(failed > 0 ? 1 : 0);
    } catch (err) {
        console.error('Кампания упала:', err);
        process.exit(1);
    }
})();
