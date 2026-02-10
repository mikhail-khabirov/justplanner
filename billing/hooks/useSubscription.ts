import { useState, useEffect, useCallback, useMemo } from 'react';
import { billingApi } from '../api';
import type { Subscription, BillingState } from '../types';

const FREE_TASK_LIMIT = 5;

export function useSubscription(taskCount: number = 0): BillingState & {
    refresh: () => Promise<void>;
    cancelAutoRenew: () => Promise<void>;
    resumeAutoRenew: () => Promise<void>;
} {
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchSubscription = useCallback(async () => {
        setIsLoading(true);
        try {
            const sub = await billingApi.getSubscription();
            setSubscription(sub);
        } catch (error) {
            console.error('Failed to fetch subscription:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSubscription();
    }, [fetchSubscription]);

    const isPremium = useMemo(() => {
        if (!subscription) return false;
        return subscription.plan === 'pro' && subscription.status === 'active';
    }, [subscription]);

    const canAddTask = useMemo(() => {
        if (isPremium) return true;
        return taskCount < FREE_TASK_LIMIT;
    }, [isPremium, taskCount]);

    const cancelAutoRenew = useCallback(async () => {
        await billingApi.cancelAutoRenew();
        await fetchSubscription();
    }, [fetchSubscription]);

    const resumeAutoRenew = useCallback(async () => {
        await billingApi.resumeAutoRenew();
        await fetchSubscription();
    }, [fetchSubscription]);

    return {
        subscription,
        isLoading,
        isPremium,
        canAddTask,
        taskLimit: FREE_TASK_LIMIT,
        refresh: fetchSubscription,
        cancelAutoRenew,
        resumeAutoRenew
    };
}
