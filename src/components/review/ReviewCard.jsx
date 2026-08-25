import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import HebrewDatePicker from '@/components/ui/HebrewDatePicker';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MobileSelect } from '@/components/ui/MobileSelect';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Check, X, Edit3, Save, GraduationCap, CalendarCheck,
  FileText, ClipboardList, UserPlus, BookOpen, AlertCircle,
  MessageSquare, Clock, Image as ImageIcon, CalendarDays
} from 'lucide-react';
import { motion } from 'framer-motion';
import { getIntentLabel } from '@/lib/pendingUpdateActions';

const INTENT_ICONS = {
  add_student: UserPlus,
  mark_attendance: CalendarCheck,
  add_grade: GraduationCap,
  add_task: ClipboardList,
  add_behavior: AlertCircle,
  add_homework: BookOpen,
  document_ingest: FileText,
  incident: AlertCircle,
  calendar_event: CalendarDays,
  parent_contact: MessageSquare,
  daily_log: FileText,
};

const INTENT_COLORS = {
  add_student: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  mark_attendance: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  add_grade: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  add_task: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  add_behavior: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  add_homework: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  document_ingest: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  incident: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  calendar_event: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  parent_contact: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-400',
  daily_log: 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400',
};

export default function ReviewCard({ pending, students, onApprove, onReject, isProcessing }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(pending.payload || {});

  const Icon = INTENT_ICONS[pending.intent] || FileText;
  const colorClass = INTENT_COLORS[pending.intent] || INTENT_COLORS.document_ingest;

  function updateField(field, value) {
    setDraft(prev => ({ ...prev, [field]: value }));
  }

  function handleSaveEdit() {
    // onApprove (ReviewPage.handleApprove) now rethrows on failure so batch
    // approval can report accurate counts — it already shows its own error
    // toast, so this just needs to catch the rejection to avoid an
    // unhandled-promise-rejection warning; nothing else to do with it here.
    onApprove(pending, draft).catch(() => {});
  }

  function handleApprove() {
    const payload = editing ? draft : pending.payload;
    onApprove(pending, payload).catch(() => {});
  }

  const requiresStudent = pending.intent !== 'add_student' && pending.intent !== 'add_homework';
  const isDocIngest = pending.intent === 'document_ingest';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
    >
      <Card className="overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50 bg-muted/20">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}>
            <Icon className="w-4.5 h-4.5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{pending.summary}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="secondary" className="text-[10px] py-0">{getIntentLabel(pending.intent)}</Badge>
              {pending.source === 'voice_command' && (
                <Badge variant="outline" className="text-[10px] py-0 gap-1">
                  <MessageSquare className="w-2.5 h-2.5" /> קולי
                </Badge>
              )}
              {pending.source === 'file_upload' && (
                <Badge variant="outline" className="text-[10px] py-0 gap-1">
                  <ImageIcon className="w-2.5 h-2.5" /> קובץ
                </Badge>
              )}
            </div>
          </div>
        </div>

        <CardContent className="p-4 space-y-3">
          {/* Original text */}
          {pending.original_text && (
            <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-2.5">
              <span className="font-medium">מקור: </span>"{pending.original_text}"
            </div>
          )}

          {/* Document preview */}
          {isDocIngest && pending.file_url && (
            <div className="rounded-lg overflow-hidden border border-border/50">
              <img src={pending.file_url} alt="תצוגה מקדימה" className="w-full max-h-48 object-cover" />
            </div>
          )}

          {/* Editable fields */}
          <div className="space-y-2.5">
            {/* Student selector */}
            {requiresStudent && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">תלמיד</Label>
                {editing ? (
                  <MobileSelect
                    value={draft.selectedStudentId || draft.student_id || ''}
                    onValueChange={(v) => {
                      const student = students.find(s => s.id === v);
                      updateField('student_id', v);
                      updateField('selectedStudentId', v);
                      if (student) updateField('student_name', student.name);
                    }}
                    placeholder="בחר תלמיד"
                  >
                    {students.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </MobileSelect>
                ) : (
                  <p className="text-sm font-medium text-foreground">
                    {pending.student_name || students.find(s => s.id === (pending.payload?.student_id || pending.payload?.selectedStudentId))?.name || '— לא זוהה —'}
                  </p>
                )}
              </div>
            )}

            {/* add_student */}
            {pending.intent === 'add_student' && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">שם התלמיד</Label>
                {editing ? (
                  <Input
                    value={draft.student_name || ''}
                    onChange={e => updateField('student_name', e.target.value)}
                    className="h-9"
                  />
                ) : (
                  <p className="text-sm font-medium">{pending.payload?.student_name}</p>
                )}
              </div>
            )}

            {/* add_grade */}
            {pending.intent === 'add_grade' && (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">מקצוע</Label>
                  {editing ? (
                    <Input value={draft.subject || ''} onChange={e => updateField('subject', e.target.value)} className="h-9" />
                  ) : (
                    <p className="text-sm font-medium">{pending.payload?.subject || '—'}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">ציון</Label>
                  {editing ? (
                    <Input
                      type="number"
                      value={draft.score ?? ''}
                      onChange={e => updateField('score', e.target.value === '' ? null : Number(e.target.value))}
                      className="h-9"
                    />
                  ) : (
                    <p className="text-sm font-medium">{pending.payload?.score ?? '—'}</p>
                  )}
                </div>
              </div>
            )}

            {/* mark_attendance */}
            {pending.intent === 'mark_attendance' && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">סטטוס</Label>
                {editing ? (
                  <MobileSelect
                    value={draft.status || 'absent'}
                    onValueChange={v => updateField('status', v)}
                    placeholder="בחר סטטוס"
                  >
                    <SelectItem value="present">נוכח</SelectItem>
                    <SelectItem value="absent">נעדר</SelectItem>
                    <SelectItem value="late">מאחר</SelectItem>
                  </MobileSelect>
                ) : (
                  <p className="text-sm font-medium">
                    {pending.payload?.status === 'present' ? 'נוכח' : pending.payload?.status === 'late' ? 'מאחר' : 'נעדר'}
                  </p>
                )}
              </div>
            )}

            {/* add_behavior */}
            {pending.intent === 'add_behavior' && (
              <>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">סוג התנהגות</Label>
                  {editing ? (
                    <MobileSelect
                      value={draft.behavior_type || 'neutral'}
                      onValueChange={v => updateField('behavior_type', v)}
                      placeholder="בחר סוג"
                    >
                      <SelectItem value="positive">חיובי</SelectItem>
                      <SelectItem value="negative">שלילי</SelectItem>
                      <SelectItem value="neutral">ניטרלי</SelectItem>
                      <SelectItem value="improvement">שיפור</SelectItem>
                      <SelectItem value="concern">דאגה</SelectItem>
                    </MobileSelect>
                  ) : (
                    <p className="text-sm font-medium">
                      {({positive:'חיובי',negative:'שלילי',neutral:'ניטרלי',improvement:'שיפור',concern:'דאגה'})[pending.payload?.behavior_type] || '—'}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">תיאור</Label>
                  {editing ? (
                    <Textarea
                      value={draft.description || ''}
                      onChange={e => updateField('description', e.target.value)}
                      rows={2}
                      className="text-sm"
                    />
                  ) : (
                    <p className="text-sm">{pending.payload?.description || '—'}</p>
                  )}
                </div>
              </>
            )}

            {/* add_task / add_homework */}
            {(pending.intent === 'add_task' || pending.intent === 'add_homework') && (
              <>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">כותרת</Label>
                  {editing ? (
                    <Input value={draft.title || ''} onChange={e => updateField('title', e.target.value)} className="h-9" />
                  ) : (
                    <p className="text-sm font-medium">{pending.payload?.title || '—'}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">מקצוע</Label>
                    {editing ? (
                      <Input value={draft.subject || ''} onChange={e => updateField('subject', e.target.value)} className="h-9" />
                    ) : (
                      <p className="text-sm">{pending.payload?.subject || '—'}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">תאריך יעד</Label>
                    {editing ? (
                      <HebrewDatePicker value={draft.due_date || ''} onChange={v => updateField('due_date', v)} className="h-9" />
                    ) : (
                      <p className="text-sm">{pending.payload?.due_date || '—'}</p>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* incident */}
            {pending.intent === 'incident' && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">סוג</Label>
                    {editing ? (
                      <MobileSelect value={draft.behavior_type || 'concern'} onValueChange={v => updateField('behavior_type', v)} placeholder="בחר סוג">
                        <SelectItem value="positive">חיובי</SelectItem>
                        <SelectItem value="negative">שלילי</SelectItem>
                        <SelectItem value="neutral">ניטרלי</SelectItem>
                        <SelectItem value="improvement">שיפור</SelectItem>
                        <SelectItem value="concern">דאגה</SelectItem>
                      </MobileSelect>
                    ) : (
                      <p className="text-sm font-medium">{({positive:'חיובי',negative:'שלילי',neutral:'ניטרלי',improvement:'שיפור',concern:'דאגה'})[pending.payload?.behavior_type] || '—'}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">חומרה</Label>
                    {editing ? (
                      <MobileSelect value={draft.severity || 'medium'} onValueChange={v => updateField('severity', v)} placeholder="בחר חומרה">
                        <SelectItem value="low">נמוכה</SelectItem>
                        <SelectItem value="medium">בינונית</SelectItem>
                        <SelectItem value="high">גבוהה</SelectItem>
                      </MobileSelect>
                    ) : (
                      <p className="text-sm font-medium">{({low:'נמוכה',medium:'בינונית',high:'גבוהה'})[pending.payload?.severity] || '—'}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">תיאור</Label>
                  {editing ? (
                    <Textarea value={draft.description || ''} onChange={e => updateField('description', e.target.value)} rows={2} className="text-sm" />
                  ) : (
                    <p className="text-sm">{pending.payload?.description || '—'}</p>
                  )}
                </div>
              </>
            )}

            {/* calendar_event */}
            {pending.intent === 'calendar_event' && (
              <>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">כותרת</Label>
                  {editing ? (
                    <Input value={draft.event_title || ''} onChange={e => updateField('event_title', e.target.value)} className="h-9" />
                  ) : (
                    <p className="text-sm font-medium">{pending.payload?.event_title || '—'}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">סוג</Label>
                    {editing ? (
                      <MobileSelect value={draft.event_type || 'other'} onValueChange={v => updateField('event_type', v)} placeholder="בחר סוג">
                        <SelectItem value="trip">טיול</SelectItem>
                        <SelectItem value="assembly">אסיפה</SelectItem>
                        <SelectItem value="holiday">חג</SelectItem>
                        <SelectItem value="meeting">פגישה</SelectItem>
                        <SelectItem value="exam">מבחן</SelectItem>
                        <SelectItem value="deadline">מועד אחרון</SelectItem>
                        <SelectItem value="celebration">חגיגה</SelectItem>
                        <SelectItem value="other">אחר</SelectItem>
                      </MobileSelect>
                    ) : (
                      <p className="text-sm">{pending.payload?.event_type || '—'}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">תאריך</Label>
                    {editing ? (
                      <HebrewDatePicker value={draft.event_date || ''} onChange={v => updateField('event_date', v)} className="h-9" />
                    ) : (
                      <p className="text-sm">{pending.payload?.event_date || '—'}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">תיאור</Label>
                  {editing ? (
                    <Textarea value={draft.event_description || ''} onChange={e => updateField('event_description', e.target.value)} rows={2} className="text-sm" />
                  ) : (
                    <p className="text-sm">{pending.payload?.event_description || '—'}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">מיקום</Label>
                  {editing ? (
                    <Input value={draft.event_location || ''} onChange={e => updateField('event_location', e.target.value)} className="h-9" />
                  ) : (
                    <p className="text-sm">{pending.payload?.event_location || '—'}</p>
                  )}
                </div>
              </>
            )}

            {/* parent_contact */}
            {pending.intent === 'parent_contact' && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">סוג קשר</Label>
                    {editing ? (
                      <MobileSelect value={draft.contact_type || 'note'} onValueChange={v => updateField('contact_type', v)} placeholder="בחר סוג">
                        <SelectItem value="call">שיחה</SelectItem>
                        <SelectItem value="meeting">פגישה</SelectItem>
                        <SelectItem value="message">הודעה</SelectItem>
                        <SelectItem value="email">אימייל</SelectItem>
                        <SelectItem value="note">רישום</SelectItem>
                      </MobileSelect>
                    ) : (
                      <p className="text-sm font-medium">{({call:'שיחה',meeting:'פגישה',message:'הודעה',email:'אימייל',note:'רישום'})[pending.payload?.contact_type] || '—'}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">תאריך</Label>
                    {editing ? (
                      <HebrewDatePicker value={draft.contact_date || ''} onChange={v => updateField('contact_date', v)} className="h-9" />
                    ) : (
                      <p className="text-sm">{pending.payload?.contact_date || '—'}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">תוכן</Label>
                  {editing ? (
                    <Textarea value={draft.contact_summary || ''} onChange={e => updateField('contact_summary', e.target.value)} rows={2} className="text-sm" />
                  ) : (
                    <p className="text-sm">{pending.payload?.contact_summary || '—'}</p>
                  )}
                </div>
              </>
            )}

            {/* daily_log */}
            {pending.intent === 'daily_log' && (
              <>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">תאריך</Label>
                  {editing ? (
                    <HebrewDatePicker value={draft.log_date || ''} onChange={v => updateField('log_date', v)} className="h-9" />
                  ) : (
                    <p className="text-sm">{pending.payload?.log_date || '—'}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">תוכן התיעוד</Label>
                  {editing ? (
                    <Textarea value={draft.log_text || ''} onChange={e => updateField('log_text', e.target.value)} rows={3} className="text-sm" />
                  ) : (
                    <p className="text-sm">{pending.payload?.log_text || '—'}</p>
                  )}
                </div>
              </>
            )}

            {/* document_ingest — category + summary */}
            {isDocIngest && (
              <>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">קטגוריה</Label>
                  {editing ? (
                    <MobileSelect
                      value={draft.selectedCategory || draft.category || 'student_note'}
                      onValueChange={v => updateField('selectedCategory', v)}
                      placeholder="בחר קטגוריה"
                    >
                      <SelectItem value="student_note">הערה על תלמיד</SelectItem>
                      <SelectItem value="class_journal">יומן כיתה</SelectItem>
                      <SelectItem value="grades_assessment">ציונים</SelectItem>
                      <SelectItem value="personal_letter">מכתב אישי</SelectItem>
                    </MobileSelect>
                  ) : (
                    <p className="text-sm font-medium">
                      {({student_note:'הערה על תלמיד',class_journal:'יומן כיתה',grades_assessment:'ציונים',personal_letter:'מכתב אישי'})[pending.payload?.selectedCategory || pending.payload?.category] || '—'}
                    </p>
                  )}
                </div>
                {(pending.payload?.selectedCategory === 'grades_assessment' || pending.payload?.category === 'grades_assessment') && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">ציון</Label>
                      {editing ? (
                        <Input type="number" value={draft.score ?? ''} onChange={e => updateField('score', e.target.value === '' ? null : Number(e.target.value))} className="h-9" />
                      ) : (
                        <p className="text-sm">{pending.payload?.score ?? '—'}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">מקצוע</Label>
                      {editing ? (
                        <Input value={draft.subject || ''} onChange={e => updateField('subject', e.target.value)} className="h-9" />
                      ) : (
                        <p className="text-sm">{pending.payload?.subject || '—'}</p>
                      )}
                    </div>
                  </div>
                )}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">סיכום</Label>
                  {editing ? (
                    <Textarea value={draft.summary || ''} onChange={e => updateField('summary', e.target.value)} rows={2} className="text-sm" />
                  ) : (
                    <p className="text-sm text-muted-foreground">{pending.payload?.summary || '—'}</p>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            {editing ? (
              <Button size="sm" className="flex-1 gap-1.5" onClick={handleSaveEdit} disabled={isProcessing}>
                <Save className="w-3.5 h-3.5" /> שמור ואשר
              </Button>
            ) : (
              <Button size="sm" className="flex-1 gap-1.5" onClick={handleApprove} disabled={isProcessing}>
                <Check className="w-3.5 h-3.5" /> אשר
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => { setEditing(!editing); setDraft(pending.payload || {}); }}
              disabled={isProcessing}
            >
              <Edit3 className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-destructive hover:text-destructive border-destructive/20"
              onClick={() => onReject(pending)}
              disabled={isProcessing}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}