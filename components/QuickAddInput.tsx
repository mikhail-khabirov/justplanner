import React, { useState, useRef, useEffect } from 'react';
import { TaskColor } from '../types';
import { Check } from 'lucide-react';

interface QuickAddInputProps {
  onConfirm: (content: string, color: TaskColor) => void;
  onCancel: () => void;
  defaultColor?: TaskColor;
  isPremium?: boolean;
}

const ALL_COLORS = [
  TaskColor.DEFAULT,
  TaskColor.YELLOW,
  TaskColor.GREEN,
  TaskColor.PURPLE,
  TaskColor.RED,
  TaskColor.BLUE
];

const QuickAddInput: React.FC<QuickAddInputProps> = ({ onConfirm, onCancel, defaultColor = TaskColor.DEFAULT, isPremium = false }) => {
  const [content, setContent] = useState('');
  // For free users, always use default color
  const [selectedColor, setSelectedColor] = useState<TaskColor>(isPremium ? defaultColor : TaskColor.DEFAULT);
  const containerRef = useRef<HTMLDivElement>(null);

  // Colors available based on plan
  const colors = isPremium ? ALL_COLORS : [TaskColor.DEFAULT];

  // Refs to keep track of latest state inside event listener
  const contentRef = useRef(content);
  const colorRef = useRef(selectedColor);

  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  useEffect(() => {
    colorRef.current = selectedColor;
  }, [selectedColor]);

  // Handle outside click/blur (both mouse and touch)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        // If there is content, confirm/save. If empty, cancel.
        if (contentRef.current.trim()) {
          onConfirm(contentRef.current.trim(), colorRef.current);
        } else {
          onCancel();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [onConfirm, onCancel]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (content.trim()) {
        onConfirm(content.trim(), selectedColor);
      } else {
        onCancel();
      }
    }
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  const getColorBg = (color: TaskColor) => {
    switch (color) {
      case TaskColor.YELLOW: return 'bg-accent-yellow';
      case TaskColor.GREEN: return 'bg-accent-green';
      case TaskColor.PURPLE: return 'bg-accent-purple';
      case TaskColor.RED: return 'bg-accent-red';
      case TaskColor.BLUE: return 'bg-accent-blue';
      default: return 'bg-white';
    }
  };

  return (
    <div
      ref={containerRef}
      className={`
            w-full rounded-lg border-2 border-blue-500 shadow-lg p-2 z-50
            animate-in fade-in zoom-in-95 duration-100
            ${getColorBg(selectedColor)}
        `}
      onClick={(e) => e.stopPropagation()}
    >
      <input
        autoFocus
        type="text"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Новая задача..."
        className="w-full bg-transparent border-none outline-none text-sm font-medium text-gray-900 placeholder:text-gray-400 mb-2"
      />

      {/* Color picker - only show multiple colors for Premium */}
      {isPremium ? (
        <div className="flex gap-1.5">
          {colors.map(color => (
            <button
              key={color}
              onClick={() => setSelectedColor(color)}
              className={`
                        w-4 h-4 rounded-full border border-black/10 flex items-center justify-center transition-transform hover:scale-110
                        ${color === selectedColor ? 'ring-2 ring-offset-1 ring-gray-400 scale-110' : ''}
                        ${color === TaskColor.DEFAULT ? 'bg-white' : ''}
                        ${color === TaskColor.YELLOW ? 'bg-yellow-200' : ''}
                        ${color === TaskColor.GREEN ? 'bg-green-200' : ''}
                        ${color === TaskColor.PURPLE ? 'bg-purple-200' : ''}
                        ${color === TaskColor.RED ? 'bg-red-200' : ''}
                        ${color === TaskColor.BLUE ? 'bg-blue-200' : ''}
                    `}
            />
          ))}
          <div className="ml-auto text-[10px] text-gray-400 flex items-center">
            Enter
          </div>
        </div>
      ) : (
        <div className="flex justify-end">
          <div className="text-[10px] text-gray-400 flex items-center">
            Enter
          </div>
        </div>
      )}
    </div>
  );
};

export default QuickAddInput;