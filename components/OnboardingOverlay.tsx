import React, { useState } from 'react';
import { X, ChevronRight, GripVertical, Clock, Plus, Settings, Inbox } from 'lucide-react';
import { safeLocalStorage } from '../utils';

interface OnboardingOverlayProps {
    isOpen: boolean;
    userId?: string;
    onComplete: () => void;
}

const ONBOARDING_STEPS = [
    {
        id: 'nav',
        emoji: '📅',
        title: 'Листай недели',
        description: 'Используй зелёные стрелки рядом с датой для навигации между неделями',
        icon: ChevronRight
    },
    {
        id: 'drag',
        emoji: '✋',
        title: 'Перетаскивай задачи',
        description: 'Зажми задачу и перемести её на любой день или час. Работает и на мобильных!',
        icon: GripVertical
    },
    {
        id: 'hour',
        emoji: '⏰',
        title: '3 задачи в час',
        description: 'В каждый час можно добавить до 3 задач. Тапни на пустое место — создай задачу',
        icon: Clock
    },
    {
        id: 'add',
        emoji: '➕',
        title: 'Быстрое создание',
        description: 'Нажми на любой час в сетке — появится поле для новой задачи. Выбери цвет для категории',
        icon: Plus
    },
    {
        id: 'settings',
        emoji: '⚙️',
        title: 'Настрой свой день',
        description: 'В настройках можно выбрать комфортное время начала дня. Более ранние часы будут скрыты',
        icon: Settings
    },
    {
        id: 'backlog',
        emoji: '📥',
        title: 'Бэклог задач',
        description: 'Внизу экрана есть раздел для задач без времени — скидывай туда всё, что планируешь сделать позже',
        icon: Inbox
    }
];

const OnboardingOverlay: React.FC<OnboardingOverlayProps> = ({ isOpen, userId, onComplete }) => {
    const [currentStep, setCurrentStep] = useState(0);

    const handleNext = () => {
        if (currentStep < ONBOARDING_STEPS.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            handleComplete();
        }
    };

    const handleComplete = () => {
        // Mark as complete for this user
        const key = `onboarding_complete_${userId || 'default'}`;
        safeLocalStorage.setItem(key, 'true');
        setCurrentStep(0);
        onComplete();
    };

    const handleSkip = () => {
        handleComplete();
    };

    if (!isOpen) return null;

    const step = ONBOARDING_STEPS[currentStep];
    const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;

    return (
        <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={handleSkip}
        >
            <div
                className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in-95 duration-300"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-[#26A69A] to-[#2dd4bf] px-6 py-4 flex justify-between items-center">
                    <h2 className="text-white font-bold text-lg">Добро пожаловать! 👋</h2>
                    <button
                        onClick={handleSkip}
                        className="text-white/70 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Step indicators */}
                <div className="flex justify-center gap-2 py-4 bg-gray-50">
                    {ONBOARDING_STEPS.map((_, idx) => (
                        <div
                            key={idx}
                            className={`w-2 h-2 rounded-full transition-all ${idx === currentStep
                                ? 'bg-[#26A69A] w-6'
                                : idx < currentStep
                                    ? 'bg-[#26A69A]/50'
                                    : 'bg-gray-300'
                                }`}
                        />
                    ))}
                </div>

                {/* Content */}
                <div className="px-6 py-6">
                    <div className="text-center">
                        <span className="text-4xl mb-4 block">{step.emoji}</span>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{step.title}</h3>
                        <p className="text-gray-600 leading-relaxed">{step.description}</p>
                    </div>
                </div>

                {/* Actions */}
                <div className="px-6 pb-6 flex gap-3">
                    <button
                        onClick={handleSkip}
                        className="flex-1 py-3 text-gray-500 hover:text-gray-700 transition-colors text-sm"
                    >
                        Пропустить
                    </button>
                    <button
                        onClick={handleNext}
                        className="flex-1 py-3 bg-[#26A69A] hover:bg-[#1f8f84] text-white rounded-xl font-semibold transition-colors shadow-lg hover:shadow-xl"
                    >
                        {isLastStep ? 'Начать!' : 'Далее'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OnboardingOverlay;
