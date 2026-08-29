import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import {
  Phone, Mail, Users, ChevronLeft, Briefcase, HeartPulse, Building2, Contact as ContactIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const CATEGORY_CONFIG = {
  'הנהלה וצוות':   { icon: Building2,     color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
  'ספקים ושירותים': { icon: Briefcase,     color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' },
  'בריאות וחירום':  { icon: HeartPulse,    color: 'text-red-600 bg-red-50 dark:bg-red-900/20' },
  'הורים וקהילה':   { icon: Users,         color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' },
};

function digits(v) { return String(v).replace(/[^\d+]/g, ''); }

// Shows ALL contacts associated with the student by context: every ContactEntry
// linked to the student's classroom(s) plus general/institutional contacts, with
// quick call/email actions and a link to the full contact sheet.
export default function StudentClassContacts({ studentId }) {
  const navigate = useNavigate();
  const { data: classrooms = [] } = useQuery({
    queryKey: ['classrooms'],
    queryFn: () => base44.entities.Classroom.list(),
  });
  const { data: contacts = [] } = useQuery({
    queryKey: ['contact-entries'],
    queryFn: () => base44.entities.ContactEntry.list('-sort_order', 300),
  });

  const studentClassIds = useMemo(
    () => classrooms.filter(c => (c.student_ids || []).includes(studentId)).map(c => c.id),
    [classrooms, studentId]
  );

  const relevant = useMemo(
    () => contacts.filter(c => !c.class_id || studentClassIds.includes(c.class_id)),
    [contacts, studentClassIds]
  );

  const byCategory = useMemo(() => {
    const groups = {};
    relevant.forEach(c => {
      const k = c.category || 'אחר';
      if (!groups[k]) groups[k] = [];
      groups[k].push(c);
    });
    return groups;
  }, [relevant]);

  if (relevant.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-2xl p-3.5 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
          <ContactIcon className="w-3.5 h-3.5" /> אנשי קשר לתלמיד ({relevant.length})
        </p>
        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => navigate('/weekly-communication?tab=contacts')}>
          דף קשר מלא <ChevronLeft className="w-3.5 h-3.5" />
        </Button>
      </div>
      {Object.entries(byCategory).map(([cat, items]) => {
        const cfg = CATEGORY_CONFIG[cat] || { icon: ContactIcon, color: 'text-muted-foreground bg-muted/40' };
        const Icon = cfg.icon;
        const iconColor = cfg.color.split(' ')[0];
        return (
          <div key={cat} className="space-y-1.5">
            <p className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
              <Icon className={`w-3 h-3 ${iconColor}`} /> {cat}
            </p>
            {items.map(c => (
              <div key={c.id} className="flex items-center gap-2 bg-muted/30 border border-border/60 rounded-xl px-2.5 py-2">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${cfg.color}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{c.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{c.role}{c.notes ? ` · ${c.notes}` : ''}</p>
                </div>
                {c.phone && (
                  <a href={`tel:${digits(c.phone)}`} className="text-emerald-600 hover:text-emerald-700 shrink-0 p-1" aria-label="חייג">
                    <Phone className="w-3.5 h-3.5" />
                  </a>
                )}
                {c.email && (
                  <a href={`mailto:${c.email}`} className="text-blue-600 hover:text-blue-700 shrink-0 p-1" aria-label="מייל">
                    <Mail className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}