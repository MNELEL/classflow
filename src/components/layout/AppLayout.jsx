import React, { useCallback, useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutGrid, Users, BookOpen, Settings, ChevronRight,
  Library, MoreHorizontal
} from 'lucide-react';
import { loadBranding } from '@/lib/branding';


// Primary 4 nav items (always visible) + "More"
const PRIMARY_NAV = [
  { path: '/',         icon: BookOpen,    label: 'דשבורד' },
  { path: '/seating',  icon: LayoutGrid,  label: 'סידור'  },
  { path: '/students', icon: Users,       label: 'תלמידים'},
  { path: '/library',  icon: Library,     label: 'ספרייה' },
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
        className="bg-white/95 backdrop-blur-xl border-b border-border/60 flex items-center justify-between sticky top-0 z-50 shadow-[0_1px_12px_rgba(0,120,130,0.06)]"
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

      {/* Bottom Navigation Bar — dark premium */}
      <nav
        className="fixed bottom-0 inset-x-0 z-50 nav-premium flex items-stretch"
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
                'flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[56px] min-w-[44px] py-2 select-none transition-all duration-200',
                active
                  ? 'text-[hsl(192,70%,60%)]'
                  : 'text-[hsl(210,14%,50%)] hover:text-[hsl(210,14%,72%)]'
              )}
            >
              <div className={cn(
                'w-9 h-7 flex items-center justify-center rounded-xl transition-all duration-200',
                active ? 'bg-[hsl(192,80%,32%,0.25)]' : ''
              )}>
                <Icon className={cn('w-5 h-5 transition-transform duration-200', active && 'scale-110')} />
              </div>
              <span className={cn('text-[10px] font-medium transition-all', active ? 'opacity-100' : 'opacity-60')}>{navLabel}</span>
            </Link>
          );
        })}

        {/* More button */}
        <Link
          to="/more"
          onClick={(e) => handleNavClick(e, '/more')}
          className={cn(
            'flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[56px] min-w-[44px] py-2 select-none transition-all duration-200',
            (isMoreActive || location.pathname === '/more')
              ? 'text-[hsl(192,70%,60%)]'
              : 'text-[hsl(210,14%,50%)] hover:text-[hsl(210,14%,72%)]'
          )}
          aria-label="עוד"
        >
          <div className={cn(
            'w-9 h-7 flex items-center justify-center rounded-xl transition-all duration-200',
            (isMoreActive || location.pathname === '/more') ? 'bg-[hsl(192,80%,32%,0.25)]' : ''
          )}>
            <MoreHorizontal className={cn('w-5 h-5 transition-transform duration-200', (isMoreActive || location.pathname === '/more') && 'scale-110')} />
          </div>
          <span className={cn('text-[10px] font-medium transition-all', (isMoreActive || location.pathname === '/more') ? 'opacity-100' : 'opacity-60')}>עוד</span>
        </Link>
      </nav>
    </div>
  );
}