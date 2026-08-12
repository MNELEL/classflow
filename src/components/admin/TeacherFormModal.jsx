import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit, X, Check } from 'lucide-react';
import { toast } from 'sonner';
import { logAudit } from '@/lib/auditLog';

const generateAccessCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export default function TeacherFormModal({ open, onClose, teacher, classrooms }) {
  const queryClient = useQueryClient();
  const isEdit = !!teacher;
  const [formData, setFormData] = useState({
    full_name: '', email: '', phone: '', subject: '', style_summary: '', is_active: true
  });
  const [selectedClassroomIds, setSelectedClassroomIds] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (teacher) {
      const myClasses = classrooms.filter(c => c.teacher_id === teacher.id).map(c => c.id);
      setFormData({
        full_name: teacher.full_name || '',
        email: teacher.email || '',
        phone: teacher.phone || '',
        subject: teacher.subject || '',
        style_summary: teacher.style_summary || '',
        is_active: teacher.is_active !== false,
      });
      setSelectedClassroomIds(myClasses);
    } else {
      setFormData({ full_name: '', email: '', phone: '', subject: '', style_summary: '', is_active: true });
      setSelectedClassroomIds([]);
    }
  }, [teacher, classrooms]);

  if (!open) return null;

  const toggleClassroom = (id) => {
    setSelectedClassroomIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.full_name.trim()) { toast.error('נדרש שם מלא'); return; }
    setSaving(true);
    try {
      let teacherId = teacher?.id;
      const payload = {
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone,
        subject: formData.subject,
        style_summary: formData.style_summary,
        is_active: formData.is_active,
      };

      if (isEdit) {
        await base44.entities.Teacher.update(teacher.id, payload);
        logAudit('update', 'Teacher', teacher.id, formData.full_name);
      } else {
        const newTeacher = await base44.entities.Teacher.create({
          ...payload,
          access_code: generateAccessCode(),
        });
        teacherId = newTeacher.id;
        logAudit('create', 'Teacher', teacherId, formData.full_name);
      }

      // Reassign classrooms: clear from unselected previously-assigned, set on all selected.
      const currentlyAssigned = classrooms.filter(c => c.teacher_id === teacherId);
      const toRemove = currentlyAssigned.filter(c => !selectedClassroomIds.includes(c.id));
      await Promise.all([
        ...toRemove.map(c => base44.entities.Classroom.update(c.id, { teacher_id: '', teacher_name: '' })),
        ...selectedClassroomIds.map(id => base44.entities.Classroom.update(id, {
          teacher_id: teacherId,
          teacher_name: formData.full_name,
        })),
      ]);

      queryClient.invalidateQueries(['teachers']);
      queryClient.invalidateQueries(['classrooms']);
      toast.success(isEdit ? 'המורה עודכן בהצלחה!' : 'המורה נוצר בהצלחה!');
      onClose();
    } catch (error) {
      toast.error('שגיאה: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const activeClassrooms = classrooms.filter(c => c.is_active !== false);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-xl border border-border w-full max-w-md p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            {isEdit ? <><Edit className="w-5 h-5" /> עריכת מורה</> : <><Plus className="w-5 h-5" /> הוסף מורה חדש</>}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-accent rounded-lg" aria-label="סגור">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-1 block">שם מלא *</Label>
            <Input
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              required
            />
          </div>
          <div>
            <Label className="text-sm font-medium mb-1 block">אימייל</Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-sm font-medium mb-1 block">טלפון</Label>
            <Input
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-sm font-medium mb-1 block">מקצוע עיקרי</Label>
            <Input
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-sm font-medium mb-1 block">סגנון הוראה</Label>
            <Textarea
              value={formData.style_summary}
              onChange={(e) => setFormData({ ...formData, style_summary: e.target.value })}
              placeholder="תיאור קצר של סגנון ההוראה, גישה פדגוגית ונקודות למען שימת לב…"
              className="min-h-[80px] resize-y"
            />
          </div>
          <div>
            <Label className="text-sm font-medium mb-1.5 block">כיתות משויכות</Label>
            {activeClassrooms.length === 0 ? (
              <p className="text-xs text-muted-foreground">אין כיתות פעילות במערכת.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {activeClassrooms.map(c => {
                  const selected = selectedClassroomIds.includes(c.id);
                  return (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() => toggleClassroom(c.id)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors flex items-center gap-1 ${
                        selected
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-border text-muted-foreground hover:border-primary/40'
                      }`}
                    >
                      {selected && <Check className="w-3 h-3" />}
                      {c.name}{c.grade_level ? ` ${c.grade_level}` : ''}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div>
            <Label className="text-sm font-medium mb-1 block">סטטוס</Label>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
              className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
                formData.is_active
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-700 dark:text-emerald-400'
                  : 'bg-muted border-border text-muted-foreground'
              }`}
            >
              {formData.is_active ? '● פעיל' : '○ לא פעיל'}
            </button>
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving ? 'שומר...' : (isEdit ? 'שמור שינויים' : 'צור מורה')}
            </Button>
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              ביטול
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}