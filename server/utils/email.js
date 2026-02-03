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
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #26A69A;">Добро пожаловать в JustPlanner! 🚀</h1>
            <p>Мы рады, что вы с нами!</p>
            <p>Теперь вы можете планировать свои задачи легко и удобно.</p>
            <p>Если у вас возникнут вопросы, просто ответьте на это письмо.</p>
            <br>
            <p>С наилучшими ожиданиями,<br>Команда JustPlanner</p>
        </div>
    `;
    const text = `Добро пожаловать в JustPlanner!\nМы рады, что вы с нами! Теперь вы можете планировать свои задачи легко и удобно.\n\nС наилучшими ожиданиями,\nКоманда JustPlanner`;
    return sendEmail(email, 'Добро пожаловать в JustPlanner!', html, text);
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
