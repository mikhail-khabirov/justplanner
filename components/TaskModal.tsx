import React, { useState, useEffect, useRef } from 'react';
import { Task, TaskColor, RecurrenceType, Recurrence } from '../types';
import { X, Plus, Check, Trash2, Calendar, Clock, ChevronLeft, ChevronRight, Repeat } from 'lucide-react';
import { toISODate } from '../utils';

interface TaskModalProps {
    task: Task;
    onClose: () => void;
    onUpdate: (id: string, content: string) => void;
    onScheduleChange: (id: string, columnId: string, hour?: number) => void;
    onColorChange: (id: string, color: TaskColor) => void;
    onRecurrenceChange: (id: string, recurrence: Recurrence | null) => void;
    onDelete: (id: string) => void;
    onAddSubtask: (taskId: string, content: string) => void;
    onToggleSubtask: (taskId: string, subtaskId: string) => void;
    onDeleteSubtask: (taskId: string, subtaskId: string) => void;
    isPremium?: boolean;
    onShowUpgradePrompt?: (reason?: 'colors' | 'recurrence') => void;
}

const HOURS_OPTIONS = [
    ...Array.from({ length: 19 }, (_, i) => i + 5), // 5 to 23
    0
];

const DAYS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MONTHS_RU = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

// Helper to check if an ID is a date (YYYY-MM-DD)
const isDateColumn = (id: string) => /^\d{4}-\d{2}-\d{2}$/.test(id);

const TaskModal: React.FC<TaskModalProps> = ({
    task,
    onClose,
    onUpdate,
    onScheduleChange,
    onColorChange,
    onRecurrenceChange,
    onDelete,
    onAddSubtask,
    onToggleSubtask,
    onDeleteSubtask,
    isPremium = false,
    onShowUpgradePrompt
}) => {
    const [title, setTitle] = useState(task.content);
    const [newSubtask, setNewSubtask] = useState('');

    // Calendar State
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [viewDate, setViewDate] = useState(() => {
        return isDateColumn(task.columnId) ? new Date(task.columnId) : new Date();
    });

    const [isEditingTime, setIsEditingTime] = useState(false);
    const [isRecurrenceOpen, setIsRecurrenceOpen] = useState(false);
    const titleInputRef = useRef<HTMLInputElement>(null);

    // Sync internal state if task changes externally
    useEffect(() => {
        setTitle(task.content);
    }, [task.content]);

    // Sync viewDate when reopening or task changes
    useEffect(() => {
        if (isCalendarOpen) {
            setViewDate(isDateColumn(task.columnId) ? new Date(task.columnId) : new Date());
        }
    }, [isCalendarOpen, task.columnId]);

    const handleTitleBlur = () => {
        if (title.trim() !== task.content) {
            onUpdate(task.id, title);
        }
    };

    const handleAddSubtaskSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newSubtask.trim()) {
            onAddSubtask(task.id, newSubtask.trim());
            setNewSubtask('');
        }
    };

    const getBgClass = (color: TaskColor) => {
        switch (color) {
            case TaskColor.YELLOW: return 'bg-[#fefce8]';
            case TaskColor.GREEN: return 'bg-[#f0fdf4]';
            case TaskColor.PURPLE: return 'bg-[#faf5ff]';
            case TaskColor.RED: return 'bg-[#fef2f2]';
            case TaskColor.BLUE: return 'bg-[#eff6ff]';
            default: return 'bg-white';
        }
    };

    const handleTimeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newHour = parseInt(e.target.value, 10);
        onScheduleChange(task.id, task.columnId, newHour);
        setIsEditingTime(false);
    };

    // Calendar Logic
    const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const getFirstDayOfMonth = (date: Date) => {
        const day = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
        return day === 0 ? 6 : day - 1; // Mon=0 ... Sun=6
    };

    const changeMonth = (offset: number) => {
        setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
    };

    const selectDate = (day: number) => {
        const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
        const dateStr = toISODate(newDate);
        onScheduleChange(task.id, dateStr, task.hour);
        setIsCalendarOpen(false);
    };

    const formatDateDisplay = (dateStr: string) => {
        if (dateStr === 'inbox') return 'Входящие';
        if (dateStr === 'urgent') return 'Срочно';
        if (dateStr === 'someday') return 'Когда-нибудь';
        if (dateStr === 'ideas') return 'Идеи';
        if (!isDateColumn(dateStr)) return 'Без даты';

        const date = new Date(dateStr);
        return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const getRecurrenceLabel = (recurrence?: Recurrence) => {
        if (!recurrence) return null;
        const labels: Record<RecurrenceType, string> = {
            [RecurrenceType.DAILY]: 'Ежедневно',
            [RecurrenceType.WEEKLY]: 'Еженедельно',
            [RecurrenceType.MONTHLY]: 'Ежемесячно',
            [RecurrenceType.YEARLY]: 'Ежегодно'
        };
        return labels[recurrence.type];
    };

    const handleRecurrenceSelect = (type: RecurrenceType | null) => {
        if (type === null) {
            onRecurrenceChange(task.id, null);
        } else {
            onRecurrenceChange(task.id, { type, interval: 1 });
        }
        setIsRecurrenceOpen(false);
    };

    // All colors visible, but non-white requires Premium
    const allColors = [TaskColor.RED, TaskColor.GREEN, TaskColor.YELLOW, TaskColor.PURPLE, TaskColor.BLUE, TaskColor.DEFAULT];

    const handleColorClick = (color: TaskColor) => {
        // Free users can only use white color
        if (!isPremium && color !== TaskColor.DEFAULT) {
            onShowUpgradePrompt?.('colors');
            return;
        }
        onColorChange(task.id, color);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-gray-900/20 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className={`
        relative w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden transform transition-all scale-100
        flex flex-col max-h-[90vh]
        ${getBgClass(task.color)}
      `}>

                {/* Header / Controls */}
                <div className="flex items-center justify-between px-6 pt-5 pb-1">
                    <div className="flex gap-2">
                        {allColors.map(c => (
                            <button
                                key={c}
                                onClick={() => handleColorClick(c)}
                                className={`
                            w-4 h-4 rounded-full border border-black/5 hover:scale-110 transition-transform
                            ${c === task.color ? 'ring-2 ring-offset-1 ring-gray-400' : ''}
                            ${c === TaskColor.DEFAULT ? 'bg-white' : ''}
                            ${c === TaskColor.YELLOW ? 'bg-yellow-200' : ''}
                            ${c === TaskColor.GREEN ? 'bg-green-200' : ''}
                            ${c === TaskColor.PURPLE ? 'bg-purple-200' : ''}
                            ${c === TaskColor.RED ? 'bg-red-200' : ''}
                            ${c === TaskColor.BLUE ? 'bg-blue-200' : ''}
                        `}
                            />
                        ))}
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => onDelete(task.id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                            title="Удалить задачу"
                        >
                            <Trash2 size={16} />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-1.5 text-gray-400 hover:text-gray-800 hover:bg-black/5 rounded-full transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Scrollable Body */}
                <div className="flex-1 overflow-y-auto px-6 pb-6">

                    {/* Meta info (Custom Calendar Popover & Time) */}
                    <div className="flex gap-3 text-sm font-medium text-gray-600 mb-4 mt-1 h-8 items-center relative z-20">

                        {/* Custom Date Trigger */}
                        <div className="relative">
                            <button
                                onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                                className={`
                            flex items-center gap-2 px-2 py-1 rounded border transition-all duration-200
                            ${isCalendarOpen
                                        ? 'bg-white border-blue-400 text-blue-600 shadow-sm ring-2 ring-blue-100'
                                        : 'bg-white/50 border-gray-300 hover:border-gray-400 hover:bg-white'}
                        `}
                            >
                                <Calendar size={13} />
                                <span className="text-[11px] font-semibold tracking-wide uppercase">
                                    {formatDateDisplay(task.columnId)}
                                </span>
                            </button>

                            {/* Calendar Popover (Compact) */}
                            {isCalendarOpen && (
                                <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-xl border border-blue-100 p-3 w-52 select-none animate-in fade-in zoom-in-95 duration-200 z-50">
                                    {/* Calendar Header */}
                                    <div className="flex items-center justify-between mb-2 bg-blue-50/50 p-1 rounded-md">
                                        <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-white hover:shadow-sm rounded-md text-gray-600 transition-all">
                                            <ChevronLeft size={14} />
                                        </button>
                                        <span className="font-bold text-gray-800 text-xs">
                                            {MONTHS_RU[viewDate.getMonth()]} {viewDate.getFullYear()}
                                        </span>
                                        <button onClick={() => changeMonth(1)} className="p-1 hover:bg-white hover:shadow-sm rounded-md text-gray-600 transition-all">
                                            <ChevronRight size={14} />
                                        </button>
                                    </div>

                                    {/* Calendar Grid */}
                                    <div className="grid grid-cols-7 gap-0.5 text-center mb-1">
                                        {DAYS_SHORT.map(d => (
                                            <div key={d} className="text-[9px] text-gray-400 font-bold uppercase">
                                                {d}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="grid grid-cols-7 gap-0.5">
                                        {Array.from({ length: getFirstDayOfMonth(viewDate) }).map((_, i) => (
                                            <div key={`empty-${i}`} />
                                        ))}
                                        {Array.from({ length: getDaysInMonth(viewDate) }).map((_, i) => {
                                            const day = i + 1;
                                            const currentCheckDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
                                            const dateStr = toISODate(currentCheckDate);
                                            const isSelected = task.columnId === dateStr;
                                            const isToday = dateStr === toISODate(new Date());

                                            return (
                                                <button
                                                    key={day}
                                                    onClick={() => selectDate(day)}
                                                    className={`
                                                w-6 h-6 flex items-center justify-center rounded-full text-[10px] font-medium transition-all duration-200
                                                ${isSelected
                                                            ? 'bg-black text-white shadow-md'
                                                            : 'hover:bg-gray-100 text-gray-700'}
                                                ${!isSelected && isToday ? 'text-blue-600 font-bold ring-1 ring-blue-200' : ''}
                                            `}
                                                >
                                                    {day}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Time Picker - Only if it's a date column */}
                        {isDateColumn(task.columnId) && (
                            <div className="relative">
                                {isEditingTime ? (
                                    <select
                                        autoFocus
                                        value={task.hour !== undefined ? task.hour : 9}
                                        onChange={handleTimeChange}
                                        onBlur={() => setIsEditingTime(false)}
                                        className="bg-white border border-blue-400 rounded px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-blue-100"
                                    >
                                        {HOURS_OPTIONS.map(h => (
                                            <option key={h} value={h}>{h === 0 ? '00:00' : `${h}:00`}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <button
                                        onClick={() => setIsEditingTime(true)}
                                        className="flex items-center gap-1.5 cursor-pointer bg-white/50 border border-gray-300 hover:border-gray-400 hover:bg-white px-2 py-1 rounded transition-all"
                                    >
                                        <Clock size={13} />
                                        <span className="text-[11px] font-medium">{task.hour === 0 ? '00:00' : `${task.hour}:00`}</span>
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Recurrence Picker */}
                        {isDateColumn(task.columnId) && (
                            <div className="relative">
                                <button
                                    onClick={() => {
                                        if (!isPremium) {
                                            onShowUpgradePrompt?.('recurrence');
                                            return;
                                        }
                                        setIsRecurrenceOpen(!isRecurrenceOpen);
                                    }}
                                    className={`
                                        flex items-center gap-1.5 px-2 py-1 rounded border transition-all
                                        ${task.recurrence
                                            ? 'bg-purple-50 border-purple-300 text-purple-600'
                                            : 'bg-white/50 border-gray-300 hover:border-gray-400 hover:bg-white text-gray-600'}
                                    `}
                                >
                                    <Repeat size={13} />
                                    <span className="text-[11px] font-medium">
                                        {getRecurrenceLabel(task.recurrence) || 'Повторять'}
                                    </span>
                                </button>

                                {isRecurrenceOpen && (
                                    <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-xl border border-purple-100 p-2 w-40 z-50 animate-in fade-in zoom-in-95 duration-200">
                                        <button
                                            onClick={() => handleRecurrenceSelect(RecurrenceType.DAILY)}
                                            className={`w-full text-left px-3 py-2 text-xs rounded hover:bg-purple-50 ${task.recurrence?.type === RecurrenceType.DAILY ? 'bg-purple-100 text-purple-700' : ''}`}
                                        >
                                            Ежедневно
                                        </button>
                                        <button
                                            onClick={() => handleRecurrenceSelect(RecurrenceType.WEEKLY)}
                                            className={`w-full text-left px-3 py-2 text-xs rounded hover:bg-purple-50 ${task.recurrence?.type === RecurrenceType.WEEKLY ? 'bg-purple-100 text-purple-700' : ''}`}
                                        >
                                            Еженедельно
                                        </button>
                                        <button
                                            onClick={() => handleRecurrenceSelect(RecurrenceType.MONTHLY)}
                                            className={`w-full text-left px-3 py-2 text-xs rounded hover:bg-purple-50 ${task.recurrence?.type === RecurrenceType.MONTHLY ? 'bg-purple-100 text-purple-700' : ''}`}
                                        >
                                            Ежемесячно
                                        </button>
                                        <button
                                            onClick={() => handleRecurrenceSelect(RecurrenceType.YEARLY)}
                                            className={`w-full text-left px-3 py-2 text-xs rounded hover:bg-purple-50 ${task.recurrence?.type === RecurrenceType.YEARLY ? 'bg-purple-100 text-purple-700' : ''}`}
                                        >
                                            Ежегодно
                                        </button>
                                        {task.recurrence && (
                                            <>
                                                <div className="border-t border-gray-100 my-1" />
                                                <button
                                                    onClick={() => handleRecurrenceSelect(null)}
                                                    className="w-full text-left px-3 py-2 text-xs rounded hover:bg-red-50 text-red-600"
                                                >
                                                    Отменить повторение
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Title */}
                    <input
                        ref={titleInputRef}
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        onBlur={handleTitleBlur}
                        className="w-full text-xl font-bold bg-transparent border-none outline-none placeholder:text-gray-400/70 text-gray-900 mb-4 font-serif"
                        placeholder="Название задачи"
                    />

                    {/* Subtasks Section */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between border-b border-black/5 pb-2">
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Подзадачи</h4>
                            <span className="text-[10px] font-mono text-gray-400 bg-white/50 px-1.5 py-0.5 rounded">
                                {task.subtasks.filter(s => s.completed).length}/{task.subtasks.length}
                            </span>
                        </div>

                        {/* Progress Bar */}
                        {task.subtasks.length > 0 && (
                            <div className="h-1 w-full bg-white rounded-full overflow-hidden shadow-inner">
                                <div
                                    className="h-full bg-gradient-to-r from-blue-400 to-purple-400 transition-all duration-500 ease-out"
                                    style={{ width: `${(task.subtasks.filter(s => s.completed).length / task.subtasks.length) * 100}%` }}
                                />
                            </div>
                        )}

                        {/* List */}
                        <div className="space-y-2">
                            {task.subtasks.map((sub) => (
                                <div
                                    key={sub.id}
                                    className="group flex items-center gap-3 p-2.5 rounded-lg bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 animate-in fade-in slide-in-from-bottom-1"
                                >
                                    <div
                                        onClick={() => onToggleSubtask(task.id, sub.id)}
                                        className={`
                                    w-4 h-4 rounded border cursor-pointer flex items-center justify-center transition-all duration-200 flex-shrink-0
                                    ${sub.completed
                                                ? 'bg-blue-500 border-blue-500 shadow-sm'
                                                : 'bg-white border-gray-300 hover:border-blue-400'}
                                `}
                                    >
                                        {sub.completed && <Check size={10} className="text-white" strokeWidth={3} />}
                                    </div>
                                    <span
                                        className={`flex-1 min-w-0 text-sm leading-tight transition-colors break-all ${sub.completed ? 'text-gray-400 line-through' : 'text-gray-800 font-medium'}`}
                                        style={{ overflowWrap: 'anywhere' }}
                                    >
                                        {sub.content}
                                    </span>
                                    <button
                                        onClick={() => onDeleteSubtask(task.id, sub.id)}
                                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Add Subtask Input & Button */}
                        <form
                            onSubmit={handleAddSubtaskSubmit}
                            className="flex items-center gap-2 p-1.5 mt-2 rounded-lg bg-white/40 focus-within:bg-white focus-within:shadow-md focus-within:ring-1 focus-within:ring-blue-100 transition-all duration-200 group border border-transparent focus-within:border-blue-100"
                        >
                            <Plus size={16} className="text-gray-400 ml-2 group-focus-within:text-blue-500 transition-colors" />
                            <input
                                value={newSubtask}
                                onChange={(e) => setNewSubtask(e.target.value)}
                                placeholder="Добавить шаг..."
                                className="flex-1 bg-transparent border-none outline-none text-xs placeholder:text-gray-500 text-gray-800 h-8"
                            />
                            <button
                                type="submit"
                                disabled={!newSubtask.trim()}
                                className={`
                            h-7 px-3 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all
                            ${newSubtask.trim()
                                        ? 'bg-black text-white hover:bg-gray-800 shadow-sm'
                                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'}
                        `}
                            >
                                Добавить
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div >
    );
};

export default TaskModal;