#!/usr/bin/env python3
"""
JustPlanner Dashboard Metrics Collector
Запускается по крону в 01:00 — собирает данные за вчерашний день.
Собирает данные из Яндекс.Директ и PostgreSQL, пишет в Google Sheets.
Можно запустить с аргументом --date YYYY-MM-DD для заполнения истории.
"""

import os
import sys
import json
import logging
import argparse
import requests
import psycopg2
import gspread
from datetime import date, datetime, timedelta
from dotenv import load_dotenv
from google.oauth2.service_account import Credentials

# ─── Конфиг ───────────────────────────────────────────────────────────────────
load_dotenv()

DATABASE_URL         = os.getenv("DATABASE_URL")
YANDEX_OAUTH_TOKEN   = os.getenv("YANDEX_OAUTH_TOKEN")
YANDEX_CLIENT_LOGIN  = os.getenv("YANDEX_CLIENT_LOGIN")       # логин аккаунта в Директе
GOOGLE_SHEET_ID      = os.getenv("GOOGLE_SHEET_ID")
GOOGLE_CREDS_FILE    = os.getenv("GOOGLE_CREDS_FILE", "google-credentials.json")  # путь к JSON Service Account

# ─── Логирование ──────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("dashboard.log", encoding="utf-8"),
        logging.StreamHandler()
    ]
)
log = logging.getLogger(__name__)

# ─── Дата (по умолчанию — вчера, можно переопределить через --date) ─────────────────
parser = argparse.ArgumentParser()
parser.add_argument("--date", help="Дата в формате YYYY-MM-DD (по умолчанию — вчера)")
args, _ = parser.parse_known_args()

if args.date:
    TARGET_DATE = date.fromisoformat(args.date)
else:
    TARGET_DATE = date.today() - timedelta(days=1)  # вчера

TODAY_STR = TARGET_DATE.strftime("%d.%m.%Y")   # формат для Google Sheets: DD.MM.YYYY
TODAY_ISO = TARGET_DATE.strftime("%Y-%m-%d")   # формат для Яндекс.Директ API


# ─── Источник 1: Яндекс.Директ ───────────────────────────────────────────────

def fetch_yandex_direct() -> dict:
    """Получить клики, CPC и расход за указанный день через Reports API v5."""
    log.info("Запрашиваю данные Яндекс.Директ за %s...", TODAY_ISO)

    url = "https://api.direct.yandex.com/json/v5/reports"
    headers = {
        "Authorization": f"Bearer {YANDEX_OAUTH_TOKEN}",
        "Client-Login": YANDEX_CLIENT_LOGIN,
        "Accept-Language": "ru",
        "processingMode": "auto",
        "returnMoneyInMicros": "false",
        "skipReportHeader": "true",
        "skipColumnHeader": "false",
        "skipReportSummary": "true",
    }
    body = {
        "params": {
            "SelectionCriteria": {
                "DateFrom": TODAY_ISO,
                "DateTo": TODAY_ISO,
            },
            "FieldNames": ["Clicks", "AvgCpc", "Cost"],
            "ReportName": f"daily_metrics_{TODAY_ISO}",
            "ReportType": "ACCOUNT_PERFORMANCE_REPORT",
            "DateRangeType": "CUSTOM_DATE",
            "Format": "TSV",
            "IncludeVAT": "YES",
        }
    }

    try:
        resp = requests.post(url, headers=headers, json=body, timeout=60)

        # Директ может вернуть 201/202 (ещё считает) — ждём синхронно (processingMode=auto)
        if resp.status_code not in (200, 201, 202):
            log.error("Яндекс.Директ вернул статус %s: %s", resp.status_code, resp.text[:300])
            return {"clicks": 0, "avg_cpc": 0.0, "cost": 0.0}

        lines = resp.text.strip().splitlines()
        # Первая строка — заголовки (Clicks\tAvgCpc\tCost), вторая — данные
        if len(lines) < 2:
            log.warning("Яндекс.Директ: нет данных за %s (пустой отчёт)", TODAY_ISO)
            return {"clicks": 0, "avg_cpc": 0.0, "cost": 0.0}

        headers_row = lines[0].split("\t")
        data_row    = lines[1].split("\t")
        row = dict(zip(headers_row, data_row))

        result = {
            "clicks":  int(row.get("Clicks", 0)),
            "avg_cpc": float(row.get("AvgCpc", 0)),
            "cost":    float(row.get("Cost", 0)),
        }
        log.info("Яндекс.Директ: клики=%d, CPC=%.2f₽, расход=%.2f₽",
                 result["clicks"], result["avg_cpc"], result["cost"])
        return result

    except Exception as e:
        log.error("Ошибка при запросе Яндекс.Директ: %s", e)
        return {"clicks": 0, "avg_cpc": 0.0, "cost": 0.0}


# ─── Источник 2: PostgreSQL ───────────────────────────────────────────────────

def fetch_postgres() -> dict:
    """Получить оплаты, регистрации и поведенческие метрики за день (TODAY_ISO)."""
    log.info("Запрашиваю данные из PostgreSQL за %s...", TODAY_ISO)

    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur  = conn.cursor()

        # 1. Оплаты за день по типу (из таблицы payments)
        cur.execute("""
            SELECT
                COUNT(*) FILTER (WHERE description = 'Trial 7 days')                                          AS trial,
                SUM(amount) FILTER (WHERE description = 'Trial 7 days')                                       AS trial_sum,

                COUNT(*) FILTER (WHERE description = 'Premium subscription')                                   AS monthly,
                SUM(amount) FILTER (WHERE description = 'Premium subscription')                                AS monthly_sum,

                COUNT(*) FILTER (WHERE description = 'Annual Pro 365 days')                                   AS annual,
                SUM(amount) FILTER (WHERE description = 'Annual Pro 365 days')                                AS annual_sum,

                COUNT(*) FILTER (WHERE description LIKE '%%автопродление%%' OR description LIKE '%%после триала%%') AS renewal,
                SUM(amount) FILTER (WHERE description LIKE '%%автопродление%%' OR description LIKE '%%после триала%%') AS renewal_sum,

                COUNT(*) FILTER (WHERE status = 'succeeded')                                                  AS total_paying,
                COALESCE(SUM(amount) FILTER (WHERE status = 'succeeded'), 0)                                  AS revenue
            FROM payments
            WHERE status = 'succeeded'
              AND created_at::date = %s
        """, (TODAY_ISO,))

        row = cur.fetchone()
        trial_count   = row[0] or 0
        trial_sum     = float(row[1] or 0)
        monthly_count = row[2] or 0
        monthly_sum   = float(row[3] or 0)
        annual_count  = row[4] or 0
        annual_sum    = float(row[5] or 0)
        renewal_count = row[6] or 0
        renewal_sum   = float(row[7] or 0)
        total_paying  = row[8] or 0
        revenue       = float(row[9] or 0)

        mrr = round(revenue, 2)

        # 2. Новые регистрации за день
        cur.execute("""
            SELECT COUNT(*) FROM users
            WHERE is_verified = true
              AND created_at::date = %s
        """, (TODAY_ISO,))
        registrations = cur.fetchone()[0] or 0

        # 3. DAU — уникальные пользователи с активностью за день
        cur.execute("""
            SELECT COUNT(*) FROM users
            WHERE last_login::date = %s
        """, (TODAY_ISO,))
        dau = cur.fetchone()[0] or 0

        # 4. Активные Pro-подписки на конец дня
        #    Считаем подписки, созданные до этой даты включительно,
        #    у которых period_end >= дата (т.е. ещё действовали)
        cur.execute("""
            SELECT COUNT(*) FROM subscriptions
            WHERE plan = 'pro'
              AND created_at::date <= %s
              AND current_period_end >= %s
        """, (TODAY_ISO, TODAY_ISO))
        active_subs = cur.fetchone()[0] or 0

        # 5. Задачи создано за день
        cur.execute("""
            SELECT COUNT(*) FROM tasks
            WHERE created_at::date = %s
        """, (TODAY_ISO,))
        tasks_created = cur.fetchone()[0] or 0

        # 6. Retention D1 — % юзеров зарегистрированных вчера, вернувшихся сегодня
        cur.execute("""
            SELECT
                COUNT(*) FILTER (WHERE last_login::date >= created_at::date + 1) AS returned,
                COUNT(*) AS total
            FROM users
            WHERE is_verified = true
              AND created_at::date = %s::date - 1
        """, (TODAY_ISO,))
        ret_row = cur.fetchone()
        ret_d1 = round(100.0 * (ret_row[0] or 0) / ret_row[1], 1) if ret_row[1] else 0

        # 7. Retention D7 — % юзеров зарегистрированных 7 дней назад, вернувшихся
        cur.execute("""
            SELECT
                COUNT(*) FILTER (WHERE last_login::date >= created_at::date + 7) AS returned,
                COUNT(*) AS total
            FROM users
            WHERE is_verified = true
              AND created_at::date = %s::date - 7
        """, (TODAY_ISO,))
        ret_row7 = cur.fetchone()
        ret_d7 = round(100.0 * (ret_row7[0] or 0) / ret_row7[1], 1) if ret_row7[1] else 0

        # 8. Trial→Pro — кол-во юзеров, у которых триал закончился и они оплатили
        #    Считаем: юзеры с is_trial=false, plan='pro', у которых есть платёж
        #    типа "Premium subscription" или "Annual" или "автопродление" за этот день
        cur.execute("""
            SELECT COUNT(DISTINCT p.user_id)
            FROM payments p
            JOIN subscriptions s ON s.user_id = p.user_id
            WHERE p.status = 'succeeded'
              AND p.created_at::date = %s
              AND p.description IN ('Premium subscription', 'Annual Pro 365 days')
              AND s.is_trial = false
        """, (TODAY_ISO,))
        trial_to_pro = cur.fetchone()[0] or 0

        # 9. Churn — подписки отменённые за день (status стал cancelled)
        cur.execute("""
            SELECT COUNT(*) FROM subscriptions
            WHERE status = 'cancelled'
              AND updated_at::date = %s
        """, (TODAY_ISO,))
        churn = cur.fetchone()[0] or 0

        cur.close()
        conn.close()

        log.info(
            "PostgreSQL: триал=%d(%.0f₽), мес=%d(%.0f₽), год=%d(%.0f₽), продл=%d(%.0f₽), "
            "рег=%d, выручка=%.2f₽, DAU=%d, подписки=%d, задачи=%d, "
            "retD1=%.1f%%, retD7=%.1f%%, trial→pro=%d, churn=%d",
            trial_count, trial_sum, monthly_count, monthly_sum,
            annual_count, annual_sum, renewal_count, renewal_sum,
            registrations, mrr, dau, active_subs, tasks_created,
            ret_d1, ret_d7, trial_to_pro, churn
        )

        return {
            "trial":         trial_count,
            "monthly":       monthly_count,
            "annual":        annual_count,
            "renewal":       renewal_count,
            "total_paying":  total_paying,
            "registrations": registrations,
            "mrr":           mrr,
            "dau":           dau,
            "active_subs":   active_subs,
            "tasks_created": tasks_created,
            "ret_d1":        ret_d1,
            "ret_d7":        ret_d7,
            "trial_to_pro":  trial_to_pro,
            "churn":         churn,
        }

    except Exception as e:
        log.error("Ошибка при запросе PostgreSQL: %s", e)
        return {
            "trial": 0, "monthly": 0, "annual": 0, "renewal": 0,
            "total_paying": 0, "registrations": 0, "mrr": 0.0,
            "dau": 0, "active_subs": 0, "tasks_created": 0,
            "ret_d1": 0, "ret_d7": 0, "trial_to_pro": 0, "churn": 0,
        }


# ─── Google Sheets ────────────────────────────────────────────────────────────

def write_to_sheets(direct: dict, pg: dict) -> None:
    """Найти строку с датой в колонке A и записать метрики.

    Колонки, заполняемые скриптом:
        C–H:  Выручка, Триал, Месячных, Годовых, Продлений, Клики
        J–K:  Расход, Рег
        Q–W:  DAU, Подписки, Задачи, Ret D1%, Ret D7%, Trial→Pro, Churn

    Колонки с формулами (НЕ трогаем):
        B:    Прибыль (формула)
        I:    CPC  (формула)
        L–P:  CAC, Клик→Рег%, reg->trial, trial->full, reg->50 (формулы)
    """
    log.info("Записываю данные в Google Sheets (sheet_id=%s)...", GOOGLE_SHEET_ID)

    try:
        scopes = [
            "https://www.googleapis.com/auth/spreadsheets",
            "https://www.googleapis.com/auth/drive",
        ]
        creds  = Credentials.from_service_account_file(GOOGLE_CREDS_FILE, scopes=scopes)
        client = gspread.authorize(creds)
        sheet  = client.open_by_key(GOOGLE_SHEET_ID).sheet1

        # B–G: данные из PostgreSQL + Яндекс.Директ
        values_bg = [
            pg["mrr"],
            pg["trial"],
            pg["monthly"],
            pg["annual"],
            pg["renewal"],
            direct["clicks"],
        ]
        # I–J: Расход (Директ), Регистрации (PostgreSQL)
        values_ij = [
            direct["cost"],
            pg["registrations"],
        ]
        # P–V: поведенческие метрики (PostgreSQL)
        values_pv = [
            pg["dau"],
            pg["active_subs"],
            pg["tasks_created"],
            pg["ret_d1"],
            pg["ret_d7"],
            pg["trial_to_pro"],
            pg["churn"],
        ]

        # Проверяем/обновляем заголовки Q1:W1 (новые метрики)
        headers_row = sheet.row_values(1)
        new_headers = ['DAU', 'Подписки', 'Задачи', 'Ret D1%', 'Ret D7%', 'Trial→Pro', 'Churn']
        # Q = колонка 17, W = колонка 23 → Q1:W1
        if len(headers_row) < 23 or headers_row[16:23] != new_headers:
            sheet.update([new_headers], 'Q1:W1')
            log.info('Заголовки Q1:W1 обновлены')

        col_a = sheet.col_values(1)
        try:
            row_index = col_a.index(TODAY_STR) + 1  # gspread: 1-based
            log.info("Нашёл строку с датой %s: строка %d", TODAY_STR, row_index)
        except ValueError:
            row_index = len(col_a) + 1
            sheet.update_cell(row_index, 1, TODAY_STR)
            log.info("Дата %s не найдена, добавляю новую строку %d", TODAY_STR, row_index)

        # C–H: Выручка, Триал, Месячных, Годовых, Продлений, Клики (B=Прибыль — формула, не трогаем)
        sheet.update([values_bg], f"C{row_index}:H{row_index}")
        # J–K: Расход, Рег (I=CPC — формула, не трогаем)
        sheet.update([values_ij], f"J{row_index}:K{row_index}")
        # Q–W: DAU, Подписки, Задачи, Ret D1%, Ret D7%, Trial→Pro, Churn (L–P — формулы, не трогаем)
        sheet.update([values_pv], f"Q{row_index}:W{row_index}")

        log.info(
            "Записано строка %d (C:H, J:K, Q:W): выр=%.2f₽, триал=%d, мес=%d, год=%d, продл=%d, "
            "клики=%d, расход=%.2f, рег=%d | "
            "DAU=%d, подписки=%d, задачи=%d, retD1=%.1f%%, retD7=%.1f%%, t→p=%d, churn=%d",
            row_index, *values_bg, *values_ij, *values_pv
        )

    except Exception as e:
        log.error("Ошибка при записи в Google Sheets: %s", e)
        raise


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    log.info("=" * 60)
    log.info("Старт сбора метрик за %s (%s)", TODAY_STR, TARGET_DATE)
    log.info("=" * 60)

    direct = fetch_yandex_direct()
    pg     = fetch_postgres()
    write_to_sheets(direct, pg)

    log.info("Готово. Метрики за %s записаны.", TODAY_STR)


if __name__ == "__main__":
    main()
