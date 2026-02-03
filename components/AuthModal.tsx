import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    allowClose?: boolean;
    initialMode?: 'login' | 'register';
}

const API_URL = '/api';

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, allowClose = true, initialMode = 'login' }) => {
    const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'reset'>('login');
    const [step, setStep] = useState<'auth' | 'verify'>('auth');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const { login, register, verifyEmail, forgotPassword, resetPassword } = useAuth();

    // Check for reset token on mount/open
    React.useEffect(() => {
        if (isOpen) {
            const urlParams = new URLSearchParams(window.location.search);
            const resetToken = urlParams.get('resetToken');
            if (resetToken) {
                setMode('reset');
            } else {
                setMode(initialMode);
            }
            setMessage('');
            setError('');
        }
    }, [isOpen, initialMode]);

    // Analytics: Track virtual page views for Auth
    React.useEffect(() => {
        if (isOpen) {
            const ym = (window as any).ym;
            if (typeof ym === 'function') {
                let virtualUrl = '';
                let title = '';

                if (mode === 'login') {
                    virtualUrl = '/auth/login';
                    title = 'Вход';
                } else if (mode === 'register') {
                    virtualUrl = '/auth/register';
                    title = 'Регистрация';
                }

                if (virtualUrl) {
                    ym(106590123, 'hit', virtualUrl, {
                        title: `JustPlanner - ${title}`,
                        referer: window.location.href
                    });
                }
            }
        }
    }, [isOpen, mode]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setIsLoading(true);

        try {
            if (mode === 'login') {
                const result = await login(email, password);
                (window as any).ym?.(106590123, 'reachGoal', 'form_login_submit');
                onClose();
            } else if (mode === 'register') {
                const result = await register(email, password);
                (window as any).ym?.(106590123, 'reachGoal', 'form_register_submit');
                if (result.needVerification) {
                    setStep('verify');
                } else {
                    onClose();
                }
            } else if (mode === 'forgot') {
                await forgotPassword(email);
                setMessage('Ссылка для сброса пароля отправлена на вашу почту');
            } else if (mode === 'reset') {
                const urlParams = new URLSearchParams(window.location.search);
                const token = urlParams.get('resetToken');
                if (!token) throw new Error('Токен сброса отсутствует');

                await resetPassword(token, password);
                setMessage('Пароль успешно изменен. Теперь вы можете войти.');
                setTimeout(() => setMode('login'), 2000);
                // Clear URL
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        } catch (err: any) {
            if (err.needVerification) {
                setStep('verify');
                setError('Требуется подтверждение почты');
            } else {
                setError(err.message || 'Произошла ошибка');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerificationSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            await verifyEmail(email, verificationCode);
            onClose();
            setStep('auth');
            setEmail('');
            setPassword('');
            setVerificationCode('');
        } catch (err: any) {
            setError(err.message || 'Неверный код');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = () => {
        (window as any).ym?.(106590123, 'reachGoal', 'auth_google');
        window.location.href = `${API_URL}/auth/google`;
    };

    const handleOverlayClick = (e: React.MouseEvent) => {
        // Overlay click closing disabled by request - must use X button
    };

    // VERIFICATION SCREEN
    if (step === 'verify') {
        return (
            <div
                className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
                onClick={handleOverlayClick}
            >
                <div
                    className="relative w-full max-w-md mx-4 bg-white rounded-3xl shadow-2xl p-8 animate-in fade-in zoom-in-95 duration-200"
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 rounded-full hover:bg-black/5"
                    >
                        <X size={20} className="text-gray-500" />
                    </button>

                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Подтверждение</h2>
                    <p className="text-gray-500 mb-6">
                        Мы отправили код на <strong>{email}</strong>. Введите его ниже.
                    </p>

                    {error && (
                        <div className="mb-4 p-3 bg-red-100 border border-red-200 rounded-xl text-red-700 text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleVerificationSubmit} className="space-y-4">
                        <input
                            type="text"
                            value={verificationCode}
                            onChange={(e) => setVerificationCode(e.target.value)}
                            placeholder="Код из письма"
                            required
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-left text-lg font-mono"
                            maxLength={6}
                        />

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
                        >
                            {isLoading ? 'Проверка...' : 'Подтвердить'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    const getTitle = () => {
        switch (mode) {
            case 'login': return 'С возвращением!';
            case 'register': return 'Создайте бесплатный аккаунт чтобы начать пользоваться';
            case 'forgot': return 'Восстановление пароля';
            case 'reset': return 'Новый пароль';
        }
    };

    const getButtonText = () => {
        if (isLoading) return 'Загрузка...';
        switch (mode) {
            case 'login': return 'Войти';
            case 'register': return 'Зарегистрироваться';
            case 'forgot': return 'Отправить ссылку';
            case 'reset': return 'Сохранить пароль';
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={handleOverlayClick}
        >
            <div
                className="relative w-full max-w-md mx-4 bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 rounded-3xl shadow-2xl p-8 animate-in fade-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close button - only if allowClose is true */}
                {allowClose && (
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 rounded-full hover:bg-black/5 transition-colors"
                    >
                        <X size={20} className="text-gray-500" />
                    </button>
                )}

                {/* Header with toggle */}
                <div className="flex flex-col gap-4 mb-8">
                    <div className="flex flex-col pr-8">
                        <h2 className="text-2xl font-bold text-gray-900 leading-tight">
                            {getTitle()}
                        </h2>
                    </div>

                    {(mode === 'login' || mode === 'register') && (
                        <div className="flex">
                            <button
                                onClick={() => {
                                    setMode(mode === 'login' ? 'register' : 'login');
                                    setError('');
                                    setMessage('');
                                }}
                                className="px-4 py-1.5 text-sm font-medium border border-gray-400/30 bg-white/50 rounded-full hover:bg-white transition-colors whitespace-nowrap text-gray-700"
                            >
                                {mode === 'login' ? 'Нет аккаунта? Зарегистрироваться' : 'Есть аккаунт? Войти'}
                            </button>
                        </div>
                    )}
                </div>

                {/* Messages */}
                {error && (
                    <div className="mb-4 p-3 bg-red-100 border border-red-200 rounded-xl text-red-700 text-sm">
                        {error}
                    </div>
                )}
                {message && (
                    <div className="mb-4 p-3 bg-green-100 border border-green-200 rounded-xl text-green-700 text-sm">
                        {message}
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {mode !== 'reset' && (
                        <div>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Электронная почта"
                                required
                                className="w-full px-4 py-3 bg-transparent border-b-2 border-gray-300 focus:border-gray-900 outline-none transition-colors text-gray-900 placeholder:text-gray-400"
                            />
                        </div>
                    )}

                    {(mode === 'login' || mode === 'register' || mode === 'reset') && (
                        <div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder={mode === 'reset' ? 'Новый пароль' : 'Пароль'}
                                required
                                minLength={6}
                                className="w-full px-4 py-3 bg-transparent border-b-2 border-gray-300 focus:border-gray-900 outline-none transition-colors text-gray-900 placeholder:text-gray-400"
                            />
                        </div>
                    )}

                    {mode === 'login' && (
                        <div className="text-right">
                            <button
                                type="button"
                                onClick={() => {
                                    setMode('forgot');
                                    setError('');
                                    setMessage('');
                                }}
                                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                            >
                                Забыл пароль?
                            </button>
                        </div>
                    )}

                    {mode === 'forgot' && (
                        <div className="text-right">
                            <button
                                type="button"
                                onClick={() => {
                                    setMode('login');
                                    setError('');
                                    setMessage('');
                                }}
                                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                            >
                                Вернуться ко входу
                            </button>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3.5 bg-gradient-to-r from-amber-200 via-orange-200 to-rose-200 hover:from-amber-300 hover:via-orange-300 hover:to-rose-300 rounded-xl font-semibold text-gray-800 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {getButtonText()}
                    </button>
                </form>

                {/* Divider & OAuth - Only for login/register */}
                {(mode === 'login' || mode === 'register') && (
                    <>
                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-200"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-4 bg-gradient-to-r from-amber-50 via-orange-50 to-rose-50 text-gray-400">или</span>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={handleGoogleLogin}
                                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors font-medium text-gray-700"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                <span>Войти через Google</span>
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default AuthModal;
