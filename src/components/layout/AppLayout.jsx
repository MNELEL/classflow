import React, { useCallback, useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutGrid, Users, BookOpen, Settings, ChevronRight,
  Library, Wrench, Grid3x3, CalendarCheck
} from 'lucide-react';

import { loadBranding } from '@/lib/branding';
import OverdueAlertsPanel from '@/components/alerts/OverdueAlertsPanel';


// 5 bottom nav tabs — all other routes accessible via /more
const PRIMARY_NAV = [
  { path: '/',           icon: BookOpen,      label: 'דשבורד'  },
  { path: '/students',   icon: Users,         label: 'תלמידים' },
  { path: '/attendance', icon: CalendarCheck, label: 'נוכחות'  },
  { path: '/library',    icon: Library,       label: 'ספרייה'   },
  { path: '/more',       icon: Grid3x3,       label: 'עוד'      },
];



export default function AppLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [branding, setBranding] = useState(loadBranding);


  const scrollPositions = useRef({});
  const tabHistory = useRef({});
  const mainRef = useRef(null);

  const NAV_PATHS = [...PRIMARY_NAV.map(n => n.path), '/more'];

  function getCurrentTabRoot(pathname) {
    for (const p of PRIMARY_NAV.filter(n => n.path !== '/more').map(n => n.path)) {
      if (p === '/') {
        if (pathname === '/') return '/';
      } else if (pathname === p || pathname.startsWith(p + '/')) {
        return p;
      }
    }
    return '/more';
  }

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
    requestAnimationFrame(() => { main.scrollTop = savedY; });
  }, [location.pathname]);

  // Save current path to tab history on route change
  useEffect(() => {
    const root = getCurrentTabRoot(location.pathname);
    if (root) {
      tabHistory.current[root] = location.pathname;
    }
  }, [location.pathname]);

  const handleNavClick = useCallback((e, path) => {
    if (mainRef.current) {
      scrollPositions.current[location.pathname] = mainRef.current.scrollTop;
    }
    const currentTabRoot = getCurrentTabRoot(location.pathname);
    if (path === currentTabRoot) {
      // Same tab — reset to root
      e.preventDefault();
      delete tabHistory.current[path];
      scrollPositions.current[path] = 0;
      if (location.pathname === path) {
        if (mainRef.current) mainRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        navigate(path);
      }
    } else {
      // Different tab — restore last visited sub-path or go to root
      const target = tabHistory.current[path] || path;
      if (target !== path) {
        e.preventDefault();
        navigate(target);
      }
    }
  }, [location.pathname, navigate]);

  const isDashboard = location.pathname === '/';
  const title = branding.page_titles?.[location.pathname] || branding.school_name || 'ClassManager Pro';

  // Check if current path is in the "more" section (any route not in the 4 primary tabs)
  const MORE_PATHS = ['/seating','/toolkit','/grades','/gamification','/parents','/worksheets','/question-bank','/lesson-analyzer','/curriculum','/homework','/sound-board','/student-view','/reports','/analytics','/events','/exams','/fast-feedback','/behavior-timeline','/weekly-schedule','/bell-schedule','/study-plan-generator','/raffle','/daily-summary','/exam-scanner','/more'];
  const isMoreActive = MORE_PATHS.includes(location.pathname);

  return (
    <div className="min-h-screen bg-background flex flex-col" dir="rtl">
      {/* Top Header */}
      <header
        className="bg-white/95 backdrop-blur-xl border-b border-border/60 flex items-center justify-between sticky top-0 z-50 shadow-[0_1px_12px_rgba(0,120,130,0.06)]"
        style={{ paddingTop: 'env(safe-area-inset-top)', paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}
      >
        <div className="flex items-center gap-2 px-4 py-3 w-full">
          {!isDashboard ? (
            <button
              onClick={() => {
                if (window.history.length > 1) navigate(-1);
                else navigate('/');
              }}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-accent transition-colors select-none"
              aria-label="חזור"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          ) : (
            branding.logo_url ? (
              <img src={branding.logo_url} alt="לוגו" className="w-8 h-8 object-contain rounded-xl shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-xl shrink-0 overflow-hidden">
                <img
                  src="https://media.base44.com/images/public/69efc0a68bae1b1d07582eda/ec7fc8c0a_generated_image.png"
                  alt="ClassFlow"
                  className="w-full h-full object-cover"
                />
              </div>
            )
          )}

          <span className="font-semibold text-base tracking-tight flex-1 text-center">{isDashboard ? 'ClassFlow' : title}</span>

          <div className="flex items-center gap-1 relative">
            <OverdueAlertsPanel />
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
        </div>
      </header>

      {/* Main Content */}
      <main
        ref={mainRef}
        className="flex-1 overflow-y-auto no-scrollbar pb-[calc(64px+env(safe-area-inset-bottom))]"
      >
        {children}
      </main>

      {/* Bottom Navigation Bar — 5 tabs */}
      <nav
        role="navigation"
        aria-label="ניווט ראשי"
        className="fixed bottom-0 inset-x-0 z-50 flex items-stretch backdrop-blur-md bg-background/95 border-t border-border"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {PRIMARY_NAV.map(({ path, icon: Icon, label }) => {
          const active = path === '/more'
            ? (isMoreActive || location.pathname === '/more')
            : location.pathname === path;
          const navLabel = branding.nav_labels?.[path] || label;
          return (
            <Link
              key={path}
              to={path}
              onClick={(e) => handleNavClick(e, path)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[56px] min-w-[44px] py-2 select-none transition-all duration-200',
                active
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <div className={cn(
                'w-9 h-7 flex items-center justify-center rounded-xl transition-all duration-200',
                active ? 'bg-primary/15' : ''
              )}>
                <Icon className={cn('w-5 h-5 transition-transform duration-200', active && 'scale-110')} />
              </div>
              <span className={cn('text-[11px] md:text-xs font-medium transition-all', active ? 'opacity-100' : 'opacity-70')}>{navLabel}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}