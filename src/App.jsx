import { Toaster } from "@/components/ui/toaster"
import { Toaster as Sonner } from 'sonner';
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import SeatingPage from './pages/SeatingPage';
import StudentsPage from './pages/StudentsPage';
import HistoryPage from './pages/HistoryPage';
import DashboardPage from './pages/DashboardPage';
import SettingsPage from './pages/SettingsPage';
import ReportsPage from './pages/ReportsPage';
import AttendancePage from './pages/AttendancePage';
import GradeManagementPage from './pages/GradeManagementPage';
import LibraryPage from './pages/LibraryPage';
import GamificationPage from './pages/GamificationPage';
import ToolkitPage from './pages/ToolkitPage';
import ParentPortalPage from './pages/ParentPortalPage';
import WorksheetGeneratorPage from './pages/WorksheetGeneratorPage';
import QuestionBankPage from './pages/QuestionBankPage';

const pageVariants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.2, ease: 'easeOut' } },
  exit: { opacity: 0, x: -20, transition: { duration: 0.15, ease: 'easeIn' } },
};

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div key={location.pathname} variants={pageVariants} initial="initial" animate="animate" exit="exit" style={{ height: '100%' }}>
        <Routes location={location}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/seating" element={<SeatingPage />} />
          <Route path="/students" element={<StudentsPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/attendance" element={<AttendancePage />} />
          <Route path="/grades" element={<GradeManagementPage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/gamification" element={<GamificationPage />} />
          <Route path="/toolkit" element={<ToolkitPage />} />
          <Route path="/parents" element={<ParentPortalPage />} />
          <Route path="/worksheets" element={<WorksheetGeneratorPage />} />
          <Route path="/question-bank" element={<QuestionBankPage />} />
          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Sync system dark mode preference
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const savedSettings = (() => { try { return JSON.parse(localStorage.getItem('classmanager_settings') || '{}'); } catch { return {}; } })();
    // Only apply system preference if user hasn't explicitly set a theme
    if (!savedSettings.theme) {
      if (mq.matches) document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
    }
    const handler = (e) => {
      const current = (() => { try { return JSON.parse(localStorage.getItem('classmanager_settings') || '{}'); } catch { return {}; } })();
      if (!current.theme) {
        if (e.matches) document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return <AnimatedRoutes />;
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
        <Sonner position="top-center" richColors />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;