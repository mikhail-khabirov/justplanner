// Yookassa Payment Service
import YooKassa from 'yookassa';
import pkg from 'uuid';
const { v4: uuidv4 } = pkg;

// Initialize Yookassa with credentials
const yookassa = new YooKassa({
    shopId: process.env.YOOKASSA_SHOP_ID,
    secretKey: process.env.YOOKASSA_SECRET_KEY
});

const PREMIUM_PRICE = 199; // RUB per month
const ANNUAL_PRICE = 2388; // RUB per year (199 * 12)
const ANNUAL_FULL_PRICE = 1910; // RUB per year (20% discount from 2388)

/**
 * Create a payment for premium subscription
 * @param {number} userId - User ID
 * @param {string} userEmail - User email for receipt
 * @returns {Promise<{confirmationUrl: string, paymentId: string}>}
 */
export async function createTrialPayment(userId, userEmail) {
    const idempotenceKey = uuidv4();

    const payment = await yookassa.createPayment({
        amount: {
            value: '1.00',
            currency: 'RUB'
        },
        capture: true,
        confirmation: {
            type: 'redirect',
            return_url: process.env.YOOKASSA_RETURN_URL || 'https://justplanner.ru'
        },
        description: 'JustPlanner Pro — пробный период 7 дней',
        metadata: {
            userId: userId.toString(),
            type: 'trial'
        },
        receipt: {
            customer: {
                email: userEmail
            },
            items: [{
                description: 'JustPlanner Pro — пробный период 7 дней',
                quantity: '1',
                amount: {
                    value: '1.00',
                    currency: 'RUB'
                },
                vat_code: 1,
                payment_mode: 'full_payment',
                payment_subject: 'service'
            }]
        },
        save_payment_method: true
    }, idempotenceKey);

    return {
        confirmationUrl: payment.confirmation.confirmation_url,
        paymentId: payment.id
    };
}

/**
 * Get payment status from Yookassa
 * @param {string} paymentId - Yookassa payment ID
 */
export async function getPaymentStatus(paymentId) {
    return await yookassa.getPayment(paymentId);
}

/**
 * Create recurring payment using saved payment method
 * @param {string} paymentMethodId - Saved payment method ID
 * @param {number} userId - User ID
 * @param {string} userEmail - User email
 */
export async function createRecurringPayment(paymentMethodId, userId, userEmail) {
    const idempotenceKey = uuidv4();

    const payment = await yookassa.createPayment({
        amount: {
            value: PREMIUM_PRICE.toFixed(2),
            currency: 'RUB'
        },
        capture: true,
        payment_method_id: paymentMethodId,
        description: 'JustPlanner Premium — автопродление подписки',
        metadata: {
            userId: userId.toString(),
            type: 'recurring_payment'
        },
        receipt: {
            customer: {
                email: userEmail
            },
            items: [{
                description: 'JustPlanner Premium — автопродление подписки',
                quantity: '1',
                amount: {
                    value: PREMIUM_PRICE.toFixed(2),
                    currency: 'RUB'
                },
                vat_code: 1,
                payment_mode: 'full_payment',
                payment_subject: 'service'
            }]
        }
    }, idempotenceKey);

    return payment;
}

/**
 * Create annual payment with 50% discount (1199 RUB for 365 days)
 */
export async function createAnnualPayment(userId, userEmail) {
    const idempotenceKey = uuidv4();

    const payment = await yookassa.createPayment({
        amount: {
            value: '1199.00',
            currency: 'RUB'
        },
        capture: true,
        save_payment_method: true,
        confirmation: {
            type: 'redirect',
            return_url: process.env.YOOKASSA_RETURN_URL || 'https://justplanner.ru'
        },
        description: 'JustPlanner Pro — годовая подписка',
        metadata: {
            userId: userId.toString(),
            type: 'annual'
        },
        receipt: {
            customer: {
                email: userEmail
            },
            items: [{
                description: 'JustPlanner Pro — годовая подписка',
                quantity: '1',
                amount: {
                    value: '1199.00',
                    currency: 'RUB'
                },
                vat_code: 1,
                payment_mode: 'full_payment',
                payment_subject: 'service'
            }]
        }
    }, idempotenceKey);

    return {
        confirmationUrl: payment.confirmation.confirmation_url,
        paymentId: payment.id
    };
}

/**
 * Create annual payment with 20% discount (1910 RUB for 365 days) — always available
 */
export async function createAnnualFullPayment(userId, userEmail) {
    const idempotenceKey = uuidv4();

    const payment = await yookassa.createPayment({
        amount: {
            value: ANNUAL_FULL_PRICE.toFixed(2),
            currency: 'RUB'
        },
        capture: true,
        save_payment_method: true,
        confirmation: {
            type: 'redirect',
            return_url: process.env.YOOKASSA_RETURN_URL || 'https://justplanner.ru'
        },
        description: 'JustPlanner Pro — годовая подписка (скидка 20%)',
        metadata: {
            userId: userId.toString(),
            type: 'annual'
        },
        receipt: {
            customer: { email: userEmail },
            items: [{
                description: 'JustPlanner Pro — годовая подписка (скидка 20%)',
                quantity: '1',
                amount: { value: ANNUAL_FULL_PRICE.toFixed(2), currency: 'RUB' },
                vat_code: 1,
                payment_mode: 'full_payment',
                payment_subject: 'service'
            }]
        }
    }, idempotenceKey);

    return {
        confirmationUrl: payment.confirmation.confirmation_url,
        paymentId: payment.id
    };
}

/**
 * Create recurring annual payment using saved payment method (2388 RUB for 365 days)
 */
export async function createAnnualRecurringPayment(paymentMethodId, userId, userEmail) {
    const idempotenceKey = uuidv4();

    const payment = await yookassa.createPayment({
        amount: {
            value: ANNUAL_PRICE.toFixed(2),
            currency: 'RUB'
        },
        capture: true,
        payment_method_id: paymentMethodId,
        description: 'JustPlanner Pro — автопродление годовой подписки',
        metadata: {
            userId: userId.toString(),
            type: 'annual_recurring'
        },
        receipt: {
            customer: {
                email: userEmail
            },
            items: [{
                description: 'JustPlanner Pro — автопродление годовой подписки',
                quantity: '1',
                amount: {
                    value: ANNUAL_PRICE.toFixed(2),
                    currency: 'RUB'
                },
                vat_code: 1,
                payment_mode: 'full_payment',
                payment_subject: 'service'
            }]
        }
    }, idempotenceKey);

    return payment;
}

export async function createCardBindingPayment(userId, userEmail) {
    const idempotenceKey = uuidv4();

    const payment = await yookassa.createPayment({
        amount: {
            value: '1.00',
            currency: 'RUB'
        },
        capture: true,
        confirmation: {
            type: 'redirect',
            return_url: process.env.YOOKASSA_RETURN_URL || 'https://justplanner.ru'
        },
        description: 'Привязка банковской карты JustPlanner',
        metadata: {
            userId: userId.toString(),
            type: 'card_binding'
        },
        receipt: {
            customer: {
                email: userEmail
            },
            items: [{
                description: 'Привязка банковской карты',
                quantity: '1',
                amount: {
                    value: '1.00',
                    currency: 'RUB'
                },
                vat_code: 1,
                payment_mode: 'full_payment',
                payment_subject: 'service'
            }]
        },
        save_payment_method: true
    }, idempotenceKey);

    return {
        confirmationUrl: payment.confirmation.confirmation_url,
        paymentId: payment.id
    };
}

/**
 * Refund a payment
 * @param {string} paymentId - Payment ID
 * @param {string} amount - Amount to refund
 */
export async function refundPayment(paymentId, amount) {
    const idempotenceKey = uuidv4();
    return await yookassa.createRefund(
        paymentId,
        {
            value: amount,
            currency: 'RUB'
        },
        idempotenceKey
    );
}

export default yookassa;
