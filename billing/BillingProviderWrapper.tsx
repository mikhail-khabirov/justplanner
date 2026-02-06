import React, { ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { BillingProvider } from './BillingContext';

interface BillingProviderWrapperProps {
    children: ReactNode;
}

/**
 * Wrapper component that combines BillingProvider with useAuth
 * to automatically pass isAuthenticated prop
 */
export const BillingProviderWrapper: React.FC<BillingProviderWrapperProps> = ({ children }) => {
    const { isAuthenticated } = useAuth();

    return (
        <BillingProvider isAuthenticated={isAuthenticated}>
            {children}
        </BillingProvider>
    );
};
