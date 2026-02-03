import React, { useState, useRef, useEffect } from 'react';
import { Task, TaskColor } from '../types';
import { Check, CheckSquare, Repeat } from 'lucide-react';

interface TaskItemProps {
  task: Task;
  onUpdate: (id: string, content: string) => void;
  onColorChange: (id: string, color: TaskColor) => void;
  onDelete: (id: string) => void;
  onDragStart: (e: React.DragEvent | null, id: string) => void;
  onDrop: (e: React.DragEvent, targetTaskId: string) => void;
  onToggleComplete: (id: string) => void;
  onOpenModal: (id: string) => void;
  onTouchDragStart?: (id: string) => void;
  onTouchDragEnd?: (id: string, targetElement: Element | null) => void;
}

const TaskItem: React.FC<TaskItemProps> = ({
  task,
  onDragStart,
  onDrop,
  onToggleComplete,
  onOpenModal,
  onTouchDragStart,
  onTouchDragEnd
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const taskRef = useRef<HTMLDivElement>(null);

  // Use ref to track dragging state without re-renders
  const isDraggingRef = useRef(false);
  const ghostRef = useRef<HTMLDivElement | null>(null);
  const touchOffsetRef = useRef({ x: 0, y: 0 });

  const getColorClass = (color: TaskColor) => {
    switch (color) {
      case TaskColor.YELLOW: return 'bg-accent-yellow border-yellow-200';
      case TaskColor.GREEN: return 'bg-accent-green border-green-200';
      case TaskColor.PURPLE: return 'bg-accent-purple border-purple-200';
      case TaskColor.RED: return 'bg-accent-red border-red-200';
      case TaskColor.BLUE: return 'bg-accent-blue border-blue-200';
      default: return 'bg-white border-gray-200 hover:border-gray-300';
    }
  };

  // Desktop drag handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDropItem = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    onDrop(e, task.id);
  };

  const handleCheckboxClick = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    onToggleComplete(task.id);
  };

  // Cleanup function
  const cleanupGhost = () => {
    if (ghostRef.current) {
      ghostRef.current.remove();
      ghostRef.current = null;
    }
    const ghost = document.getElementById('touch-drag-ghost');
    if (ghost) ghost.remove();
  };

  // PURE DOM touch handlers - attached via useEffect for maximum performance
  useEffect(() => {
    const element = taskRef.current;
    if (!element) return;

    let startX = 0;
    let startY = 0;
    let hasMoved = false;
    const DRAG_THRESHOLD = 8; // pixels to move before starting drag

    const handleTouchStart = (e: TouchEvent) => {
      // Check if touch is on checkbox - if so, ignore
      const target = e.target as Element;
      if (target.closest('[data-checkbox]')) return;

      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      hasMoved = false;

      const rect = element.getBoundingClientRect();
      touchOffsetRef.current = {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      };

      // DON'T preventDefault here - allow tap through
    };

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      const dx = Math.abs(touch.clientX - startX);
      const dy = Math.abs(touch.clientY - startY);

      // Only start drag if moved beyond threshold
      if (!hasMoved && (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD)) {
        hasMoved = true;

        // Now prevent default to stop scrolling
        e.preventDefault();

        // Remove any existing ghost
        cleanupGhost();

        const rect = element.getBoundingClientRect();

        // Create ghost
        const ghost = element.cloneNode(true) as HTMLDivElement;
        const x = touch.clientX - touchOffsetRef.current.x;
        const y = touch.clientY - touchOffsetRef.current.y;

        ghost.style.cssText = `
          position: fixed;
          left: 0;
          top: 0;
          width: ${rect.width}px;
          height: ${rect.height}px;
          transform: translate3d(${x}px, ${y}px, 0) scale(1.02);
          z-index: 10000;
          opacity: 0.9;
          box-shadow: 0 10px 25px rgba(0,0,0,0.2);
          border: 2px solid #3b82f6;
          border-radius: 0.5rem;
          pointer-events: none;
          will-change: transform;
          -webkit-transform: translate3d(${x}px, ${y}px, 0) scale(1.02);
          -webkit-backface-visibility: hidden;
        `;
        ghost.id = 'touch-drag-ghost';
        document.body.appendChild(ghost);
        ghostRef.current = ghost;

        isDraggingRef.current = true;
        element.style.opacity = '0.3';

        onTouchDragStart?.(task.id);
        onDragStart(null, task.id);
      }

      // If dragging, move the ghost
      if (hasMoved && isDraggingRef.current && ghostRef.current) {
        e.preventDefault();
        const x = touch.clientX - touchOffsetRef.current.x;
        const y = touch.clientY - touchOffsetRef.current.y;
        ghostRef.current.style.transform = `translate3d(${x}px, ${y}px, 0) scale(1.02)`;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isDraggingRef.current) {
        // It was a tap, not a drag - let the click event fire
        cleanupGhost();
        hasMoved = false;
        return;
      }

      const touch = e.changedTouches[0];

      cleanupGhost();
      element.style.opacity = '';

      const targetElement = document.elementFromPoint(touch.clientX, touch.clientY);

      isDraggingRef.current = false;
      hasMoved = false;

      onTouchDragEnd?.(task.id, targetElement);
    };

    const handleTouchCancel = () => {
      cleanupGhost();
      element.style.opacity = '';
      isDraggingRef.current = false;
      hasMoved = false;
    };

    // touchstart is passive (allows tap through), touchmove is not (we may preventDefault)
    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });
    element.addEventListener('touchcancel', handleTouchCancel, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [task.id, onDragStart, onTouchDragStart, onTouchDragEnd]);

  // Subtask stats
  const completedSubtasks = task.subtasks?.filter(s => s.completed).length || 0;
  const totalSubtasks = task.subtasks?.length || 0;

  return (
    <div
      ref={taskRef}
      draggable
      data-task-id={task.id}
      data-column-id={task.columnId}
      data-hour={task.hour}
      onDragStart={(e) => {
        onDragStart(e, task.id);
        e.dataTransfer.effectAllowed = 'move';
        const target = e.currentTarget as HTMLElement;
        const rect = target.getBoundingClientRect();

        // Calculate cursor offset from element's top-left corner
        const offsetX = e.clientX - rect.left;
        const offsetY = e.clientY - rect.top;

        const ghost = target.cloneNode(true) as HTMLElement;
        ghost.classList.add('task-ghost');
        ghost.style.width = `${rect.width}px`;
        ghost.style.height = `${rect.height}px`;
        ghost.style.position = 'absolute';
        ghost.style.top = '-1000px';
        ghost.style.left = '-1000px';
        ghost.style.zIndex = '1000';
        ghost.style.transform = 'scale(1.02)';

        document.body.appendChild(ghost);
        // Use cursor offset so ghost stays under the finger/cursor
        e.dataTransfer.setDragImage(ghost, offsetX, offsetY);
        setTimeout(() => {
          if (document.body.contains(ghost)) document.body.removeChild(ghost);
        }, 0);
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDropItem}
      className={`
        task-item group relative w-full text-xs font-medium py-1 px-2 rounded-lg
        cursor-pointer mb-1 transition-all duration-200
        border select-none shadow-sm hover:shadow-md
        ${getColorClass(task.color)}
        ${isDragOver ? 'border-t-2 border-blue-500 pt-1' : ''}
        ${task.completed ? 'opacity-60' : 'opacity-100'}
      `}
      style={{ touchAction: 'none' }}
      onClick={() => onOpenModal(task.id)}
    >
      <div className="flex items-start gap-2 overflow-hidden">
        {/* Checkbox */}
        <div
          data-checkbox
          onClick={handleCheckboxClick}
          className={`
                mt-0.5 w-3.5 h-3.5 rounded-full border border-gray-400 flex items-center justify-center
                hover:border-gray-900 transition-colors cursor-pointer shrink-0 z-10
                ${task.completed ? 'bg-gray-800 border-gray-800' : 'bg-transparent'}
            `}
          style={{ touchAction: 'auto' }}
        >
          {task.completed && <Check size={10} className="text-white" strokeWidth={3} />}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col gap-1 overflow-hidden">
          <div
            className={`leading-tight ${task.completed ? 'line-through text-gray-500' : 'text-gray-800'}`}
            style={{ overflowWrap: 'anywhere' }}
          >
            {task.content || <span className="text-gray-400 italic">Новая задача</span>}
          </div>

          {/* Subtask Indicator */}
          {totalSubtasks > 0 && (
            <div className={`flex items-center gap-1 text-[10px] ${task.completed ? 'text-gray-400' : 'text-gray-500'}`}>
              <CheckSquare size={10} />
              <span>{completedSubtasks}/{totalSubtasks}</span>
            </div>
          )}

          {/* Recurrence Indicator */}
          {task.recurrence && (
            <div className={`flex items-center gap-1 text-[10px] ${task.completed ? 'text-purple-300' : 'text-purple-500'}`}>
              <Repeat size={10} />
              <span>
                {task.recurrence.type === 'daily' && 'Ежедневно'}
                {task.recurrence.type === 'weekly' && 'Еженедельно'}
                {task.recurrence.type === 'monthly' && 'Ежемесячно'}
                {task.recurrence.type === 'yearly' && 'Ежегодно'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskItem;