import React, { useMemo, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Merge, AlertTriangle, UserPlus, RefreshCw } from 'lucide-react';

const SCALAR = ['name', 'gender', 'height', 'row_preference', 'side_preference', 'academic_level', 'learning_group', 'group', 'notes'];

function mergeRows(rows) {
  const merged = { is_active: true, custom_fields: {}, _checked: true };
  SCALAR.forEach(f => { for (const r of rows) { if (r[f]) { merged[f] = r[f]; break; } } });
  const sn = new Set();
  rows.forEach(r => (r.special_needs || []).forEach(v => sn.add(v)));
  if (sn.size) merged.special_needs = [...sn];
  const cf = {};
  rows.forEach(r => Object.keys(r.custom_fields || {}).forEach(k => { const v = r.custom_fields[k]; if (v && !(k in cf)) cf[k] = v; }));
  if (Object.keys(cf).length) merged.custom_fields = cf;
  const ex = rows.find(r => r._existing);
  if (ex) merged._existing = ex._existing;
  return merged;
}

export default function DuplicateMergeModal({ open, group, onClose, onMerge }) {
  const merged = useMemo(() => group ? mergeRows(group.map(g => g.row)) : null, [group]);
  const [name, setName] = useState('');
  useEffect(() => { if (merged) setName(merged.name || ''); }, [merged]);

  if (!group || !merged) return null;
  const cf = merged.custom_fields || {};

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-[95vw] sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Merge className="w-5 h-5 text-amber-600" /> מיזוג כפילויות לכרטיס אחד
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50/60 dark:bg-amber-900/15 rounded-lg p-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>זוהו <b>{group.length}</b> רשומות לאותו תלמיד. הכרטיס הממוזג יכלול את כל הפרטים מכל הרשומות. יש לאשר את המיזוג ידנית.</span>
          </div>

          <div>
            <p className="text-[11px] font-semibold text-muted-foreground mb-1">רשומות שזוהו:</p>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {group.map((item) => (
                <div key={item.index} className="text-xs bg-muted/40 rounded px-2 py-1 flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold">{item.row.name}</span>
                  {item.row._existing && <span className="text-[10px] text-blue-600">• קיים במערכת</span>}
                  {item.row.custom_fields && Object.keys(item.row.custom_fields).length > 0 && (
                    <span className="text-[10px] text-muted-foreground">• {Object.keys(item.row.custom_fields).join(', ')}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-border pt-2">
            <p className="text-[11px] font-semibold text-muted-foreground mb-1.5">תצוגת הכרטיס הממוזג:</p>
            <div className="flex items-center gap-1.5 mb-2">
              {merged._existing ? (
                <span className="text-[10px] inline-flex items-center gap-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 rounded-full px-1.5 py-0.5"><RefreshCw className="w-2.5 h-2.5" /> יעדכן תלמיד קיים</span>
              ) : (
                <span className="text-[10px] inline-flex items-center gap-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 rounded-full px-1.5 py-0.5"><UserPlus className="w-2.5 h-2.5" /> ייווצר תלמיד חדש</span>
              )}
            </div>
            <label className="text-xs text-muted-foreground">שם התלמיד</label>
            <Input value={name} onChange={e => setName(e.target.value)} className="mt-1" />
            {Object.keys(cf).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {Object.keys(cf).map(k => (
                  <span key={k} className="text-[10px] bg-muted/50 rounded-full px-1.5 py-0.5">{k}: {String(cf[k]).slice(0, 24)}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-row-reverse gap-2">
          <Button onClick={() => onMerge({ ...merged, name: (name || '').trim() || merged.name })}>אשר מיזוג</Button>
          <Button variant="outline" onClick={onClose}>בטל</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}