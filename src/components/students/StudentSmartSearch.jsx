import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Search, X, FileText, MessageSquare, TrendingUp, CalendarCheck, BookOpen, GitBranch, Zap } from 'lucide-react';
import { formatDate } from '@/lib/formatDate';

function norm(s) { return String(s || '').toLowerCase(); }

function snippet(text, q) {
  const t = String(text || '');
  const i = norm(t).indexOf(q);
  if (i < 0) return t.slice(0, 90);
  const start = Math.max(0, i - 25);
  return (start > 0 ? '…' : '') + t.slice(start, start + 95) + (start + 95 < t.length ? '…' : '');
}

const SOURCE_META = {
  portfolio:  { label: 'תיק / דוח',   icon: FileText,     tab: 'files',      color: 'text-violet-600' },
  parent:     { label: 'תקשורת הורים', icon: MessageSquare, tab: 'parents',    color: 'text-teal-600' },
  behavior:   { label: 'התנהגות',     icon: GitBranch,    tab: 'assessments', color: 'text-indigo-600' },
  feedback:   { label: 'משוב מהיר',   icon: Zap,          tab: 'assessments', color: 'text-amber-600' },
  grade:      { label: 'ציון',       icon: TrendingUp,   tab: 'grades',      color: 'text-blue-600' },
  attendance: { label: 'נוכחות',     icon: CalendarCheck, tab: 'attendance',  color: 'text-emerald-600' },
  library:    { label: 'חומר לימוד',  icon: BookOpen,     tab: 'files',       color: 'text-teal-600' },
};

export default function StudentSmartSearch({ student, studentId, portfolio, grades, attendance, behavior, feedback, library, onJump }) {
  const [q, setQ] = useState('');
  const { data: parentContacts = [] } = useQuery({
    queryKey: ['parent-contacts', studentId],
    queryFn: () => base44.entities.ParentContact.filter({ student_id: studentId }),
    staleTime: 60000,
  });
  const { data: pendingAll = [] } = useQuery({
    queryKey: ['pendingUpdates'],
    queryFn: () => base44.entities.PendingUpdate.list('-created_date', 200),
    staleTime: 60000,
  });

  const query = norm(q).trim();

  const results = useMemo(() => {
    if (query.length < 2) return [];
    const out = [];
    const push = (source, text, date) => {
      if (text && norm(text).includes(query)) out.push({ source, snippet: snippet(text, query), date });
    };
    (portfolio || []).forEach(p => push('portfolio', [p.title, p.description, ...(p.tags || [])].join(' '), p.date));
    (parentContacts || []).forEach(c => push('parent', [c.summary, c.parent_name].join(' '), c.date));
    (pendingAll || [])
      .filter(p => (p.student_name && norm(p.student_name) === norm(student?.name)) || p.payload?.student_id === studentId)
      .forEach(p => push('parent', [p.summary, p.original_text].join(' '), p.reviewed_at || p.created_date));
    (behavior || []).forEach(b => push('behavior', b.description, b.date));
    (feedback || []).forEach(f => push('feedback', [f.message, f.category, f.subject].join(' '), f.date));
    (grades || []).forEach(g => push('grade', [g.test_name, g.subject, g.notes].join(' '), g.date));
    (attendance || []).forEach(a => push('attendance', [a.note, a.status].join(' '), a.date));
    (library || []).forEach(l => push('library', [l.title, l.subject, l.category].join(' ')));
    return out.slice(0, 30);
  }, [query, portfolio, parentContacts, pendingAll, behavior, feedback, grades, attendance, library, student, studentId]);

  return (
    <div className="relative">
      <div className="flex items-center gap-2 bg-card border border-border rounded-2xl px-3 h-10 focus-within:ring-2 focus-within:ring-primary/30">
        <Search className="w-4 h-4 text-muted-foreground shrink-0" />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="חיפוש חכם בתיק — תקשורת, דוחות, ציונים…"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          aria-label="חיפוש בתיק התלמיד"
        />
        {q && (
          <button onClick={() => setQ('')} className="text-muted-foreground hover:text-foreground shrink-0" aria-label="נקה חיפוש">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {query.length >= 2 && (
        <div className="mt-2 rounded-2xl border border-border bg-card shadow-lg overflow-hidden max-h-[60vh] overflow-y-auto no-scrollbar">
          {results.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-6">לא נמצאו תוצאות עבור "{q}"</p>
          ) : (
            <div className="divide-y divide-border">
              {results.map((r, i) => {
                const meta = SOURCE_META[r.source] || SOURCE_META.portfolio;
                const Icon = meta.icon;
                return (
                  <button
                    key={i}
                    onClick={() => { onJump?.(meta.tab); setQ(''); }}
                    className="w-full flex items-start gap-2.5 px-3 py-2.5 text-right hover:bg-accent/40 active:bg-accent/60 transition-colors"
                  >
                    <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${meta.color}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-semibold text-muted-foreground">{meta.label}</span>
                        {r.date && <span className="text-[10px] text-muted-foreground">{formatDate(r.date)}</span>}
                      </div>
                      <p className="text-xs text-foreground line-clamp-2 mt-0.5 break-words">{r.snippet}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}