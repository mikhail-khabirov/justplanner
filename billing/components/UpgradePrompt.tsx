import React, { useState } from 'react';
import { Crown, X, Loader2, Sparkles, Info } from 'lucide-react';
import { useBilling } from '../BillingContext';

export type UpgradeReason = 'task_limit' | 'colors' | 'week_planning' | 'recurrence' | 'pdf' | 'print';

interface UpgradePromptProps {
    isOpen: boolean;
    onClose: () => void;
    reason?: UpgradeReason;
}

// Message content based on reason
const REASON_CONTENT: Record<UpgradeReason, { title: string; subtitle: string }> = {
    task_limit: {
        title: 'Лимит достигнут',
        subtitle: 'Бесплатный план: максимум 10 задач'
    },
    colors: {
        title: 'Цвета для Pro',
        subtitle: 'Цветные карточки доступны в Pro версии'
    },
    week_planning: {
        title: 'Планирование недели',
        subtitle: 'Планирование на следующие недели доступно в Pro'
    },
    recurrence: {
        title: 'Повторяющиеся задачи',
        subtitle: 'Автоматическое повторение задач доступно в Pro'
    },
    pdf: {
        title: 'Сохранение в PDF',
        subtitle: 'Экспорт в PDF доступен в Pro версии'
    },
    print: {
        title: 'Печать',
        subtitle: 'Печать расписания доступна в Pro версии'
    }
};

/**
 * Modal prompting free users to upgrade when they hit various limits
 */
const UpgradePrompt: React.FC<UpgradePromptProps> = ({ isOpen, onClose, reason = 'task_limit' }) => {
    const { startPayment, taskLimit } = useBilling();
    const [isProcessing, setIsProcessing] = useState(false);
    const [showTerms, setShowTerms] = useState(false);

    if (!isOpen) return null;

    const content = REASON_CONTENT[reason];

    const handleUpgrade = async () => {
        setIsProcessing(true);
        try {
            const url = await startPayment();
            window.location.href = url;
        } catch (error) {
            console.error('Payment failed:', error);
            alert('Ошибка при создании платежа. Попробуйте позже.');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-gray-900/30 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Gradient Header */}
                <div className="bg-gradient-to-r from-amber-400 via-orange-500 to-pink-500 px-6 py-8 text-center relative">
                    <button
                        onClick={onClose}
                        className="absolute top-3 right-3 p-1.5 text-white/70 hover:text-white hover:bg-white/20 rounded-full transition-colors"
                    >
                        <X size={18} />
                    </button>

                    <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-4">
                        <Crown size={32} className="text-white" />
                    </div>

                    <h2 className="text-xl font-bold text-white mb-1">
                        {content.title}
                    </h2>
                    <p className="text-white/80 text-sm">
                        {content.subtitle}
                    </p>
                </div>

                {/* Content */}
                <div className="px-6 py-5">
                    <div className="space-y-3 mb-6">
                        <div className="flex items-center gap-3 text-gray-700">
                            <Sparkles size={18} className="text-amber-500 flex-shrink-0" />
                            <span className="text-sm">Неограниченное количество задач</span>
                        </div>
                        <div className="flex items-center gap-3 text-gray-700">
                            <Sparkles size={18} className="text-amber-500 flex-shrink-0" />
                            <span className="text-sm">Все цвета для карточек</span>
                        </div>
                        <div className="flex items-center gap-3 text-gray-700">
                            <Sparkles size={18} className="text-amber-500 flex-shrink-0" />
                            <span className="text-sm">Повторяющиеся задачи</span>
                        </div>
                        <div className="flex items-center gap-3 text-gray-700">
                            <Sparkles size={18} className="text-amber-500 flex-shrink-0" />
                            <span className="text-sm">Планирование на любую неделю</span>
                        </div>
                        <div className="flex items-center gap-3 text-gray-700">
                            <Sparkles size={18} className="text-amber-500 flex-shrink-0" />
                            <span className="text-sm">Сохранение в PDF и печать</span>
                        </div>
                    </div>

                    <button
                        onClick={handleUpgrade}
                        disabled={isProcessing}
                        className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl text-sm font-bold hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isProcessing ? (
                            <Loader2 size={18} className="animate-spin" />
                        ) : (
                            <>
                                <Crown size={18} />
                                Попробовать Pro — 1 ₽ за 7 дней
                            </>
                        )}
                    </button>

                    <p className="text-center text-xs text-gray-400 mt-1.5">далее 99 ₽/мес</p>

                    {/* Auto-renewal terms link */}
                    <p className="text-center mt-0.5">
                        <button
                            onClick={() => setShowTerms(true)}
                            className="text-[10px] text-gray-400 hover:text-gray-600 underline underline-offset-2 transition-colors"
                        >
                            Условия автопродления
                        </button>
                    </p>

                    <button
                        onClick={onClose}
                        className="w-full mt-3 py-2.5 text-gray-500 text-sm hover:text-gray-700 transition-colors"
                    >
                        Остаться на бесплатном плане
                    </button>
                </div>
            </div>

            {/* Terms Popup */}
            {showTerms && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-gray-900/50"
                        onClick={() => setShowTerms(false)}
                    />
                    <div className="relative w-full max-w-xs bg-white rounded-xl shadow-2xl p-5 animate-in fade-in zoom-in-95 duration-150">
                        <button
                            onClick={() => setShowTerms(false)}
                            className="absolute top-3 right-3 p-1 text-gray-400 hover:text-gray-600 rounded-full transition-colors"
                        >
                            <X size={16} />
                        </button>

                        <div className="flex items-center gap-2 mb-3 text-amber-600">
                            <Info size={18} />
                            <span className="font-semibold text-sm">Условия подписки</span>
                        </div>

                        <div className="text-sm text-gray-600 space-y-3">
                            <p>
                                Пробный период: 7 дней за 1 ₽. По окончании пробного периода подписка продлевается автоматически за 99 ₽/мес.
                            </p>
                            <p>
                                Отменить подписку и отвязать способ оплаты вы сможете в любой момент в настройках.
                            </p>
                        </div>

                        <button
                            onClick={() => setShowTerms(false)}
                            className="w-full mt-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                        >
                            Понятно
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UpgradePrompt;

