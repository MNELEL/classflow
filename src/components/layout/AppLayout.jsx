import React, { useCallback, useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutGrid, Users, BookOpen, Settings, ChevronRight,
  CalendarCheck, GraduationCap, Library, Trophy, Wrench,
  Contact, FileText, Layers, Mic, ClipboardList, ClipboardCheck,
  Music, Eye, MoreHorizontal, Clock, FolderOpen, UserCircle
} from 'lucide-react';
import { loadBranding } from '@/lib/branding';
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose
} from '@/components/ui/drawer';

// Primary 5 nav items (always visible)
const PRIMARY_NAV = [
  { path: '/', icon: BookOpen, label: 'ראשי' },
  { path: '/seating', icon: LayoutGrid, label: 'סידור' },
  { path: '/students', icon: Users, label: 'תלמידים' },
  { path: '/library', icon: Library, label: 'ספרייה' },
];

// More menu items (shown in drawer)
const MORE_NAV = [
  { path: '/attendance',     icon: CalendarCheck,  label: 'נוכחות' },
  { path: '/grades',         icon: GraduationCap,  label: 'ציונים' },
  { path: '/gamification',   icon: Trophy,         label: 'גמיפיקציה' },
  { path: '/toolkit',        icon: Wrench,         label: 'כלים' },
  { path: '/parents',        icon: Contact,        label: 'הורים' },
  { path: '/worksheets',     icon: FileText,       label: 'דפי עבודה' },
  { path: '/question-bank',  icon: Layers,         label: 'שאלות' },
  { path: '/lesson-analyzer',icon: Mic,            label: 'שיעורים' },
  { path: '/curriculum',     icon: ClipboardList,  label: 'תכנית לימודים' },
  { path: '/homework',       icon: ClipboardCheck, label: 'שיעורי בית' },
  { path: '/sound-board',    icon: Music,          label: 'לוח צלילים' },
  { path: '/student-view',   icon: Eye,            label: 'תצוגת תלמיד' },
];

export default function AppLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [branding, setBranding] = useState(loadBranding);
  const [moreOpen, setMoreOpen] = useState(false);

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

  const handleMoreNavClick = useCallback((path) => {
    if (mainRef.current) {
      scrollPositions.current[location.pathname] = mainRef.current.scrollTop;
    }
    setMoreOpen(false);
    navigate(path);
  }, [location.pathname, navigate]);

  const isDashboard = location.pathname === '/';
  const title = branding.page_titles?.[location.pathname] || branding.school_name || 'ClassManager Pro';

  // Check if current path is in the "more" section
  const isMoreActive = MORE_NAV.some(item => item.path === location.pathname);

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

        {/* More button */}
        <button
          onClick={() => setMoreOpen(true)}
          className={cn(
            'flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[56px] min-w-[44px] py-2 select-none transition-colors',
            isMoreActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
          )}
          aria-label="עוד"
        >
          <MoreHorizontal className={cn('w-5 h-5', isMoreActive && 'scale-110 transition-transform')} />
          <span className="text-[10px] font-medium">עוד</span>
        </button>
      </nav>

      {/* More Drawer */}
      <Drawer open={moreOpen} onOpenChange={setMoreOpen}>
        <DrawerContent className="pb-[env(safe-area-inset-bottom)]" dir="rtl">
          <DrawerHeader className="text-right pb-2 border-b border-border">
            <DrawerTitle className="text-base font-bold">כל הכלים</DrawerTitle>
          </DrawerHeader>

          <div className="overflow-y-auto max-h-[70vh] px-4 pt-3 pb-6 space-y-5">

            {/* Quick Access */}
            <section>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 text-right">גישה מהירה</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { path: '/curriculum', icon: Clock,       label: 'מערכת שעות' },
                  { path: '/library',    icon: FolderOpen,  label: 'ספריית קבצים' },
                  { path: '/settings',   icon: UserCircle,  label: 'פרופיל והגדרות' },
                ].map(({ path, icon: Icon, label }) => {
                  const active = location.pathname === path;
                  return (
                    <button
                      key={path}
                      onClick={() => handleMoreNavClick(path)}
                      className={cn(
                        'flex flex-col items-center justify-center gap-2 rounded-2xl p-3 min-h-[76px] border transition-colors select-none',
                        active
                          ? 'bg-primary/10 border-primary/30 text-primary'
                          : 'bg-secondary/50 border-transparent hover:bg-accent text-foreground'
                      )}
                    >
                      <div className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center',
                        active ? 'bg-primary text-primary-foreground' : 'bg-background shadow-sm'
                      )}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] font-semibold text-center leading-tight">{label}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* All Tools */}
            <section>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 text-right">כלי ניהול</p>
              <div className="grid grid-cols-4 gap-1">
                {MORE_NAV.map(({ path, icon: Icon, label }) => {
                  const active = location.pathname === path;
                  const navLabel = branding.nav_labels?.[path] || label;
                  return (
                    <button
                      key={path}
                      onClick={() => handleMoreNavClick(path)}
                      className={cn(
                        'flex flex-col items-center justify-center gap-1.5 rounded-xl p-2.5 min-h-[68px] transition-colors select-none',
                        active
                          ? 'bg-primary/10 text-primary'
                          : 'hover:bg-accent text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <div className={cn(
                        'w-9 h-9 rounded-xl flex items-center justify-center',
                        active ? 'bg-primary text-primary-foreground' : 'bg-secondary'
                      )}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-medium text-center leading-tight">{navLabel}</span>
                    </button>
                  );
                })}
              </div>
            </section>

          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}