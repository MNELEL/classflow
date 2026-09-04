import { Toaster } from "@/components/ui/toaster"
import { Toaster as Sonner } from 'sonner';
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, useLocation, useNavigate, useNavigationType, Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState, lazy, Suspense } from 'react';
import { warmDashboardMedia } from '@/lib/mediaWarmup';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ProtectedRoute from '@/components/ProtectedRoute';
import { SelectedDateProvider } from '@/lib/dateContext';
import { ThemeProvider } from '@/lib/themeContext';
import { applyThemeClass, loadTheme } from '@/lib/themes';
import { loadBrandingFromDB, loadBranding } from '@/lib/branding';
import PinLockScreen from '@/components/security/PinLockScreen';
import { isLocked, refreshPinStatus, PIN_ENABLED_KEY } from '@/lib/pinLock';
import ErrorBoundary from '@/components/ErrorBoundary';
import OfflineIndicator from '@/components/OfflineIndicator';
import { useOfflineSyncQueue } from '@/hooks/useOfflineSyncQueue';
import UpdatePrompt from '@/components/UpdatePrompt';
const AssistantDock = lazy(() => import('./components/assistant/AssistantDock'));

// Lazy-loaded pages for code splitting
const SeatingPage          = lazy(() => import('./pages/SeatingPage'));
const StudentsPage         = lazy(() => import('./pages/StudentsPage'));
const HistoryPage          = lazy(() => import('./pages/HistoryPage'));
const DashboardPage        = lazy(() => import('./pages/DashboardPage'));
const SettingsPage         = lazy(() => import('./pages/SettingsPage'));
const ReportsPage          = lazy(() => import('./pages/ReportsPage'));
const AttendancePage       = lazy(() => import('./pages/AttendancePage'));
const WeeklyAttendanceReportPage = lazy(() => import('./pages/WeeklyAttendanceReportPage'));
const MonthlyAttendanceReportPage = lazy(() => import('./pages/MonthlyAttendanceReportPage'));
const WeeklySummaryPage = lazy(() => import('./pages/WeeklySummaryPage'));
const WeeklyCommunicationPage = lazy(() => import('./pages/WeeklyCommunicationPage'));
const BirthdaysReportPage = lazy(() => import('./pages/BirthdaysReportPage'));
const WeeklyTasksPage = lazy(() => import('./pages/WeeklyTasksPage'));
const GradeManagementPage  = lazy(() => import('./pages/GradeManagementPage'));
const LibraryPage          = lazy(() => import('./pages/LibraryPage'));
const LibraryItemPage      = lazy(() => import('./pages/LibraryItemPage'));
const GamificationPage     = lazy(() => import('./pages/GamificationPage'));
const ToolkitPage          = lazy(() => import('./pages/ToolkitPage'));
const ParentPortalPage     = lazy(() => import('./pages/ParentPortalPage'));

const WorksheetDetailPage    = lazy(() => import('./pages/WorksheetDetailPage'));


const LessonAnalyzerPage   = lazy(() => import('./pages/LessonAnalyzerPage'));
const CurriculumPlannerPage = lazy(() => import('./pages/CurriculumPlannerPage'));
const HomeworkPage         = lazy(() => import('./pages/HomeworkPage'));
const SoundBoardPage       = lazy(() => import('./pages/SoundBoardPage'));
const ExamScannerPage      = lazy(() => import('./pages/ExamScannerPage'));
const StudentViewPage      = lazy(() => import('./pages/StudentViewPage'));
const MorePage             = lazy(() => import('./pages/MorePage'));
const AnalyticsPage        = lazy(() => import('./pages/AnalyticsPage'));
const TeacherStylePage     = lazy(() => import('./pages/TeacherStylePage'));
const TeacherLogin         = lazy(() => import('./pages/TeacherLogin'));
const TeacherDashboard     = lazy(() => import('./pages/TeacherDashboard'));
const StudentProfilePage   = lazy(() => import('./pages/StudentProfilePage'));
const WeeklySchedulePage   = lazy(() => import('./pages/WeeklySchedulePage'));
const BellSchedulePage     = lazy(() => import('./pages/BellSchedulePage'));
const StudyPlanGeneratorPage = lazy(() => import('./pages/StudyPlanGeneratorPage'));
const RafflePage            = lazy(() => import('./pages/RafflePage'));
const CertificatesPage       = lazy(() => import('./pages/CertificatesPage'));
const TemplateLibraryPage    = lazy(() => import('./pages/TemplateLibraryPage'));
const ReportTemplatesPage     = lazy(() => import('./pages/ReportTemplatesPage'));
const FastFeedbackPage      = lazy(() => import('./pages/FastFeedbackPage'));
const BehaviorTimelinePage  = lazy(() => import('./pages/BehaviorTimelinePage'));
const ExamsPage             = lazy(() => import('./pages/ExamsPage'));
const EventsPage            = lazy(() => import('./pages/EventsPage'));
const DailySummaryPage      = lazy(() => import('./pages/DailySummaryPage'));
const OnboardingModal       = lazy(() => import('./components/onboarding/OnboardingModal'));
const Login                = lazy(() => import('./pages/Login'));
const Register             = lazy(() => import('./pages/Register'));
const ForgotPassword       = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword        = lazy(() => import('./pages/ResetPassword'));
const About                = lazy(() => import('./pages/About'));
const Contact               = lazy(() => import('./pages/Contact'));
const AdminDashboard       = lazy(() => import('./pages/AdminDashboard'));
const CreationCenterPage    = lazy(() => import('./pages/CreationCenterPage'));
const TasksHubPage          = lazy(() => import('./pages/TasksHubPage'));

const TeacherInsightsPage   = lazy(() => import('./pages/TeacherInsightsPage'));
const IngestPage            = lazy(() => import('./pages/IngestPage'));
const TeachingStyleDashboard = lazy(() => import('./pages/TeachingStyleDashboard'));
const ParentFeedbackPage = lazy(() => import('./pages/ParentFeedbackPage'));
const ReviewPage              = lazy(() => import('./pages/ReviewPage'));
const TeacherProfilePage       = lazy(() => import('./pages/TeacherProfilePage'));
const AdminOverviewPage        = lazy(() => import('./pages/AdminOverviewPage'));
const MonthlyReportsPage       = lazy(() => import('./pages/MonthlyReportsPage'));
const OcrReviewPage            = lazy(() => import('./pages/OcrReviewPage'));
const SchoolCalendarPage       = lazy(() => import('./pages/SchoolCalendarPage'));
const SystemMapPage            = lazy(() => import('./pages/SystemMapPage'));


const PollPage                  = lazy(() => import('./pages/PollPage'));

// Direction-aware page transitions.
// Forward (push): new screen enters from the right, old exits left → "to the left".
// Back (pop): new screen enters from the left, old exits right → "to the right".
// `custom` carries the isBack flag so exiting children animate correctly.
const pageVariants = {
  initial: (isBack) => ({ opacity: 0, x: isBack ? -20 : 20 }),
  animate: { opacity: 1, x: 0, transition: { duration: 0.2, ease: 'easeOut' } },
  exit: (isBack) => ({ opacity: 0, x: isBack ? 20 : -20, transition: { duration: 0.15, ease: 'easeIn' } }),
};

const PageLoader = () => (
  <div className="fixed inset-0 flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
  </div>
);

function AnimatedRoutes() {
  const location = useLocation();
  const isBack = useNavigationType() === 'POP';
  return (
    <AnimatePresence mode="wait" custom={isBack}>
      <motion.div key={location.pathname} variants={pageVariants} initial="initial" animate="animate" exit="exit" custom={isBack} style={{ minHeight: '100%' }}>
        <Suspense fallback={<PageLoader />}>
          <Routes location={location}>
            {/* Public auth routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            {/* Public parent feedback route — no auth required */}
            <Route path="/feedback/:bulletinId" element={<ParentFeedbackPage />} />

            {/* Protected app routes */}
            <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/seating" element={<SeatingPage />} />
              <Route path="/students" element={<StudentsPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/attendance" element={<AttendancePage />} />
              <Route path="/weekly-attendance-report" element={<WeeklyAttendanceReportPage />} />
              <Route path="/monthly-attendance-report" element={<MonthlyAttendanceReportPage />} />
              <Route path="/weekly-summary" element={<WeeklySummaryPage />} />
<Route path="/weekly-bulletin" element={<Navigate to="/weekly-communication?tab=reports&sub=bulletin" replace />} />
<Route path="/weekly-communication" element={<WeeklyCommunicationPage />} />
              <Route path="/birthdays-report" element={<BirthdaysReportPage />} />
              <Route path="/weekly-tasks" element={<WeeklyTasksPage />} />
              <Route path="/grades" element={<GradeManagementPage />} />
              <Route path="/library" element={<LibraryPage />} />
              <Route path="/library/:itemId" element={<LibraryItemPage />} />
              <Route path="/gamification" element={<GamificationPage />} />
              <Route path="/toolkit" element={<ToolkitPage />} />
              <Route path="/parents" element={<ParentPortalPage />} />
              <Route path="/worksheets" element={<Navigate to="/creation-center?tab=create" replace />} />
            <Route path="/worksheets/:id" element={<WorksheetDetailPage />} />
              <Route path="/question-bank" element={<Navigate to="/creation-center?tab=bank" replace />} />
              <Route path="/exam-builder" element={<Navigate to="/creation-center?tab=exam" replace />} />
              <Route path="/lesson-analyzer" element={<LessonAnalyzerPage />} />
              <Route path="/curriculum" element={<CurriculumPlannerPage />} />
              <Route path="/homework" element={<HomeworkPage />} />
              <Route path="/sound-board" element={<SoundBoardPage />} />
              <Route path="/exam-scanner" element={<ExamScannerPage />} />
              <Route path="/student-view" element={<StudentViewPage />} />
              <Route path="/more" element={<MorePage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/teacher-style" element={<TeacherStylePage />} />
              <Route path="/students/:id" element={<StudentProfilePage />} />
              <Route path="/weekly-schedule" element={<WeeklySchedulePage />} />
              <Route path="/bell-schedule" element={<BellSchedulePage />} />
              <Route path="/study-plan-generator" element={<StudyPlanGeneratorPage />} />
              <Route path="/raffle" element={<RafflePage />} />
              <Route path="/fast-feedback" element={<FastFeedbackPage />} />
              <Route path="/behavior-timeline" element={<BehaviorTimelinePage />} />
              <Route path="/review" element={<ReviewPage />} />
              <Route path="/exams" element={<ExamsPage />} />
              <Route path="/events" element={<EventsPage />} />
              <Route path="/daily-summary" element={<DailySummaryPage />} />
<Route path="/admin" element={<AdminDashboard />} />
<Route path="/generators" element={<Navigate to="/creation-center?tab=create" replace />} />
<Route path="/creation-center" element={<CreationCenterPage />} />
<Route path="/tasks-hub" element={<TasksHubPage />} />
<Route path="/admin-generators" element={<Navigate to="/creation-center?tab=admin" replace />} />
<Route path="/teacher-insights" element={<TeacherInsightsPage />} />
<Route path="/ingest" element={<IngestPage />} />
<Route path="/teaching-style-dashboard" element={<TeachingStyleDashboard />} />
<Route path="/teacher-profile/:id" element={<TeacherProfilePage />} />
<Route path="/admin-overview" element={<AdminOverviewPage />} />
<Route path="/monthly-reports" element={<MonthlyReportsPage />} />
<Route path="/ocr-review/:itemId" element={<OcrReviewPage />} />
<Route path="/school-calendar" element={<SchoolCalendarPage />} />
              <Route path="/map" element={<SystemMapPage />} />
              <Route path="/weekly-sheet" element={<Navigate to="/weekly-communication?tab=reports&sub=sheet" replace />} />
              <Route path="/contact-sheet" element={<Navigate to="/weekly-communication?tab=contacts" replace />} />
              <Route path="/poll" element={<PollPage />} />
<Route path="/teacher-login" element={<TeacherLogin />} />
<Route path="/teacher-dashboard" element={<TeacherDashboard />} />
<Route path="/certificates" element={<CertificatesPage />} />
<Route path="/templates" element={<TemplateLibraryPage />} />
              <Route path="/report-templates" element={<ReportTemplatesPage />} />
            </Route>

            <Route path="*" element={<PageNotFound />} />
          </Routes>
        </Suspense>
      </motion.div>
    </AnimatePresence>
  );
}

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin, user } = useAuth();
  const navigate = useNavigate();
  // מריץ את תור הסנכרון המקומי בכל מקום באפליקציה, לא רק כשמסך הנוכחות/ציונים פתוח —
  // כדי שפעולות שנשמרו בזמן שהמסך היה פתוח יישלחו גם אם המורה כבר עבר הלאה.
  useOfflineSyncQueue();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [locked, setLocked] = useState(isLocked());
  // On a device/browser with no cached PIN status at all (cleared storage,
  // private browsing, first load on a new device), isLocked() defaults to
  // "unlocked" — that's a fail-open gap: if the teacher has PIN lock
  // enabled server-side, there'd be a window where the app renders real
  // content before refreshPinStatus() confirms that. pinStatusUnknown
  // tracks that case specifically so we can hold rendering behind a
  // loader instead, rather than trusting an absent cache.
  const [pinStatusUnknown] = useState(() => localStorage.getItem(PIN_ENABLED_KEY) === null);
  const [pinStatusChecked, setPinStatusChecked] = useState(!pinStatusUnknown);

  // React to manual lock / PIN changes from settings
  useEffect(() => {
    const handler = () => setLocked(isLocked());
    window.addEventListener('pin-lock-changed', handler);
    return () => window.removeEventListener('pin-lock-changed', handler);
  }, []);

  // Apply saved theme on mount (before auth completes)
  useEffect(() => {
    applyThemeClass(loadTheme());
  }, []);

  // Hardware back-button handling for Android/iOS WebViews — native wrapper
  // posts a 'message' event. If a modal/dialog/sheet is open (tracked via URL
  // search params), close it by stripping those params instead of navigating
  // back a full page. Otherwise, navigate back unless already at root.
  useEffect(() => {
    const OVERLAY_PARAMS = ['modal', 'dialog', 'drawer', 'sheet', 'seat'];
    const handleMessage = (event) => {
      const data = event.data;
      const isBack = typeof data === 'string'
        ? data === 'back' || data === 'backbutton'
        : data && (data.type === 'back' || data.type === 'backbutton' || data.action === 'back');
      if (!isBack) return;

      const url = new URL(window.location.href);
      const hasOverlay = OVERLAY_PARAMS.some(k => url.searchParams.has(k));
      if (hasOverlay) {
        OVERLAY_PARAMS.forEach(k => url.searchParams.delete(k));
        navigate(url.pathname + url.search, { replace: true });
        return;
      }

      if (window.location.pathname !== '/') navigate(-1);
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [navigate]);

  useEffect(() => {
    if (user && !localStorage.getItem('classflow_onboarding_done')) {
      setShowOnboarding(true);
    }
  }, [user]);

  // Refresh PIN lock status from server (keeps cache in sync across devices/sessions).
  // When pinStatusUnknown (no local cache at all — see the note above), a
  // failed check retries with backoff instead of silently treating "the
  // network call failed" as "PIN lock is off". After ~3 attempts (~7s) we
  // give up and let the app proceed rather than blocking indefinitely on a
  // persistent outage — a bounded fail-closed window, not a permanent one.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    let attempt = 0;
    const tryRefresh = () => {
      refreshPinStatus().then((result) => {
        if (cancelled) return;
        setLocked(isLocked());
        if (result !== null || !pinStatusUnknown || attempt >= 3) {
          setPinStatusChecked(true);
          return;
        }
        attempt += 1;
        setTimeout(tryRefresh, attempt * 1000);
      });
    };
    tryRefresh();
    return () => { cancelled = true; };
  }, [user]);

  // Prefetch dashboard media assets immediately after successful authentication
  useEffect(() => {
    if (user) {
      warmDashboardMedia();
    }
  }, [user]);

  // Dark/light mode is now handled centrally by ThemeProvider (themeContext.jsx),
  // which reads from classmanager_settings and listens to prefers-color-scheme.

  if (isLoadingPublicSettings || isLoadingAuth) {
    return <PageLoader />;
  }

  if (authError) {
    if (authError.type === 'user_not_registered') return <UserNotRegisteredError />;
    if (authError.type === 'auth_required') { navigateToLogin(); return null; }
  }

  if (locked) {
    return <PinLockScreen onUnlock={() => setLocked(false)} />;
  }

  // Fail-closed: on a device with no cached PIN status (see pinStatusUnknown
  // above), hold rendering here until the server confirms one way or the
  // other, instead of assuming "unlocked" while that confirmation is in
  // flight or retrying after a network failure.
  if (pinStatusUnknown && !pinStatusChecked) {
    return <PageLoader />;
  }

  return (
    <>
      {/* key={location.pathname} isn't needed here — ErrorBoundary is remounted
          fresh on every navigation because AnimatedRoutes' motion.div already
          keys by pathname internally, and handleGoHome/handleReload reset
          state before navigating. */}
      <ErrorBoundary>
        <AnimatedRoutes />
      </ErrorBoundary>
      <Suspense fallback={null}>
        <OnboardingModal open={showOnboarding} onClose={() => setShowOnboarding(false)} />
      </Suspense>
      <Suspense fallback={null}>
        <AssistantDock />
      </Suspense>
    </>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ThemeProvider>
          <QueryClientProvider client={queryClientInstance}>
            <SelectedDateProvider>
            <Router>
              <AuthenticatedApp />
            </Router>
            </SelectedDateProvider>
            <Toaster />
            <Sonner position="bottom-center" richColors offset="80px" />
            <OfflineIndicator />
            <UpdatePrompt />
          </QueryClientProvider>
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;