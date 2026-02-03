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
}