import React, { useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/AuthContext';
import {
  CalendarCheck, GraduationCap, Trophy, Wrench,
  Contact, FileText, Layers, Mic, ClipboardCheck,
  Music, Eye, Clock, UserCircle, ChevronLeft, BarChart2, Brain,
  BookOpen, Home, Bell, BookMarked, Shuffle, Zap, GitBranch, CalendarDays, Sparkles, Shield, Upload
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';

// ── Top-row quick tiles (2×3 grid) ──────────────────────────────────────────
const TOP_TILES = [
  { path: '/attendance',   icon: CalendarCheck, label: 'נוכחות',       color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  { path: '/grades',       icon: GraduationCap, label: 'ציונים',       color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'             },
  { path: '/tasks-hub',    icon: ClipboardCheck,label: 'ריכוז משימות',  color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'     },
  { path: '/homework',     icon: ClipboardCheck,label: 'שיעורי בית',   color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'     },
  { path: '/gamification', icon: Trophy,        label: 'גמיפיקציה',    color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'     },
  { path: '/worksheets',   icon: FileText,      label: 'דפי עבודה',    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'     },
  { path: '/toolkit',      icon: Wrench,        label: 'ארגז כלים',    color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400'             },
];

// ── Section rows ─────────────────────────────────────────────────────────────
const ROWS = [
  { path: '/teacher-style',   icon: Brain,      label: 'סגנון הוראה שלי', desc: 'AI לומד את הסגנון הייחודי שלך',  color: 'bg-primary/10 text-primary'                                         },
  { path: '/analytics',       icon: BarChart2,  label: 'ניתוח ציונים',    desc: 'גרפים, נושאים ומגמות',            color: 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400' },
  { path: '/weekly-schedule', icon: Clock,      label: 'לוח שבועי',       desc: 'מערכי שיעור לפי ימים ושעות',      color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' },
  { path: '/curriculum',      icon: Clock,      label: 'מערכת שעות',      desc: 'תכנון שבועי ויעדי לימוד',         color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' },
  { path: '/question-bank',   icon: Layers,     label: 'בנק שאלות',       desc: 'שאלות לפי נושא ורמה',            color: 'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400'         },
  { path: '/lesson-analyzer', icon: Mic,        label: 'ניתוח שיעורים',   desc: 'סיכום, תמלול וחומרי לימוד',      color: 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'         },
  { path: '/ingest',             icon: Upload,     label: 'העלאת קבצים',      desc: 'תמונות, PDF ואודיו לניתוח',       color: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400'         },
  { path: '/parents',         icon: Contact,    label: 'הורים',            desc: 'תקשורת ושיתוף חומרים',           color: 'bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400'         },
  { path: '/student-view',    icon: Eye,        label: 'תצוגת תלמיד',     desc: 'מה התלמיד רואה',                  color: 'bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400'             },
  { path: '/sound-board',          icon: Music,       label: 'לוח צלילים',       desc: 'צלילים וניהול כיתה',                color: 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400' },
  { path: '/bell-schedule',        icon: Bell,        label: 'לוח צלצולים',      desc: 'הגדר צלצולים ומנגינות לפי שעה',    color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'     },
  { path: '/study-plan-generator', icon: BookMarked,  label: 'מחולל תוכניות',    desc: 'צור תוכנית לימודים שבועית עם AI',  color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' },
  { path: '/exams',                icon: FileText,    label: 'מבחנים',            desc: 'נהל מבחנים, הזן ציונים וסטטוס',     color: 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'         },
  { path: '/events',               icon: CalendarDays,label: 'אירועים',            desc: 'טיולים, אסיפות, מבחנים וחגיגות',   color: 'bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400'         },
  { path: '/behavior-timeline',    icon: GitBranch,   label: 'ציר התנהגות',       desc: 'תיעוד אירועי התנהגות לאורך זמן',    color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'},
  { path: '/fast-feedback',        icon: Zap,         label: 'משוב מהיר',         desc: 'שלח משוב מיידי לתלמיד',            color: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400'},
  { path: '/raffle',               icon: Shuffle,     label: 'הגרלות',            desc: 'הגרל תלמיד, קבוצות או סדר אקראי',   color: 'bg-fuchsia-100 text-fuchsia-600 dark:bg-fuchsia-900/30 dark:text-fuchsia-400'},
  { path: '/generators',           icon: Sparkles,    label: 'מחוללים פדגוגיים',  desc: 'סיכומים ומשימות מותאמים עם AI',     color: 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400'},
  { path: '/daily-summary',        icon: Sparkles,    label: 'סיכום יומי',        desc: 'AI מחולל סיכום היום והמלצות',      color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'},
  { path: '/admin-generators',     icon: Sparkles,    label: 'מרכז מחוללים - מנהל', desc: 'סיכומים, משימות ועדכונים כלליים',  color: 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400', adminOnly: true },
  { path: '/admin',                icon: Shield,      label: 'לוח בקרה - מנהל',  desc: 'ניהול כיתות ומורים',              color: 'bg-primary/10 text-primary', adminOnly: true },
  { path: '/teaching-style-dashboard', icon: Brain,    label: 'ניתוח מצטבר',       desc: 'סגנונות הוראה ותובנות לפגישות',  color: 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400', adminOnly: true },
  { path: '/teacher-insights',     icon: Brain,       label: 'ניתוח מורים',       desc: 'סגנון הוראה ותדריכי פגישות',     color: 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400', adminOnly: true },
  { path: '/settings',             icon: UserCircle,  label: 'פרופיל והגדרות',   desc: 'מיתוג, תצוגה ועוד',                color: 'bg-slate-100 text-slate-600 dark:bg-slate-900/30 dark:text-slate-400'     },
];

export default function MorePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const scrollRef = useRef(null);
  const savedScroll = useRef(0);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = savedScroll.current;
    }
    return () => {
      if (scrollRef.current) savedScroll.current = scrollRef.current.scrollTop;
    };
  }, []);

  return (
    <AppLayout>
      <div ref={scrollRef} className="overflow-y-auto h-full min-h-full bg-background pb-6" dir="rtl">

        {/* Header */}
        <div className="px-4 pt-5 pb-4">
          <h1 className="text-xl font-bold text-foreground">כל הכלים</h1>
          <p className="text-xs text-muted-foreground mt-0.5">גישה מהירה לכל מודולי הניהול</p>
        </div>

        {/* ── Quick tiles grid ── */}
        <div className="px-4">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2.5">שימוש יומי</p>
          <div className="grid grid-cols-3 gap-2.5">
            {TOP_TILES.map(({ path, icon: Icon, label, color }) => {
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
                  <span className="text-xs font-semibold text-foreground leading-tight text-center">{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Full rows list ── */}
        <div className="px-4 mt-5 space-y-2">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2.5">כל הכלים</p>
          {ROWS.filter(row => !row.adminOnly || user?.role === 'admin').map(({ path, icon: Icon, label, desc, color }) => {
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

      </div>
    </AppLayout>
  );
}