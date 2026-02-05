import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { safeLocalStorage } from '../utils';

interface User {
    id: string;
    email: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string) => Promise<{ needVerification: boolean }>;
    verifyEmail: (email: string, code: string) => Promise<void>;
    forgotPassword: (email: string) => Promise<void>;
    resetPassword: (token: string, password: string) => Promise<void>;
    logout: () => void;
    setAuthFromToken: (token: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = '/api';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(() => safeLocalStorage.getItem('token'));
    const [isLoading, setIsLoading] = useState(true);

    // Check token on mount or get token from URL (Google OAuth redirect)
    useEffect(() => {
        const checkAuth = async () => {
            // Check for token in URL (from Google OAuth)
            const urlParams = new URLSearchParams(window.location.search);
            const urlToken = urlParams.get('token');

            if (urlToken) {
                safeLocalStorage.setItem('token', urlToken);
                setToken(urlToken);
                // Clean URL
                window.history.replaceState({}, document.title, window.location.pathname);
            }

            const storedToken = urlToken || safeLocalStorage.getItem('token');

            if (storedToken) {
                try {
                    const response = await fetch(`${API_URL}/auth/me`, {
                        headers: { 'Authorization': `Bearer ${storedToken}` }
                    });

                    if (response.ok) {
                        const data = await response.json();
                        setUser(data.user);
                        setToken(storedToken);
                    } else {
                        safeLocalStorage.removeItem('token');
                        setToken(null);
                    }
                } catch (error) {
                    console.error('Auth check failed:', error);
                }
            }

            setIsLoading(false);
        };

        checkAuth();
    }, []);

    const login = async (email: string, password: string) => {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            if (response.status === 403 && data.needVerification) {
                // Throw special error object
                const error = new Error(data.error);
                (error as any).needVerification = true;
                throw error;
            }
            throw new Error(data.error || 'Ошибка при входе');
        }

        safeLocalStorage.setItem('token', data.token);
        setToken(data.token);
        setUser(data.user);
    };

    const register = async (email: string, password: string) => {
        // Extract UTMs from cookies
        const getCookie = (name: string) => {
            const value = `; ${document.cookie}`;
            const parts = value.split(`; ${name}=`);
            if (parts.length === 2) return parts.pop()?.split(';').shift();
            return null;
        };

        const utmSource = getCookie('utm_source');
        const utmCampaign = getCookie('utm_campaign');

        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, utmSource, utmCampaign })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Ошибка при регистрации');
        }

        if (data.needVerification) {
            // Do NOT login yet. Return signal to UI
            return { needVerification: true };
        }

        safeLocalStorage.setItem('token', data.token);
        setToken(data.token);
        setUser(data.user);
        return { needVerification: false };
    };

    const verifyEmail = async (email: string, code: string) => {
        const response = await fetch(`${API_URL}/auth/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, code })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Ошибка подтверждения');
        }

        safeLocalStorage.setItem('token', data.token);
        setToken(data.token);
        setUser(data.user);
    };

    const forgotPassword = async (email: string) => {
        const response = await fetch(`${API_URL}/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Ошибка отправки письма');
        }
    };

    const resetPassword = async (token: string, password: string) => {
        const response = await fetch(`${API_URL}/auth/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Ошибка сброса пароля');
        }
    };

    const logout = () => {
        safeLocalStorage.removeItem('token');
        setToken(null);
        setUser(null);
    };

    const setAuthFromToken = async (newToken: string) => {
        safeLocalStorage.setItem('token', newToken);
        setToken(newToken);

        const response = await fetch(`${API_URL}/auth/me`, {
            headers: { 'Authorization': `Bearer ${newToken}` }
        });

        if (response.ok) {
            const data = await response.json();
            setUser(data.user);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-white">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <AuthContext.Provider value={{
            user,
            token,
            isLoading,
            isAuthenticated: !!user,
            login,
            register,
            verifyEmail,
            forgotPassword,
            resetPassword,
            logout,
            setAuthFromToken
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
