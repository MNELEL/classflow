import React, { useCallback, useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutGrid, Users, BookOpen, Settings, ChevronRight,
  Library, MoreHorizontal
} from 'lucide-react';
import { loadBranding } from '@/lib/branding';


// Primary 5 nav items (always visible)
const PRIMARY_NAV = [
  { path: '/', icon: BookOpen, label: 'ראשי' },
  { path: '/seating', icon: LayoutGrid, label: 'סידור' },
  { path: '/students', icon: Users, label: 'תלמידים' },
  { path: '/library', icon: Library, label: 'ספרייה' },
];



export default function AppLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [branding, setBranding] = useState(loadBranding);


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
    requestAnimationFrame(() => { main.scrollTop = savedY; });
  }, [location.pathname]);

  const handleNavClick = useCallback((e, path) => {
    if (mainRef.current) {
      scrollPositions.current[location.pathname] = mainRef.current.scrollTop;
    }
    if (location.pathname === path) {
      e.preventDefault();
      scrollPositions.current[path] = 0;
      if (mainRef.current) mainRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [location.pathname]);

  const isDashboard = location.pathname === '/';
  const title = branding.page_titles?.[location.pathname] || branding.school_name || 'ClassManager Pro';

  // Check if current path is in the "more" section
  const MORE_PATHS = ['/attendance','/grades','/gamification','/toolkit','/parents','/worksheets','/question-bank','/lesson-analyzer','/curriculum','/homework','/sound-board','/student-view'];
  const isMoreActive = MORE_PATHS.includes(location.pathname);

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

      {/* Main Content */}
      <main
        ref={mainRef}
        className="flex-1 overflow-y-auto no-scrollbar pb-[calc(64px+env(safe-area-inset-bottom))]"
      >
        {children}
      </main>

      {/* Bottom Navigation Bar — 5 items only */}
      <nav
        className="fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur-md border-t border-border flex items-stretch shadow-[0_-1px_12px_rgba(99,102,241,0.07)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {PRIMARY_NAV.map(({ path, icon: Icon, label }) => {
          const active = location.pathname === path;
          const navLabel = branding.nav_labels?.[path] || label;
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
              <span className="text-[10px] font-medium">{navLabel}</span>
            </Link>
          );
        })}

        {/* More button — navigates to /more page */}
        <Link
          to="/more"
          onClick={(e) => handleNavClick(e, '/more')}
          className={cn(
            'flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[56px] min-w-[44px] py-2 select-none transition-colors',
            (isMoreActive || location.pathname === '/more') ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
          )}
          aria-label="עוד"
        >
          <MoreHorizontal className={cn('w-5 h-5', (isMoreActive || location.pathname === '/more') && 'scale-110 transition-transform')} />
          <span className="text-[10px] font-medium">עוד</span>
        </Link>
      </nav>
    </div>
  );
}