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
            className="fixed bottom-20 right-5 z-50 flex items-center gap-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white pl-5 pr-6 py-3.5 rounded-2xl shadow-xl shadow-amber-500/40 hover:shadow-2xl hover:shadow-amber-500/50 hover:scale-105 transition-all cursor-pointer group animate-bounce-slow"
            style={{ animation: 'pulse-glow 2s ease-in-out infinite' }}
        >
            <style>{`
                @keyframes pulse-glow {
                    0%, 100% { box-shadow: 0 10px 25px -5px rgba(245,158,11,0.4); }
                    50% { box-shadow: 0 10px 40px -5px rgba(245,158,11,0.6); }
                }
            `}</style>
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center group-hover:bg-white/30 transition-colors">
                <Crown size={20} />
            </div>
            <div className="flex flex-col items-start">
                <span className="text-sm font-bold leading-tight">−50% на 1 год</span>
                <div className="flex items-center gap-1 mt-0.5">
                    <Clock size={12} className="opacity-80" />
                    <span className="text-xs font-mono font-bold opacity-90">
                        {formatCountdown(remaining)}
                    </span>
                </div>
            </div>
        </button>
    );
};

export default AnnualOfferWidget;
