import React, { useCallback, useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { LayoutGrid, Users, BookOpen, Settings, ChevronRight, CalendarCheck, GraduationCap, Library, Trophy, Wrench, Contact, FileText, Layers, Mic, ClipboardList, ClipboardCheck } from 'lucide-react';
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
  '/lesson-analyzer': Mic,
  '/curriculum': ClipboardList,
  '/homework': ClipboardCheck,
};

const NAV_PATHS = ['/', '/seating', '/students', '/attendance', '/grades', '/library', '/gamification', '/toolkit', '/worksheets', '/question-bank', '/lesson-analyzer', '/curriculum', '/homework', '/parents'];

export default function AppLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [branding, setBranding] = useState(loadBranding);

  // Tab Stack Preservation: remember scroll position per tab
  const scrollPositions = useRef({});
  const mainRef = useRef(null);

  useEffect(() => {
    const handler = (e) => setBranding(e.detail);
    window.addEventListener('branding-updated', handler);
    return () => window.removeEventListener('branding-updated', handler);
  }, []);

  // Restore scroll position when tab changes
  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;
    const savedY = scrollPositions.current[location.pathname] ?? 0;
    // Use rAF so content is rendered before scrolling
    requestAnimationFrame(() => { main.scrollTop = savedY; });
  }, [location.pathname]);

  const handleNavClick = useCallback((e, path) => {
    // Save current scroll before switching
    if (mainRef.current) {
      scrollPositions.current[location.pathname] = mainRef.current.scrollTop;
    }
    if (location.pathname === path) {
      e.preventDefault();
      // Same-tab tap → scroll to top and reset saved position
      scrollPositions.current[path] = 0;
      if (mainRef.current) mainRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [location.pathname]);

  const isDashboard = location.pathname === '/';
  const title = branding.page_titles?.[location.pathname] || branding.school_name || 'ClassManager Pro';

  return (
    <div className="min-h-screen bg-background flex flex-col" dir="rtl">
      {/* Top Header */}
      <header
        className="bg-white/90 backdrop-blur-md border-b border-border flex items-center justify-between sticky top-0 z-50 shadow-sm"
        style={{ paddingTop: 'env(safe-area-inset-top)', paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}
      >
        <div className="flex items-center gap-2 px-4 py-3 w-full">
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

      {/* Main Content — single scrollable container per tab */}
      <main
        ref={mainRef}
        className="flex-1 overflow-y-auto no-scrollbar pb-[calc(64px+env(safe-area-inset-bottom))]"
      >
        {children}
      </main>

      {/* Bottom Navigation Bar */}
      <nav
        className="fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur-md border-t border-border flex items-stretch shadow-[0_-1px_12px_rgba(99,102,241,0.07)]"
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
                'flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[56px] min-w-[44px] py-2 select-none transition-colors',
                active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
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