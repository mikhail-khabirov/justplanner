import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Column as ColumnType, Task, TaskColor } from './types';
import { generateColumns, generateId, getTodayISO, getNextRecurrenceDate, MOCK_TODAY_ISO, safeLocalStorage, toISODate } from './utils';
import Column from './components/Column';
import TaskModal from './components/TaskModal';
import AuthModal from './components/AuthModal';
import SettingsModal from './components/SettingsModal';
import OnboardingTooltip from './components/OnboardingTooltip';
import OnboardingOverlay from './components/OnboardingOverlay';
import ProductTour from './components/ProductTour';
import WeeklyGoals from './components/WeeklyGoals';
import type { WeeklyGoal } from './components/WeeklyGoals';
import LandingPage from './components/LandingPage';
import FeaturesPage from './components/FeaturesPage';
import PublicOffer from './components/Legal/PublicOffer';
import PrivacyPolicy from './components/Legal/PrivacyPolicy';
import PricingPage from './components/PricingPage';
import { useAuth } from './contexts/AuthContext';
import { useSettings } from './contexts/SettingsContext';
import { useBilling, ProBadge, UpgradePrompt, UpgradeReason } from './billing';
import { tasksApi, telegramApi, AuthError } from './api';
import { AnnualOfferModal, AnnualOfferWidget, startAnnualOffer, isOfferActive, isOfferDismissed } from './annual-offer';
// import NotificationSurvey from './components/NotificationSurvey';
import { User, MoreHorizontal, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, TrendingUp, LogOut, Settings, LifeBuoy, X, Crown, FileDown, Printer, Zap, Sun, CalendarDays, CalendarRange, Send, Bell } from 'lucide-react';

// Configuration for the 4 bottom columns
const BOTTOM_COLUMNS = [
  { id: 'inbox', label: 'Входящие' },
  { id: 'urgent', label: 'Срочно', headerColor: 'text-red-600' },
  { id: 'someday', label: 'Когда-нибудь' },
  { id: 'ideas', label: 'Идеи' }
];

// Default section names for settings
export const DEFAULT_SECTION_NAMES = {
  inbox: 'Входящие',
  urgent: 'Срочно',
  someday: 'Когда-нибудь',
  ideas: 'Идеи'
};

// Helper to check if an ID is a date (YYYY-MM-DD)
const isDateColumn = (id: string) => /^\d{4}-\d{2}-\d{2}$/.test(id);

// Demo tasks template: dayOffset 0=Mon, 1=Tue, ... 6=Sun; null=backlog
const DEMO_TASKS_TEMPLATE: { id: string; content: string; dayOffset: number | null; backlogColumn?: string; hour?: number; color: TaskColor; }[] = [
  { id: 'd1', content: 'Скорректировать код продукта', dayOffset: 0, hour: 8, color: TaskColor.RED },
  { id: 'd2', content: 'Провести встречу с партнером', dayOffset: 0, hour: 10, color: TaskColor.PURPLE },
  { id: 'd3', content: 'Забрать вещи', dayOffset: 0, hour: 9, color: TaskColor.DEFAULT },
  { id: 'd4', content: 'Подготовить отчёт', dayOffset: 1, hour: 10, color: TaskColor.GREEN },
  { id: 'd5', content: 'Записаться к доктору', dayOffset: 2, hour: 11, color: TaskColor.YELLOW },
  { id: 'd6a', content: 'Утренняя пробежка', dayOffset: 3, hour: 6, color: TaskColor.PURPLE },
  { id: 'd6', content: 'Провести оплату', dayOffset: 3, hour: 14, color: TaskColor.GREEN },
  { id: 'd7', content: 'Написать письмо', dayOffset: 4, hour: 16, color: TaskColor.YELLOW },
  { id: 'd8', content: 'Проверить задачи', dayOffset: 5, hour: 9, color: TaskColor.RED },
  { id: 'd9', content: 'Написать письмо Вике', dayOffset: null, backlogColumn: 'inbox', color: TaskColor.YELLOW },
  { id: 'd10', content: 'Позвонить Диме', dayOffset: null, backlogColumn: 'urgent', color: TaskColor.YELLOW },
  { id: 'd11', content: 'Купить автомобиль', dayOffset: null, backlogColumn: 'someday', color: TaskColor.BLUE },
  { id: 'd12', content: 'Запустить телеграм бота по подписке', dayOffset: null, backlogColumn: 'ideas', color: TaskColor.DEFAULT },
];

// Generate demo tasks for a given week (monday date)
function generateDemoTasks(monday: Date): Task[] {
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return DEMO_TASKS_TEMPLATE.map(t => {
    if (t.dayOffset !== null) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + t.dayOffset);
      return { id: t.id, content: t.content, columnId: fmt(d), hour: t.hour, color: t.color, completed: false, subtasks: [] };
    }
    return { id: t.id, content: t.content, columnId: t.backlogColumn!, color: t.color, completed: false, subtasks: [] };
  });
}

interface QuickAddState {
  columnId: string;
  hour?: number;
}

// Reusable Stats Content Component
const StatsDisplay = ({ stats }: { stats: any }) => (
  <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1.5 rounded-xl border border-gray-100/80 shadow-sm" data-tour="stats-widget">
    <TrendingUp size={13} className="text-blue-400 shrink-0" />
    <div className="flex flex-col gap-0.5 text-[11px] font-semibold text-gray-700 leading-none">
      <div className="flex items-center gap-0.5" title="Сегодня">
        <Sun size={11} className="text-amber-400" />
        <span className={stats.todayTotal > 0 && stats.todayDone === stats.todayTotal ? 'text-green-600' : ''}>{stats.todayDone}/{stats.todayTotal}</span>
        <span className="hidden sm:inline text-gray-400 font-normal ml-0.5">Сегодня</span>
      </div>
      <div className="flex items-center gap-0.5" title="Неделя">
        <CalendarDays size={11} className="text-blue-400" />
        <span className={stats.weekTotal > 0 && stats.weekDone === stats.weekTotal ? 'text-green-600' : ''}>{stats.weekDone}/{stats.weekTotal}</span>
        <span className="hidden sm:inline text-gray-400 font-normal ml-0.5">Неделя</span>
      </div>
      <div className="flex items-center gap-0.5" title="Месяц">
        <CalendarRange size={11} className="text-purple-400" />
        <span className={stats.monthTotal > 0 && stats.monthDone === stats.monthTotal ? 'text-green-600' : ''}>{stats.monthDone}/{stats.monthTotal}</span>
        <span className="hidden sm:inline text-gray-400 font-normal ml-0.5">Месяц</span>
      </div>
    </div>
  </div>
);

const App: React.FC = () => {
  const { user, isAuthenticated, isLoading: authLoading, logout, token, isNewRegistration, clearNewRegistration } = useAuth();
  const { isPremium, startPayment, canAddTask, subscription } = useBilling();
  const { settings } = useSettings();

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
  const [feedbackHidden, setFeedbackHidden] = useState(() => safeLocalStorage.getItem('feedbackHidden') === '1');
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showProductTour, setShowProductTour] = useState(false);
  // URL-based routing: initialize state from current pathname
  const initPath = typeof window !== 'undefined' ? window.location.pathname : '/';
  const [showLanding, setShowLanding] = useState(() => {
    if (isAuthenticated) return false;
    return initPath === '/' || initPath === '/features' || initPath === '/pricing' || initPath === '/terms' || initPath === '/privacy';
  });
  const [showFeaturesPage, setShowFeaturesPage] = useState(initPath === '/features');
  const [legalView, setLegalView] = useState<'terms' | 'privacy' | 'pricing' | null>(() => {
    if (initPath === '/pricing') return 'pricing';
    if (initPath === '/terms') return 'terms';
    if (initPath === '/privacy') return 'privacy';
    return null;
  });
  // Blocking auth state: triggered by smart timer/clicks in demo mode
  const [blockingAuth, setBlockingAuth] = useState(false);
  // Upgrade prompt for free users hitting various limits
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<UpgradeReason>('colors');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Survey state
  // const [showSurvey, setShowSurvey] = useState(false);

  // Annual offer state
  const [isBacklogCollapsed, setIsBacklogCollapsed] = useState(() => safeLocalStorage.getItem('backlogCollapsed') === '1');
  const goalsIntroSeen = safeLocalStorage.getItem('goalsIntroSeen') === '1';
  const [isGoalsPanelOpen, setIsGoalsPanelOpen] = useState(!goalsIntroSeen);
  const [showGoalsIntro, setShowGoalsIntro] = useState(!goalsIntroSeen);
  const [showAnnualModal, setShowAnnualModal] = useState(false);
  const [showAnnualWidget, setShowAnnualWidget] = useState(() => isOfferActive() && !isOfferDismissed());

  // Telegram state
  const [telegramLinked, setTelegramLinked] = useState(false);
  const telegramPollingRef = useRef<NodeJS.Timeout | null>(null);

  // Helper: navigate to a URL and update state
  const navigateTo = useCallback((path: string) => {
    window.history.pushState({}, '', path);
  }, []);

  // Handle browser back/forward
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      setLegalView(
        path === '/pricing' ? 'pricing' :
          path === '/terms' ? 'terms' :
            path === '/privacy' ? 'privacy' : null
      );
      setShowFeaturesPage(path === '/features');
      if (path === '/app') {
        setShowLanding(false);
      } else if (path === '/' && !isAuthenticated) {
        setShowLanding(true);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isAuthenticated]);

  // Helper to show upgrade prompt with specific reason
  const showUpgradePromptWithReason = useCallback((reason: UpgradeReason) => {
    setUpgradeReason(reason);
    setShowUpgradePrompt(true);
  }, []);

  // Called when user completes registration (email, not Google)
  const handleRegisterComplete = useCallback(() => {
    startAnnualOffer();
    setShowAnnualWidget(true);
    // Modal will be shown 10s after onboarding closes
  }, []);

  // Handle Google OAuth new registrations
  useEffect(() => {
    if (isNewRegistration && isAuthenticated && !isPremium) {
      startAnnualOffer();
      setShowAnnualWidget(true);
      clearNewRegistration();
      // Modal will be shown 10s after onboarding closes
    }
  }, [isNewRegistration, isAuthenticated, isPremium, clearNewRegistration]);

  // Show notification survey once per authenticated user (not while annual offer is active)
  // useEffect(() => {
  //   if (!isAuthenticated || !user) return;
  //   const key = `nsv2_${user.id}`;
  //   if (safeLocalStorage.getItem(key) === '1') return;
  //   if (showAnnualModal) return; // don't compete if annual modal is open right now
  //   const timer = setTimeout(() => {
  //     setShowSurvey(true);
  //     safeLocalStorage.setItem(key, '1');
  //   }, 10000);
  //   return () => clearTimeout(timer);
  // }, [isAuthenticated, user]);

  // Handle ?annualOffer=1 from welcome email link
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('annualOffer') === '1' && isAuthenticated) {
      const alreadyAnnual = subscription?.isAnnual && subscription?.plan === 'pro';
      if (!alreadyAnnual) {
        setShowAnnualModal(true);
        if (!isPremium || subscription?.isTrial) setShowAnnualWidget(true);
      }
      params.delete('annualOffer');
      const newUrl = params.toString()
        ? `${window.location.pathname}?${params.toString()}`
        : window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [isAuthenticated, isPremium, subscription]);

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

  // Drag-to-scroll: hold mouse button and drag left/right
  useEffect(() => {
    const el = mainScrollRef.current;
    if (!el) return;
    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;

    const onMouseDown = (e: MouseEvent) => {
      // Only on left button, ignore clicks on interactive elements
      if (e.button !== 0) return;
      const target = e.target as HTMLElement;
      if (target.closest('button, input, textarea, [data-task-id]')) return;
      isDown = true;
      startX = e.pageX - el.offsetLeft;
      scrollLeft = el.scrollLeft;
      el.style.cursor = 'grabbing';
      el.style.userSelect = 'none';
    };
    const onMouseUp = () => {
      isDown = false;
      el.style.cursor = '';
      el.style.userSelect = '';
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - el.offsetLeft;
      const walk = (x - startX) * 1.2;
      el.scrollLeft = scrollLeft - walk;
    };

    el.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    el.addEventListener('mousemove', onMouseMove);
    return () => {
      el.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      el.removeEventListener('mousemove', onMouseMove);
    };
  }, []);

  // Track if tasks have been loaded from server to avoid overwriting
  const hasLoadedFromServer = useRef(false);
  const [tasksLoaded, setTasksLoaded] = useState(false);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingSyncRef = useRef<any[] | null>(null);
  const syncRetryCount = useRef(0);
  const MAX_SYNC_RETRIES = 3;

  // localStorage backup helpers
  const getBackupKey = useCallback(() => `tasks_backup_${user?.id || 'unknown'}`, [user?.id]);
  const getBackupTimestampKey = useCallback(() => `tasks_backup_ts_${user?.id || 'unknown'}`, [user?.id]);
  const getSyncedKey = useCallback(() => `tasks_synced_${user?.id || 'unknown'}`, [user?.id]);

  // Load tasks from server. Server data always wins — localStorage backup is only used as offline fallback.
  const loadServerTasks = useCallback(() => {
    if (!isAuthenticated) return;

    tasksApi.getAll()
      .then(serverTasks => {
        hasLoadedFromServer.current = true;

        // Server is the source of truth — always use server data
        setTasks(serverTasks);
        setTasksLoaded(true);
        // Update backup with fresh server data and mark as synced
        safeLocalStorage.setItem(getBackupKey(), JSON.stringify(serverTasks));
        safeLocalStorage.setItem(getBackupTimestampKey(), new Date().toISOString());
        safeLocalStorage.setItem(getSyncedKey(), 'true');

        // Show onboarding for first-time users after login
        const onboardingKey = `onboarding_complete_${user?.id || 'default'}`;
        if (!safeLocalStorage.getItem(onboardingKey)) {
          setShowOnboarding(true);
        }
      })
      .catch(err => {
        if (err instanceof AuthError) {
          // Backup is already in localStorage from the sync effect
          logout();
        } else {
          console.error('Failed to load tasks:', err);
          // Server unavailable — fall back to localStorage backup
          const backupRaw = safeLocalStorage.getItem(getBackupKey());
          if (backupRaw) {
            try {
              const backupTasks = JSON.parse(backupRaw);
              if (Array.isArray(backupTasks) && backupTasks.length > 0) {
                console.log('Loading tasks from localStorage backup (server unavailable)');
                hasLoadedFromServer.current = true;
                setTasks(backupTasks);
                setTasksLoaded(true);
              }
            } catch (e) { /* ignore */ }
          }
        }
      });
  }, [isAuthenticated, user?.id, getBackupKey, getBackupTimestampKey, getSyncedKey]);

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
      // Demo tasks always on the real current week (not the displayed one)
      const today = new Date();
      const dow = today.getDay();
      const mondayOffset = today.getDate() - dow + (dow === 0 ? -6 : 1);
      const currentMonday = new Date(today);
      currentMonday.setHours(0, 0, 0, 0);
      currentMonday.setDate(mondayOffset);
      setTasks(generateDemoTasks(currentMonday));
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

    // Always backup to localStorage immediately
    safeLocalStorage.setItem(getBackupKey(), JSON.stringify(tasks));
    safeLocalStorage.setItem(getBackupTimestampKey(), new Date().toISOString());
    safeLocalStorage.setItem(getSyncedKey(), 'false');

    // Clear previous timeout
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    // Debounce sync by 1 second
    pendingSyncRef.current = tasks;
    syncRetryCount.current = 0;

    const doSync = (tasksToSync: Task[]) => {
      tasksApi.syncAll(tasksToSync)
        .then(() => {
          syncRetryCount.current = 0;
          pendingSyncRef.current = null;
          safeLocalStorage.setItem(getSyncedKey(), 'true');
        })
        .catch(err => {
          console.error('Failed to sync tasks:', err);
          // Keep pendingSyncRef set so beforeUnload can still send
          pendingSyncRef.current = tasksToSync;
          // Retry with backoff
          if (syncRetryCount.current < MAX_SYNC_RETRIES) {
            syncRetryCount.current++;
            const delay = Math.min(2000 * Math.pow(2, syncRetryCount.current - 1), 10000);
            console.log(`Retrying sync (${syncRetryCount.current}/${MAX_SYNC_RETRIES}) in ${delay}ms...`);
            syncTimeoutRef.current = setTimeout(() => doSync(tasksToSync), delay);
          }
        });
    };

    syncTimeoutRef.current = setTimeout(() => doSync(tasks), 1000);

    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [tasks, isAuthenticated, getBackupKey, getBackupTimestampKey, getSyncedKey]);

  // Re-fetch from server when tab becomes visible (cross-device sync)
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Only re-fetch if there are no pending local changes waiting to sync
        const isSynced = safeLocalStorage.getItem(getSyncedKey());
        if (isSynced !== 'false') {
          console.log('Tab visible — refreshing tasks from server');
          loadServerTasks();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isAuthenticated, getSyncedKey, loadServerTasks]);

  // Flush pending sync on page close/refresh
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Always try to sync from localStorage backup (most reliable source)
      const backupRaw = safeLocalStorage.getItem(getBackupKey());
      const isSynced = safeLocalStorage.getItem(getSyncedKey());
      if (backupRaw && isSynced === 'false') {
        const token = safeLocalStorage.getItem('token');
        const payload = backupRaw; // Already JSON string of tasks array
        const body = JSON.stringify({ tasks: JSON.parse(payload) });
        // Use sendBeacon (most reliable for page close), fallback to fetch+keepalive
        if (navigator.sendBeacon) {
          const blob = new Blob([body], { type: 'application/json' });
          // sendBeacon doesn't support custom headers, so encode token in URL
          navigator.sendBeacon(`/api/tasks/sync?token=${encodeURIComponent(token || '')}`, blob);
        } else {
          fetch('/api/tasks/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
            body,
            keepalive: true
          }).catch(() => { });
        }
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [getBackupKey, getSyncedKey]);

  // Auto-rollover: move incomplete past tasks to today after midnight (PRO only)
  useEffect(() => {
    if (!isAuthenticated || !isPremium || !settings.autoRollover) return;
    if (!tasksLoaded) return;

    const rolloverTasks = () => {
      const todayISO = getTodayISO();
      setTasks(prev => {
        const hasPastIncomplete = prev.some(
          t => isDateColumn(t.columnId) && t.columnId < todayISO && !t.completed
        );
        if (!hasPastIncomplete) return prev;

        // Count existing tasks per hour in today's column (before rollover)
        const hourCounts: Record<number, number> = {};
        prev.forEach(t => {
          if (t.columnId === todayISO && t.hour !== undefined) {
            hourCounts[t.hour] = (hourCounts[t.hour] || 0) + 1;
          }
        });

        return prev.map(t => {
          if (isDateColumn(t.columnId) && t.columnId < todayISO && !t.completed) {
            let finalHour = t.hour;
            if (finalHour !== undefined) {
              const count = hourCounts[finalHour] || 0;
              if (count >= 3) {
                finalHour = undefined; // слот переполнен — без времени
              } else {
                hourCounts[finalHour] = count + 1; // резервируем слот
              }
            }
            return { ...t, columnId: todayISO, hour: finalHour };
          }
          return t;
        });
      });
    };

    // Run immediately on mount / settings change
    rolloverTasks();

    // Schedule to re-run at next midnight
    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setDate(now.getDate() + 1);
    nextMidnight.setHours(0, 0, 0, 100);
    const msUntilMidnight = nextMidnight.getTime() - now.getTime();

    const timer = setTimeout(() => {
      rolloverTasks();
    }, msUntilMidnight);

    return () => clearTimeout(timer);
  }, [isAuthenticated, isPremium, settings.autoRollover, tasksLoaded]);

  // Generate columns based on current startDate
  const columns = useMemo(() => generateColumns(startDate), [startDate]);

  // Sort tasks for display: Completed tasks always at the bottom
  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => Number(a.completed) - Number(b.completed));
  }, [tasks]);

  const activeTask = useMemo(() => tasks.find(t => t.id === activeTaskId), [tasks, activeTaskId]);

  // --- Weekly Goals ---
  const weekGoalsColumnId = useMemo(() => `goals-${toISODate(startDate)}`, [startDate]);

  const weekGoals: WeeklyGoal[] = useMemo(() => {
    return tasks
      .filter(t => t.columnId === weekGoalsColumnId)
      .map(t => ({ id: t.id, content: t.content, completed: t.completed, subtasks: (t.subtasks || []).map(s => ({ id: s.id, content: s.content, completed: s.completed })) }));
  }, [tasks, weekGoalsColumnId]);

  const weekLabel = useMemo(() => {
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    const startDay = startDate.getDate();
    const endDay = endDate.getDate();
    const startMonth = startDate.toLocaleDateString('ru-RU', { month: 'long' });
    const endMonth = endDate.toLocaleDateString('ru-RU', { month: 'long' });
    if (startMonth === endMonth) {
      return `${startDay} – ${endDay} ${startMonth}`;
    }
    return `${startDay} ${startMonth} – ${endDay} ${endMonth}`;
  }, [startDate]);

  const handleAddGoal = useCallback((content: string) => {
    const newTask: Task = {
      id: generateId(),
      content,
      columnId: weekGoalsColumnId,
      color: TaskColor.DEFAULT,
      completed: false,
      subtasks: [],
    };
    setTasks(prev => [...prev, newTask]);
  }, [weekGoalsColumnId]);

  const handleDeleteGoal = useCallback((id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  }, []);

  const handleToggleGoal = useCallback((id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  }, []);

  const handleUpdateGoal = useCallback((id: string, content: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, content } : t));
  }, []);

  const handleReorderGoals = useCallback((reordered: WeeklyGoal[]) => {
    setTasks(prev => {
      // Remove old goal tasks for this week, then add reordered ones back
      const withoutGoals = prev.filter(t => t.columnId !== weekGoalsColumnId);
      const goalTasks = reordered.map(g => {
        const original = prev.find(t => t.id === g.id);
        return original || { id: g.id, content: g.content, columnId: weekGoalsColumnId, color: TaskColor.DEFAULT, completed: g.completed, subtasks: [] };
      });
      return [...withoutGoals, ...goalTasks];
    });
  }, [weekGoalsColumnId]);

  const handleMoveGoalToNextWeek = useCallback((id: string) => {
    const nextMonday = new Date(startDate);
    nextMonday.setDate(nextMonday.getDate() + 7);
    const nextWeekColumnId = `goals-${toISODate(nextMonday)}`;
    setTasks(prev => prev.map(t =>
      t.id === id ? { ...t, columnId: nextWeekColumnId } : t
    ));
  }, [startDate]);

  const handleAddGoalSubtask = useCallback((goalId: string, content: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === goalId) {
        return { ...t, subtasks: [...t.subtasks, { id: generateId(), content, completed: false }] };
      }
      return t;
    }));
  }, []);

  const handleToggleGoalSubtask = useCallback((goalId: string, subtaskId: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === goalId) {
        return { ...t, subtasks: t.subtasks.map(s => s.id === subtaskId ? { ...s, completed: !s.completed } : s) };
      }
      return t;
    }));
  }, []);

  const handleDeleteGoalSubtask = useCallback((goalId: string, subtaskId: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === goalId) {
        return { ...t, subtasks: t.subtasks.filter(s => s.id !== subtaskId) };
      }
      return t;
    }));
  }, []);

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

    // Week restriction for free users (can only move to current week)
    if (!isPremium && isDateColumn(targetColumnId)) {
      const targetDate = new Date(targetColumnId);
      // Calculate ACTUAL current week (not displayed week)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dayOfWeek = today.getDay();
      const mondayDiff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const currentWeekMonday = new Date(today);
      currentWeekMonday.setDate(mondayDiff);
      const endOfCurrentWeek = new Date(currentWeekMonday);
      endOfCurrentWeek.setDate(currentWeekMonday.getDate() + 6);
      endOfCurrentWeek.setHours(23, 59, 59, 999);

      if (targetDate > endOfCurrentWeek) {
        showUpgradePromptWithReason('week_planning');
        setDraggedTaskId(null);
        return;
      }
    }

    if (taskId) {
      moveTask(taskId, targetColumnId, hour);
    }
    setDraggedTaskId(null);
  }, [isPremium]);

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
      // Week restriction for free users (can only move to current week)
      if (!isPremium && isDateColumn(targetColumnId)) {
        const targetDate = new Date(targetColumnId);
        // Calculate ACTUAL current week (not displayed week)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dayOfWeek = today.getDay();
        const mondayDiff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        const currentWeekMonday = new Date(today);
        currentWeekMonday.setDate(mondayDiff);
        const endOfCurrentWeek = new Date(currentWeekMonday);
        endOfCurrentWeek.setDate(currentWeekMonday.getDate() + 6);
        endOfCurrentWeek.setHours(23, 59, 59, 999);

        if (targetDate > endOfCurrentWeek) {
          showUpgradePromptWithReason('week_planning');
          setDraggedTaskId(null);
          return;
        }
      }
      moveTask(taskId, targetColumnId, targetHour, targetTaskId || undefined);
    }

    setDraggedTaskId(null);
  }, [isPremium]);

  // --- Task Management ---

  const handleInitiateQuickAdd = (columnId: string, hour?: number) => {
    // Check week restriction for free users (can only plan current week)
    if (isAuthenticated && !isPremium && isDateColumn(columnId)) {
      const targetDate = new Date(columnId);
      // Calculate ACTUAL current week (not displayed week)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dayOfWeek = today.getDay();
      const mondayDiff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const currentWeekMonday = new Date(today);
      currentWeekMonday.setDate(mondayDiff);
      const endOfCurrentWeek = new Date(currentWeekMonday);
      endOfCurrentWeek.setDate(currentWeekMonday.getDate() + 6);
      endOfCurrentWeek.setHours(23, 59, 59, 999);

      if (targetDate > endOfCurrentWeek) {
        showUpgradePromptWithReason('week_planning');
        return;
      }
    }
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

  // Reminder handler
  const handleReminderChange = (id: string, offset: string | null) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, reminderOffset: offset } : t));
  };

  // Telegram integration
  const loadTelegramStatus = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const status = await telegramApi.getStatus();
      setTelegramLinked(status.linked);
    } catch (err) {
      // ignore
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadTelegramStatus();
  }, [loadTelegramStatus]);

  const handleConnectTelegram = async () => {
    // Open window synchronously (before await) to avoid popup blocker
    const win = window.open('about:blank', '_blank');
    try {
      const { link } = await telegramApi.getLink();
      if (win) {
        win.location.href = link;
      } else {
        // Fallback: navigate in same tab if popup was still blocked
        window.location.href = link;
      }
      // Start polling for status
      let attempts = 0;
      const maxAttempts = 40; // ~2 minutes at 3s intervals
      if (telegramPollingRef.current) clearInterval(telegramPollingRef.current);
      telegramPollingRef.current = setInterval(async () => {
        attempts++;
        try {
          const status = await telegramApi.getStatus();
          if (status.linked) {
            setTelegramLinked(true);
            if (telegramPollingRef.current) clearInterval(telegramPollingRef.current);
          }
        } catch (_) { /* ignore */ }
        if (attempts >= maxAttempts && telegramPollingRef.current) {
          clearInterval(telegramPollingRef.current);
        }
      }, 3000);
    } catch (err) {
      if (win) win.close();
      console.error('Failed to connect Telegram:', err);
    }
  };

  const handleDisconnectTelegram = async () => {
    try {
      await telegramApi.unlink();
      setTelegramLinked(false);
      // Clear reminder offsets from local tasks
      setTasks(prev => prev.map(t => ({ ...t, reminderOffset: null })));
    } catch (err) {
      console.error('Failed to disconnect Telegram:', err);
    }
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

  const handleEditSubtask = (taskId: string, subtaskId: string, content: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          subtasks: t.subtasks.map(s => s.id === subtaskId ? { ...s, content } : s)
        };
      }
      return t;
    }));
  };

  const handleReorderSubtasks = (taskId: string, subtasks: import('./types').Subtask[]) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, subtasks } : t));
  };

  if (authLoading) {
    return <div className="flex items-center justify-center" style={{ height: '100dvh' }}>Загрузка...</div>;
  }

  if (legalView === 'terms') {
    return <PublicOffer onBack={() => { setLegalView(null); window.history.back(); }} />;
  }
  if (legalView === 'privacy') {
    return <PrivacyPolicy onBack={() => { setLegalView(null); window.history.back(); }} />;
  }
  if (legalView === 'pricing') {
    return (
      <PricingPage
        onBack={() => { setLegalView(null); window.history.back(); }}
        token={token}
        isAuthenticated={isAuthenticated}
        subscription={subscription}
        onAuthRequired={() => { setLegalView(null); setAuthMode('register'); setShowAuthModal(true); }}
        onSelectPlan={(plan) => {
          setLegalView(null);
          navigateTo('/app');
          if (plan === 'pro') {
            setAuthMode('register');
            setShowAuthModal(true);
          } else {
            setShowLanding(false);
          }
        }}
      />
    );
  }

  // Show Features Page
  if (showFeaturesPage) {
    return (
      <>
        <FeaturesPage
          onStart={() => {
            setShowFeaturesPage(false);
            setShowLanding(false);
            navigateTo('/app');
          }}
          onBack={() => {
            setShowFeaturesPage(false);
            if (!isAuthenticated) {
              setShowLanding(true);
              navigateTo('/');
            } else {
              navigateTo('/app');
            }
          }}
          onShowPricing={() => { setLegalView('pricing'); navigateTo('/pricing'); }}
        />
        {legalView === 'pricing' && (
          <PricingPage
            onBack={() => setLegalView(null)}
            token={token}
            isAuthenticated={isAuthenticated}
            subscription={subscription}
            onAuthRequired={() => { setLegalView(null); setAuthMode('register'); setShowAuthModal(true); }}
            onSelectPlan={() => {
              setLegalView(null);
              setShowFeaturesPage(false);
              setShowLanding(false);
            }}
          />
        )}
      </>
    );
  }

  // Show Landing Page for guests (unless they chose to try demo)
  if (!isAuthenticated && showLanding) {
    return (
      <>
        <LandingPage
          onStart={() => {
            setShowLanding(false);
            navigateTo('/app');
          }}
          onLogin={() => {
            setAuthMode('login');
            setShowAuthModal(true);
          }}
          onShowTerms={() => { setLegalView('terms'); navigateTo('/terms'); }}
          onShowPrivacy={() => { setLegalView('privacy'); navigateTo('/privacy'); }}
          onShowPricing={() => { setLegalView('pricing'); navigateTo('/pricing'); }}
          onShowFeatures={() => { setShowFeaturesPage(true); navigateTo('/features'); }}
        />
        {/* Render AuthModal here too in case they click Login from landing */}
        {showAuthModal && (
          <AuthModal
            isOpen={showAuthModal}
            onClose={() => !blockingAuth && setShowAuthModal(false)}
            allowClose={!blockingAuth}
            initialMode={authMode}
            onRegister={handleRegisterComplete}
          />
        )}
      </>
    );
  }

  // --- Layout ---

  return (
    <div className="flex flex-col bg-white text-gray-900 font-sans overflow-hidden selection:bg-blue-100" style={{ height: '100dvh' }}>
      {/* Unregistered User Alert */}
      {!isAuthenticated && (
        <div className="bg-red-50 border-b border-red-100 px-4 py-2 flex items-center justify-center text-center">
          <p className="text-xs md:text-sm text-red-800">
            <span className="font-bold">Вы не зарегистрированы.</span> Ваши данные пропадут после обновления страницы. <button onClick={() => { setAuthMode('register'); setShowAuthModal(true); }} className="underline font-semibold hover:text-red-900">Зарегистрируйтесь</button>, чтобы сохранить прогресс.
          </p>
        </div>
      )}

      {/* Header */}
      <header className="flex-shrink-0 px-3 py-2 md:px-6 md:py-4 lg:px-8 lg:py-6 border-b border-transparent">
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-2 md:gap-3 lg:gap-4 min-w-0 overflow-hidden">
            {/* Title + arrows */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <h1
                onClick={handleBackToToday}
                className="text-base sm:text-2xl md:text-3xl lg:text-4xl font-serif font-bold tracking-tight leading-none cursor-pointer hover:opacity-70 transition-opacity whitespace-nowrap"
                title="Вернуться к текущей неделе"
              >
                {monthTitle}
              </h1>
              <div className="flex gap-1.5">
                <button
                  onClick={handlePrevWeek}
                  className="p-1.5 md:p-2 rounded-full bg-[#26A69A] text-white hover:bg-[#1f8f84] transition-colors active:scale-95"
                >
                  <ChevronLeft size={14} className="md:w-4 md:h-4 lg:w-5 lg:h-5" />
                </button>
                <button
                  onClick={handleNextWeek}
                  className="p-1.5 md:p-2 rounded-full bg-[#26A69A] text-white hover:bg-[#1f8f84] transition-colors active:scale-95"
                >
                  <ChevronRight size={14} className="md:w-4 md:h-4 lg:w-5 lg:h-5" />
                </button>
              </div>
            </div>

            {/* Efficiency Stats Widget */}
            <StatsDisplay stats={stats} />

          </div>

          {/* Feedback prompt */}
          {!feedbackHidden && (
            <div className="hidden xl:flex items-center gap-2 flex-1 justify-center mx-4">
              <div className="inline-flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-full px-4 py-1.5 shadow-sm">
                <span className="text-xs text-gray-500">Есть идеи? Напишите нам</span>
                <a href="mailto:support@justplanner.ru" className="text-xs font-medium text-[#26A69A] hover:underline">support@justplanner.ru</a>
                {isPremium && (
                  <button
                    onClick={() => { setFeedbackHidden(true); safeLocalStorage.setItem('feedbackHidden', '1'); }}
                    className="ml-1 p-0.5 text-gray-300 hover:text-gray-500 transition-colors rounded-full"
                    title="Скрыть"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center gap-1 md:gap-2 lg:gap-3 flex-shrink-0">
            {/* Print - Pro only, before divider */}
            {isAuthenticated && (
              <button
                onClick={() => {
                  if (!isPremium) {
                    showUpgradePromptWithReason('print');
                    return;
                  }
                  // Set document title for print/PDF filename
                  const originalTitle = document.title;
                  const endOfWeek = new Date(startDate);
                  endOfWeek.setDate(startDate.getDate() + 6);
                  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                  const startDay = startDate.getDate();
                  const endDay = endOfWeek.getDate();
                  const month = months[startDate.getMonth()];
                  document.title = `${startDay}-${endDay} ${month}. Justplanner`;
                  window.print();
                  setTimeout(() => { document.title = originalTitle; }, 1000);
                }}
                className="p-2 rounded-full bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors"
                title="Распечатать"
              >
                <Printer size={20} />
              </button>
            )}

            {/* Divider only on desktop */}
            <div className="hidden lg:block h-8 w-[1px] bg-gray-200 mx-1"></div>

            {isAuthenticated ? (
              <span className="hidden lg:block text-sm text-gray-600 truncate max-w-[130px]">
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

            {/* Pro Badge for premium users */}
            {isAuthenticated && isPremium && (
              <ProBadge size="md" />
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
                        setShowFeaturesPage(true);
                        setShowMenuDropdown(false);
                        navigateTo('/features');
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Zap size={16} />
                      Функции
                    </button>

                    {/* Upgrade to Pro - for free and unauthenticated users */}
                    {!isPremium && (
                      <button
                        onClick={() => {
                          setShowMenuDropdown(false);
                          setLegalView('pricing');
                          navigateTo('/pricing');
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-amber-600 hover:bg-amber-50 flex items-center gap-2 font-medium"
                      >
                        <Crown size={16} />
                        Перейти на Pro
                      </button>
                    )}

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

      </header>

      {/* Weekly Goals Panel */}
      <WeeklyGoals
        goals={weekGoals}
        isOpen={isGoalsPanelOpen}
        onToggle={() => setIsGoalsPanelOpen(prev => !prev)}
        onAdd={handleAddGoal}
        onDelete={handleDeleteGoal}
        onToggleComplete={handleToggleGoal}
        onUpdate={handleUpdateGoal}
        onReorder={handleReorderGoals}
        onMoveToNextWeek={handleMoveGoalToNextWeek}
        onAddSubtask={handleAddGoalSubtask}
        onToggleSubtask={handleToggleGoalSubtask}
        onDeleteSubtask={handleDeleteGoalSubtask}
        weekLabel={weekLabel}
        showIntro={showGoalsIntro}
        onDismissIntro={() => { setShowGoalsIntro(false); safeLocalStorage.setItem('goalsIntroSeen', '1'); }}
      />

      {/* Main Content: Horizontal Scroll for Days */}
      <main
        ref={mainScrollRef}
        className="flex-1 overflow-x-auto lg:overflow-x-hidden overflow-y-hidden px-4 md:px-8 pb-2 snap-x snap-mandatory lg:snap-none scrollbar-thin"
      >
        <div className="flex h-full gap-4 lg:gap-4 min-w-max lg:min-w-0 lg:w-full">
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
              isPremium={isPremium}
              onShowUpgradePrompt={() => showUpgradePromptWithReason('colors')}
              isFirstColumn={col.isToday}
            />
          ))}
        </div>
      </main>

      {/* Backlog Toggle Button */}
      <div
        className="flex-shrink-0 flex justify-center py-1 z-20"
        style={isBacklogCollapsed ? { paddingBottom: 'calc(0.25rem + env(safe-area-inset-bottom))' } : undefined}
      >
        <button
          onClick={() => {
            const next = !isBacklogCollapsed;
            setIsBacklogCollapsed(next);
            safeLocalStorage.setItem('backlogCollapsed', next ? '1' : '0');
          }}
          className={`flex items-center gap-1 px-4 py-1.5 sm:px-3 sm:py-0.5 rounded-full text-xs transition-colors shadow-sm ${isBacklogCollapsed
            ? 'bg-gray-100 border-2 border-gray-300 text-gray-600 hover:bg-gray-200'
            : 'bg-white border border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300'
            }`}
        >
          {isBacklogCollapsed ? <ChevronUp size={18} className="sm:w-3.5 sm:h-3.5" /> : <ChevronDown size={18} className="sm:w-3.5 sm:h-3.5" />}
          <span>{isBacklogCollapsed ? 'Показать' : 'Скрыть'}</span>
        </button>
      </div>

      {/* Footer / Backlog Area */}
      {!isBacklogCollapsed && (
        <section className="flex-shrink-0 h-1/4 px-4 md:px-8 pb-4 border-t-2 border-gray-200 bg-gray-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }} data-tour="backlog-section">
          <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 md:grid md:grid-cols-4 md:gap-8 h-full scrollbar-hide pb-2 md:pb-0">
            {BOTTOM_COLUMNS.map(colDef => (
              <div key={colDef.id} className="min-w-[85vw] md:min-w-0 h-full snap-center last:pr-4 md:last:pr-0">
                <Column
                  column={{
                    id: colDef.id,
                    dateLabel: settings.sectionNames?.[colDef.id as keyof typeof settings.sectionNames] || colDef.label,
                    dayLabel: '',
                  }}
                  quickAddState={quickAddState}
                  headerColor={colDef.headerColor}
                  tasks={sortedTasks.filter(t => t.columnId === colDef.id)}
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
                  isPremium={isPremium}
                  onShowUpgradePrompt={() => showUpgradePromptWithReason('colors')}
                />
              </div>
            ))}
          </div>
        </section>
      )}

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
          onEditSubtask={handleEditSubtask}
          onReorderSubtasks={handleReorderSubtasks}
          isPremium={isPremium}
          onShowUpgradePrompt={(reason) => showUpgradePromptWithReason(reason || 'colors')}
          isTelegramLinked={telegramLinked}
          showTourReminder={showProductTour}
          onReminderChange={handleReminderChange}
        />
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal && !isAuthenticated}
        onClose={() => !blockingAuth && setShowAuthModal(false)}
        allowClose={!blockingAuth}
        initialMode={blockingAuth ? "register" : authMode}
        onRegister={handleRegisterComplete}
      />

      {/* Settings Modal */}
      {showSettingsModal && (
        <SettingsModal
          onClose={() => setShowSettingsModal(false)}
          currentDate={startDate}
          onTasksDeleted={loadServerTasks}
          telegramLinked={telegramLinked}
          onConnectTelegram={handleConnectTelegram}
          onDisconnectTelegram={handleDisconnectTelegram}
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
        onComplete={() => {
          setShowOnboarding(false);
          // Start product tour after onboarding overlay
          const tourKey = `tour_complete_${user?.id || 'default'}`;
          if (!safeLocalStorage.getItem(tourKey)) {
            setTimeout(() => setShowProductTour(true), 500);
          } else {
            // Show annual offer modal 10s after onboarding closes
            if (isOfferActive() && !isOfferDismissed() && !isPremium) {
              setTimeout(() => setShowAnnualModal(true), 10000);
            }
          }
        }}
      />

      {/* Product Tour — spotlight tooltips after onboarding */}
      <ProductTour
        isOpen={showProductTour}
        userId={user?.id}
        todayISO={getTodayISO()}
        onComplete={() => {
          setShowProductTour(false);
          // Show annual offer modal 10s after tour completes
          if (isOfferActive() && !isOfferDismissed() && !isPremium) {
            setTimeout(() => setShowAnnualModal(true), 10000);
          }
        }}
        onCreateDemoTask={(stepId: string) => {
          const todayCol = getTodayISO();
          if (stepId === 'drag-drop') {
            const demoTask: Task = {
              id: generateId(),
              content: 'Моя первая задача',
              columnId: todayCol,
              hour: 10,
              color: 'blue' as TaskColor,
              completed: false,
              subtasks: []
            };
            setTasks(prev => [...prev, demoTask]);
          } else if (stepId === 'multi-task') {
            const task2: Task = {
              id: generateId(),
              content: 'Позвонить клиенту',
              columnId: todayCol,
              hour: 10,
              color: 'green' as TaskColor,
              completed: false,
              subtasks: []
            };
            const task3: Task = {
              id: generateId(),
              content: 'Отправить отчёт',
              columnId: todayCol,
              hour: 10,
              color: 'purple' as TaskColor,
              completed: false,
              subtasks: []
            };
            setTasks(prev => [...prev, task2, task3]);
          } else if (stepId === 'telegram-btn') {
            // No action needed — button shown via showProductTour state
          } else if (stepId === 'reminder-section') {
            // Open the first demo task modal to show reminder section
            setTasks(prev => {
              const demoTask = prev.find(t => t.columnId === todayCol && t.hour === 10);
              if (demoTask) {
                setTimeout(() => setActiveTaskId(demoTask.id), 50);
              }
              return prev;
            });
          } else if (stepId === 'stats-widget') {
            // Close the task modal so stats widget is visible
            setActiveTaskId(null);
          } else if (stepId === 'backlog-section') {
            // Close modal and expand backlog
            setActiveTaskId(null);
            setIsBacklogCollapsed(false);
            safeLocalStorage.setItem('backlogCollapsed', '0');
          } else if (stepId === 'settings-day-start' || stepId === 'settings-rollover' || stepId === 'settings-sections' || stepId === 'settings-pro') {
            // Open settings modal (keep open if already open)
            setShowSettingsModal(true);
          }
        }}
      />

      {/* Upgrade Prompt for free users hitting various limits */}
      <UpgradePrompt
        isOpen={showUpgradePrompt}
        onClose={() => setShowUpgradePrompt(false)}
        reason={upgradeReason}
      />

      {/* Annual Offer — modal (also for Pro via email link) + widget (free & trial) */}
      {/* isAuthenticated && showSurvey && (
        <NotificationSurvey
          token={token}
          onDone={() => setShowSurvey(false)}
        />
      ) */}

      {isAuthenticated && (
        <>
          <AnnualOfferModal
            isOpen={showAnnualModal}
            onClose={() => setShowAnnualModal(false)}
            onPurchased={() => { setShowAnnualModal(false); setShowAnnualWidget(false); }}
          />
          {(!isPremium || subscription?.isTrial) && (
            <AnnualOfferWidget
              visible={!showAnnualModal && showAnnualWidget}
              onClick={() => setShowAnnualModal(true)}
            />
          )}

          {/* Telegram Connect Button - bottom left (show during tour or for Pro when not linked) */}
          {(showProductTour || (isPremium && !telegramLinked)) && (
            <button
              onClick={handleConnectTelegram}
              className="fixed bottom-5 left-5 z-40 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl text-sm font-semibold bg-blue-500 text-white hover:bg-blue-600 border border-blue-400"
              title="Подключить Telegram"
              data-tour="telegram-btn"
            >
              <Send size={16} />
              <span className="hidden sm:inline">Подключить Telegram</span>
              <Bell size={14} className="animate-pulse" />
            </button>
          )}
        </>
      )}
    </div>
  );
};

export default App;