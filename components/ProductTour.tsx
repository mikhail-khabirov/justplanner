import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, MousePointerClick, GripVertical, Layers, Send, Bell, TrendingUp, Inbox, Settings, Clock, RefreshCw, Crown, PenLine } from 'lucide-react';
import { safeLocalStorage } from '../utils';

interface ProductTourProps {
    isOpen: boolean;
    userId?: string;
    todayISO?: string;
    onComplete: () => void;
    onCreateDemoTask?: (stepId: string) => void;
}

interface SpotlightRect {
    top: number;
    left: number;
    width: number;
    height: number;
}

const getTourSteps = (todayISO: string) => [
    {
        id: 'create-task',
        emoji: '👆',
        icon: MousePointerClick,
        title: 'Создайте первую задачу',
        description: 'Просто кликните по любой ячейке — создание задачи займёт 5 секунд',
        selector: '[data-tour="create-task"]',
    },
    {
        id: 'drag-drop',
        emoji: '✋',
        icon: GripVertical,
        title: 'Перетаскивайте задачи',
        description: 'Зажмите задачу и перетащите на любой день или час. Работает и на мобильных!',
        selector: `[data-column="${todayISO}"][data-hour="10"]`,
    },
    {
        id: 'multi-task',
        emoji: '📚',
        icon: Layers,
        title: 'До 3 задач в час',
        description: 'В каждый часовой слот можно добавить до 3 задач — группируйте дела по времени',
        selector: `[data-column="${todayISO}"][data-hour="10"]`,
    },
    {
        id: 'telegram-btn',
        emoji: '✉️',
        icon: Send,
        title: 'Подключите Telegram',
        description: 'Привяжите Telegram и получайте напоминания о задачах прямо в мессенджер',
        selector: '[data-tour="telegram-btn"]',
    },
    {
        id: 'reminder-section',
        emoji: '🔔',
        icon: Bell,
        title: 'Настройте напоминания',
        description: 'Откройте задачу и выберите время напоминания — бот пришлёт уведомление в Telegram',
        selector: '[data-tour="reminder-section"]',
    },
    {
        id: 'stats-widget',
        emoji: '📈',
        icon: TrendingUp,
        title: 'Отслеживайте прогресс',
        description: 'Здесь видно сколько задач выполнено сегодня, за неделю и месяц — следите за своей эффективностью!',
        selector: '[data-tour="stats-widget"]',
    },
    {
        id: 'backlog-section',
        emoji: '📥',
        icon: Inbox,
        title: 'Бэклог для идей',
        description: 'Внизу — 4 раздела: Входящие, Срочно, Достижения и Когда-нибудь. Записывайте сюда всё, что пока не привязано ко времени',
        selector: '[data-tour="backlog-section"]',
    },
    {
        id: 'settings-day-start',
        emoji: '⏰',
        icon: Clock,
        title: 'Начало рабочего дня',
        description: 'Выберите час, с которого начинается ваш день — календарь подстроится',
        selector: '[data-tour="settings-day-start"]',
    },
    {
        id: 'settings-rollover',
        emoji: '🔄',
        icon: RefreshCw,
        title: 'Перенос задач',
        description: 'Незакрытые задачи автоматически переносятся на сегодня — ничего не потеряется',
        selector: '[data-tour="settings-rollover"]',
    },
    {
        id: 'settings-sections',
        emoji: '✏️',
        icon: PenLine,
        title: 'Названия разделов',
        description: 'Переименуйте разделы бэклога под свои задачи — например, «Работа» или «Личное»',
        selector: '[data-tour="settings-sections"]',
    },
    {
        id: 'settings-pro',
        emoji: '👑',
        icon: Crown,
        title: 'Разблокируйте все функции',
        description: 'Перейдите на Pro и получите напоминания, настройку рабочего дня, перенос задач и многое другое',
        selector: '[data-tour="settings-pro"]',
    },
];

const ProductTour: React.FC<ProductTourProps> = ({ isOpen, userId, todayISO, onComplete, onCreateDemoTask }) => {
    const [step, setStep] = useState(0);
    const TOUR_STEPS = getTourSteps(todayISO || '');
    const [spotlight, setSpotlight] = useState<SpotlightRect | null>(null);
    const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
    const [arrowStyle, setArrowStyle] = useState<React.CSSProperties>({});
    const [arrowDirection, setArrowDirection] = useState<'left' | 'top'>('left');
    const rafRef = useRef<number>(0);

    const positionSpotlight = useCallback(() => {
        const currentStep = TOUR_STEPS[step];
        if (!currentStep) return;

        const el = document.querySelector(currentStep.selector);
        if (!el) {
            // If element not found and we already tried creating, skip
            if (step < TOUR_STEPS.length - 1) {
                setStep(s => s + 1);
            } else {
                handleComplete();
            }
            return;
        }

        const rect = el.getBoundingClientRect();
        const padding = 8;

        const spotRect = {
            top: rect.top - padding,
            left: rect.left - padding,
            width: rect.width + padding * 2,
            height: rect.height + padding * 2,
        };
        setSpotlight(spotRect);

        // Position tooltip
        const isMobile = window.innerWidth < 640;
        const tooltipWidth = Math.min(280, window.innerWidth - 32);
        const tooltipHeight = 160; // approximate
        const vh = window.innerHeight;

        if (isMobile) {
            // On mobile: position below or above the spotlight
            const spaceBelow = vh - (spotRect.top + spotRect.height);
            if (spaceBelow > tooltipHeight + 32) {
                // Below
                const tooltipTop = spotRect.top + spotRect.height + 16;
                const tooltipLeft = Math.max(16, Math.min(
                    spotRect.left + spotRect.width / 2 - tooltipWidth / 2,
                    window.innerWidth - tooltipWidth - 16
                ));
                setTooltipStyle({ position: 'fixed', top: tooltipTop, left: tooltipLeft, width: tooltipWidth });
                setArrowDirection('top');
                setArrowStyle({
                    position: 'absolute', top: -6,
                    left: Math.min(Math.max(spotRect.left + spotRect.width / 2 - tooltipLeft - 6, 12), tooltipWidth - 24),
                });
            } else {
                // Above
                const tooltipTop = spotRect.top - tooltipHeight - 16;
                const tooltipLeft = Math.max(16, Math.min(
                    spotRect.left + spotRect.width / 2 - tooltipWidth / 2,
                    window.innerWidth - tooltipWidth - 16
                ));
                setTooltipStyle({ position: 'fixed', top: Math.max(16, tooltipTop), left: tooltipLeft, width: tooltipWidth });
                setArrowDirection('top'); // arrow on bottom pointing down
                setArrowStyle({
                    position: 'absolute', bottom: -6, top: 'auto' as any,
                    left: Math.min(Math.max(spotRect.left + spotRect.width / 2 - tooltipLeft - 6, 12), tooltipWidth - 24),
                });
            }
        } else {
            // Desktop: check bottom first, then right, then below
            const spaceBelow = vh - (spotRect.top + spotRect.height);
            const spaceAbove = spotRect.top;
            const hasSpaceRight = (spotRect.left + spotRect.width + 16 + tooltipWidth) <= window.innerWidth - 16;
            const isNearBottom = spaceBelow < tooltipHeight + 60;

            if (isNearBottom && spaceAbove > tooltipHeight + 32) {
                // Above element (priority when at bottom of screen)
                const altTop = spotRect.top - tooltipHeight - 16;
                const altLeft = Math.max(16, Math.min(
                    spotRect.left + spotRect.width / 2 - tooltipWidth / 2,
                    window.innerWidth - tooltipWidth - 16
                ));
                setTooltipStyle({ position: 'fixed', top: Math.max(16, altTop), left: altLeft, width: tooltipWidth });
                setArrowDirection('top');
                setArrowStyle({
                    position: 'absolute', bottom: -6, top: 'auto' as any,
                    left: Math.min(Math.max(spotRect.left + spotRect.width / 2 - altLeft - 6, 12), tooltipWidth - 24),
                });
            } else if (hasSpaceRight) {
                // Right of element
                const tooltipLeft = spotRect.left + spotRect.width + 16;
                const tooltipTop = spotRect.top + spotRect.height / 2 - 60;
                setTooltipStyle({
                    position: 'fixed',
                    top: Math.max(16, Math.min(tooltipTop, vh - tooltipHeight - 16)),
                    left: tooltipLeft,
                    width: tooltipWidth,
                });
                setArrowDirection('left');
                setArrowStyle({
                    position: 'absolute', left: -6,
                    top: Math.min(spotRect.top + spotRect.height / 2 - Math.max(16, Math.min(tooltipTop, vh - tooltipHeight - 16)) - 6, 100),
                });
            } else {
                // Below element
                const altTop = spotRect.top + spotRect.height + 16;
                const altLeft = Math.max(16, Math.min(
                    spotRect.left + spotRect.width / 2 - tooltipWidth / 2,
                    window.innerWidth - tooltipWidth - 16
                ));
                setTooltipStyle({ position: 'fixed', top: altTop, left: altLeft, width: tooltipWidth });
                setArrowDirection('top');
                setArrowStyle({
                    position: 'absolute', top: -6,
                    left: Math.min(Math.max(spotRect.left + spotRect.width / 2 - altLeft - 6, 12), tooltipWidth - 24),
                });
            }
        }
    }, [step]);

    useEffect(() => {
        if (!isOpen) return;

        // Initial position
        const timer = setTimeout(positionSpotlight, 100);

        // Reposition on scroll/resize
        const handleUpdate = () => {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = requestAnimationFrame(positionSpotlight);
        };

        window.addEventListener('resize', handleUpdate);
        window.addEventListener('scroll', handleUpdate, true);

        return () => {
            clearTimeout(timer);
            cancelAnimationFrame(rafRef.current);
            window.removeEventListener('resize', handleUpdate);
            window.removeEventListener('scroll', handleUpdate, true);
        };
    }, [isOpen, positionSpotlight]);

    const handleComplete = useCallback(() => {
        const key = `tour_complete_${userId || 'default'}`;
        safeLocalStorage.setItem(key, 'true');
        setStep(0);
        setSpotlight(null);
        onComplete();
    }, [userId, onComplete]);

    const handleNext = () => {
        if (step < TOUR_STEPS.length - 1) {
            const nextStep = step + 1;
            const nextStepDef = TOUR_STEPS[nextStep];

            // Call onCreateDemoTask for steps that need setup
            if (onCreateDemoTask) {
                onCreateDemoTask(nextStepDef.id);
                // Wait for react to render changes, then advance
                setTimeout(() => {
                    setStep(nextStep);
                }, 400);
                return;
            }

            setStep(nextStep);
        } else {
            handleComplete();
        }
    };

    if (!isOpen || !spotlight) return null;

    const currentStep = TOUR_STEPS[step];

    return (
        <div className="fixed inset-0 z-[60]" onClick={handleNext}>
            {/* CSS animations for drag demo */}
            <style>{`
                @keyframes tour-drag-hand {
                    0% { transform: translate(0, 0) scale(1); opacity: 0; }
                    10% { transform: translate(0, 0) scale(1); opacity: 1; }
                    25% { transform: translate(0, -2px) scale(1.1); }
                    40% { transform: translate(60px, -15px) scale(1.1); }
                    70% { transform: translate(80px, -20px) scale(1.1); }
                    85% { transform: translate(80px, -20px) scale(1); opacity: 0.5; }
                    100% { transform: translate(0, 0) scale(1); opacity: 0; }
                }
                @keyframes tour-task-wiggle {
                    0%, 100% { transform: translateX(0); }
                    15% { transform: translateX(0); }
                    25% { transform: translateX(2px) rotate(0.5deg); }
                    40% { transform: translateX(60px) rotate(1deg); }
                    70% { transform: translateX(80px) rotate(0.5deg); }
                    85% { transform: translateX(0) rotate(0deg); }
                }
            `}</style>

            {/* Overlay with spotlight cutout using box-shadow */}
            <div
                className="fixed z-[60] rounded-xl transition-all duration-500 ease-out"
                style={{
                    top: spotlight.top,
                    left: spotlight.left,
                    width: spotlight.width,
                    height: spotlight.height,
                    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.55)',
                    pointerEvents: 'none',
                    ...(currentStep.id === 'drag-drop' ? {
                        animation: 'tour-task-wiggle 3s ease-in-out infinite',
                    } : {}),
                }}
            />

            {/* Spotlight border glow */}
            <div
                className="fixed z-[61] rounded-xl border-2 border-[#26A69A]/60 transition-all duration-500 ease-out pointer-events-none"
                style={{
                    top: spotlight.top,
                    left: spotlight.left,
                    width: spotlight.width,
                    height: spotlight.height,
                    boxShadow: '0 0 20px rgba(38, 166, 154, 0.3), inset 0 0 20px rgba(38, 166, 154, 0.1)',
                    ...(currentStep.id === 'drag-drop' ? {
                        animation: 'tour-task-wiggle 3s ease-in-out infinite',
                    } : {}),
                }}
            />

            {/* Animated drag hand cursor on step 2 */}
            {currentStep.id === 'drag-drop' && (
                <div
                    className="fixed z-[62] pointer-events-none"
                    style={{
                        top: spotlight.top + spotlight.height / 2 - 12,
                        left: spotlight.left + 20,
                        animation: 'tour-drag-hand 3s ease-in-out infinite',
                        fontSize: 28,
                    }}
                >
                    👆
                </div>
            )}

            {/* Tooltip */}
            <div
                className="fixed z-[62] animate-in fade-in slide-in-from-bottom-2 duration-300"
                style={tooltipStyle}
                onClick={e => e.stopPropagation()}
            >
                <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
                    {/* Arrow */}
                    <div
                        className="absolute w-3 h-3 bg-white transform rotate-45 border-gray-200 z-10"
                        style={{
                            ...arrowStyle,
                            borderLeft: arrowDirection === 'left' ? '1px solid #e5e7eb' : 'none',
                            borderBottom: arrowDirection === 'left' ? '1px solid #e5e7eb' : 'none',
                            borderTop: arrowDirection === 'top' ? '1px solid #e5e7eb' : 'none',
                            borderLeft2: arrowDirection === 'top' ? '1px solid #e5e7eb' : 'none',
                        }}
                    />

                    {/* Step counter + close */}
                    <div className="flex items-center justify-between px-4 pt-3 pb-1">
                        <div className="flex items-center gap-2">
                            {TOUR_STEPS.map((_, idx) => (
                                <div
                                    key={idx}
                                    className={`h-1.5 rounded-full transition-all ${idx === step ? 'bg-[#26A69A] w-6' : idx < step ? 'bg-[#26A69A]/40 w-1.5' : 'bg-gray-200 w-1.5'
                                        }`}
                                />
                            ))}
                        </div>
                        <button
                            onClick={handleComplete}
                            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X size={14} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="px-4 pb-2 pt-1">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#26A69A]/10 flex items-center justify-center shrink-0 mt-0.5">
                                <currentStep.icon size={20} className="text-[#26A69A]" />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900 text-[15px] leading-tight">{currentStep.title}</h4>
                                <p className="text-gray-500 text-[13px] leading-relaxed mt-1">{currentStep.description}</p>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="px-4 pb-3 flex justify-end">
                        <button
                            onClick={handleNext}
                            className="px-4 py-2 bg-[#26A69A] hover:bg-[#1f8f84] text-white rounded-xl text-sm font-semibold transition-colors shadow-md hover:shadow-lg"
                        >
                            {step < TOUR_STEPS.length - 1 ? 'Далее →' : 'Понятно! 🎉'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductTour;
