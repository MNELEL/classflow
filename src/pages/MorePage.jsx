import React, { useRef, useEffect, useCallback } from 'react';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import PullToRefreshIndicator from '@/components/ui/PullToRefreshIndicator';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/AuthContext';
import {
  CalendarCheck, GraduationCap, Trophy, Wrench,
  Contact, FileText, Layers, Mic, ClipboardCheck,
  Music, Eye, Clock, UserCircle, ChevronLeft, BarChart2, Brain,
  BookOpen, Home, Bell, BookMarked, Shuffle, Zap, GitBranch, CalendarDays, Sparkles, Shield, Upload, Award, LayoutTemplate,
  Library, LayoutGrid, Newspaper, Users, Map
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';

// ── Section definitions ──────────────────────────────────────────────────────
// Each section: { title, subtitle, layout: 'grid' | 'rows', items: [...] }
// grid layout = compact tiles (שימוש יומי); rows layout = full rows with desc.
const SECTIONS = [
  {
    title: 'שימוש יומי',
    subtitle: 'הכלים הנפוצים ביותר ליום עבודה שוטף',
    layout: 'grid',
    items: [
      { path: '/attendance',   icon: CalendarCheck, label: 'נוכחות',       color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
      { path: '/grades',       icon: GraduationCap, label: 'ציונים',       color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'             },
      { path: '/tasks-hub',    icon: ClipboardCheck,label: 'ריכוז משימות',  color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'     },
      { path: '/homework',     icon: ClipboardCheck,label: 'שיעורי בית',   color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'     },
      { path: '/gamification', icon: Trophy,        label: 'גמיפיקציה',    color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'     },
      { path: '/worksheets',   icon: FileText,      label: 'דפי עבודה',    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'     },
      { path: '/toolkit',      icon: Wrench,        label: 'ארגז כלים',    color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400'             },
      { path: '/seating',      icon: LayoutGrid,    label: 'הושבה',        color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'     },
    ],
  },
  {
    title: 'ספרייה ותכנון',
    subtitle: 'כל מה שמזין ומוזן אחד מהשני - חומרים, תכנון, תלמידים, הערכה ודיווח',
    layout: 'rows',
    items: [
      { path: '/library',             icon: Library,    label: 'ספרייה',            desc: 'חומרי לימוד, תמלולים ומצגות',      color: 'bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400'             },
      { path: '/lesson-analyzer',     icon: Mic,        label: 'ניתוח שיעורים',     desc: 'סיכום, תמלול וחומרי לימוד',        color: 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'            },
      { path: '/ingest',              icon: Upload,     label: 'העלאת קבצים',      desc: 'תמונות, PDF ואודיו לניתוח',       color: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400'            },
      { path: '/curriculum',          icon: Clock,      label: 'מערכת שעות',       desc: 'תכנון שבועי ויעדי לימוד',         color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'   },
      { path: '/weekly-schedule',     icon: Clock,      label: 'לוח שבועי',        desc: 'מערכי שיעור לפי ימים ושעות',      color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'   },
      { path: '/question-bank',       icon: Layers,     label: 'בנק שאלות',        desc: 'שאלות לפי נושא ורמה',            color: 'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400'           },
      { path: '/study-plan-generator',icon: BookMarked, label: 'מחולל תוכניות',    desc: 'צור תוכנית לימודים שבועית עם AI', color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400'    },
      { path: '/teacher-style',       icon: Brain,      label: 'סגנון הוראה שלי',  desc: 'AI לומד את הסגנון הייחודי שלך',  color: 'bg-primary/10 text-primary'                                                },
      { path: '/weekly-bulletin',     icon: Newspaper,  label: 'חוברת קשר שבועית', desc: 'טיוטה אוטומטית לפי ההספק ומערכת השעות', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'      },
      { path: '/students',            icon: Users,         label: 'תיק תלמיד',         desc: 'רשימת תלמידים והפרופיל האישי של כל תלמיד', color: 'bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400' },
      { path: '/grades',             icon: GraduationCap, label: 'ציונים',            desc: 'הזנה ומעקב ציונים לפי מקצוע',             color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
      { path: '/exams',               icon: FileText,      label: 'הערכות ומבחנים',    desc: 'מבחנים, הזנת ציונים וסטטוס',              color: 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' },
      { path: '/attendance',          icon: CalendarCheck, label: 'נוכחות',           desc: 'דיווח ומעקב נוכחות יומי',                color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
      { path: '/reports',             icon: BarChart2,     label: 'דוחות',             desc: 'דוחות וסיכומים תקופתיים',                 color: 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400' },
    ],
  },
  {
    title: 'תקשורת עם הורים',
    subtitle: 'שיתוף עם הורים ותצוגת תלמיד',
    layout: 'rows',
    items: [
      { path: '/parents',      icon: Contact, label: 'הורים',        desc: 'תקשורת ושיתוף חומרים', color: 'bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400' },
      { path: '/student-view', icon: Eye,     label: 'תצוגת תלמיד',  desc: 'מה התלמיד רואה',        color: 'bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400'     },
      { path: '/weekly-bulletin', icon: Newspaper, label: 'חוברת קשר שבועית', desc: 'טיוטה אוטומטית לפי ההספק ומערכת השעות', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    ],
  },
  {
    title: 'מעורבות כיתתית',
    subtitle: 'כלים לניהול, הגרלות ומשוב בזמן שיעור',
    layout: 'rows',
    items: [
      { path: '/sound-board',       icon: Music,     label: 'לוח צלילים',  desc: 'צלילים וניהול כיתה',            color: 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400' },
      { path: '/bell-schedule',     icon: Bell,      label: 'לוח צלצולים', desc: 'הגדר צלצולים ומנגינות לפי שעה', color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'     },
      { path: '/raffle',            icon: Shuffle,   label: 'הגרלות',      desc: 'הגרל תלמיד, קבוצות או סדר אקראי',color: 'bg-fuchsia-100 text-fuchsia-600 dark:bg-fuchsia-900/30 dark:text-fuchsia-400' },
      { path: '/fast-feedback',     icon: Zap,       label: 'משוב מהיר',   desc: 'שלח משוב מיידי לתלמיד',         color: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400'  },
      { path: '/behavior-timeline',icon: GitBranch,  label: 'ציר התנהגות', desc: 'תיעוד אירועי התנהגות לאורך זמן', color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'   },
    ],
  },
  {
    title: 'הערכה ותיעוד',
    subtitle: 'מבחנים, תעודות, מחוללים וניתוח ציונים',
    layout: 'rows',
    items: [
      { path: '/exams',         icon: FileText,       label: 'מבחנים',            desc: 'נהל מבחנים, הזן ציונים וסטטוס',     color: 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'         },
      { path: '/certificates',  icon: Award,          label: 'תעודות',            desc: 'הפקת תעודות PDF להצטיינות ולסיום נושא', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
      { path: '/templates',     icon: LayoutTemplate, label: 'תבניות עיצוב',       desc: 'למד סגנון מתעודה או חוברת קשר קיימת', color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400'},
      { path: '/generators',    icon: Sparkles,       label: 'מחוללים פדגוגיים',  desc: 'סיכומים ומשימות מותאמים עם AI',     color: 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400' },
      { path: '/daily-summary', icon: Sparkles,       label: 'סיכום יומי',        desc: 'AI מחולל סיכום היום והמלצות',      color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'  },
      { path: '/analytics',     icon: BarChart2,      label: 'ניתוח ציונים',      desc: 'גרפים, נושאים ומגמות',            color: 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400' },
    ],
  },
  {
    title: 'אירועים ולוח שנה',
    subtitle: 'אירועי בית-ספר ולוח השנה העברי',
    layout: 'rows',
    items: [
      { path: '/events',          icon: CalendarDays, label: 'אירועים',       desc: 'טיולים, אסיפות, מבחנים וחגיגות', color: 'bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400' },
      { path: '/school-calendar', icon: CalendarDays, label: 'לוח שנה עברי', desc: 'ימי חופש, סיום מוקדם ושעות יום', color: 'bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400' },
    ],
  },
  {
    title: 'ניהול',
    subtitle: 'כלים ניהוליים - זמינים למנהלים בלבד',
    layout: 'rows',
    adminOnly: true,
    items: [
      { path: '/admin',                   icon: Shield,        label: 'לוח בקרה - מנהל',    desc: 'ניהול כיתות ומורים',              color: 'bg-primary/10 text-primary'                                                },
      { path: '/admin-generators',        icon: Sparkles,      label: 'מרכז מחוללים - מנהל',desc: 'סיכומים, משימות ועדכונים כלליים',  color: 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400'  },
      { path: '/teaching-style-dashboard',icon: Brain,         label: 'ניתוח מצטבר',        desc: 'סגנונות הוראה ותובנות לפגישות',   color: 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400'  },
      { path: '/teacher-insights',       icon: Brain,         label: 'ניתוח מורים',         desc: 'סגנון הוראה ותדריכי פגישות',     color: 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400'  },
      { path: '/review',                 icon: ClipboardCheck,label: 'מסך סקירה',          desc: 'אשר או דחה עדכוני AI',           color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'     },
    ],
  },
];

// Standalone settings row at the bottom (outside groups, shown to all)
const SETTINGS_ITEM = { path: '/settings', icon: UserCircle, label: 'פרופיל והגדרות', desc: 'מיתוג, תצוגה ועוד', color: 'bg-slate-100 text-slate-600 dark:bg-slate-900/30 dark:text-slate-400' };
const MAP_ITEM = { path: '/map', icon: Map, label: 'מפת המערכת', desc: 'כל המסכים במקום אחד, עם חיפוש וייצוא ל-PDF', color: 'bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-400' };

export default function MorePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const savedScroll = useRef(0);
  const handleRefresh = useCallback(async () => {}, []);
  const { containerRef, pullY, refreshing } = usePullToRefresh(handleRefresh);

  useEffect(() => {
    const main = containerRef.current?.closest('main');
    if (main) main.scrollTop = savedScroll.current;
    return () => {
      const m = containerRef.current?.closest('main');
      if (m) savedScroll.current = m.scrollTop;
    };
  }, []);

  const visibleSections = SECTIONS.filter(s => !s.adminOnly || user?.role === 'admin');

  return (
    <AppLayout>
      <div ref={containerRef} className="min-h-full bg-background pb-6 relative" dir="rtl">
        <PullToRefreshIndicator pullY={pullY} refreshing={refreshing} />

        {/* Header */}
        <div className="px-4 pt-5 pb-4">
          <h1 className="text-xl font-bold text-foreground">כל הכלים</h1>
          <p className="text-xs text-muted-foreground mt-0.5">גישה מהירה לכל מודולי הניהול</p>
        </div>

        {/* ── Sections ── */}
        {visibleSections.map((section) => (
          <div key={section.title} className="px-4 mt-5 first:mt-0">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{section.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5 mb-2.5">{section.subtitle}</p>

            {section.layout === 'grid' ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                {section.items.map(({ path, icon: Icon, label, color }) => {
                  const active = location.pathname === path;
                  return (
                    <button
                      key={path}
                      onClick={() => navigate(path)}
                      className={cn(
                        'flex flex-col items-center gap-2 py-4 px-2 rounded-2xl border transition-all select-none',
                        active
                          ? 'border-primary/30 bg-primary/5'
                          : 'border-border bg-card hover:border-primary/20 active:scale-95'
                      )}
                    >
                      <div className={cn('w-11 h-11 rounded-2xl flex items-center justify-center', color)}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] sm:text-xs font-semibold text-foreground leading-tight text-center line-clamp-1">{label}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2">
                {section.items.map(({ path, icon: Icon, label, desc, color }) => {
                  const active = location.pathname === path;
                  return (
                    <button
                      key={path}
                      onClick={() => navigate(path)}
                      className={cn(
                        'w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl border transition-all text-right select-none',
                        active
                          ? 'border-primary/30 bg-primary/5'
                          : 'border-border bg-card hover:border-primary/20 active:scale-[0.98]'
                      )}
                    >
                      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', color)}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0 text-right">
                        <p className="font-semibold text-sm text-foreground">{label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{desc}</p>
                      </div>
                      <ChevronLeft className="w-4 h-4 text-muted-foreground shrink-0" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}

        {/* ── System map (standalone) ── */}
        <div className="px-4 mt-5">
          <button
            onClick={() => navigate(MAP_ITEM.path)}
            className={cn(
              'w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl border transition-all text-right select-none',
              location.pathname === MAP_ITEM.path
                ? 'border-primary/30 bg-primary/5'
                : 'border-border bg-card hover:border-primary/20 active:scale-[0.98]'
            )}
          >
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', MAP_ITEM.color)}>
              <MAP_ITEM.icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0 text-right">
              <p className="font-semibold text-sm text-foreground">{MAP_ITEM.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{MAP_ITEM.desc}</p>
            </div>
            <ChevronLeft className="w-4 h-4 text-muted-foreground shrink-0" />
          </button>
        </div>

        {/* ── Settings (standalone, bottom) ── */}
        <div className="px-4 mt-5">
          <button
            onClick={() => navigate(SETTINGS_ITEM.path)}
            className={cn(
              'w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl border transition-all text-right select-none',
              location.pathname === SETTINGS_ITEM.path
                ? 'border-primary/30 bg-primary/5'
                : 'border-border bg-card hover:border-primary/20 active:scale-[0.98]'
            )}
          >
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', SETTINGS_ITEM.color)}>
              <SETTINGS_ITEM.icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0 text-right">
              <p className="font-semibold text-sm text-foreground">{SETTINGS_ITEM.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{SETTINGS_ITEM.desc}</p>
            </div>
            <ChevronLeft className="w-4 h-4 text-muted-foreground shrink-0" />
          </button>
        </div>
      </div>
    </AppLayout>
  );
}