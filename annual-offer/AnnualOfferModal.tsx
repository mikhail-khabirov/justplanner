import React, { useState } from 'react';
import { X, Crown, Clock, Check, Loader2 } from 'lucide-react';
import { billingApi } from '../billing/api';
import { useCountdown } from './useCountdown';
import { formatCountdown, dismissOffer } from './utils';

interface AnnualOfferModalProps {
    isOpen: boolean;
    onClose: () => void;
    onPurchased: () => void;
}

const FEATURES = [
    'Безлимитные задачи',
    'Все цвета оформления',
    'Повторяющиеся задачи',
    'Настройка начала дня',
    'Переименование разделов',
    'Статистика продуктивности',
    'Печать и сохранение в PDF',
    'Приоритетная поддержка',
];

const AnnualOfferModal: React.FC<AnnualOfferModalProps> = ({ isOpen, onClose, onPurchased }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const remaining = useCountdown();

    if (!isOpen) return null;
    const isExpired = remaining <= 0;

    const handlePurchase = async () => {
        setIsProcessing(true);
        try {
            const { confirmationUrl } = await billingApi.createAnnualPayment();
            dismissOffer();
            onPurchased();
            window.location.href = confirmationUrl;
        } catch (err) {
            console.error('Annual payment error:', err);
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-300">
                {/* Header gradient */}
                <div className="bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 px-6 pt-6 pb-8 text-white relative">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/20 transition-colors"
                    >
                        <X size={20} />
                    </button>

                    <div className="flex items-center gap-2 mb-3">
                        <Crown size={24} />
                        <span className="text-sm font-semibold uppercase tracking-wider opacity-90">
                            Специальное предложение
                        </span>
                    </div>

                    <h2 className="text-2xl font-bold mb-1">
                        Годовая подписка Pro
                    </h2>
                    <p className="text-white/80 text-sm">
                        Скидка 50% только для новых пользователей
                    </p>
                </div>

                {/* Timer */}
                {isExpired ? (
                    <div className="flex items-center justify-center gap-2 py-3 bg-gray-50 border-b border-gray-200">
                        <Clock size={16} className="text-gray-400" />
                        <span className="text-sm font-medium text-gray-500">
                            Срок скидки истёк
                        </span>
                    </div>
                ) : (
                    <div className="flex items-center justify-center gap-2 py-3 bg-red-50 border-b border-red-100">
                        <Clock size={16} className="text-red-500" />
                        <span className="text-sm font-medium text-red-600">
                            Предложение истекает через
                        </span>
                        <span className="font-mono font-bold text-red-700 text-base">
                            {formatCountdown(remaining)}
                        </span>
                    </div>
                )}

                {/* Content */}
                <div className="px-6 py-5">
                    {/* Price */}
                    <div className="text-center mb-5">
                        {isExpired ? (
                            <>
                                <div className="flex items-baseline justify-center gap-2">
                                    <span className="text-4xl font-extrabold text-gray-900">2 388 ₽</span>
                                </div>
                                <p className="text-sm text-gray-500 mt-1">за 12 месяцев · 199 ₽/мес</p>
                                <p className="text-xs text-gray-400 mt-2">Скидка действовала 24 часа с момента регистрации</p>
                            </>
                        ) : (
                            <>
                                <div className="flex items-baseline justify-center gap-2">
                                    <span className="text-lg text-gray-400 line-through">2 388 ₽</span>
                                    <span className="text-4xl font-extrabold text-gray-900">1 199 ₽</span>
                                </div>
                                <p className="text-sm text-gray-500 mt-1">за 12 месяцев · 99,9 ₽/мес</p>
                            </>
                        )}
                    </div>

                    {/* Features */}
                    <div className="space-y-2.5 mb-6">
                        {FEATURES.map((f) => (
                            <div key={f} className="flex items-center gap-2.5">
                                <div className="w-5 h-5 bg-[#26A69A]/10 rounded-full flex items-center justify-center shrink-0">
                                    <Check size={13} className="text-[#26A69A]" />
                                </div>
                                <span className="text-sm text-gray-700">{f}</span>
                            </div>
                        ))}
                    </div>

                    {/* CTA */}
                    <button
                        onClick={handlePurchase}
                        disabled={isProcessing}
                        className="w-full py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg shadow-amber-500/25 disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                        {isProcessing ? (
                            <Loader2 size={20} className="animate-spin" />
                        ) : (
                            <>
                                <Crown size={18} />
                                {isExpired ? 'Оформить за 2 388 ₽' : 'Оформить за 1 199 ₽'}
                            </>
                        )}
                    </button>

                    <p className="text-center text-xs text-gray-400 mt-3">
                        Подписка продлевается автоматически через 365 дней по стоимости 2 388 ₽/год. Отменить можно в любой момент в настройках.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AnnualOfferModal;
