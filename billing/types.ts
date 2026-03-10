// Billing Types

export type PlanType = 'free' | 'pro';
export type SubscriptionStatus = 'active' | 'cancelled' | 'past_due';
export type PaymentStatus = 'pending' | 'succeeded' | 'cancelled' | 'refunded';

export interface Subscription {
    id: number;
    userId: number;
    plan: PlanType;
    status: SubscriptionStatus;
    yookassaSubscriptionId?: string;
    currentPeriodEnd?: string; // ISO date
    autoRenew: boolean;
    paymentMethodTitle?: string; // e.g., "Bank card *4444"
    isTrial?: boolean;
    isAnnual?: boolean;
    createdAt: string;
}

export interface Payment {
    id: number;
    userId: number;
    yookassaPaymentId: string;
    amount: number;
    currency: string;
    status: PaymentStatus;
    description?: string;
    createdAt: string;
}

export interface BillingState {
    subscription: Subscription | null;
    isLoading: boolean;
    isPremium: boolean;
    canAddTask: boolean;
}

export interface CreatePaymentResponse {
    confirmationUrl: string;
    paymentId: string;
}
