import React, { useState } from 'react';
import { X, Clock, Trash2, AlertTriangle } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { toISODate } from '../utils';
import { SubscriptionStatus } from '../billing';

interface SettingsModalProps {
    onClose: () => void;
    currentDate?: Date;
    onTasksDeleted?: () => void;
}

const DAY_START_OPTIONS = [5, 6, 7, 8, 9, 10];

const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, currentDate, onTasksDeleted }) => {
    const { settings, updateSettings } = useSettings();
    const { token, isAuthenticated } = useAuth();
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
            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
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
                <div className="px-6 py-5 space-y-8">
                    {/* Day Start Hour Setting */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-gray-700">
                            <Clock size={18} />
                            <span className="font-medium">Начало рабочего дня</span>
                        </div>
                        <p className="text-sm text-gray-500">
                            Выберите час, с которого начинается отображение дня в календаре
                        </p>
                        <div className="grid grid-cols-6 gap-2">
                            {DAY_START_OPTIONS.map(hour => (
                                <button
                                    key={hour}
                                    onClick={() => updateSettings({ dayStartHour: hour })}
                                    className={`
                    py-2 px-3 rounded-lg text-sm font-medium transition-all
                    ${settings.dayStartHour === hour
                                            ? 'bg-blue-600 text-white shadow-md'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }
                  `}
                                >
                                    {hour}:00
                                </button>
                            ))}
                        </div>
                        <p className="text-xs text-gray-400 mt-2">
                            Задачи, назначенные на более раннее время, будут отображаться в свёрнутой секции
                        </p>
                    </div>

                    {/* Subscription Status - only for authenticated users */}
                    {isAuthenticated && (
                        <div className="pt-4 border-t border-gray-100">
                            <SubscriptionStatus />
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
        </div>
    );
};

export default SettingsModal;
