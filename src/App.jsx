import { Toaster } from "@/components/ui/toaster"
import { Toaster as Sonner } from 'sonner';
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState, lazy, Suspense } from 'react';
import { warmDashboardMedia } from '@/lib/mediaWarmup';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ProtectedRoute from '@/components/ProtectedRoute';
import { ThemeProvider } from '@/lib/themeContext';
import { applyThemeClass, loadTheme } from '@/lib/themes';
import { loadBrandingFromDB, loadBranding } from '@/lib/branding';
import PinLockScreen from '@/components/security/PinLockScreen';
import { isLocked } from '@/lib/pinLock';
const AssistantDock = lazy(() => import('./components/assistant/AssistantDock'));

// Lazy-loaded pages for code splitting
const SeatingPage          = lazy(() => import('./pages/SeatingPage'));
const StudentsPage         = lazy(() => import('./pages/StudentsPage'));
const HistoryPage          = lazy(() => import('./pages/HistoryPage'));
const DashboardPage        = lazy(() => import('./pages/DashboardPage'));
const SettingsPage         = lazy(() => import('./pages/SettingsPage'));
const ReportsPage          = lazy(() => import('./pages/ReportsPage'));
const AttendancePage       = lazy(() => import('./pages/AttendancePage'));
const GradeManagementPage  = lazy(() => import('./pages/GradeManagementPage'));
const LibraryPage          = lazy(() => import('./pages/LibraryPage'));
const LibraryItemPage      = lazy(() => import('./pages/LibraryItemPage'));
const GamificationPage     = lazy(() => import('./pages/GamificationPage'));
const ToolkitPage          = lazy(() => import('./pages/ToolkitPage'));
const ParentPortalPage     = lazy(() => import('./pages/ParentPortalPage'));
const WorksheetGeneratorPage = lazy(() => import('./pages/WorksheetGeneratorPage'));
const WorksheetDetailPage    = lazy(() => import('./pages/WorksheetDetailPage'));
const QuestionBankPage     = lazy(() => import('./pages/QuestionBankPage'));
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
const GeneratorsPage       = lazy(() => import('./pages/GeneratorsPage'));
const TasksHubPage          = lazy(() => import('./pages/TasksHubPage'));
const AdminGeneratorsPage   = lazy(() => import('./pages/AdminGeneratorsPage'));
const TeacherInsightsPage   = lazy(() => import('./pages/TeacherInsightsPage'));
const IngestPage            = lazy(() => import('./pages/IngestPage'));
const TeachingStyleDashboard = lazy(() => import('./pages/TeachingStyleDashboard'));
const ParentFeedbackPage = lazy(() => import('./pages/ParentFeedbackPage'));

const pageVariants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.2, ease: 'easeOut' } },
  exit: { opacity: 0, x: -20, transition: { duration: 0.15, ease: 'easeIn' } },
};

const PageLoader = () => (
  <div className="fixed inset-0 flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
  </div>
);

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div key={location.pathname} variants={pageVariants} initial="initial" animate="animate" exit="exit" style={{ height: '100%' }}>
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
              <Route path="/seating" element={<SeatingPage />} />
              <Route path="/students" element={<StudentsPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/attendance" element={<AttendancePage />} />
              <Route path="/grades" element={<GradeManagementPage />} />
              <Route path="/library" element={<LibraryPage />} />
              <Route path="/library/:itemId" element={<LibraryItemPage />} />
              <Route path="/gamification" element={<GamificationPage />} />
              <Route path="/toolkit" element={<ToolkitPage />} />
              <Route path="/parents" element={<ParentPortalPage />} />
              <Route path="/worksheets" element={<WorksheetGeneratorPage />} />
            <Route path="/worksheets/:id" element={<WorksheetDetailPage />} />
              <Route path="/question-bank" element={<QuestionBankPage />} />
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
              <Route path="/exams" element={<ExamsPage />} />
              <Route path="/events" element={<EventsPage />} />
              <Route path="/daily-summary" element={<DailySummaryPage />} />
<Route path="/admin" element={<AdminDashboard />} />
<Route path="/generators" element={<GeneratorsPage />} />
<Route path="/tasks-hub" element={<TasksHubPage />} />
<Route path="/admin-generators" element={<AdminGeneratorsPage />} />
<Route path="/teacher-insights" element={<TeacherInsightsPage />} />
<Route path="/ingest" element={<IngestPage />} />
<Route path="/teaching-style-dashboard" element={<TeachingStyleDashboard />} />
<Route path="/teacher-login" element={<TeacherLogin />} />
<Route path="/teacher-dashboard" element={<TeacherDashboard />} />
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
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [locked, setLocked] = useState(isLocked());

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
    const OVERLAY_PARAMS = ['modal', 'dialog', 'sheet', 'seat'];
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

  // Prefetch dashboard media assets immediately after successful authentication
  useEffect(() => {
    if (user) {
      warmDashboardMedia();
    }
  }, [user]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const savedSettings = (() => { try { return JSON.parse(localStorage.getItem('classmanager_settings') || '{}'); } catch { return {}; } })();
    if (!savedSettings.theme || savedSettings.theme === 'system') {
      if (mq.matches) document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
    }
    const handler = (e) => {
      const current = (() => { try { return JSON.parse(localStorage.getItem('classmanager_settings') || '{}'); } catch { return {}; } })();
      if (!current.theme || current.theme === 'system') {
        if (e.matches) document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

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

  return (
    <>
      <AnimatedRoutes />
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
    <AuthProvider>
      <ThemeProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <AuthenticatedApp />
          </Router>
          <Toaster />
          <Sonner position="bottom-center" richColors offset="80px" />
        </QueryClientProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;