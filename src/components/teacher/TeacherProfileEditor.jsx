import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function TeacherProfileEditor({ teacher, onUpdated }) {
  const [formData, setFormData] = useState({
    full_name: teacher?.full_name || '',
    email: teacher?.email || '',
    phone: teacher?.phone || '',
    subject: teacher?.subject || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await base44.entities.Teacher.update(teacher.id, formData);
      toast.success('הפרטים נשמרו בהצלחה');
      onUpdated?.();
    } catch (err) {
      toast.error('שגיאה בשמירה: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <User className="w-4 h-4 text-primary" />
          פרטי מורה
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">שם מלא</Label>
              <Input
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs">אימייל</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs">טלפון</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs">מקצוע עיקרי</Label>
              <Input
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="h-9"
              />
            </div>
          </div>
          <Button type="submit" disabled={saving} className="gap-2">
            <Save className="w-4 h-4" /> {saving ? 'שומר...' : 'שמור שינויים'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}