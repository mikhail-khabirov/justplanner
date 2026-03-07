import React, { useState } from 'react';
import { Check, ArrowLeft, Crown, Loader2, Info, ShieldCheck } from 'lucide-react';

interface Subscription {
    plan?: string;
    status?: string;
    currentPeriodEnd?: string;
    isAnnual?: boolean;
    isTrial?: boolean;
}

interface PricingPageProps {
    onBack: () => void;
    onSelectPlan: (plan: 'free' | 'pro') => void;
    token?: string | null;
    isAuthenticated?: boolean;
    onAuthRequired?: () => void;
    subscription?: Subscription | null;
}

function getRemainingDays(subscription?: Subscription | null): number {
    if (!subscription?.currentPeriodEnd) return 0;
    if (subscription.plan !== 'pro' || subscription.status !== 'active') return 0;
    if (subscription.isAnnual) return 0;
    const end = new Date(subscription.currentPeriodEnd);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
}

const PricingPage: React.FC<PricingPageProps> = ({ onBack, onSelectPlan, token, isAuthenticated, onAuthRequired, subscription }) => {
    const [annualLoading, setAnnualLoading] = useState(false);
    const remainingDays = getRemainingDays(subscription);

    const handleBuyAnnual = async () => {
        if (!isAuthenticated) {
            onAuthRequired?.();
            return;
        }
        setAnnualLoading(true);
        try {
            const res = await fetch('/api/billing/create-annual-full-payment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                credentials: 'include',
            });
            const data = await res.json();
            if (data.confirmationUrl) {
                window.location.href = data.confirmationUrl;
            } else {
                alert('Ошибка создания платежа: ' + (data.error || 'Попробуйте позже'));
            }
        } catch (e) {
            alert('Ошибка сети. Попробуйте ещё раз.');
        } finally {
            setAnnualLoading(false);
        }
    };

    const proFeatures = [
        'Безлимитные задачи',
        'Все цвета оформления',
        'Повторяющиеся задачи',
        'Настройка начала дня',
        'Переименование разделов',
        'Статистика продуктивности',
        'Печать и сохранение в PDF',
        'Приоритетная поддержка'
    ];

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
            <div className="max-w-7xl mx-auto">
                {/* Back Link */}
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors mb-12 group"
                >
                    <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                    <span>Назад</span>
                </button>

                <div className="text-center mb-16">
                    <h1 className="text-4xl font-extrabold text-gray-900 mb-4 sm:text-5xl">
                        Простые тарифы для <span className="text-[#26A69A]">продуктивной жизни</span>
                    </h1>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                        Выберите подходящий план и начните планировать уже сегодня.
                        Без скрытых платежей.
                    </p>
                </div>

                {remainingDays > 0 && (
                    <div className="max-w-6xl mx-auto mb-8 flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-2xl px-5 py-4">
                        <Info size={20} className="text-blue-500 shrink-0 mt-0.5" />
                        <p className="text-sm text-blue-700">
                            У вас активна месячная подписка — осталось <strong>{remainingDays} {remainingDays === 1 ? 'день' : remainingDays < 5 ? 'дня' : 'дней'}</strong>.
                            При переходе на годовой план эти дни будут автоматически добавлены к 365 дням.
                        </p>
                    </div>
                )}

                <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    {/* Free */}
                    <div className="relative bg-white rounded-3xl shadow-xl overflow-hidden border-2 border-transparent transition-transform hover:-translate-y-1 duration-300">
                        <div className="p-8 sm:p-10 h-full flex flex-col">
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">Бесплатно</h3>
                            <p className="text-gray-500 mb-6 text-sm">Для тех, кто начинает свой путь к продуктивности</p>
                            <div className="mb-8">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-5xl font-extrabold tracking-tight text-gray-900">0</span>
                                    <span className="text-xl font-medium text-gray-500">₽</span>
                                </div>
                            </div>
                            <ul className="space-y-4 mb-10 flex-grow">
                                {['5 активных задач', 'Недельный вид на 7 дней', 'Drag & Drop перенос задач', 'Базовые цвета задач', 'Работает на всех устройствах'].map(f => (
                                    <li key={f} className="flex items-start gap-3 text-gray-700">
                                        <div className="mt-1 w-5 h-5 bg-[#26A69A]/10 rounded-full flex items-center justify-center shrink-0">
                                            <Check size={14} className="text-[#26A69A]" />
                                        </div>
                                        <span className="text-base">{f}</span>
                                    </li>
                                ))}
                            </ul>
                            <button
                                onClick={() => { window.history.pushState({}, '', '/app'); onSelectPlan('free'); }}
                                className="w-full py-4 px-6 rounded-2xl font-bold text-lg transition-all bg-gray-100 text-gray-900 hover:bg-gray-200"
                            >
                                Начать сейчас
                            </button>
                        </div>
                    </div>

                    {/* Pro Monthly Trial */}
                    <div className="relative bg-white rounded-3xl shadow-xl overflow-hidden border-2 border-[#26A69A] transition-transform hover:-translate-y-1 duration-300">
                        <div className="absolute top-0 right-0 bg-[#26A69A] text-white text-xs font-bold px-4 py-1.5 rounded-bl-xl uppercase tracking-wider">
                            Рекомендуем
                        </div>
                        <div className="p-8 sm:p-10 h-full flex flex-col">
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">Премиум</h3>
                            <p className="text-gray-500 mb-6 text-sm">Полный доступ ко всем функциям</p>
                            <div className="mb-8">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-5xl font-extrabold tracking-tight text-gray-900">1</span>
                                    <span className="text-xl font-medium text-gray-500">₽</span>
                                    <span className="text-lg font-medium text-gray-500">/ 7 дней</span>
                                </div>
                                <p className="text-sm text-gray-400 mt-1">далее 199 ₽/мес</p>
                            </div>
                            <ul className="space-y-4 mb-10 flex-grow">
                                {proFeatures.map(f => (
                                    <li key={f} className="flex items-start gap-3 text-gray-700">
                                        <div className="mt-1 w-5 h-5 bg-[#26A69A]/10 rounded-full flex items-center justify-center shrink-0">
                                            <Check size={14} className="text-[#26A69A]" />
                                        </div>
                                        <span className="text-base">{f}</span>
                                    </li>
                                ))}
                            </ul>
                            <button
                                onClick={() => { window.history.pushState({}, '', '/app'); onSelectPlan('pro'); }}
                                className="w-full py-4 px-6 rounded-2xl font-bold text-lg transition-all bg-[#26A69A] text-white hover:bg-[#218F84] shadow-[0_8px_20px_rgba(38,166,154,0.3)]"
                            >
                                Попробовать за 1 ₽
                            </button>
                        </div>
                    </div>

                    {/* Pro Annual */}
                    <div className="relative bg-white rounded-3xl shadow-xl overflow-hidden border-2 border-amber-400 transition-transform hover:-translate-y-1 duration-300">
                        <div className="absolute top-0 right-0 bg-amber-400 text-white text-xs font-bold px-4 py-1.5 rounded-bl-xl uppercase tracking-wider">
                            Скидка 20%
                        </div>
                        <div className="p-8 sm:p-10 h-full flex flex-col">
                            <div className="flex items-center gap-2 mb-2">
                                <Crown size={20} className="text-amber-500" />
                                <h3 className="text-2xl font-bold text-gray-900">Про на год</h3>
                            </div>
                            <p className="text-gray-500 mb-6 text-sm">Всё включено, выгоднее на 20%</p>
                            <div className="mb-8">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-lg font-medium text-gray-400 line-through">2 388 ₽</span>
                                    <span className="text-5xl font-extrabold tracking-tight text-gray-900">1 910</span>
                                    <span className="text-xl font-medium text-gray-500">₽</span>
                                </div>
                                <p className="text-sm text-gray-400 mt-1">за год · 159 ₽/мес</p>
                            </div>
                            <ul className="space-y-4 mb-10 flex-grow">
                                {proFeatures.map(f => (
                                    <li key={f} className="flex items-start gap-3 text-gray-700">
                                        <div className="mt-1 w-5 h-5 bg-amber-400/10 rounded-full flex items-center justify-center shrink-0">
                                            <Check size={14} className="text-amber-500" />
                                        </div>
                                        <span className="text-base">{f}</span>
                                    </li>
                                ))}
                            </ul>
                            <button
                                onClick={handleBuyAnnual}
                                disabled={annualLoading}
                                className="w-full py-4 px-6 rounded-2xl font-bold text-lg transition-all bg-gradient-to-r from-amber-400 to-orange-400 text-white hover:from-amber-500 hover:to-orange-500 shadow-[0_8px_20px_rgba(251,191,36,0.3)] disabled:opacity-60 flex items-center justify-center gap-2"
                            >
                                {annualLoading ? <Loader2 size={20} className="animate-spin" /> : 'Купить за 1 910 ₽'}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="max-w-6xl mx-auto mt-10 flex items-center justify-center gap-2.5 bg-green-50 border border-green-200 rounded-2xl px-6 py-4">
                    <ShieldCheck size={22} className="text-green-600 shrink-0" />
                    <p className="text-sm text-green-700 font-medium">
                        100% гарантия возврата денег, если продукт не понравится. Без вопросов.
                    </p>
                </div>

                <div className="mt-16 text-center text-gray-500 text-sm">
                    <p>Есть вопросы? Напишите нам на <a href="mailto:support@justplanner.ru" className="text-[#26A69A] hover:underline">support@justplanner.ru</a></p>
                </div>
            </div>
        </div>
    );
};

export default PricingPage;
