import React, { useState } from 'react';
import { Crown, Calendar, ToggleLeft, ToggleRight, Loader2, ExternalLink, CreditCard, X } from 'lucide-react';
import { useBilling } from '../BillingContext';

interface SubscriptionStatusProps {
    onUpgrade?: () => void;
}

const SubscriptionStatus: React.FC<SubscriptionStatusProps> = ({ onUpgrade }) => {
    const { subscription, isPremium, plan, cancelAutoRenew, resumeAutoRenew, unbindCard, startPayment, bindCard, isLoading } = useBilling();
    const [isProcessing, setIsProcessing] = useState(false);

    const formatDate = (dateString: string | null | undefined) => {
        if (!dateString) return '—';
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const handleToggleAutoRenew = async () => {
        setIsProcessing(true);
        try {
            if (subscription?.autoRenew) {
                await cancelAutoRenew();
            } else {
                await resumeAutoRenew();
            }
        } catch (error) {
            console.error('Failed to toggle auto-renew:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleUpgrade = async () => {
        setIsProcessing(true);
        try {
            const confirmationUrl = await startPayment();
            window.location.href = confirmationUrl;
        } catch (error) {
            console.error('Failed to create payment:', error);
            alert('Ошибка при создании платежа. Попробуйте позже.');
            setIsProcessing(false);
        }
    };

    const handleBindCard = async () => {
        setIsProcessing(true);
        try {
            const confirmationUrl = await bindCard();
            window.location.href = confirmationUrl;
        } catch (error) {
            console.error('Failed to create binding payment:', error);
            alert('Ошибка при привязке карты. Попробуйте позже.');
            setIsProcessing(false);
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-3">
                <div className="flex items-center gap-2 text-gray-700">
                    <Crown size={18} />
                    <span className="font-medium">Подписка</span>
                </div>
                <div className="flex items-center justify-center py-4">
                    <Loader2 size={20} className="animate-spin text-gray-400" />
                </div>
            </div>
        );
    }

    // Premium user
    if (isPremium && subscription) {
        return (
            <div className="space-y-3">
                <div className="flex items-center gap-2 text-amber-600">
                    <Crown size={18} />
                    <span className="font-medium">
                        {subscription.isTrial ? 'Пробный период Pro' : 'Подписка Pro'}
                    </span>
                </div>

                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-amber-700">
                            <Calendar size={16} />
                            <span className="text-sm">
                                {subscription.isTrial ? 'Пробный период до' : 'Активна до'}
                            </span>
                        </div>
                        <span className="font-semibold text-amber-900">
                            {formatDate(subscription.currentPeriodEnd)}
                        </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-amber-200">
                        <span className="text-sm text-gray-600">Автопродление</span>
                        {subscription.paymentMethodTitle ? (
                            <button
                                onClick={handleToggleAutoRenew}
                                disabled={isProcessing}
                                className="flex items-center gap-2 text-sm font-medium transition-colors disabled:opacity-50"
                            >
                                {isProcessing ? (
                                    <Loader2 size={18} className="animate-spin text-gray-400" />
                                ) : subscription.autoRenew ? (
                                    <>
                                        <ToggleRight size={24} className="text-green-500" />
                                        <span className="text-green-600">Включено</span>
                                    </>
                                ) : (
                                    <>
                                        <ToggleLeft size={24} className="text-gray-400" />
                                        <span className="text-gray-500">Отключено</span>
                                    </>
                                )}
                            </button>
                        ) : (
                            <span className="text-sm text-gray-400">Нет карты</span>
                        )}
                    </div>

                    {subscription.paymentMethodTitle ? (
                        <div className="flex items-center justify-between pt-2 border-t border-amber-200">
                            <span className="text-sm text-gray-600">Карта</span>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-700 font-medium">
                                    {subscription.paymentMethodTitle}
                                </span>
                                <button
                                    onClick={async () => {
                                        setIsProcessing(true);
                                        try { await unbindCard(); } catch (e) { console.error(e); }
                                        finally { setIsProcessing(false); }
                                    }}
                                    disabled={isProcessing}
                                    className="text-xs text-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
                                    title="Отвязать карту"
                                >
                                    Отвязать
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="pt-2 border-t border-amber-200">
                            <button
                                onClick={handleBindCard}
                                disabled={isProcessing}
                                className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isProcessing ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : (
                                    <>
                                        <CreditCard size={16} />
                                        Привязать карту (1₽ с возвратом)
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Free user
    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2 text-gray-700">
                <Crown size={18} />
                <span className="font-medium">Подписка</span>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <span className="text-gray-600">Бесплатный план</span>
                    <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">Free</span>
                </div>

                <div className="text-xs text-gray-500 space-y-1">
                    <p>• Максимум 10 задач</p>
                    <p>• Только белый цвет карточек</p>
                    <p>• Планирование только на текущую неделю</p>
                    <p>• Без повторяющихся задач</p>
                    <p>• Без переименования разделов</p>
                    <p>• Без сохранения в PDF и печати</p>
                </div>

                <button
                    onClick={onUpgrade || handleUpgrade}
                    disabled={isProcessing}
                    className="w-full py-2.5 bg-[#26A69A] text-white rounded-lg text-sm font-medium hover:bg-[#218F84] transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {isProcessing ? (
                        <Loader2 size={16} className="animate-spin" />
                    ) : (
                        <>
                            <Crown size={16} />
                            Попробовать Pro — 1 ₽ за 7 дней
                        </>
                    )}
                </button>
                <p className="text-center text-xs text-gray-400 mt-1">далее 99 ₽/мес</p>
            </div>
        </div>
    );
};

export default SubscriptionStatus;
