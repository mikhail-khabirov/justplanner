import React, { useState } from 'react';
import { Bell, X, MessageSquare, Smartphone, Globe } from 'lucide-react';

interface NotificationSurveyProps {
    token: string | null;
    onDone: () => void;
}

const OPTIONS = [
    { id: 'telegram', label: 'В Telegram', icon: <Smartphone size={20} /> },
    { id: 'browser', label: 'В браузере', icon: <Globe size={20} /> },
    { id: 'both', label: 'И там, и там', icon: <Bell size={20} /> },
    { id: 'custom', label: 'Свой вариант', icon: <MessageSquare size={20} /> },
];

const NotificationSurvey: React.FC<NotificationSurveyProps> = ({ token, onDone }) => {
    const [selected, setSelected] = useState<string | null>(null);
    const [customText, setCustomText] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!selected) return;
        if (selected === 'custom' && !customText.trim()) return;
        setLoading(true);
        try {
            await fetch('/api/settings/survey', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                credentials: 'include',
                body: JSON.stringify({ answer: selected, customText: customText.trim() || undefined }),
            });
        } catch (e) {
            console.error('Survey submit error:', e);
        } finally {
            setLoading(false);
            onDone();
        }
    };

    const handleSkip = async () => {
        try {
            await fetch('/api/settings/survey', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                credentials: 'include',
                body: JSON.stringify({ answer: 'skip' }),
            });
        } catch (e) {
            console.error('Survey skip error:', e);
        } finally {
            onDone();
        }
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in fade-in zoom-in duration-300">
                <button
                    onClick={handleSkip}
                    className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100 transition-colors text-gray-400"
                >
                    <X size={18} />
                </button>

                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-[#26A69A]/10 rounded-full flex items-center justify-center">
                        <Bell size={20} className="text-[#26A69A]" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Быстрый вопрос</p>
                        <h2 className="text-base font-semibold text-gray-900 leading-tight">Внедряем напоминания о задачах</h2>
                    </div>
                </div>

                <p className="text-sm text-gray-600 mb-4">
                    Где вам удобнее получать напоминания?
                </p>

                <div className="space-y-2 mb-4">
                    {OPTIONS.map((opt) => (
                        <button
                            key={opt.id}
                            onClick={() => setSelected(opt.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left ${
                                selected === opt.id
                                    ? 'border-[#26A69A] bg-[#26A69A]/5 text-[#26A69A]'
                                    : 'border-gray-100 hover:border-gray-200 text-gray-700'
                            }`}
                        >
                            <span className={selected === opt.id ? 'text-[#26A69A]' : 'text-gray-400'}>
                                {opt.icon}
                            </span>
                            <span className="text-sm font-medium">{opt.label}</span>
                        </button>
                    ))}
                </div>

                {selected === 'custom' && (
                    <input
                        type="text"
                        value={customText}
                        onChange={(e) => setCustomText(e.target.value)}
                        placeholder="Напишите свой вариант..."
                        className="w-full mb-4 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#26A69A]"
                        autoFocus
                    />
                )}

                <button
                    onClick={handleSubmit}
                    disabled={!selected || (selected === 'custom' && !customText.trim()) || loading}
                    className="w-full py-3 rounded-xl font-semibold text-white bg-[#26A69A] hover:bg-[#1a9688] transition-colors disabled:opacity-40"
                >
                    {loading ? 'Отправка...' : 'Ответить'}
                </button>
            </div>
        </div>
    );
};

export default NotificationSurvey;
