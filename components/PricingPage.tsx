import React from 'react';
import { Check, ArrowLeft } from 'lucide-react';

interface PricingPageProps {
    onBack: () => void;
    onSelectPlan: (plan: 'free' | 'pro') => void;
}

const PricingPage: React.FC<PricingPageProps> = ({ onBack, onSelectPlan }) => {
    const plans = [
        {
            name: 'Бесплатно',
            price: '0',
            description: 'Для тех, кто начинает свой путь к продуктивности',
            features: [
                '10 активных задач',
                'Недельный вид на 7 дней',
                'Drag & Drop перенос задач',
                'Базовые цвета задач',
                'Работает на всех устройствах'
            ],
            buttonText: 'Начать сейчас',
            highlight: false
        },
        {
            name: 'Премиум',
            price: '99',
            oldPrice: '299',
            period: 'мес',
            description: 'Полный доступ ко всем функциям',
            features: [
                'Безлимитные задачи',
                'Все цвета оформления',
                'Повторяющиеся задачи',
                'Настройка начала дня',
                'Переименование разделов',
                'Статистика продуктивности',
                'Печать и сохранение в PDF',
                'Приоритетная поддержка'
            ],
            buttonText: 'Попробовать бесплатно',
            highlight: true
        }
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

                <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                    {plans.map((plan) => (
                        <div
                            key={plan.name}
                            className={`relative bg-white rounded-3xl shadow-xl overflow-hidden border-2 transition-transform hover:-translate-y-1 duration-300 ${plan.highlight ? 'border-[#26A69A]' : 'border-transparent'
                                }`}
                        >
                            {plan.highlight && (
                                <div className="absolute top-0 right-0 bg-[#26A69A] text-white text-xs font-bold px-4 py-1.5 rounded-bl-xl uppercase tracking-wider">
                                    Рекомендуем
                                </div>
                            )}

                            <div className="p-8 sm:p-10 h-full flex flex-col">
                                <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                                <p className="text-gray-500 mb-6 text-sm">{plan.description}</p>

                                <div className="flex items-baseline mb-8 gap-2">
                                    {plan.oldPrice && (
                                        <span className="text-2xl font-medium text-gray-400 line-through">{plan.oldPrice}₽</span>
                                    )}
                                    <span className="text-5xl font-extrabold tracking-tight text-gray-900">{plan.price}</span>
                                    <span className="text-xl font-medium text-gray-500">₽</span>
                                    {plan.period && (
                                        <span className="text-lg font-medium text-gray-500">/{plan.period}</span>
                                    )}
                                </div>

                                <ul className="space-y-4 mb-10 flex-grow">
                                    {plan.features.map((feature) => (
                                        <li key={feature} className="flex items-start gap-3 text-gray-700">
                                            <div className="mt-1 w-5 h-5 bg-[#26A69A]/10 rounded-full flex items-center justify-center shrink-0">
                                                <Check size={14} className="text-[#26A69A]" />
                                            </div>
                                            <span className="text-base">{feature}</span>
                                        </li>
                                    ))}
                                </ul>

                                <button
                                    onClick={() => {
                                        window.history.pushState({}, '', '/app');
                                        onSelectPlan(plan.highlight ? 'pro' : 'free');
                                    }}
                                    className={`w-full py-4 px-6 rounded-2xl font-bold text-lg transition-all ${plan.highlight
                                        ? 'bg-[#26A69A] text-white hover:bg-[#218F84] shadow-[0_8px_20px_rgba(38,166,154,0.3)]'
                                        : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                                        }`}
                                >
                                    {plan.buttonText}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-16 text-center text-gray-500 text-sm">
                    <p>Есть вопросы? Напишите нам на <a href="mailto:support@justplanner.ru" className="text-[#26A69A] hover:underline">support@justplanner.ru</a></p>
                </div>
            </div>
        </div>
    );
};

export default PricingPage;
