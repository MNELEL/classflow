import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  CalendarCheck, GraduationCap, Trophy, Wrench,
  Contact, FileText, Layers, Mic, ClipboardList, ClipboardCheck,
  Music, Eye, Clock, FolderOpen, UserCircle, Settings, ChevronLeft, BarChart2, Brain
} from 'lucide-react';

const QUICK_ACCESS = [
  { path: '/teacher-style', icon: Brain,     label: 'סגנון הוראה שלי', desc: 'AI לומד את הסגנון הייחודי שלך', color: 'bg-primary/10 text-primary' },
  { path: '/analytics',  icon: BarChart2,   label: 'ניתוח ציונים',   desc: 'גרפים, נושאים ומגמות',      color: 'bg-violet-50 text-violet-600' },
  { path: '/curriculum', icon: Clock,       label: 'מערכת שעות',     desc: 'תכנון שבועי ויעדי לימוד',   color: 'bg-indigo-50 text-indigo-600' },
  { path: '/library',    icon: FolderOpen,  label: 'ספריית קבצים',   desc: 'חומרי הוראה ומשאבים',       color: 'bg-blue-50 text-blue-600' },
  { path: '/settings',   icon: UserCircle,  label: 'פרופיל והגדרות', desc: 'מיתוג, תצוגה ועוד',         color: 'bg-slate-50 text-slate-600' },
];

const TOOL_GROUPS = [
  {
    title: 'מעקב ובקרה',
    items: [
      { path: '/attendance',   icon: CalendarCheck,  label: 'נוכחות',       color: 'bg-emerald-100 text-emerald-700' },
      { path: '/grades',       icon: GraduationCap,  label: 'ציונים',       color: 'bg-blue-100 text-blue-700' },
      { path: '/homework',     icon: ClipboardCheck, label: 'שיעורי בית',   color: 'bg-orange-100 text-orange-700' },
      { path: '/gamification', icon: Trophy,         label: 'גמיפיקציה',   color: 'bg-yellow-100 text-yellow-700' },
    ]
  },
  {
    title: 'כלי הוראה',
    items: [
      { path: '/worksheets',      icon: FileText,      label: 'דפי עבודה',      color: 'bg-purple-100 text-purple-700' },
      { path: '/question-bank',   icon: Layers,        label: 'בנק שאלות',     color: 'bg-pink-100 text-pink-700' },
      { path: '/lesson-analyzer', icon: Mic,           label: 'ניתוח שיעורים', color: 'bg-rose-100 text-rose-700' },
      { path: '/toolkit',         icon: Wrench,        label: 'ארגז כלים',     color: 'bg-cyan-100 text-cyan-700' },
    ]
  },
  {
    title: 'תקשורת ותצוגה',
    items: [
      { path: '/parents',       icon: Contact,        label: 'הורים',         color: 'bg-teal-100 text-teal-700' },
      { path: '/student-view',  icon: Eye,            label: 'תצוגת תלמיד',  color: 'bg-indigo-100 text-indigo-700' },
      { path: '/sound-board',   icon: Music,          label: 'לוח צלילים',   color: 'bg-violet-100 text-violet-700' },
    ]
  },
];

export default function MorePage() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="min-h-full bg-background" dir="rtl">
      {/* Hero */}
      <div className="bg-academic-gradient px-4 pt-5 pb-6">
        <h1 className="text-2xl font-bold text-foreground">כל הכלים</h1>
        <p className="text-sm text-muted-foreground mt-0.5">גישה מהירה לכל מודולי הניהול</p>
      </div>

      <div className="px-4 py-5 space-y-6">

        {/* Quick Access */}
        <section>
          <h2 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3">גישה מהירה</h2>
          <div className="space-y-2">
            {QUICK_ACCESS.map(({ path, icon: Icon, label, desc, color }) => {
              const active = location.pathname === path;
              return (
                <button
                  key={path}
                  onClick={() => navigate(path)}
                  className={cn(
                    'w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-right select-none',
                    active
                      ? 'border-primary/30 bg-primary/5'
                      : 'border-border bg-card hover:border-primary/20 hover:shadow-sm'
                  )}
                >
                  <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center shrink-0', color)}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                  </div>
                  <ChevronLeft className="w-4 h-4 text-muted-foreground shrink-0" />
                </button>
              );
            })}
          </div>
        </section>

        {/* Tool Groups */}
        {TOOL_GROUPS.map(({ title, items }) => (
          <section key={title}>
            <h2 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3">{title}</h2>
            <div className="grid grid-cols-2 gap-2">
              {items.map(({ path, icon: Icon, label, color }) => {
                const active = location.pathname === path;
                return (
                  <button
                    key={path}
                    onClick={() => navigate(path)}
                    className={cn(
                      'flex items-center gap-3 p-3.5 rounded-2xl border transition-all text-right select-none',
                      active
                        ? 'border-primary/30 bg-primary/5'
                        : 'border-border bg-card hover:border-primary/20 hover:shadow-sm'
                    )}
                  >
                    <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', color)}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="font-medium text-sm text-foreground">{label}</span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}

      </div>
    </div>
  );
}