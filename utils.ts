export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

export const formatDate = (date: Date): string => {
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
};

export const getDayName = (date: Date): string => {
  return date.toLocaleDateString('ru-RU', { weekday: 'short' });
};

export const toISODate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Get today's date in ISO format
export const getTodayISO = (): string => toISODate(new Date());

// For backward compatibility
export const MOCK_TODAY_ISO = getTodayISO();

// Calculate next recurrence date
export const getNextRecurrenceDate = (currentDate: string, recurrenceType: string, interval: number = 1): string => {
  const date = new Date(currentDate);

  switch (recurrenceType) {
    case 'daily':
      date.setDate(date.getDate() + interval);
      break;
    case 'weekly':
      date.setDate(date.getDate() + (7 * interval));
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + interval);
      break;
    case 'yearly':
      date.setFullYear(date.getFullYear() + interval);
      break;
  }

  return toISODate(date);
};

// Simple list of major holidays for 2026 (RU context)
const HOLIDAYS_2026 = [
  '2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04', '2026-01-05', '2026-01-06', '2026-01-07', '2026-01-08', // New Year
  '2026-02-23', // Defender of the Fatherland Day
  '2026-03-08', // Women's Day
  '2026-05-01', // Spring and Labor Day
  '2026-05-09', // Victory Day
  '2026-06-12', // Russia Day
  '2026-11-04'  // Unity Day
];

export const generateColumns = (startDate: Date, days: number = 7): any[] => {
  const columns = [];

  for (let i = 0; i < days; i++) {
    const current = new Date(startDate);
    current.setDate(startDate.getDate() + i);
    const isoDate = toISODate(current);
    const dayOfWeek = current.getDay(); // 0 = Sun, 6 = Sat

    columns.push({
      id: isoDate,
      dateLabel: formatDate(current),
      dayLabel: getDayName(current),
      isToday: isoDate === getTodayISO(),
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      isHoliday: HOLIDAYS_2026.includes(isoDate)
    });
  }
  return columns;
};