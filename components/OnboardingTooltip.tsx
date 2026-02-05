import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { safeLocalStorage } from '../utils';

interface OnboardingTooltipProps {
    id: string; // unique key for localStorage
    children: React.ReactNode;
    position?: 'top' | 'bottom' | 'left' | 'right';
    arrowPosition?: 'start' | 'center' | 'end';
}

const OnboardingTooltip: React.FC<OnboardingTooltipProps> = ({
    id,
    children,
    position = 'bottom',
    arrowPosition = 'center'
}) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const key = `onboarding_${id}`;
        const dismissed = safeLocalStorage.getItem(key);
        if (!dismissed) {
            // Small delay so UI renders first
            const timer = setTimeout(() => setIsVisible(true), 500);
            return () => clearTimeout(timer);
        }
    }, [id]);

    const handleDismiss = () => {
        safeLocalStorage.setItem(`onboarding_${id}`, 'true');
        setIsVisible(false);
    };

    if (!isVisible) return null;

    // Arrow positioning
    const getArrowClasses = () => {
        const arrowBase = 'absolute w-3 h-3 bg-white transform rotate-45 border';

        if (position === 'bottom') {
            const horizontal = arrowPosition === 'start' ? 'left-4' : arrowPosition === 'end' ? 'right-4' : 'left-1/2 -translate-x-1/2';
            return `${arrowBase} -top-1.5 ${horizontal} border-t border-l border-gray-200`;
        }
        if (position === 'top') {
            const horizontal = arrowPosition === 'start' ? 'left-4' : arrowPosition === 'end' ? 'right-4' : 'left-1/2 -translate-x-1/2';
            return `${arrowBase} -bottom-1.5 ${horizontal} border-b border-r border-gray-200`;
        }
        if (position === 'right') {
            return `${arrowBase} -left-1.5 top-1/2 -translate-y-1/2 border-l border-b border-gray-200`;
        }
        if (position === 'left') {
            return `${arrowBase} -right-1.5 top-1/2 -translate-y-1/2 border-r border-t border-gray-200`;
        }
        return arrowBase;
    };

    // Tooltip positioning
    const getTooltipClasses = () => {
        const base = 'absolute z-50 animate-in fade-in slide-in-from-bottom-2 duration-300';

        if (position === 'bottom') {
            const horizontal = arrowPosition === 'start' ? 'left-0' : arrowPosition === 'end' ? 'right-0' : 'left-1/2 -translate-x-1/2';
            return `${base} top-full mt-3 ${horizontal}`;
        }
        if (position === 'top') {
            const horizontal = arrowPosition === 'start' ? 'left-0' : arrowPosition === 'end' ? 'right-0' : 'left-1/2 -translate-x-1/2';
            return `${base} bottom-full mb-3 ${horizontal}`;
        }
        if (position === 'right') {
            return `${base} left-full ml-3 top-1/2 -translate-y-1/2`;
        }
        if (position === 'left') {
            return `${base} right-full mr-3 top-1/2 -translate-y-1/2`;
        }
        return base;
    };

    return (
        <div className={getTooltipClasses()}>
            <div className="relative bg-white rounded-xl shadow-xl border border-gray-200 px-4 py-3 max-w-xs">
                {/* Arrow */}
                <div className={getArrowClasses()} />

                {/* Close button */}
                <button
                    onClick={handleDismiss}
                    className="absolute -top-2 -right-2 p-1 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors shadow-sm"
                >
                    <X size={12} className="text-gray-500" />
                </button>

                {/* Content */}
                <div className="text-sm text-gray-700">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default OnboardingTooltip;
