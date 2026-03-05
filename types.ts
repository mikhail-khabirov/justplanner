export enum TaskColor {
  DEFAULT = 'default',
  YELLOW = 'yellow',
  GREEN = 'green',
  PURPLE = 'purple',
  RED = 'red',
  BLUE = 'blue'
}

export interface Subtask {
  id: string;
  content: string;
  completed: boolean;
}

export enum RecurrenceType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly'
}

export interface Recurrence {
  type: RecurrenceType;
  interval: number; // every N days/weeks/months/years
  endDate?: string; // optional end date ISO format
}

export interface Task {
  id: string;
  content: string;
  columnId: string;
  hour?: number; // 0-23
  color: TaskColor;
  completed: boolean;
  subtasks: Subtask[];
  recurrence?: Recurrence;
  reminderOffset?: string | null; // "0min" | "15min" | "30min" | "1h" | "2h" | "12h"
}

export interface Column {
  id: string;
  dateLabel: string; // e.g., "26 янв."
  dayLabel: string;  // e.g., "Пн"
  isToday?: boolean;
  isWeekend?: boolean;
  isHoliday?: boolean;
}

export const ItemTypes = {
  TASK: 'task'
};

export interface UserSettings {
  dayStartHour: number; // 5, 6, 7, 8, 9, 10
  autoRollover?: boolean; // move incomplete past tasks to today after midnight
  sectionNames?: {
    inbox?: string;
    urgent?: string;
    someday?: string;
    ideas?: string;
  };
}