import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Trash2, Settings, LogOut } from 'lucide-react';
import { toast } from 'sonner';

export default function TeacherAccountSettings({ teacher, onLogout }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDeactivate = async () => {
    setDeleting(true);
    try {
      await base44.entities.Teacher.update(teacher.id, { is_active: false });
      toast.success('החשבון הושבת בהצלחה');
      sessionStorage.removeItem('classflow_teacher_id');
      sessionStorage.removeItem('classflow_teacher_name');
      sessionStorage.removeItem('classflow_user_role');
      navigate('/teacher-login');
    } catch (error) {
      toast.error('שגיאה בהשבתת החשבון');
    } finally {
      setDeleting(false);
      setConfirmOpen(false);
      setOpen(false);
    }
  };

  return (
    <>
      <Button variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label="הגדרות חשבון">
        <Settings className="w-5 h-5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" /> הגדרות חשבון
            </DialogTitle>
            <DialogDescription>נהל את חשבון המורה שלך</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="font-medium text-sm">{teacher.full_name}</p>
                <p className="text-xs text-muted-foreground">{teacher.email || 'מורה פעיל'}</p>
              </div>
            </div>

            <Button variant="outline" className="w-full gap-2" onClick={onLogout}>
              <LogOut className="w-4 h-4" /> התנתקות
            </Button>

            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <p className="text-sm font-medium text-destructive mb-1">השבתת חשבון</p>
              <p className="text-xs text-muted-foreground mb-3">
                השבתת החשבון תסיר את הגישה שלך למערכת. ניתן לפנות למנהל המערכת לשחזור הגישה.
              </p>
              <Button
                variant="destructive"
                size="sm"
                className="w-full gap-2"
                onClick={() => setConfirmOpen(true)}
              >
                <Trash2 className="w-4 h-4" /> בקשת השבתת חשבון
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>האם אתה בטוח?</AlertDialogTitle>
            <AlertDialogDescription>
              פעולה זו תשבית את חשבון המורה שלך ותסיר את הגישה למערכת. לא ניתן לבטל פעולה זו ללא פנייה למנהל המערכת.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeactivate}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'משבית...' : 'השבת חשבון'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}