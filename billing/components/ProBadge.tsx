import React from 'react';
import { Crown } from 'lucide-react';

interface ProBadgeProps {
    size?: 'sm' | 'md';
    className?: string;
}

/**
 * Pro badge component shown for premium users
 */
const ProBadge: React.FC<ProBadgeProps> = ({ size = 'md', className = '' }) => {
    const sizeStyles = {
        sm: 'px-1.5 py-0.5 text-[10px] gap-0.5',
        md: 'px-2 py-1 text-xs gap-1'
    };

    const iconSize = size === 'sm' ? 10 : 12;

    return (
        <div
            className={`
                inline-flex items-center ${sizeStyles[size]}
                bg-gradient-to-r from-amber-400 to-orange-500
                text-white font-bold rounded-full
                shadow-sm
                ${className}
            `}
        >
            <Crown size={iconSize} className="fill-white/30" />
            <span>Pro</span>
        </div>
    );
};

export default ProBadge;
