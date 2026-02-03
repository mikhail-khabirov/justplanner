import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Column as ColumnType, Task, TaskColor } from './types';
import { generateColumns, generateId, getTodayISO, getNextRecurrenceDate, MOCK_TODAY_ISO } from './utils';
import Column from './components/Column';
import TaskModal from './components/TaskModal';
import AuthModal from './components/AuthModal';
import SettingsModal from './components/SettingsModal';
import OnboardingTooltip from './components/OnboardingTooltip';
import OnboardingOverlay from './components/OnboardingOverlay';
import LandingPage from './components/LandingPage';
import PublicOffer from './components/Legal/PublicOffer';
import PrivacyPolicy from './components/Legal/PrivacyPolicy';
import PricingPage from './components/PricingPage';
import { useAuth } from './contexts/AuthContext';
import { tasksApi } from './api';
import { User, MoreHorizontal, ChevronLeft, ChevronRight, TrendingUp, LogOut, Settings, LifeBuoy, X } from 'lucide-react';

// Configuration for the 4 bottom columns
const BOTTOM_COLUMNS = [
  { id: 'inbox', label: 'Входящие' },
  { id: 'urgent', label: 'Срочно', headerColor: 'text-red-600' },
  { id: 'someday', label: 'Когда-нибудь' },
  { id: 'ideas', label: 'Идеи' }
];

// Helper to check if an ID is a date (YYYY-MM-DD)
const isDateColumn = (id: string) => /^\d{4}-\d{2}-\d{2}$/.test(id);

// Demo tasks for guests (not logged in)
const DEMO_TASKS: Task[] = [
  // Monday 26 янв
  { id: 'd1', content: 'Скорректировать код продукта', columnId: '2026-01-26', hour: 8, color: TaskColor.RED, completed: false, subtasks: [] },
  { id: 'd2', content: 'Провести встречу с партнером', columnId: '2026-01-26', hour: 8, color: TaskColor.PURPLE, completed: false, subtasks: [] },
  { id: 'd3', content: 'Забрать вещи', columnId: '2026-01-26', hour: 9, color: TaskColor.DEFAULT, completed: false, subtasks: [] },
  // Tuesday 27 янв
  { id: 'd4', content: 'Забрать вещи', columnId: '2026-01-27', hour: 10, color: TaskColor.GREEN, completed: false, subtasks: [] },
  // Wednesday 28 янв
  { id: 'd5', content: 'Записаться к доктору', columnId: '2026-01-28', hour: 11, color: TaskColor.YELLOW, completed: false, subtasks: [] },
  // Thursday 29 янв - 6:00 task to highlight 5-8 button
  { id: 'd6a', content: 'Утренняя пробежка', columnId: '2026-01-29', hour: 6, color: TaskColor.PURPLE, completed: false, subtasks: [] },
  { id: 'd6', content: 'Провести оплату', columnId: '2026-01-29', hour: 14, color: TaskColor.GREEN, completed: false, subtasks: [] },
  // Friday 30 янв
  { id: 'd7', content: 'Написать письмо', columnId: '2026-01-30', hour: 16, color: TaskColor.YELLOW, completed: false, subtasks: [] },
  // Saturday 31 янв
  { id: 'd8', content: 'Проверить задачи', columnId: '2026-01-31', hour: 9, color: TaskColor.RED, completed: false, subtasks: [] },
  // Backlogs
  { id: 'd9', content: 'Написать письмо Вике', columnId: 'inbox', color: TaskColor.YELLOW, completed: false, subtasks: [] },
  { id: 'd10', content: 'Позвонить Диме', columnId: 'urgent', color: TaskColor.YELLOW, completed: false, subtasks: [] },
  { id: 'd11', content: 'Купить автомобиль', columnId: 'someday', color: TaskColor.BLUE, completed: false, subtasks: [] },
  { id: 'd12', content: 'Запустить телеграм бота по подписке', columnId: 'ideas', color: TaskColor.DEFAULT, completed: false, subtasks: [] },
];

interface QuickAddState {
  columnId: string;
  hour?: number;
}

// Reusable Stats Content Component
const StatsDisplay = ({ stats }: { stats: any }) => (
  <>
    <div className="bg-white p-1.5 rounded-full shadow-sm shrink-0">
      <TrendingUp size={16} className="text-blue-500" />
    </div>
    <div className="flex flex-col min-w-0">
      <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-0.5 leading-none truncate">Задач закрыто</span>
      <div className="flex items-center gap-3 text-xs font-semibold text-gray-700 leading-none whitespace-nowrap">
        <div className="flex items-center gap-1">
          <span className="text-gray-500 font-normal">Сегодня</span>
          <span className={stats.todayTotal > 0 && stats.todayDone === stats.todayTotal ? "text-green-600" : ""}>{stats.todayDone}/{stats.todayTotal}</span>
        </div>
        <div className="w-[1px] h-3 bg-gray-200"></div>
        <div className="flex items-center gap-1">
          <span className="text-gray-500 font-normal">Неделя</span>
          <span className={stats.weekTotal > 0 && stats.weekDone === stats.weekTotal ? "text-green-600" : ""}>{stats.weekDone}/{stats.weekTotal}</span>
        </div>
        <div className="w-[1px] h-3 bg-gray-200"></div>
        <div className="flex items-center gap-1">
          <span className="text-gray-500 font-normal">Месяц</span>
          <span className={stats.monthTotal > 0 && stats.monthDone === stats.monthTotal ? "text-green-600" : ""}>{stats.monthDone}/{stats.monthTotal}</span>
        </div>
      </div>
    </div>
  </>
);

const App: React.FC = () => {
  const { user, isAuthenticated, isLoading: authLoading, logout, token } = useAuth();

  // Start date: Jan 26, 2026
  // Start date: Monday of the current week
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    const day = today.getDay(); // 0 is Sunday
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    const monday = new Date(today.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  });
  const [tasks, setTasks] = useState<Task[]>([]);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showLanding, setShowLanding] = useState(!isAuthenticated);
  const [legalView, setLegalView] = useState<'terms' | 'privacy' | 'pricing' | null>(null);
  // Blocking auth state: triggered by smart timer/clicks in demo mode
  const [blockingAuth, setBlockingAuth] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Quick Add State
  const [quickAddState, setQuickAddState] = useState<QuickAddState | null>(null);

  // Analytics: Track virtual page views
  useEffect(() => {
    // Check if ym is defined (it is defined in index.html)
    const ym = (window as any).ym;
    if (typeof ym === 'function') {
      const virtualUrl = showLanding ? '/' : '/app';
      const pageTitle = showLanding ? 'JustPlanner - Главная' : 'JustPlanner - Приложение';

      ym(106590123, 'hit', virtualUrl, {
        title: pageTitle,
        referer: window.location.href
      });
    }

    // Capture UTM parameters
    const params = new URLSearchParams(window.location.search);
    const source = params.get('utm_source');
    const campaign = params.get('utm_campaign');

    // Save to cookies for 24h (accessible by server for Google Auth)
    if (source) document.cookie = `utm_source=${source}; path=/; max-age=86400`;
    if (campaign) document.cookie = `utm_campaign=${campaign}; path=/; max-age=86400`;

  }, [showLanding]);

  // Ref for main scroll container
  const mainScrollRef = useRef<HTMLElement>(null);

  // Auto-scroll to "Today" on mobile when columns change
  useEffect(() => {
    // Only trigger if we have columns and it's a mobile view (horizontal scroll)
    const handleScroll = () => {
      if (window.innerWidth >= 1024) return;

      const todayISO = getTodayISO();
      // Find the element within our scroll container
      const todayEl = mainScrollRef.current?.querySelector(`[data-column-id="${todayISO}"]`);

      if (todayEl) {
        console.log('Scrolling to today:', todayISO);
        todayEl.scrollIntoView({ behavior: 'auto', inline: 'center', block: 'nearest' });
      }
    };

    // Small delay to ensure DOM is ready and layout is stable
    const timer = setTimeout(handleScroll, 100);
    return () => clearTimeout(timer);
  }, [startDate, showLanding]); // Re-run when switching weeks or entering app

  // Track if tasks have been loaded from server to avoid overwriting
  const hasLoadedFromServer = useRef(false);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load tasks 
  const loadServerTasks = useCallback(() => {
    if (!isAuthenticated) return;

    tasksApi.getAll()
      .then(serverTasks => {
        hasLoadedFromServer.current = true;
        setTasks(serverTasks);

        // Show onboarding for first-time users after login
        const onboardingKey = `onboarding_complete_${user?.id || 'default'}`;
        if (!localStorage.getItem(onboardingKey)) {
          setShowOnboarding(true);
        }
      })
      .catch(err => console.error('Failed to load tasks:', err));
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    // Check for resetToken
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('resetToken');
    if (token) {
      setShowAuthModal(true);
    }

    // If authenticated, load tasks from server
    if (isAuthenticated) {
      // Hide landing if logged in
      setShowLanding(false);
      setShowAuthModal(false);
      setBlockingAuth(false);

      if (!hasLoadedFromServer.current) {
        loadServerTasks();
      }
    }

    // If NOT authenticated, show demo tasks and LANDING by default
    else if (!isAuthenticated) {
      hasLoadedFromServer.current = false;
      setTasks(DEMO_TASKS);
      setShowOnboarding(false);

      // Smart Auth Trigger Logic (Demo Mode)
      if (!showLanding && !showAuthModal) {
        // Click Handler: 20 clicks anywhere
        let clickCount = 0;
        const handleClick = () => {
          clickCount++;
          if (clickCount >= 20) {
            setAuthMode('register');
            setShowAuthModal(true);
            // Optionally reset clickCount here, but component re-render will handle it
          }
        };

        // Attach listeners
        document.addEventListener('click', handleClick);

        // Cleanup
        return () => {
          document.removeEventListener('click', handleClick);
        };
      }
    }
  }, [isAuthenticated, user?.id, showLanding, showAuthModal]);

  // Auto-sync tasks to server when they change (with debounce)
  useEffect(() => {
    if (!isAuthenticated || !hasLoadedFromServer.current) return;

    // Clear previous timeout
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    // Debounce sync by 1 second
    syncTimeoutRef.current = setTimeout(() => {
      tasksApi.syncAll(tasks).catch(err => console.error('Failed to sync tasks:', err));
    }, 1000);

    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [tasks, isAuthenticated]);

  // Generate columns based on current startDate
  const columns = useMemo(() => generateColumns(startDate), [startDate]);

  // Sort tasks for display: Completed tasks always at the bottom
  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => Number(a.completed) - Number(b.completed));
  }, [tasks]);

  const activeTask = useMemo(() => tasks.find(t => t.id === activeTaskId), [tasks, activeTaskId]);

  // Header Date Title
  const monthTitle = useMemo(() => {
    const title = startDate.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
    // Capitalize first letter and remove trailing "г."
    const formatted = title.charAt(0).toUpperCase() + title.slice(1);
    return formatted.replace(/ г\.$/, '');
  }, [startDate]);

  // --- Statistics Calculation ---
  const stats = useMemo(() => {
    const today = new Date(getTodayISO());
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Calculate start of week (Monday)
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const weekStart = new Date(today);
    weekStart.setDate(diff);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    let todayTotal = 0, todayDone = 0;
    let weekTotal = 0, weekDone = 0;
    let monthTotal = 0, monthDone = 0;

    tasks.forEach(t => {
      // Only count tasks that are assigned to a date (YYYY-MM-DD format)
      if (!isDateColumn(t.columnId)) return;

      const taskDate = new Date(t.columnId);

      // Today
      if (t.columnId === getTodayISO()) {
        todayTotal++;
        if (t.completed) todayDone++;
      }

      // Week (using simple date comparison)
      // Set taskDate time to 0 to compare dates correctly
      const checkDate = new Date(taskDate);
      checkDate.setHours(0, 0, 0, 0);

      if (checkDate >= weekStart && checkDate <= new Date(weekEnd.getFullYear(), weekEnd.getMonth(), weekEnd.getDate())) {
        weekTotal++;
        if (t.completed) weekDone++;
      }

      // Month
      if (taskDate.getMonth() === currentMonth && taskDate.getFullYear() === currentYear) {
        monthTotal++;
        if (t.completed) monthDone++;
      }
    });

    return { todayTotal, todayDone, weekTotal, weekDone, monthTotal, monthDone };
  }, [tasks]);

  // Navigation Handlers
  const handlePrevWeek = () => {
    setStartDate(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
  };

  const handleNextWeek = () => {
    setStartDate(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
  };

  const handleBackToToday = () => {
    const today = new Date();
    const day = today.getDay(); // 0 is Sunday
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    const monday = new Date(today.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    setStartDate(monday);
  };

  // --- Drag & Drop Handlers ---

  const handleDragStart = useCallback((e: React.DragEvent | null, id: string) => {
    setDraggedTaskId(id);
    if (e) {
      e.dataTransfer.setData('text/plain', id);
      e.dataTransfer.effectAllowed = 'move';
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const moveTask = (draggedId: string, targetColumnId: string, targetHour?: number, targetTaskId?: string) => {
    setTasks(prev => {
      const taskToMove = prev.find(t => t.id === draggedId);
      if (!taskToMove) return prev;

      if (targetTaskId === draggedId) return prev;

      const isTargetCalendar = isDateColumn(targetColumnId);

      // Check Limit: Max 3 tasks per hour (only for calendar columns)
      if (isTargetCalendar && targetHour !== undefined) {
        const existingTasksInHour = prev.filter(t =>
          t.columnId === targetColumnId &&
          t.hour === targetHour &&
          t.id !== draggedId
        );
        if (existingTasksInHour.length >= 3) {
          // Limit reached, do not move
          return prev;
        }
      }

      const filtered = prev.filter(t => t.id !== draggedId);

      // If moving to list/backlog, remove hour. If moving to calendar, ensure hour is set.
      let finalHour = targetHour;
      if (isTargetCalendar && finalHour === undefined) {
        finalHour = 9;
      }
      if (!isTargetCalendar) {
        finalHour = undefined;
      }

      const updatedTask = { ...taskToMove, columnId: targetColumnId, hour: finalHour };

      if (targetTaskId) {
        const targetIndex = filtered.findIndex(t => t.id === targetTaskId);
        if (targetIndex !== -1) {
          const newTasks = [...filtered];
          newTasks.splice(targetIndex, 0, updatedTask);
          return newTasks;
        }
      }

      return [...filtered, updatedTask];
    });
  };

  const handleDropOnColumn = useCallback((e: React.DragEvent, targetColumnId: string, hour?: number) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      moveTask(taskId, targetColumnId, hour);
    }
    setDraggedTaskId(null);
  }, []);

  const handleDropOnTask = useCallback((e: React.DragEvent, targetTaskId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const draggedId = e.dataTransfer.getData('text/plain');

    if (draggedId) {
      const targetTask = tasks.find(t => t.id === targetTaskId);
      if (targetTask) {
        // Inherit the hour from the task we dropped onto
        moveTask(draggedId, targetTask.columnId, targetTask.hour, targetTaskId);
      }
    }
    setDraggedTaskId(null);
  }, [tasks]);

  // Touch drag end handler - finds drop target from coordinates
  const handleTouchDragEnd = useCallback((taskId: string, targetElement: Element | null) => {
    if (!targetElement) {
      setDraggedTaskId(null);
      return;
    }

    // Walk up to find hour-block or column
    let el: Element | null = targetElement;
    let targetColumnId: string | null = null;
    let targetHour: number | undefined = undefined;
    let targetTaskId: string | null = null;

    while (el && !targetColumnId) {
      // Check for task (data-task-id)
      if (el.hasAttribute('data-task-id')) {
        targetTaskId = el.getAttribute('data-task-id');
        targetColumnId = el.getAttribute('data-column-id');
        const hourAttr = el.getAttribute('data-hour');
        targetHour = hourAttr ? parseInt(hourAttr) : undefined;
        break;
      }

      // Check for hour-block (has data-column and data-hour)
      if (el.hasAttribute('data-column') && el.hasAttribute('data-hour')) {
        targetColumnId = el.getAttribute('data-column');
        const hourAttr = el.getAttribute('data-hour');
        targetHour = hourAttr ? parseInt(hourAttr) : undefined;
        break;
      }

      // Check for column container (data-column-id on column)
      if (el.hasAttribute('data-column-id')) {
        targetColumnId = el.getAttribute('data-column-id');
        break;
      }

      el = el.parentElement;
    }

    if (targetColumnId && taskId !== targetTaskId) {
      moveTask(taskId, targetColumnId, targetHour, targetTaskId || undefined);
    }

    setDraggedTaskId(null);
  }, []);

  // --- Task Management ---

  const handleInitiateQuickAdd = (columnId: string, hour?: number) => {
    // Check limits for calendar view
    if (isDateColumn(columnId) && hour !== undefined) {
      const count = tasks.filter(t => t.columnId === columnId && t.hour === hour).length;
      if (count >= 3) return;
    }
    // Set state to show input
    setQuickAddState({ columnId, hour });
  };

  const handleCommitQuickAdd = (content: string, color: TaskColor) => {
    if (!quickAddState) return;

    const newTaskId = generateId();
    const newTask: Task = {
      id: newTaskId,
      content: content,
      columnId: quickAddState.columnId,
      hour: quickAddState.hour,
      color: color,
      completed: false,
      subtasks: []
    };

    setTasks((prev) => [...prev, newTask]);
    setQuickAddState(null);
  };

  const handleCancelQuickAdd = () => {
    setQuickAddState(null);
  };

  const handleUpdateTask = (id: string, content: string) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, content } : t)));
  };

  const handleScheduleChange = (id: string, columnId: string, hour?: number) => {
    setTasks((prev) => prev.map((t) => {
      if (t.id !== id) return t;

      const isTargetCalendar = isDateColumn(columnId);

      // Logic to ensure valid state
      let newHour = hour;
      if (!isTargetCalendar) {
        newHour = undefined;
      } else if (hour === undefined) {
        // If moving from backlog to a date without hour specified, default to 9:00
        newHour = 9;
      }

      return { ...t, columnId, hour: newHour };
    }));
  };

  const handleDeleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    if (activeTaskId === id) setActiveTaskId(null);
  };

  const handleColorChange = (id: string, color: TaskColor) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, color } : t)));
  };

  const handleToggleComplete = (id: string) => {
    setTasks(prev => {
      const task = prev.find(t => t.id === id);
      if (!task) return prev;

      // If completing a recurring task that's not yet completed, create a copy for next occurrence
      if (task.recurrence && !task.completed) {
        const nextDate = getNextRecurrenceDate(task.columnId, task.recurrence.type, task.recurrence.interval);

        // Check if recurrence should end
        const shouldCreateCopy = !task.recurrence.endDate || nextDate <= task.recurrence.endDate;

        if (shouldCreateCopy) {
          const newTask: Task = {
            id: generateId(),
            content: task.content,
            columnId: nextDate,
            hour: task.hour,
            color: task.color,
            completed: false,
            subtasks: [], // Start fresh with subtasks
            recurrence: task.recurrence
          };

          // Mark original as completed and add new task
          return prev.map(t => t.id === id ? { ...t, completed: true } : t).concat(newTask);
        }
      }

      // Normal toggle for non-recurring tasks
      return prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    });
  };

  const handleRecurrenceChange = (id: string, recurrence: import('./types').Recurrence | null) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, recurrence: recurrence || undefined } : t));
  };

  // --- Subtask Handlers ---

  const handleAddSubtask = (taskId: string, content: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          subtasks: [...t.subtasks, { id: generateId(), content, completed: false }]
        };
      }
      return t;
    }));
  };

  const handleToggleSubtask = (taskId: string, subtaskId: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          subtasks: t.subtasks.map(s => s.id === subtaskId ? { ...s, completed: !s.completed } : s)
        };
      }
      return t;
    }));
  };

  const handleDeleteSubtask = (taskId: string, subtaskId: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          subtasks: t.subtasks.filter(s => s.id !== subtaskId)
        };
      }
      return t;
    }));
  };

  if (authLoading) {
    return <div className="flex h-screen items-center justify-center">Загрузка...</div>;
  }

  if (legalView === 'terms') {
    return <PublicOffer onBack={() => setLegalView(null)} />;
  }
  if (legalView === 'privacy') {
    return <PrivacyPolicy onBack={() => setLegalView(null)} />;
  }
  if (legalView === 'pricing') {
    return (
      <PricingPage
        onBack={() => setLegalView(null)}
        onSelectPlan={(plan) => {
          setLegalView(null);
          if (plan === 'premium') {
            setAuthMode('register');
            setShowAuthModal(true);
          } else {
            setShowLanding(false);
          }
        }}
      />
    );
  }

  // Show Landing Page for guests (unless they chose to try demo)
  if (!isAuthenticated && showLanding) {
    return (
      <>
        <LandingPage
          onStart={() => {
            setShowLanding(false); // Go to demo
          }}
          onLogin={() => {
            setAuthMode('login');
            setShowAuthModal(true);
          }}
          onShowTerms={() => setLegalView('terms')}
          onShowPrivacy={() => setLegalView('privacy')}
          onShowPricing={() => setLegalView('pricing')}
        />
        {/* Render AuthModal here too in case they click Login from landing */}
        {showAuthModal && (
          <AuthModal
            isOpen={showAuthModal}
            onClose={() => !blockingAuth && setShowAuthModal(false)}
            allowClose={!blockingAuth}
            initialMode={authMode}
          />
        )}
      </>
    );
  }

  // --- Layout ---

  return (
    <div className="flex flex-col h-screen bg-white text-gray-900 font-sans overflow-hidden selection:bg-blue-100">
      {/* Unregistered User Alert */}
      {!isAuthenticated && (
        <div className="bg-red-50 border-b border-red-100 px-4 py-2 flex items-center justify-center text-center">
          <p className="text-xs md:text-sm text-red-800">
            <span className="font-bold">Вы не зарегистрированы.</span> Ваши данные пропадут после обновления страницы. <button onClick={() => { setAuthMode('register'); setShowAuthModal(true); }} className="underline font-semibold hover:text-red-900">Зарегистрируйтесь</button>, чтобы сохранить прогресс.
          </p>
        </div>
      )}

      {/* Header */}
      <header className="flex-shrink-0 px-4 py-4 md:px-8 md:py-6 border-b border-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 md:gap-4">
            <h1
              onClick={handleBackToToday}
              className="text-3xl md:text-4xl font-serif font-bold tracking-tight min-w-[150px] md:min-w-[200px] leading-none cursor-pointer hover:opacity-70 transition-opacity"
              title="Вернуться к текущей неделе"
            >
              {monthTitle}
            </h1>

            {/* Arrows moved next to title */}
            <div className="relative flex gap-2">
              <button
                onClick={handlePrevWeek}
                className="p-2 rounded-full bg-[#26A69A] text-white hover:bg-[#1f8f84] transition-colors active:scale-95"
              >
                <ChevronLeft size={16} className="md:w-5 md:h-5" />
              </button>
              <button
                onClick={handleNextWeek}
                className="p-2 rounded-full bg-[#26A69A] text-white hover:bg-[#1f8f84] transition-colors active:scale-95"
              >
                <ChevronRight size={16} className="md:w-5 md:h-5" />
              </button>
            </div>

            {/* Efficiency Stats Widget - Desktop */}
            <div className="hidden lg:flex items-center gap-3 ml-8 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100/80 shadow-sm">
              <StatsDisplay stats={stats} />
            </div>

          </div>

          <div className="flex items-center gap-2 md:gap-4">
            {/* Divider only on desktop if needed, or just space */}
            <div className="hidden md:block h-8 w-[1px] bg-gray-200 mx-2"></div>

            {isAuthenticated ? (
              <span className="hidden md:block text-sm text-gray-600 truncate max-w-[150px]">
                {user?.email}
              </span>
            ) : (
              <button
                onClick={() => {
                  setAuthMode('login');
                  setShowAuthModal(true);
                }}
                className="p-2 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                title="Войти"
              >
                <User size={20} />
              </button>
            )}

            <div className="relative">
              <button
                onClick={() => setShowMenuDropdown(!showMenuDropdown)}
                className="p-2 rounded-full bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors"
              >
                <MoreHorizontal size={20} />
              </button>

              {showMenuDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowMenuDropdown(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50 animate-in fade-in zoom-in-95 duration-200">
                    <button
                      onClick={() => {
                        setShowSettingsModal(true);
                        setShowMenuDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Settings size={16} />
                      Настройки
                    </button>

                    <button
                      onClick={() => {
                        setShowSupportModal(true);
                        setShowMenuDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <LifeBuoy size={16} />
                      Поддержка
                    </button>

                    {isAuthenticated && (
                      <button
                        onClick={() => {
                          logout();
                          setShowMenuDropdown(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        <LogOut size={16} />
                        Выйти
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Efficiency Stats Widget - Mobile (Below Header) */}
        <div className="lg:hidden mt-3 flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100/80 shadow-sm overflow-x-auto scrollbar-hide">
          <StatsDisplay stats={stats} />
        </div>
      </header>

      {/* Main Content: Horizontal Scroll for Days */}
      <main
        ref={mainScrollRef}
        className="flex-1 overflow-x-auto lg:overflow-x-hidden overflow-y-hidden px-4 md:px-8 pb-4 scrollbar-hide snap-x snap-mandatory lg:snap-none"
      >
        <div className="flex h-full gap-4 md:gap-6 lg:gap-4 min-w-max lg:min-w-0 lg:w-full">
          {columns.map((col) => (
            <Column
              key={col.id}
              column={col}
              tasks={sortedTasks.filter((t) => t.columnId === col.id)}
              quickAddState={quickAddState}
              onDrop={handleDropOnColumn}
              onDropTask={handleDropOnTask}
              onDragOver={handleDragOver}
              onInitiateQuickAdd={handleInitiateQuickAdd}
              onCommitQuickAdd={handleCommitQuickAdd}
              onCancelQuickAdd={handleCancelQuickAdd}
              onUpdateTask={handleUpdateTask}
              onColorChange={handleColorChange}
              onDeleteTask={handleDeleteTask}
              onDragStart={handleDragStart}
              onToggleComplete={handleToggleComplete}
              onOpenModal={setActiveTaskId}
              onTouchDragEnd={handleTouchDragEnd}
            />
          ))}
        </div>
      </main>

      {/* Footer / Backlog Area */}
      <section className="flex-shrink-0 h-1/4 px-4 md:px-8 pb-4 border-t-2 border-gray-200 bg-gray-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10">
        <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 md:grid md:grid-cols-4 md:gap-8 h-full scrollbar-hide pb-2 md:pb-0">
          {BOTTOM_COLUMNS.map(colDef => (
            <div key={colDef.id} className="min-w-[85vw] md:min-w-0 h-full snap-center last:pr-4 md:last:pr-0">
              <Column
                column={{
                  id: colDef.id,
                  dateLabel: colDef.label,
                  dayLabel: '',
                }}
                quickAddState={quickAddState}
                headerColor={colDef.headerColor}
                tasks={tasks.filter(t => t.columnId === colDef.id)}
                onDrop={handleDropOnColumn}
                onDropTask={handleDropOnTask}
                onDragOver={handleDragOver}
                onInitiateQuickAdd={handleInitiateQuickAdd}
                onCommitQuickAdd={handleCommitQuickAdd}
                onCancelQuickAdd={handleCancelQuickAdd}
                onUpdateTask={handleUpdateTask}
                onColorChange={handleColorChange}
                onDeleteTask={handleDeleteTask}
                onDragStart={handleDragStart}
                onToggleComplete={handleToggleComplete}
                onOpenModal={setActiveTaskId}
                onTouchDragEnd={handleTouchDragEnd}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Task Modal */}
      {activeTask && (
        <TaskModal
          task={activeTask}
          onClose={() => setActiveTaskId(null)}
          onUpdate={handleUpdateTask}
          onScheduleChange={handleScheduleChange}
          onColorChange={handleColorChange}
          onRecurrenceChange={handleRecurrenceChange}
          onDelete={handleDeleteTask}
          onAddSubtask={handleAddSubtask}
          onToggleSubtask={handleToggleSubtask}
          onDeleteSubtask={handleDeleteSubtask}
        />
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal && !isAuthenticated}
        onClose={() => !blockingAuth && setShowAuthModal(false)}
        allowClose={!blockingAuth}
        initialMode={blockingAuth ? "register" : authMode}
      />

      {/* Settings Modal */}
      {showSettingsModal && (
        <SettingsModal
          onClose={() => setShowSettingsModal(false)}
          currentDate={startDate}
          onTasksDeleted={loadServerTasks}
        />
      )}

      {/* Support Modal */}
      {showSupportModal && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowSupportModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm animate-in fade-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">Поддержка</h3>
              <button
                onClick={() => setShowSupportModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <p className="text-gray-600 mb-6 leading-relaxed">
              Мы сможем помочь вам в почте по адресу <a href="mailto:support@justplanner.ru" className="text-blue-600 font-semibold hover:underline">support@justplanner.ru</a>. <br />
              Ответим максимально быстро!
            </p>

            <button
              onClick={() => setShowSupportModal(false)}
              className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-semibold transition-colors"
            >
              Понятно
            </button>
          </div>
        </div>
      )}

      {/* Onboarding Overlay for new users - after first login */}
      <OnboardingOverlay
        isOpen={showOnboarding}
        userId={user?.id}
        onComplete={() => setShowOnboarding(false)}
      />
    </div>
  );
};

export default App;