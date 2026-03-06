import React, { useState } from 'react';
import { X, Clock, Trash2, AlertTriangle, Crown, RefreshCw, Send } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { toISODate } from '../utils';
import { SubscriptionStatus, useBilling } from '../billing';

interface SettingsModalProps {
    onClose: () => void;
    currentDate?: Date;
    onTasksDeleted?: () => void;
    telegramLinked?: boolean;
    onConnectTelegram?: () => void;
    onDisconnectTelegram?: () => void;
}

const DAY_START_OPTIONS = [5, 6, 7, 8, 9, 10];

const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, currentDate, onTasksDeleted, telegramLinked, onConnectTelegram, onDisconnectTelegram }) => {
    const { settings, updateSettings } = useSettings();
    const { token, isAuthenticated } = useAuth();
    const { isPremium, startPayment } = useBilling();
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDeleteWeek = async () => {
        if (!currentDate || !isAuthenticated || !token) return;

        if (!window.confirm('Вы уверены, что хотите удалить ВСЕ задачи текущей недели? Это действие нельзя отменить.')) {
            return;
        }

        setIsDeleting(true);
        try {
            // Generate IDs for the 7 days of the current week
            const columnIds = [];
            for (let i = 0; i < 7; i++) {
                const date = new Date(currentDate);
                date.setDate(currentDate.getDate() + i);
                columnIds.push(toISODate(date));
            }

            const response = await fetch('/api/tasks/batch-delete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ columnIds })
            });

            if (response.ok) {
                if (onTasksDeleted) onTasksDeleted();
                onClose();
            } else {
                alert('Ошибка при удалении задач');
            }
        } catch (error) {
            console.error('Delete error:', error);
            alert('Ошибка сети');
        } finally {
            setIsDeleting(false);
        }
    };

    // Analytics: Track virtual page view
    React.useEffect(() => {
        const ym = (window as any).ym;
        if (typeof ym === 'function') {
            ym(106590123, 'hit', '/app/settings', {
                title: 'JustPlanner - Настройки',
                referer: window.location.href
            });
        }
    }, []);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-gray-900/20 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden" data-tour="settings-content">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-gray-900">Настройки</h2>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-gray-400 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="px-6 py-5 space-y-8 max-h-[70vh] overflow-y-auto">
                    {/* Subscription Status - only for authenticated users */}
                    {isAuthenticated && (
                        <div className="pb-4 border-b border-gray-100" data-tour="settings-pro">
                            <SubscriptionStatus />
                        </div>
                    )}

                    {/* Day Start Hour Setting */}
                    <div className="space-y-3" data-tour="settings-day-start">
                        <div className="flex items-center gap-2 text-gray-700">
                            <Clock size={18} />
                            <span className="font-medium">Начало рабочего дня</span>
                            {!isPremium && (
                                <span className="ml-auto flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-200">
                                    <Crown size={12} />
                                    Pro
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-gray-500">
                            Выберите час, с которого начинается отображение дня в календаре
                        </p>
                        <div className="grid grid-cols-6 gap-2">
                            {DAY_START_OPTIONS.map(hour => (
                                <button
                                    key={hour}
                                    onClick={() => {
                                        if (isPremium) {
                                            updateSettings({ dayStartHour: hour });
                                        }
                                    }}
                                    disabled={!isPremium}
                                    className={`
                    py-2 px-3 rounded-lg text-sm font-medium transition-all
                    ${settings.dayStartHour === hour
                                            ? 'bg-blue-600 text-white shadow-md'
                                            : isPremium
                                                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                                        }
                  `}
                                >
                                    {hour}:00
                                </button>
                            ))}
                        </div>
                        {isPremium ? (
                            <p className="text-xs text-gray-400 mt-2">
                                Задачи, назначенные на более раннее время, будут отображаться в свёрнутой секции
                            </p>
                        ) : (
                            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
                                <Crown size={16} className="text-amber-600 shrink-0" />
                                <p className="text-sm text-amber-700 font-medium">
                                    Оформите Pro подписку, чтобы выбрать начало дня
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Auto Rollover Setting */}
                    <div className="space-y-3 pt-4 border-t border-gray-100" data-tour="settings-rollover">
                        <div className="flex items-center gap-2 text-gray-700">
                            <RefreshCw size={18} />
                            <span className="font-medium">Перенос незакрытых задач</span>
                            {!isPremium && (
                                <span className="ml-auto flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-200">
                                    <Crown size={12} />
                                    Pro
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-gray-500">
                            После полуночи незакрытые задачи прошлых дней автоматически переносятся на сегодня
                        </p>
                        {isPremium ? (
                            <button
                                onClick={() => updateSettings({ autoRollover: !settings.autoRollover })}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${settings.autoRollover ? 'bg-blue-600' : 'bg-gray-200'}`}
                                role="switch"
                                aria-checked={!!settings.autoRollover}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${settings.autoRollover ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        ) : (
                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
                                <Crown size={16} className="text-amber-600 shrink-0" />
                                <p className="text-sm text-amber-700 font-medium">
                                    Оформите Pro подписку, чтобы включить перенос задач
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Section Names Setting */}
                    <div className="space-y-3 pt-4 border-t border-gray-100" data-tour="settings-sections">
                        <div className="flex items-center gap-2 text-gray-700">
                            <span className="font-medium">Названия разделов</span>
                            {!isPremium && (
                                <span className="ml-auto flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-200">
                                    <Crown size={12} />
                                    Pro
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-gray-500">
                            Переименуйте разделы бэклога под свои задачи
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { id: 'inbox', label: 'Входящие' },
                                { id: 'urgent', label: 'Срочно' },
                                { id: 'someday', label: 'Когда-нибудь' },
                                { id: 'ideas', label: 'Идеи' }
                            ].map(section => (
                                <div key={section.id} className="space-y-1">
                                    <label className="text-xs text-gray-500">{section.label}</label>
                                    <input
                                        type="text"
                                        value={settings.sectionNames?.[section.id as keyof typeof settings.sectionNames] || section.label}
                                        onChange={(e) => {
                                            if (isPremium) {
                                                updateSettings({
                                                    sectionNames: {
                                                        ...settings.sectionNames,
                                                        [section.id]: e.target.value || section.label
                                                    }
                                                });
                                            }
                                        }}
                                        disabled={!isPremium}
                                        placeholder={section.label}
                                        className={`w-full px-3 py-2 text-sm border rounded-lg transition-colors ${isPremium
                                            ? 'border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                                            : 'bg-gray-50 border-gray-100 text-gray-400 cursor-not-allowed'
                                            }`}
                                    />
                                </div>
                            ))}
                        </div>
                        {!isPremium && (
                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
                                <Crown size={16} className="text-amber-600 shrink-0" />
                                <p className="text-sm text-amber-700 font-medium">
                                    Оформите Pro подписку, чтобы переименовать разделы
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Telegram Section */}
                    {isAuthenticated && (
                        <div className="space-y-3 pt-4 border-t border-gray-100">
                            <div className="flex items-center gap-2 text-gray-700">
                                <Send size={18} />
                                <span className="font-medium">Telegram-уведомления</span>
                                {!isPremium && (
                                    <span className="ml-auto flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-200">
                                        <Crown size={12} />
                                        Pro
                                    </span>
                                )}
                            </div>
                            <p className="text-sm text-gray-500">
                                Подключите Telegram, чтобы получать напоминания о задачах
                            </p>
                            {isPremium ? (
                                telegramLinked ? (
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-green-600 font-medium flex items-center gap-2">
                                            ✅ Telegram подключён
                                        </span>
                                        <button
                                            onClick={onDisconnectTelegram}
                                            className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                                        >
                                            Отключить
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={onConnectTelegram}
                                        className="w-full py-2.5 px-4 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Send size={16} />
                                        Подключить Telegram
                                    </button>
                                )
                            ) : (
                                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
                                    <Crown size={16} className="text-amber-600 shrink-0" />
                                    <p className="text-sm text-amber-700 font-medium">
                                        Оформите Pro подписку для Telegram-уведомлений
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Danger Zone */}
                    {isAuthenticated && (
                        <div className="pt-6 border-t border-gray-100 space-y-3">
                            <div className="flex items-center gap-2 text-red-600">
                                <AlertTriangle size={18} />
                                <span className="font-medium">Опасная зона</span>
                            </div>
                            <p className="text-sm text-gray-500">
                                Действия в этом разделе необратимы
                            </p>
                            <button
                                onClick={handleDeleteWeek}
                                disabled={isDeleting}
                                className="w-full py-3 px-4 border border-red-200 bg-red-50 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isDeleting ? 'Удаление...' : (
                                    <>
                                        <Trash2 size={16} />
                                        Очистить текущую неделю
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                    <button
                        onClick={onClose}
                        className="w-full py-2.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
                    >
                        Готово
                    </button>
                </div>
            </div>
        </div >
    );
};

export default SettingsModal;
