import React, { useCallback, useRef, useState } from 'react';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/alert-dialog';

/**
 * מחליף את window.confirm() הילידי בדיאלוג מותאם RTL, עקבי עם שאר האפליקציה.
 *
 * שימוש:
 *   const { confirm, ConfirmDialog } = useConfirmDialog();
 *   ...
 *   if (!(await confirm({ title: 'למחוק?', description: 'הפעולה בלתי הפיכה.' }))) return;
 *   ...
 *   return <>{ConfirmDialog}...</>;
 */
export function useConfirmDialog() {
  const [state, setState] = useState(null); // { title, description, confirmLabel, cancelLabel, destructive }
  const resolveRef = useRef(null);

  const confirm = useCallback((options = {}) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setState({
        title: options.title || 'לאשר פעולה?',
        description: options.description || '',
        confirmLabel: options.confirmLabel || 'אישור',
        cancelLabel: options.cancelLabel || 'ביטול',
        destructive: options.destructive !== false,
      });
    });
  }, []);

  function handleOpenChange(open) {
    if (!open) {
      resolveRef.current?.(false);
      setState(null);
    }
  }

  function handleConfirm() {
    resolveRef.current?.(true);
    setState(null);
  }

  const ConfirmDialog = (
    <AlertDialog open={!!state} onOpenChange={handleOpenChange}>
      <AlertDialogContent dir="rtl">
        <AlertDialogHeader>
          <AlertDialogTitle>{state?.title}</AlertDialogTitle>
          {state?.description && (
            <AlertDialogDescription>{state.description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-row-reverse gap-2 sm:gap-0">
          <AlertDialogCancel>{state?.cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className={state?.destructive ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
          >
            {state?.confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { confirm, ConfirmDialog };
}
