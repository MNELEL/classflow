import React, { useCallback, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { LayoutGrid, Users, BookOpen, Settings, ChevronRight, CalendarCheck, GraduationCap, Library, Trophy, Wrench, Contact, FileText, Layers } from 'lucide-react';
import { loadBranding } from '@/lib/branding';

const NAV_ICONS = {
  '/': BookOpen,
  '/seating': LayoutGrid,
  '/students': Users,
  '/attendance': CalendarCheck,
  '/grades': GraduationCap,
  '/library': Library,
  '/gamification': Trophy,
  '/toolkit': Wrench,
  '/parents': Contact,
  '/worksheets': FileText,
  '/question-bank': Layers,
};

const NAV_PATHS = ['/', '/seating', '/students', '/attendance', '/grades', '/library', '/gamification', '/toolkit', '/parents', '/worksheets', '/question-bank'];

export default function AppLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [branding, setBranding] = useState(loadBranding);

  useEffect(() => {
    const handler = (e) => setBranding(e.detail);
    window.addEventListener('branding-updated', handler);
    return () => window.removeEventListener('branding-updated', handler);
  }, []);

  const handleNavClick = useCallback((e, path) => {
    if (location.pathname === path) {
      e.preventDefault();
      navigate(path, { replace: true });
      // Scroll the main content area back to top
      document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [location.pathname, navigate]);
  const isDashboard = location.pathname === '/';
  const title = branding.page_titles?.[location.pathname] || branding.school_name || 'ClassManager Pro';

  return (
    <div className="min-h-screen bg-background flex flex-col" dir="rtl">
      {/* Top Header */}
      <header
        className="bg-card border-b border-border flex items-center justify-between sticky top-0 z-50 shadow-sm"
        style={{ paddingTop: 'env(safe-area-inset-top)', paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}
      >
        <div className="flex items-center gap-2 px-4 py-3 w-full">
          {/* Back button on sub-pages */}
          {!isDashboard ? (
            <button
              onClick={() => navigate(-1)}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-accent transition-colors select-none"
              aria-label="חזור"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          ) : (
            branding.logo_url ? (
              <img src={branding.logo_url} alt="לוגו" className="w-8 h-8 object-contain rounded-lg shrink-0" />
            ) : (
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shrink-0">
                <BookOpen className="w-4 h-4 text-primary-foreground" />
              </div>
            )
          )}

          <span className="font-bold text-base tracking-tight flex-1 text-center">{title}</span>

          {/* Settings icon on right (only on non-settings pages) */}
          {location.pathname !== '/settings' ? (
            <Link
              to="/settings"
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-accent transition-colors select-none"
              aria-label="הגדרות"
            >
              <Settings className="w-5 h-5 text-muted-foreground" />
            </Link>
          ) : (
            <div className="w-11" />
          )}
        </div>
      </header>

      {/* Main Content — padded for bottom nav */}
      <main className="flex-1 overflow-hidden pb-[calc(64px+env(safe-area-inset-bottom))]">
        {children}
      </main>

      {/* Bottom Navigation Bar */}
      <nav
        className="fixed bottom-0 inset-x-0 z-50 bg-card border-t border-border flex items-stretch"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {NAV_PATHS.map(path => {
          const Icon = NAV_ICONS[path];
          const active = location.pathname === path;
          const label = branding.nav_labels?.[path] || path;
          return (
            <Link
              key={path}
              to={path}
              onClick={(e) => handleNavClick(e, path)}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[56px] py-2 select-none transition-colors',
                active
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className={cn('w-5 h-5', active && 'scale-110 transition-transform')} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}