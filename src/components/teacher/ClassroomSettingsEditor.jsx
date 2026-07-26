import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function ClassroomSettingsEditor({ classroom, onUpdated }) {
  const [formData, setFormData] = useState({
    name: classroom?.name || '',
    grade_level: classroom?.grade_level || '',
    school: classroom?.school || '',
    year: classroom?.year || '',
    notes: classroom?.notes || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await base44.entities.Classroom.update(classroom.id, formData);
      toast.success('הגדרות הכיתה נשמרו בהצלחה');
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
          <Settings className="w-4 h-4 text-primary" />
          הגדרות כיתה
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">שם הכיתה</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs">שכבת גיל</Label>
              <Input
                value={formData.grade_level}
                onChange={(e) => setFormData({ ...formData, grade_level: e.target.value })}
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs">שם המוסד</Label>
              <Input
                value={formData.school}
                onChange={(e) => setFormData({ ...formData, school: e.target.value })}
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs">שנת לימודים</Label>
              <Input
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                className="h-9"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">הערות</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              className="resize-none"
            />
          </div>
          <Button type="submit" disabled={saving} className="gap-2">
            <Save className="w-4 h-4" /> {saving ? 'שומר...' : 'שמור שינויים'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}