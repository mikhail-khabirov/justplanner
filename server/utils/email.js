import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.beget.com',
    port: process.env.SMTP_PORT || 465,
    secure: true, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

// Helper to send email
const sendEmail = async (to, subject, html, text) => {
    try {
        const info = await transporter.sendMail({
            from: `JustPlanner <${process.env.SMTP_USER}>`,
            to,
            subject,
            html,
            text // Plain text version for better deliverability
        });
        console.log('Email sent: %s', info.messageId);
        return true;
    } catch (error) {
        console.error('Error sending email:', error);
        return false;
    }
};

export const sendVerificationCode = async (email, code) => {
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2563eb;">Подтверждение регистрации</h1>
            <p>Здравствуйте!</p>
            <p>Ваш код для подтверждения почты в JustPlanner:</p>
            <h2 style="background-color: #f3f4f6; padding: 10px; border-radius: 5px; text-align: center; letter-spacing: 5px;">${code}</h2>
            <p>Если вы не регистрировались, просто игнорируйте это письмо.</p>
        </div>
    `;
    const text = `Ваш код подтверждения JustPlanner: ${code}\nЕсли вы не регистрировались, просто игнорируйте это письмо.`;
    return sendEmail(email, 'Код подтверждения JustPlanner', html, text);
};

export const sendWelcomeEmail = async (email) => {
    const html = `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0f4f8; padding: 32px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
    <tr>
        <td align="center">
            <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
                <tr>
                    <td style="background: linear-gradient(135deg, #1a9688 0%, #26A69A 100%); padding: 40px 40px 32px; text-align: center;">
                        <div style="font-size: 28px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">📋 JustPlanner</div>
                        <div style="margin-top: 16px; font-size: 22px; font-weight: 600; color: #ffffff;">Добро пожаловать!</div>
                        <div style="margin-top: 8px; font-size: 15px; color: rgba(255,255,255,0.7);">Ваш новый способ планировать неделю</div>
                    </td>
                </tr>
                <tr>
                    <td style="padding: 32px 40px 0;">
                        <p style="margin: 0; font-size: 16px; color: #334155; line-height: 1.6;">Привет! �</p>
                        <p style="margin: 12px 0 0; font-size: 16px; color: #334155; line-height: 1.6;">Мы рады, что вы выбрали JustPlanner — простой и удобный планировщик задач на неделю. Никаких сложных настроек, только то, что действительно нужно.</p>
                    </td>
                </tr>
                <tr>
                    <td style="padding: 28px 40px 0;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%); border-radius: 14px; overflow: hidden;">
                            <tr>
                                <td style="padding: 28px 28px 24px; text-align: center;">
                                    <div style="font-size: 32px; margin-bottom: 8px;">🎁</div>
                                    <div style="font-size: 20px; font-weight: 700; color: #ffffff; margin-bottom: 6px;">Скидка 50% на годовую подписку</div>
                                    <div style="font-size: 14px; color: rgba(255,255,255,0.9); margin-bottom: 6px;">Только для новых пользователей</div>
                                    <div style="display: inline-block; background-color: rgba(0,0,0,0.2); border-radius: 8px; padding: 8px 18px; margin-bottom: 16px;">
                                        <span style="font-size: 15px; font-weight: 700; color: #ffffff;">⏰ Действует 24 часа с момента регистрации</span>
                                    </div>
                                    <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto 16px;">
                                        <tr>
                                            <td style="font-size: 16px; color: rgba(255,255,255,0.7); text-decoration: line-through; padding-right: 12px;">1 188 ₽/год</td>
                                            <td style="font-size: 24px; font-weight: 800; color: #ffffff;">594 ₽/год</td>
                                        </tr>
                                    </table>
                                    <div style="margin-bottom: 6px;">
                                        <a href="https://justplanner.ru?annualOffer=1" style="display: inline-block; background-color: #ffffff; color: #ea580c; font-size: 16px; font-weight: 700; padding: 14px 36px; border-radius: 10px; text-decoration: none;">Получить скидку →</a>
                                    </div>
                                    <div style="font-size: 12px; color: rgba(255,255,255,0.7); margin-top: 12px;">Это всего 49,5 ₽/мес вместо 99 ₽/мес</div>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
                <tr>
                    <td style="padding: 28px 40px 0;">
                        <div style="font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 16px;">⚡ Что умеет JustPlanner</div>
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                                <td style="padding: 12px 16px; background-color: #f8fafc; border-radius: 10px;">
                                    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                                        <td style="vertical-align: top; padding-right: 12px; font-size: 20px;">📅</td>
                                        <td><div style="font-size: 15px; font-weight: 600; color: #0f172a;">Планирование по дням</div><div style="font-size: 13px; color: #64748b; margin-top: 2px;">Раскидывайте задачи по дням недели — всё наглядно</div></td>
                                    </tr></table>
                                </td>
                            </tr>
                            <tr><td style="height: 8px;"></td></tr>
                            <tr>
                                <td style="padding: 12px 16px; background-color: #f8fafc; border-radius: 10px;">
                                    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                                        <td style="vertical-align: top; padding-right: 12px; font-size: 20px;">🔄</td>
                                        <td><div style="font-size: 15px; font-weight: 600; color: #0f172a;">Перенос и повторы</div><div style="font-size: 13px; color: #64748b; margin-top: 2px;">Перетаскивайте задачи между днями, настраивайте повторения</div></td>
                                    </tr></table>
                                </td>
                            </tr>
                            <tr><td style="height: 8px;"></td></tr>
                            <tr>
                                <td style="padding: 12px 16px; background-color: #f8fafc; border-radius: 10px;">
                                    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                                        <td style="vertical-align: top; padding-right: 12px; font-size: 20px;">🎨</td>
                                        <td><div style="font-size: 15px; font-weight: 600; color: #0f172a;">Цвета и категории</div><div style="font-size: 13px; color: #64748b; margin-top: 2px;">Выделяйте задачи цветом — работа, личное, спорт</div></td>
                                    </tr></table>
                                </td>
                            </tr>
                            <tr><td style="height: 8px;"></td></tr>
                            <tr>
                                <td style="padding: 12px 16px; background-color: #f8fafc; border-radius: 10px;">
                                    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                                        <td style="vertical-align: top; padding-right: 12px; font-size: 20px;">📄</td>
                                        <td><div style="font-size: 15px; font-weight: 600; color: #0f172a;">Экспорт в PDF</div><div style="font-size: 13px; color: #64748b; margin-top: 2px;">Распечатайте план на неделю или сохраните на телефон</div></td>
                                    </tr></table>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
                <tr>
                    <td style="padding: 28px 40px 0;">
                        <div style="font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 16px;">🚀 Как начать</div>
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                            <tr><td style="padding: 10px 0;"><table role="presentation" cellpadding="0" cellspacing="0"><tr>
                                <td style="vertical-align: top; padding-right: 14px;"><div style="width: 28px; height: 28px; border-radius: 50%; background: #26A69A; color: white; font-size: 14px; font-weight: 700; text-align: center; line-height: 28px;">1</div></td>
                                <td style="font-size: 15px; color: #334155; line-height: 1.5; padding-top: 3px;"><strong>Создайте первую задачу</strong> — нажмите + или введите текст в поле быстрого добавления</td>
                            </tr></table></td></tr>
                            <tr><td style="padding: 10px 0;"><table role="presentation" cellpadding="0" cellspacing="0"><tr>
                                <td style="vertical-align: top; padding-right: 14px;"><div style="width: 28px; height: 28px; border-radius: 50%; background: #26A69A; color: white; font-size: 14px; font-weight: 700; text-align: center; line-height: 28px;">2</div></td>
                                <td style="font-size: 15px; color: #334155; line-height: 1.5; padding-top: 3px;"><strong>Распределите по дням</strong> — перетащите задачи в нужные колонки</td>
                            </tr></table></td></tr>
                            <tr><td style="padding: 10px 0;"><table role="presentation" cellpadding="0" cellspacing="0"><tr>
                                <td style="vertical-align: top; padding-right: 14px;"><div style="width: 28px; height: 28px; border-radius: 50%; background: #26A69A; color: white; font-size: 14px; font-weight: 700; text-align: center; line-height: 28px;">3</div></td>
                                <td style="font-size: 15px; color: #334155; line-height: 1.5; padding-top: 3px;"><strong>Отмечайте выполненное</strong> — кликните по задаче, чтобы завершить её ✓</td>
                            </tr></table></td></tr>
                        </table>
                    </td>
                </tr>
                <tr>
                    <td style="padding: 28px 40px; text-align: center;">
                        <a href="https://justplanner.ru" style="display: inline-block; background-color: #26A69A; color: #ffffff; font-size: 16px; font-weight: 600; padding: 14px 40px; border-radius: 10px; text-decoration: none;">Открыть JustPlanner</a>
                    </td>
                </tr>
                <tr>
                    <td style="padding: 0 40px 32px; text-align: center;">
                        <div style="border-top: 1px solid #e2e8f0; padding-top: 20px;">
                            <p style="margin: 0; font-size: 13px; color: #94a3b8; line-height: 1.5;">Есть вопросы? Просто ответьте на это письмо — мы всегда на связи.</p>
                            <p style="margin: 10px 0 0; font-size: 13px; color: #94a3b8;">С наилучшими, Команда JustPlanner</p>
                        </div>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>
    `;
    const text = `Добро пожаловать в JustPlanner!\n\nМы рады, что вы с нами! JustPlanner — простой и удобный планировщик задач на неделю.\n\n🎁 Скидка 50% на годовую подписку — только 24 часа! 594 ₽/год вместо 1188 ₽/год.\nПолучить: https://justplanner.ru?annualOffer=1\n\nКак начать:\n1. Создайте первую задачу\n2. Распределите по дням\n3. Отмечайте выполненное\n\nС наилучшими, Команда JustPlanner`;
    return sendEmail(email, 'Добро пожаловать в JustPlanner! 🎁 Скидка 50% внутри', html, text);
};

export const sendAnnualOfferReminder = async (email) => {
    const html = `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0f4f8; padding: 32px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
    <tr>
        <td align="center">
            <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
                <tr>
                    <td style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); padding: 36px 40px 28px; text-align: center;">
                        <div style="font-size: 40px; margin-bottom: 10px;">⏰</div>
                        <div style="font-size: 24px; font-weight: 700; color: #ffffff;">Осталось менее 5 часов!</div>
                        <div style="margin-top: 8px; font-size: 15px; color: rgba(255,255,255,0.85);">Ваша скидка 50% скоро сгорит</div>
                    </td>
                </tr>
                <tr>
                    <td style="padding: 28px 40px 0;">
                        <p style="margin: 0; font-size: 16px; color: #334155; line-height: 1.6;">Привет!</p>
                        <p style="margin: 12px 0 0; font-size: 16px; color: #334155; line-height: 1.6;">Напоминаем, что ваше специальное предложение — <strong>годовая подписка JustPlanner Pro со скидкой 50%</strong> — действует ещё совсем немного.</p>
                    </td>
                </tr>
                <tr>
                    <td style="padding: 24px 40px 0;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%); border-radius: 14px; overflow: hidden;">
                            <tr>
                                <td style="padding: 24px 28px; text-align: center;">
                                    <div style="display: inline-block; background-color: rgba(0,0,0,0.2); border-radius: 8px; padding: 10px 20px; margin-bottom: 16px;">
                                        <span style="font-size: 16px; font-weight: 700; color: #ffffff;">⏰ Осталось менее 5 часов!</span>
                                    </div>
                                    <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto 16px;">
                                        <tr>
                                            <td style="font-size: 16px; color: rgba(255,255,255,0.7); text-decoration: line-through; padding-right: 12px;">1 188 ₽/год</td>
                                            <td style="font-size: 24px; font-weight: 800; color: #ffffff;">594 ₽/год</td>
                                        </tr>
                                    </table>
                                    <div>
                                        <a href="https://justplanner.ru?annualOffer=1" style="display: inline-block; background-color: #ffffff; color: #ea580c; font-size: 16px; font-weight: 700; padding: 14px 36px; border-radius: 10px; text-decoration: none;">Получить скидку →</a>
                                    </div>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
                <tr>
                    <td style="padding: 24px 40px 0;">
                        <p style="margin: 0; font-size: 15px; color: #64748b; line-height: 1.6;">После истечения срока цена вернётся к стандартной — 99 ₽/мес (1 188 ₽/год).</p>
                    </td>
                </tr>
                <tr>
                    <td style="padding: 24px 40px; text-align: center;">
                        <a href="https://justplanner.ru?annualOffer=1" style="display: inline-block; background-color: #26A69A; color: #ffffff; font-size: 16px; font-weight: 600; padding: 14px 40px; border-radius: 10px; text-decoration: none;">Открыть JustPlanner</a>
                    </td>
                </tr>
                <tr>
                    <td style="padding: 0 40px 32px; text-align: center;">
                        <div style="border-top: 1px solid #e2e8f0; padding-top: 20px;">
                            <p style="margin: 0; font-size: 13px; color: #94a3b8; line-height: 1.5;">Есть вопросы? Просто ответьте на это письмо.</p>
                            <p style="margin: 10px 0 0; font-size: 13px; color: #94a3b8;">Команда JustPlanner</p>
                        </div>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>
    `;
    const text = `⏰ Осталось менее 5 часов!\n\nВаша скидка 50% на годовую подписку JustPlanner Pro скоро сгорит.\n594 ₽/год вместо 1188 ₽/год.\n\nПолучить: https://justplanner.ru?annualOffer=1\n\nПосле истечения срока цена вернётся к стандартной — 99 ₽/мес.\n\nКоманда JustPlanner`;
    return sendEmail(email, '⏰ Осталось 5 часов — скидка 50% сгорает!', html, text);
};

export const sendPasswordResetEmail = async (email, link) => {
    const text = `
Привет!

Вы запросили сброс пароля для JustPlanner. Перейдите по ссылке ниже, чтобы создать новый пароль:

${link}

Ссылка действительна в течение 1 часа.
Если вы этого не делали, просто проигнорируйте это письмо.
    `;

    const html = `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px;">
        <h2 style="color: #26A69A;">Сброс пароля</h2>
        <p>Вы запросили сброс пароля для JustPlanner.</p>
        <p>Нажмите на кнопку ниже, чтобы создать новый пароль:</p>
        <div style="margin: 20px 0;">
            <a href="${link}" style="background-color: #26A69A; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Сбросить пароль</a>
        </div>
        <p style="color: #666; font-size: 14px;">Или скопируйте ссылку в браузер:<br>${link}</p>
        <p style="color: #666; font-size: 14px; margin-top: 20px;">Ссылка действительна 1 час. Если вы не запрашивали сброс, проигнорируйте это письмо.</p>
    </div>
    `;

    await sendEmail(email, 'Сброс пароля JustPlanner', text, html);
};
