import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Award, FileText, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/formatDate';

const TEMPLATE_LABELS = {
  excellence: 'הצטיינות',
  participation: 'השתתפות',
  topic_completion: 'סיום נושא',
  custom: 'מותאמת אישית',
};

// Aggregates every generated report / assessment / certificate for a student
// so the profile (תיק תלמיד) reflects them automatically. Certificates come
// from the Certificate entity; reports/assessments are persisted as
// StudentPortfolioItem records by the report generators.
export default function StudentReportsAndCertificates({ studentId }) {
  const navigate = useNavigate();
  const { data: certificates = [] } = useQuery({
    queryKey: ['certificates', studentId],
    queryFn: () => base44.entities.Certificate.filter({ student_id: studentId }, '-date'),
  });
  const { data: portfolio = [] } = useQuery({
    queryKey: ['portfolio'],
    queryFn: () => base44.entities.StudentPortfolioItem.list('-date', 200),
  });
  const myPortfolio = useMemo(
    () => portfolio.filter(p => p.student_id === studentId),
    [portfolio, studentId]
  );

  const total = certificates.length + myPortfolio.length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">דוחות ותעודות</p>
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => navigate('/certificates')}>
          <Award className="w-3.5 h-3.5" /> הפקת תעודה
        </Button>
      </div>

      {total === 0 ? (
        <div className="text-center py-6 text-muted-foreground text-sm">עדיין לא הופקו דוחות או תעודות לתלמיד זה</div>
      ) : (
        <div className="space-y-2">
          {certificates.map(c => (
            <div key={c.id} className="flex items-center gap-3 bg-card border border-border rounded-xl px-3.5 py-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center shrink-0">
                <Award className="w-4 h-4 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{c.title || 'תעודה'}</p>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <Badge variant="outline" className="text-[10px]">{TEMPLATE_LABELS[c.template] || c.template}</Badge>
                  {c.subject && <span className="text-xs text-muted-foreground truncate">{c.subject}</span>}
                  {c.date && <span className="text-xs text-muted-foreground">· {formatDate(c.date)}</span>}
                </div>
              </div>
            </div>
          ))}
          {myPortfolio.map(item => (
            <div key={item.id} className="flex items-center gap-3 bg-card border border-border rounded-xl px-3.5 py-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.type}{item.date ? ` · ${formatDate(item.date)}` : ''}</p>
              </div>
              {item.file_url && (
                <a href={item.file_url} target="_blank" rel="noreferrer" className="shrink-0">
                  <ExternalLink className="w-4 h-4 text-muted-foreground hover:text-primary transition-colors" />
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}