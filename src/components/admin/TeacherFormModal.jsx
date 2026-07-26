import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Edit } from 'lucide-react';
import { toast } from 'sonner';

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
    full_name: '', email: '', phone: '', subject: '', classroom_id: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (teacher) {
      const classroom = classrooms.find(c => c.teacher_id === teacher.id);
      setFormData({
        full_name: teacher.full_name || '',
        email: teacher.email || '',
        phone: teacher.phone || '',
        subject: teacher.subject || '',
        classroom_id: classroom?.id || '',
      });
    } else {
      setFormData({ full_name: '', email: '', phone: '', subject: '', classroom_id: '' });
    }
  }, [teacher, classrooms]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      let teacherId = teacher?.id;

      if (isEdit) {
        await base44.entities.Teacher.update(teacher.id, {
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone,
          subject: formData.subject,
        });
      } else {
        const newTeacher = await base44.entities.Teacher.create({
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone,
          subject: formData.subject,
          access_code: generateAccessCode(),
          is_active: true,
        });
        teacherId = newTeacher.id;
      }

      // Handle classroom assignment
      const oldClassroom = classrooms.find(c => c.teacher_id === teacherId);
      const newClassroomId = formData.classroom_id;

      if (oldClassroom && oldClassroom.id !== newClassroomId) {
        await base44.entities.Classroom.update(oldClassroom.id, {
          teacher_id: '',
          teacher_name: '',
        });
      }
      if (newClassroomId && (!oldClassroom || oldClassroom.id !== newClassroomId)) {
        await base44.entities.Classroom.update(newClassroomId, {
          teacher_id: teacherId,
          teacher_name: formData.full_name,
        });
      }

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

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl border border-border w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          {isEdit ? <><Edit className="w-5 h-5" /> עריכת מורה</> : <><Plus className="w-5 h-5" /> הוסף מורה חדש</>}
        </h2>
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
            <Label className="text-sm font-medium mb-1 block">כיתה משויכת</Label>
            <select
              value={formData.classroom_id}
              onChange={(e) => setFormData({ ...formData, classroom_id: e.target.value })}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              <option value="">ללא כיתה</option>
              {classrooms.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.grade_level ? `(${c.grade_level})` : ''}
                </option>
              ))}
            </select>
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