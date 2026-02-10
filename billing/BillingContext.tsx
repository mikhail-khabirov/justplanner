import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { billingApi } from './api';
import type { Subscription, PlanType } from './types';

const FREE_TASK_LIMIT = 10;

interface BillingContextType {
    subscription: Subscription | null;
    isLoading: boolean;
    isPremium: boolean;
    plan: PlanType;
    canAddTask: (currentTaskCount: number) => boolean;
    taskLimit: number;
    refresh: () => Promise<void>;
    cancelAutoRenew: () => Promise<void>;
    resumeAutoRenew: () => Promise<void>;
    unbindCard: () => Promise<void>;
    startPayment: () => Promise<string>; // returns confirmation URL
}

const BillingContext = createContext<BillingContextType | undefined>(undefined);

interface BillingProviderProps {
    children: ReactNode;
    isAuthenticated: boolean;
}

export const BillingProvider: React.FC<BillingProviderProps> = ({ children, isAuthenticated }) => {
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const fetchSubscription = useCallback(async () => {
        if (!isAuthenticated) {
            setSubscription(null);
            return;
        }
        setIsLoading(true);
        try {
            const sub = await billingApi.getSubscription();
            setSubscription(sub);
        } catch (error) {
            console.error('Failed to fetch subscription:', error);
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated]);

    useEffect(() => {
        const init = async () => {
            await fetchSubscription();
            // After fetching subscription, verify any pending payments (webhook fallback)
            if (isAuthenticated) {
                try {
                    const result = await billingApi.verifyPayment();
                    if (result.status === 'activated') {
                        // Payment was confirmed — refresh subscription data
                        await fetchSubscription();
                    }
                } catch (e) {
                    // Silently ignore — no pending payment or verification failed
                }
            }
        };
        init();
    }, [fetchSubscription, isAuthenticated]);

    const isPremium = useMemo(() => {
        if (!subscription) return false;
        return subscription.plan === 'pro' && subscription.status === 'active';
    }, [subscription]);

    const plan = useMemo((): PlanType => {
        return isPremium ? 'pro' : 'free';
    }, [isPremium]);

    const canAddTask = useCallback((currentTaskCount: number): boolean => {
        if (isPremium) return true;
        return currentTaskCount < FREE_TASK_LIMIT;
    }, [isPremium]);

    const cancelAutoRenew = useCallback(async () => {
        await billingApi.cancelAutoRenew();
        await fetchSubscription();
    }, [fetchSubscription]);

    const resumeAutoRenew = useCallback(async () => {
        await billingApi.resumeAutoRenew();
        await fetchSubscription();
    }, [fetchSubscription]);

    const unbindCard = useCallback(async () => {
        await billingApi.unbindCard();
        await fetchSubscription();
    }, [fetchSubscription]);

    const startPayment = useCallback(async (): Promise<string> => {
        const response = await billingApi.createPayment();
        return response.confirmationUrl;
    }, []);

    const value = useMemo(() => ({
        subscription,
        isLoading,
        isPremium,
        plan,
        canAddTask,
        taskLimit: FREE_TASK_LIMIT,
        refresh: fetchSubscription,
        cancelAutoRenew,
        resumeAutoRenew,
        unbindCard,
        startPayment
    }), [subscription, isLoading, isPremium, plan, canAddTask, fetchSubscription, cancelAutoRenew, resumeAutoRenew, unbindCard, startPayment]);

    return (
        <BillingContext.Provider value={value}>
            {children}
        </BillingContext.Provider>
    );
};

export const useBilling = (): BillingContextType => {
    const context = useContext(BillingContext);
    if (!context) {
        throw new Error('useBilling must be used within a BillingProvider');
    }
    return context;
};
