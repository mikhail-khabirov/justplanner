import React, { useState, useRef, useCallback } from 'react';
import { Target, Plus, X, GripVertical, Check, ArrowRightToLine } from 'lucide-react';

export interface WeeklyGoal {
    id: string;
    content: string;
    completed: boolean;
}

interface WeeklyGoalsProps {
    goals: WeeklyGoal[];
    isOpen: boolean;
    onToggle: () => void;
    onAdd: (content: string) => void;
    onDelete: (id: string) => void;
    onToggleComplete: (id: string) => void;
    onUpdate: (id: string, content: string) => void;
    onReorder: (goals: WeeklyGoal[]) => void;
    onMoveToNextWeek: (id: string) => void;
    weekLabel: string; // e.g. "9 – 15 марта"
}

const WeeklyGoals: React.FC<WeeklyGoalsProps> = ({
    goals,
    isOpen,
    onToggle,
    onAdd,
    onDelete,
    onToggleComplete,
    onUpdate,
    onReorder,
    onMoveToNextWeek,
    weekLabel,
}) => {
    const [newGoalText, setNewGoalText] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editText, setEditText] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const editInputRef = useRef<HTMLInputElement>(null);

    // Drag state
    const [dragIdx, setDragIdx] = useState<number | null>(null);
    const [overIdx, setOverIdx] = useState<number | null>(null);
    const dragNodeRef = useRef<number | null>(null);

    const handleAdd = useCallback(() => {
        const trimmed = newGoalText.trim();
        if (!trimmed) return;
        onAdd(trimmed);
        setNewGoalText('');
        setTimeout(() => inputRef.current?.focus(), 50);
    }, [newGoalText, onAdd]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAdd();
        }
    }, [handleAdd]);

    const startEdit = useCallback((id: string, content: string) => {
        setEditingId(id);
        setEditText(content);
        setTimeout(() => editInputRef.current?.focus(), 50);
    }, []);

    const commitEdit = useCallback(() => {
        if (editingId && editText.trim()) {
            onUpdate(editingId, editText.trim());
        }
        setEditingId(null);
        setEditText('');
    }, [editingId, editText, onUpdate]);

    // --- Drag handlers ---
    const handleDragStart = (idx: number) => {
        dragNodeRef.current = idx;
        setDragIdx(idx);
    };

    const handleDragEnter = (idx: number) => {
        if (dragNodeRef.current === null) return;
        setOverIdx(idx);
    };

    const handleDragEnd = () => {
        if (dragNodeRef.current !== null && overIdx !== null && dragNodeRef.current !== overIdx) {
            const reordered = [...goals];
            const [removed] = reordered.splice(dragNodeRef.current, 1);
            reordered.splice(overIdx, 0, removed);
            onReorder(reordered);
        }
        dragNodeRef.current = null;
        setDragIdx(null);
        setOverIdx(null);
    };

    // Touch drag
    const touchStartY = useRef(0);
    const touchDragIdx = useRef<number | null>(null);
    const listRef = useRef<HTMLDivElement>(null);

    const handleTouchStart = (idx: number, e: React.TouchEvent) => {
        touchStartY.current = e.touches[0].clientY;
        touchDragIdx.current = idx;
        setDragIdx(idx);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (touchDragIdx.current === null || !listRef.current) return;
        const y = e.touches[0].clientY;
        const items = listRef.current.querySelectorAll('[data-goal-item]');
        for (let i = 0; i < items.length; i++) {
            const rect = items[i].getBoundingClientRect();
            if (y >= rect.top && y <= rect.bottom) {
                setOverIdx(i);
                break;
            }
        }
    };

    const handleTouchEnd = () => {
        if (touchDragIdx.current !== null && overIdx !== null && touchDragIdx.current !== overIdx) {
            const reordered = [...goals];
            const [removed] = reordered.splice(touchDragIdx.current, 1);
            reordered.splice(overIdx, 0, removed);
            onReorder(reordered);
        }
        touchDragIdx.current = null;
        setDragIdx(null);
        setOverIdx(null);
    };

    return (
        <>
            {/* Side tab button — always visible on left edge */}
            {!isOpen && (
                <button
                    onClick={onToggle}
                    className="fixed left-0 top-1/2 -translate-y-1/2 z-30 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm border border-l-0 border-gray-200 rounded-r-xl px-2 py-3 shadow-md hover:shadow-lg hover:bg-white transition-all duration-200 group"
                    title="Цели недели"
                    style={{ writingMode: 'vertical-lr', textOrientation: 'mixed' }}
                >
                    <Target size={16} className="text-emerald-500 group-hover:text-emerald-600 transition-colors rotate-0" style={{ writingMode: 'horizontal-tb' }} />
                    <span className="text-[11px] font-semibold text-gray-500 group-hover:text-gray-700 tracking-wide transition-colors">Цели</span>
                </button>
            )}

            {/* Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-40 transition-opacity duration-200"
                    onClick={onToggle}
                />
            )}

            {/* Panel */}
            <div
                className={`fixed top-0 left-0 h-full z-50 transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
                style={{ width: 'min(340px, 90vw)' }}
            >
                <div className="h-full bg-white shadow-2xl flex flex-col border-r border-gray-100">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 pt-5 pb-3 border-b border-gray-100">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                                <Target size={18} className="text-emerald-500" />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-gray-900 leading-tight">Цели недели</h2>
                                <p className="text-[11px] text-gray-400 font-medium">{weekLabel}</p>
                            </div>
                        </div>
                        <button
                            onClick={onToggle}
                            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Goals list */}
                    <div className="flex-1 overflow-y-auto px-3 py-3" ref={listRef}>
                        {goals.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-3">
                                    <Target size={22} className="text-gray-300" />
                                </div>
                                <p className="text-sm text-gray-400 font-medium">Пока нет целей</p>
                                <p className="text-xs text-gray-300 mt-1">Добавьте главные цели на эту неделю</p>
                            </div>
                        ) : (
                            <div className="space-y-1.5">
                                {goals.map((goal, idx) => (
                                    <div
                                        key={goal.id}
                                        data-goal-item
                                        draggable
                                        onDragStart={() => handleDragStart(idx)}
                                        onDragEnter={() => handleDragEnter(idx)}
                                        onDragEnd={handleDragEnd}
                                        onDragOver={(e) => e.preventDefault()}
                                        onTouchStart={(e) => handleTouchStart(idx, e)}
                                        onTouchMove={handleTouchMove}
                                        onTouchEnd={handleTouchEnd}
                                        className={`group flex items-start gap-2 p-2.5 rounded-xl border transition-all duration-150 ${dragIdx === idx
                                            ? 'opacity-50 scale-[0.98] border-emerald-300 bg-emerald-50/50'
                                            : overIdx === idx && dragIdx !== null
                                                ? 'border-emerald-400 bg-emerald-50/30 shadow-sm'
                                                : goal.completed
                                                    ? 'border-gray-100 bg-gray-50/50'
                                                    : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm'
                                            }`}
                                    >
                                        {/* Drag handle */}
                                        <div className="pt-0.5 cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-400 touch-none">
                                            <GripVertical size={14} />
                                        </div>

                                        {/* Checkbox */}
                                        <button
                                            onClick={() => onToggleComplete(goal.id)}
                                            className={`mt-0.5 flex-shrink-0 w-4.5 h-4.5 rounded-md border-2 flex items-center justify-center transition-all ${goal.completed
                                                ? 'bg-emerald-400 border-emerald-400 text-white'
                                                : 'border-gray-300 hover:border-emerald-400'
                                                }`}
                                            style={{ width: 18, height: 18 }}
                                        >
                                            {goal.completed && <Check size={12} strokeWidth={3} />}
                                        </button>

                                        {/* Content */}
                                        {editingId === goal.id ? (
                                            <input
                                                ref={editInputRef}
                                                value={editText}
                                                onChange={(e) => setEditText(e.target.value)}
                                                onBlur={commitEdit}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') commitEdit();
                                                    if (e.key === 'Escape') { setEditingId(null); setEditText(''); }
                                                }}
                                                className="flex-1 text-sm bg-transparent outline-none border-b border-emerald-300 py-0.5 text-gray-800"
                                            />
                                        ) : (
                                            <span
                                                onClick={() => startEdit(goal.id, goal.content)}
                                                className={`flex-1 text-sm leading-snug cursor-text break-words ${goal.completed ? 'text-gray-400 line-through' : 'text-gray-700'
                                                    }`}
                                            >
                                                {goal.content}
                                            </span>
                                        )}

                                        {/* Action buttons */}
                                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 flex-shrink-0">
                                            {/* Move to next week */}
                                            <div className="relative group/move">
                                                <button
                                                    onClick={() => onMoveToNextWeek(goal.id)}
                                                    className="p-1 rounded-lg text-gray-300 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                                                >
                                                    <ArrowRightToLine size={14} />
                                                </button>
                                                <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 text-[10px] font-medium text-white bg-gray-800 rounded-md whitespace-nowrap opacity-0 group-hover/move:opacity-100 transition-opacity duration-150 shadow-lg">
                                                    На следующую неделю
                                                </span>
                                            </div>

                                            {/* Delete */}
                                            <button
                                                onClick={() => onDelete(goal.id)}
                                                className="p-1 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Add goal input */}
                    <div className="px-3 pb-4 pt-2 border-t border-gray-100">
                        <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-100 focus-within:border-emerald-300 focus-within:bg-white transition-all">
                            <Plus size={16} className="text-gray-400 flex-shrink-0" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={newGoalText}
                                onChange={(e) => setNewGoalText(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Добавить цель..."
                                className="flex-1 bg-transparent outline-none text-sm text-gray-700 placeholder-gray-400"
                            />
                            {newGoalText.trim() && (
                                <button
                                    onClick={handleAdd}
                                    className="p-1 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
                                >
                                    <Plus size={14} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default WeeklyGoals;
