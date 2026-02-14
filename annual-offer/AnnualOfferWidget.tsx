import React from 'react';
import { Crown, Clock } from 'lucide-react';
import { useCountdown } from './useCountdown';
import { formatCountdown } from './utils';

interface AnnualOfferWidgetProps {
    visible: boolean;
    onClick: () => void;
}

const AnnualOfferWidget: React.FC<AnnualOfferWidgetProps> = ({ visible, onClick }) => {
    const remaining = useCountdown();

    if (!visible || remaining <= 0) return null;

    return (
        <button
            onClick={onClick}
            className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white pl-4 pr-5 py-3 rounded-full shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 hover:scale-105 transition-all cursor-pointer group"
        >
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center group-hover:bg-white/30 transition-colors">
                <Crown size={16} />
            </div>
            <div className="flex flex-col items-start">
                <span className="text-xs font-semibold leading-tight">Скидка 50%</span>
                <div className="flex items-center gap-1">
                    <Clock size={11} className="opacity-80" />
                    <span className="text-xs font-mono font-bold opacity-90">
                        {formatCountdown(remaining)}
                    </span>
                </div>
            </div>
        </button>
    );
};

export default AnnualOfferWidget;
