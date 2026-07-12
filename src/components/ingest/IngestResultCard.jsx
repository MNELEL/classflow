import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Save, Loader2, CheckCircle2, FileText, BookOpen, Award, Mail } from 'lucide-react';
import { CATEGORIES, REQUIRES_STUDENT, getCategoryConfig } from '@/lib/smartIngest';

const ICON_MAP = { FileText, BookOpen, Award, Mail };

export default function IngestResultCard({ result, students, onSave, onUpdate, isSaving, isSaved }) {
  if (result.status === 'error') {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-destructive/30">
          <CardContent className="p-3">
            <p className="text-sm font-medium truncate">{result.fileName}</p>
            <p className="text-xs text-destructive mt-1">{result.error}</p>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  const category = result.selectedCategory || result.category;
  const requiresStudent = REQUIRES_STUDENT.includes(category);
  const canSave = !isSaving && !isSaved && (!requiresStudent || !!result.selectedStudentId);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
      <Card className={isSaved ? 'border-green-200 dark:border-green-900/40' : 'border-border'}>
        <CardContent className="p-3 space-y-3">
          {/* Image preview */}
          <div className="relative rounded-lg overflow-hidden bg-muted/40">
            <img src={result.previewUrl} alt={result.fileName} className="w-full object-contain max-h-48" />
            {isSaved && (
              <div className="absolute top-2 right-2">
                <Badge className="bg-green-500 text-white border-0 gap-1 text-[10px]">
                  <CheckCircle2 className="w-3 h-3" /> נשמר
                </Badge>
              </div>
            )}
            {result.confidence === 'low' && !isSaved && (
              <div className="absolute top-2 right-2">
                <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-0 text-[10px]">⚠ ביטחון נמוך</Badge>
              </div>
            )}
          </div>

          {/* Category selector */}
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground mb-1.5">סוג מסמך</p>
            <div className="grid grid-cols-4 gap-1">
              {CATEGORIES.map(cat => {
                const Icon = ICON_MAP[cat.icon] || FileText;
                const active = category === cat.value;
                return (
                  <button
                    key={cat.value}
                    onClick={() => onUpdate(result.id, { selectedCategory: cat.value })}
                    disabled={isSaving || isSaved}
                    className={`flex flex-col items-center gap-1 p-1.5 rounded-lg border text-[9px] font-medium transition-all ${
                      active ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:border-primary/20'
                    } ${isSaved ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="leading-tight text-center">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Student selector */}
          {requiresStudent && (
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground mb-1.5">תלמיד</p>
              <select
                value={result.selectedStudentId || ''}
                onChange={e => onUpdate(result.id, { selectedStudentId: e.target.value })}
                disabled={isSaving || isSaved}
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm disabled:opacity-50"
              >
                <option value="">בחר תלמיד...</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              {result.student_name && !result.selectedStudentId && (
                <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">זוהה במסמך: {result.student_name}</p>
              )}
            </div>
          )}

          {/* Summary */}
          {result.summary && (
            <div className="bg-muted/30 rounded-lg p-2.5">
              <p className="text-[10px] font-semibold text-muted-foreground mb-1">תקציר</p>
              <p className="text-xs leading-relaxed summary-text">{result.summary}</p>
            </div>
          )}

          {/* Category-specific fields */}
          {category === 'grades_assessment' && result.score !== undefined && (
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={result.score ?? ''}
                  onChange={e => onUpdate(result.id, { score: parseFloat(e.target.value) })}
                  disabled={isSaving || isSaved}
                  className="w-16 h-9 text-center text-lg font-bold rounded-md border border-input bg-transparent disabled:opacity-50"
                />
                <span className="text-muted-foreground text-sm">/</span>
                <input
                  type="number"
                  value={result.max_score ?? 100}
                  onChange={e => onUpdate(result.id, { max_score: parseFloat(e.target.value) })}
                  disabled={isSaving || isSaved}
                  className="w-16 h-9 text-center text-sm rounded-md border border-input bg-transparent disabled:opacity-50"
                />
              </div>
              {result.subject && <Badge variant="secondary" className="text-[10px]">{result.subject}</Badge>}
            </div>
          )}

          {category === 'student_note' && (
            <div className="flex flex-wrap gap-1">
              {result.behavior_type && <Badge variant="secondary" className="text-[10px]">{result.behavior_type}</Badge>}
              {result.severity && <Badge variant="outline" className="text-[10px]">חומרה: {result.severity}</Badge>}
            </div>
          )}

          {category === 'personal_letter' && result.recipient && (
            <Badge variant="secondary" className="text-[10px]">
              נמען: {result.recipient === 'parent' ? 'הורה' : result.recipient === 'student' ? 'תלמיד' : 'לא ידוע'}
            </Badge>
          )}

          {category === 'class_journal' && result.key_points?.length > 0 && (
            <div className="space-y-1">
              {result.key_points.slice(0, 3).map((p, i) => (
                <p key={i} className="text-[11px] text-muted-foreground">• {p}</p>
              ))}
            </div>
          )}

          {/* Save button */}
          <Button
            onClick={() => onSave(result)}
            disabled={!canSave}
            variant={isSaved ? 'outline' : 'default'}
            className="w-full gap-2"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : isSaved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {isSaving ? 'שומר...' : isSaved ? 'נשמר' : 'שמור'}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}