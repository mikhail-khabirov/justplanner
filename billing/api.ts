// Billing API Client
import { safeLocalStorage } from '../utils';
import type { Subscription, CreatePaymentResponse } from './types';

const API_URL = import.meta.env.VITE_API_URL || '';

const getAuthHeaders = () => {
    const token = safeLocalStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
};

export const billingApi = {
    // Get current subscription
    async getSubscription(): Promise<Subscription | null> {
        try {
            const response = await fetch(`${API_URL}/api/billing/subscription`, {
                headers: getAuthHeaders()
            });
            if (!response.ok) {
                if (response.status === 404) return null;
                throw new Error('Failed to fetch subscription');
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching subscription:', error);
            return null;
        }
    },

    // Create payment for premium subscription
    async createPayment(): Promise<CreatePaymentResponse> {
        const response = await fetch(`${API_URL}/api/billing/create-payment`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                amount: 99,
                description: 'JustPlanner Premium - ежемесячная подписка'
            })
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Payment creation failed');
        }
        return await response.json();
    },

    // Cancel auto-renewal
    async cancelAutoRenew(): Promise<void> {
        const response = await fetch(`${API_URL}/api/billing/cancel-auto-renew`, {
            method: 'POST',
            headers: getAuthHeaders()
        });
        if (!response.ok) {
            throw new Error('Failed to cancel auto-renewal');
        }
    },

    // Resume auto-renewal
    async resumeAutoRenew(): Promise<void> {
        const response = await fetch(`${API_URL}/api/billing/resume-auto-renew`, {
            method: 'POST',
            headers: getAuthHeaders()
        });
        if (!response.ok) {
            throw new Error('Failed to resume auto-renewal');
        }
    }
};
