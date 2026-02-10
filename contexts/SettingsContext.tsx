import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserSettings } from '../types';
import { useAuth } from './AuthContext';
import { safeLocalStorage } from '../utils';

interface SettingsContextType {
    settings: UserSettings;
    updateSettings: (newSettings: Partial<UserSettings>) => void;
    isLoading: boolean;
}

const defaultSettings: UserSettings = {
    dayStartHour: 7
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { isAuthenticated, token } = useAuth();
    const [settings, setSettings] = useState<UserSettings>(defaultSettings);
    const [isLoading, setIsLoading] = useState(false);

    // Load settings from server when authenticated
    useEffect(() => {
        if (isAuthenticated && token) {
            setIsLoading(true);
            fetch('/api/settings', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
                .then(res => res.json())
                .then(data => {
                    if (data.settings) {
                        setSettings(data.settings);
                    }
                })
                .catch(console.error)
                .finally(() => setIsLoading(false));
        } else {
            // Load from safeLocalStorage for non-authenticated users
            const saved = safeLocalStorage.getItem('justplanner_settings');
            if (saved) {
                try {
                    setSettings(JSON.parse(saved));
                } catch (e) {
                    console.error('Failed to parse settings:', e);
                }
            }
        }
    }, [isAuthenticated, token]);

    const updateSettings = (newSettings: Partial<UserSettings>) => {
        const updated = { ...settings, ...newSettings };
        setSettings(updated);

        if (isAuthenticated && token) {
            // Save to server
            fetch('/api/settings', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updated)
            }).catch(console.error);
        } else {
            // Save to safeLocalStorage
            safeLocalStorage.setItem('justplanner_settings', JSON.stringify(updated));
        }
    };

    return (
        <SettingsContext.Provider value={{ settings, updateSettings, isLoading }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};
