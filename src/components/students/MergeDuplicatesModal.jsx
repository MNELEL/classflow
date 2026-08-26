import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Merge, AlertTriangle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { MobileSelect, SelectItem } from '@/components/ui/MobileSelect';
import { CUSTOM_FIELD_LABELS } from './StudentCustomFields';

function normName(n) { return (n || '').trim().toLowerCase().replace(/[^א-תa-z0-9]/g, ''); }
const ID_KEYS = ['id_number'];

function findGroups(students) {
  const parent = students.map((_, i) => i);
  const find = (x) => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
  const union = (a, b) => { parent[find(a)] = find(b); };
  const byName = {};
  students.forEach((s, i) => { const k = normName(s.name); if (k) { (byName[k] ||= []).push(i); } });
  Object.values(byName).forEach(idxs => { for (let j = 1; j < idxs.length; j++) union(idxs[0], idxs[j]); });
  ID_KEYS.forEach(key => {
    const byId = {};
    students.forEach((s, i) => { const v = s.custom_fields?.[key]; if (v && String(v).trim()) { const k = String(v).trim(); (byId[k] ||= []).push(i); } });
    Object.values(byId).forEach(idxs => { for (let j = 1; j < idxs.length; j++) union(idxs[0], idxs[j]); });
  });
  const groups = {};
  students.forEach((_, i) => { const r = find(i); (groups[r] ||= []).push(i); });
  return Object.values(groups).filter(g => g.length > 1).map(g => g.map(i => students[i]));
}

function fieldCount(s) { return s.custom_fields ? Object.keys(s.custom_fields).filter(k => s.custom_fields[k]).length : 0; }

export default function MergeDuplicatesModal({ open, onClose, students, onMerged }) {
  const groups = useMemo(() => findGroups(students || []), [students]);
  const [mode, setMode] = useState('auto'); // 'auto' | 'manual'
  const [keepByGroup, setKeepByGroup] = useState({});
  const [busy, setBusy] = useState(false);
  const [mergedGroups, setMergedGroups] = useState(new Set());
  const [manualKeep, setManualKeep] = useState('');
  const [manualOther, setManualOther] = useState('');

  const active = students.filter(s => s.is_active !== false);
  const activeGroups = groups.map((g, i) => ({ g, i })).filter(({ i }) => !mergedGroups.has(i));

  async function doMerge(g, keepId, gi) {
    const removeIds = g.filter(s => s.id !== keepId).map(s => s.id);
    if (!removeIds.length) return;
    setBusy(true);
    try {
      await base44.functions.invoke('mergeStudents', { keep_id: keepId, remove_ids: removeIds });
      toast.success(`מוזגו ${removeIds.length} רשומות לתלמיד אחד`);
      setMergedGroups(prev => new Set(prev).add(gi));
      onMerged?.();
    } catch (e) {
      toast.error('מיזוג נכשל — ' + (e?.message || ''));
    } finally {
      setBusy(false);
    }
  }

  async function doManualMerge() {
    if (!manualKeep || !manualOther) { toast.error('בחר שני תלמידים'); return; }
    if (manualKeep === manualOther) { toast.error('בחר שני תלמידים שונים'); return; }
    setBusy(true);
    try {
      await base44.functions.invoke('mergeStudents', { keep_id: manualKeep, remove_ids: [manualOther] });
      toast.success('התלמידים מוזגו לכרטיס אחד');
      setManualKeep(''); setManualOther('');
      onMerged?.();
    } catch (e) {
      toast.error('מיזוג נכשל — ' + (e?.message || ''));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-[95vw] sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Merge className="w-5 h-5 text-amber-600" /> מיזוג תלמידים</DialogTitle>
        </DialogHeader>

        {/* Mode toggle */}
        <div className="flex gap-1 bg-muted/50 rounded-lg p-1">
          <button onClick={() => setMode('auto')} className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all ${mode === 'auto' ? 'bg-card shadow text-foreground' : 'text-muted-foreground'}`}>כפילויות מזוהות</button>
          <button onClick={() => setMode('manual')} className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all ${mode === 'manual' ? 'bg-card shadow text-foreground' : 'text-muted-foreground'}`}>מיזוג ידני</button>
        </div>

        {mode === 'manual' ? (
          <div className="space-y-3">
            <p className="text-[11px] text-muted-foreground">בחר שני תלמידים כלשהם. התלמיד הראשון נשמר ככרטיס המאוחד, והשני ממוזג אליו ונמחק — כל הנתונים (ציונים, נוכחות, פרטים אישיים וכו') עוברים לכרטיס המאוחד.</p>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">תלמיד שנשמר (הכרטיס המאוחד)</label>
              <MobileSelect value={manualKeep} onValueChange={setManualKeep} placeholder="בחר תלמיד…" className="h-9 text-sm w-full">
                <SelectItem value={null}>בחר תלמיד…</SelectItem>
                {active.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </MobileSelect>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">תלמיד שימוזג וימחק</label>
              <MobileSelect value={manualOther} onValueChange={setManualOther} placeholder="בחר תלמיד…" className="h-9 text-sm w-full">
                <SelectItem value={null}>בחר תלמיד…</SelectItem>
                {active.filter(s => s.id !== manualKeep).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </MobileSelect>
            </div>
            <Button size="sm" className="w-full h-9" disabled={busy || !manualKeep || !manualOther} onClick={doManualMerge}>
              <Merge className="w-4 h-4 ml-1" /> מזג לכרטיס אחד
            </Button>
          </div>
        ) : (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {activeGroups.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">לא זוהו כפילויות. עבור ל"מיזוג ידני" כדי למזג שני תלמידים כלשהם.</p>
            ) : (
              <>
                <div className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50/60 dark:bg-amber-900/15 rounded-lg p-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>זוהו {activeGroups.length} קבוצות כפולות (לפי שם או תעודת זהות). בחר איזה תלמיד לשמור — כל הנתונים ימוזגו אליו והשאר יימחקו.</span>
                </div>
                {activeGroups.map(({ g, i }) => {
                  const keepId = keepByGroup[i] || (g.slice().sort((a, b) => fieldCount(b) - fieldCount(a))[0]?.id) || g[0].id;
                  return (
                    <div key={i} className="border border-amber-300/50 dark:border-amber-700/40 rounded-lg p-2 bg-amber-50/30 dark:bg-amber-900/10">
                      <div className="space-y-1.5">
                        {g.map(s => (
                          <label key={s.id} className={`flex items-start gap-2 rounded-lg px-2 py-1.5 cursor-pointer border ${keepId === s.id ? 'border-primary bg-primary/5' : 'border-transparent'}`}>
                            <input type="radio" name={`group-${i}`} checked={keepId === s.id} onChange={() => setKeepByGroup(p => ({ ...p, [i]: s.id }))} className="mt-1" />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold">{s.name}</div>
                              {s.custom_fields && (
                                <div className="text-[10px] text-muted-foreground flex flex-wrap gap-x-2">
                                  {Object.keys(s.custom_fields).filter(k => s.custom_fields[k]).slice(0, 4).map(k => (
                                    <span key={k}>{CUSTOM_FIELD_LABELS[k] || k}: {String(s.custom_fields[k]).slice(0, 16)}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </label>
                        ))}
                      </div>
                      <Button size="sm" className="w-full mt-2 h-8" disabled={busy} onClick={() => doMerge(g, keepId, i)}>
                        <Merge className="w-3.5 h-3.5 ml-1" /> מזג לתלמיד אחד
                      </Button>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>סגור</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}