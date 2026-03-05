import React, { useState, useMemo } from 'react';
import { Column as ColumnType, Task, TaskColor } from '../types';
import TaskItem from './TaskItem';
import QuickAddInput from './QuickAddInput';
import { ChevronDown, ChevronUp, Sun } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';

// Generate hours array based on day start setting
const generateHours = (dayStartHour: number) => {
  const early: number[] = [];
  const standard: number[] = [];

  // Early hours: 5 up to dayStartHour - 1
  for (let h = 5; h < dayStartHour; h++) {
    early.push(h);
  }

  // Standard hours: dayStartHour to 23, then 0
  for (let h = dayStartHour; h <= 23; h++) {
    standard.push(h);
  }
  standard.push(0); // midnight

  return { early, standard };
};

interface ColumnProps {
  column: ColumnType;
  tasks: Task[];
  quickAddState: { columnId: string; hour?: number } | null;
  headerColor?: string; // Optional override for header color
  onDrop: (e: React.DragEvent, columnId: string, hour?: number) => void;
  onDropTask: (e: React.DragEvent, targetTaskId: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onInitiateQuickAdd: (columnId: string, hour?: number) => void;
  onCommitQuickAdd: (content: string, color: TaskColor) => void;
  onCancelQuickAdd: () => void;
  onUpdateTask: (id: string, content: string) => void;
  onColorChange: (id: string, color: TaskColor) => void;
  onDeleteTask: (id: string) => void;
  onDragStart: (e: React.DragEvent | null, id: string) => void;
  onToggleComplete: (id: string) => void;
  onOpenModal: (id: string) => void;
  onTouchDragEnd?: (taskId: string, targetElement: Element | null) => void;
  isPremium?: boolean;
  onShowUpgradePrompt?: () => void;
  isFirstColumn?: boolean; // For product tour targeting
}

const Column: React.FC<ColumnProps> = ({
  column,
  tasks,
  quickAddState,
  headerColor,
  onDrop,
  onDropTask,
  onDragOver,
  onInitiateQuickAdd,
  onCommitQuickAdd,
  onCancelQuickAdd,
  onUpdateTask,
  onColorChange,
  onDeleteTask,
  onDragStart,
  onToggleComplete,
  onOpenModal,
  onTouchDragEnd,
  isPremium = false,
  onShowUpgradePrompt,
  isFirstColumn = false
}) => {
  // Get user settings
  const { settings } = useSettings();
  const { early: EARLY_HOURS, standard: STANDARD_HOURS } = useMemo(
    () => generateHours(settings.dayStartHour),
    [settings.dayStartHour]
  );

  // Determine if this is a List view (Bottom columns) or Calendar view
  const isListView = !/^\d{4}-\d{2}-\d{2}$/.test(column.id);

  // State for collapsible morning hours
  const [isEarlyHoursExpanded, setIsEarlyHoursExpanded] = useState(false);

  // Check if there are tasks in the early hours to show a hint
  const hasHiddenTasks = useMemo(() => {
    if (isListView || isEarlyHoursExpanded) return false;
    return tasks.some(t => t.hour !== undefined && EARLY_HOURS.includes(t.hour));
  }, [tasks, isListView, isEarlyHoursExpanded, EARLY_HOURS]);

  // Combine hours based on state
  const visibleHours = useMemo(() => {
    return isEarlyHoursExpanded ? [...EARLY_HOURS, ...STANDARD_HOURS] : STANDARD_HOURS;
  }, [isEarlyHoursExpanded, EARLY_HOURS, STANDARD_HOURS]);

  // Determine header text colors
  const getHeaderColors = () => {
    if (column.isToday) return 'text-blue-600';
    if (column.isWeekend || column.isHoliday) return 'text-red-500';
    return 'text-gray-900';
  };

  const getSubHeaderColors = () => {
    if (column.isToday) return 'text-blue-400';
    if (column.isWeekend || column.isHoliday) return 'text-red-300';
    return 'text-gray-300';
  };

  // Track if we've placed the tour marker
  let tourCreatePlaced = false;
  let tourDragPlaced = false;

  const renderHourSlot = (hour: number) => {
    const hourTasks = tasks.filter(t => t.hour === hour);
    const isFull = hourTasks.length >= 3;
    const displayTime = hour === 0 ? '00:00' : `${hour}:00`;
    const isQuickAddActive = quickAddState?.columnId === column.id && quickAddState?.hour === hour;

    // Place data-tour on first empty slot of today, and first task
    const shouldMarkCreate = isFirstColumn && column.isToday && !tourCreatePlaced && hourTasks.length === 0;
    const shouldMarkDrag = isFirstColumn && column.isToday && !tourDragPlaced && hourTasks.length > 0;
    if (shouldMarkCreate) tourCreatePlaced = true;
    if (shouldMarkDrag) tourDragPlaced = true;

    return (
      <div
        key={hour}
        className="hour-block flex group/time min-h-[40px]"
        data-column={column.id}
        data-hour={hour}
        {...(shouldMarkCreate ? { 'data-tour': 'create-task' } : {})}
        onDragOver={onDragOver}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDrop(e, column.id, hour);
        }}
      >
        {/* Time Label */}
        <div className="w-9 shrink-0 self-start text-right pr-2 -mt-[8px]">
          <span className="text-[10px] leading-none font-sans text-gray-400 select-none">
            {displayTime}
          </span>
        </div>

        {/* Task Area with Top Line */}
        <div
          className="flex-1 relative border-t border-gray-200"
          onClick={(e) => {
            // Only trigger if clicking the empty space (container) and not full
            if (e.target === e.currentTarget && !isFull) {
              onInitiateQuickAdd(column.id, hour);
            }
          }}
        >
          <div className="flex flex-col gap-1 pt-1 pb-1">
            {hourTasks.map((task, taskIdx) => {
              const isFirstTask = shouldMarkDrag && taskIdx === 0;
              return (
                <div key={task.id} className="relative z-10" {...(isFirstTask ? { 'data-tour': 'drag-task' } : {})}>
                  <TaskItem
                    task={task}
                    onUpdate={onUpdateTask}
                    onColorChange={onColorChange}
                    onDelete={onDeleteTask}
                    onDragStart={onDragStart}
                    onDrop={onDropTask}
                    onToggleComplete={onToggleComplete}
                    onOpenModal={onOpenModal}
                    onTouchDragEnd={onTouchDragEnd}
                  />
                </div>
              );
            })}

            {/* Quick Add Input in Calendar Slot */}
            {isQuickAddActive && (
              <div className="relative z-20">
                <QuickAddInput
                  onConfirm={onCommitQuickAdd}
                  onCancel={onCancelQuickAdd}
                  isPremium={isPremium}
                  onShowUpgradePrompt={onShowUpgradePrompt}
                />
              </div>
            )}
          </div>

          {/* Hover effect to indicate interactivity */}
          {!isFull && !isQuickAddActive && (
            <div className="absolute inset-0 z-0 hover:bg-gray-50/40 transition-colors pointer-events-none" />
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      data-column-id={column.id}
      className={`
        flex flex-col h-full border-r border-gray-100 last:border-r-0
        ${isListView ? 'w-full pt-4 flex-shrink-0' : 'w-[85vw] md:w-48 lg:w-auto lg:flex-1 lg:min-w-0 md:min-w-[9rem] lg:min-w-[100px] snap-center lg:snap-align-none flex-shrink-0 lg:flex-shrink'}
        transition-colors duration-300
      `}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, column.id)}
    >
      {/* Header for Calendar Columns */}
      {!isListView && (
        <div className="mb-1 px-2 group">
          <div className="flex items-baseline justify-between border-b border-black pb-2">
            <h3 className={`text-xl font-bold tracking-tight ${getHeaderColors()}`}>
              {column.dateLabel}
            </h3>
            <span className={`text-sm font-medium uppercase tracking-widest ${getSubHeaderColors()}`}>
              {column.dayLabel}
            </span>
          </div>
        </div>
      )}

      {/* Header for List Columns (Bottom) */}
      {isListView && (
        <div className="sticky top-0 bg-gray-50 z-10 mb-2 px-1 pb-1">
          <h3 className={`text-sm font-bold tracking-wider uppercase ${headerColor || 'text-gray-900'}`}>
            {column.dateLabel}
          </h3>
        </div>
      )}

      {/* Content Area */}
      {isListView ? (
        // List View (Inbox, Urgent, etc)
        <div
          className="flex-1 relative px-1 paper-grid paper-lines overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              onInitiateQuickAdd(column.id);
            }
          }}
        >
          {tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onUpdate={onUpdateTask}
              onColorChange={onColorChange}
              onDelete={onDeleteTask}
              onDragStart={onDragStart}
              onDrop={onDropTask}
              onToggleComplete={onToggleComplete}
              onOpenModal={onOpenModal}
            />
          ))}

          {/* Quick Add Input in List */}
          {quickAddState?.columnId === column.id ? (
            <div className="mt-1">
              <QuickAddInput
                onConfirm={onCommitQuickAdd}
                onCancel={onCancelQuickAdd}
                isPremium={isPremium}
                onShowUpgradePrompt={onShowUpgradePrompt}
              />
            </div>
          ) : (
            <div className="h-12 w-full flex items-center pl-2 text-gray-300 text-sm opacity-50 select-none pointer-events-none">
              + Добавить
            </div>
          )}
        </div>
      ) : (
        // Calendar Day: Timeline view
        <div className="flex-1 overflow-y-auto scrollbar-hide pr-1 pt-2">

          {/* Early Morning Toggle */}
          <div className="mb-1 flex justify-end pr-1 relative z-30">
            <button
              onClick={() => setIsEarlyHoursExpanded(!isEarlyHoursExpanded)}
              className={`
                        flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-medium transition-all relative
                        border border-transparent hover:border-blue-100 hover:bg-blue-50
                        ${hasHiddenTasks ? 'text-blue-600 bg-blue-50' : 'text-gray-400'}
                    `}
            >
              <Sun size={12} className={hasHiddenTasks ? 'fill-blue-600' : ''} />
              <span>
                {isEarlyHoursExpanded ? 'Скрыть утро' : `5:00 — ${settings.dayStartHour}:00`}
              </span>
              {isEarlyHoursExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}

              {/* Indicator dot if hidden tasks exist */}
              {!isEarlyHoursExpanded && hasHiddenTasks && (
                <span className="absolute top-0 right-0 -mt-0.5 -mr-0.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
              )}
            </button>
          </div>

          {/* Render Visible Hours */}
          {visibleHours.map(renderHourSlot)}

          {/* Simple footer padding */}
          <div className="h-10"></div>
        </div>
      )}
    </div>
  );
};

export default Column;