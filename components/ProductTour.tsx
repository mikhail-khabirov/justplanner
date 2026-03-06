import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, MousePointerClick, GripVertical } from 'lucide-react';
import { safeLocalStorage } from '../utils';

interface ProductTourProps {
    isOpen: boolean;
    userId?: string;
    onComplete: () => void;
}

interface SpotlightRect {
    top: number;
    left: number;
    width: number;
    height: number;
}

const TOUR_STEPS = [
    {
        id: 'create-task',
        emoji: '👆',
        icon: MousePointerClick,
        title: 'Создайте первую задачу',
        description: 'Просто кликните по любой ячейке — создание задачи займёт 5 секунд',
        selector: '[data-tour="create-task"]',
        tooltipPosition: 'right' as const,
    },
    {
        id: 'drag-drop',
        emoji: '✋',
        icon: GripVertical,
        title: 'Перетаскивайте задачи',
        description: 'Зажмите задачу и перетащите на любой день или час. Работает и на мобильных!',
        selector: '[data-tour="drag-task"]',
        tooltipPosition: 'right' as const,
    },
];

const ProductTour: React.FC<ProductTourProps> = ({ isOpen, userId, onComplete }) => {
    const [step, setStep] = useState(0);
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
            // If element not found, skip to next step or complete
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

        if (isMobile) {
            // On mobile: position below the spotlight
            const tooltipTop = spotRect.top + spotRect.height + 16;
            const tooltipLeft = Math.max(16, Math.min(
                spotRect.left + spotRect.width / 2 - tooltipWidth / 2,
                window.innerWidth - tooltipWidth - 16
            ));
            setTooltipStyle({
                position: 'fixed',
                top: tooltipTop,
                left: tooltipLeft,
                width: tooltipWidth,
            });
            setArrowDirection('top');
            setArrowStyle({
                position: 'absolute',
                top: -6,
                left: Math.min(Math.max(spotRect.left + spotRect.width / 2 - tooltipLeft - 6, 12), tooltipWidth - 24),
            });
        } else {
            // On desktop: position to the right of the spotlight
            const tooltipLeft = spotRect.left + spotRect.width + 16;
            const tooltipTop = spotRect.top + spotRect.height / 2 - 60;

            // If not enough space on the right, position below
            if (tooltipLeft + tooltipWidth > window.innerWidth - 16) {
                const altTop = spotRect.top + spotRect.height + 16;
                const altLeft = Math.max(16, spotRect.left + spotRect.width / 2 - tooltipWidth / 2);
                setTooltipStyle({
                    position: 'fixed',
                    top: altTop,
                    left: altLeft,
                    width: tooltipWidth,
                });
                setArrowDirection('top');
                setArrowStyle({
                    position: 'absolute',
                    top: -6,
                    left: Math.min(Math.max(spotRect.left + spotRect.width / 2 - altLeft - 6, 12), tooltipWidth - 24),
                });
            } else {
                setTooltipStyle({
                    position: 'fixed',
                    top: Math.max(16, tooltipTop),
                    left: tooltipLeft,
                    width: tooltipWidth,
                });
                setArrowDirection('left');
                setArrowStyle({
                    position: 'absolute',
                    left: -6,
                    top: Math.min(spotRect.top + spotRect.height / 2 - Math.max(16, tooltipTop) - 6, 100),
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
            setStep(s => s + 1);
        } else {
            handleComplete();
        }
    };

    if (!isOpen || !spotlight) return null;

    const currentStep = TOUR_STEPS[step];

    return (
        <div className="fixed inset-0 z-[60]" onClick={handleNext}>
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
                }}
            />

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
