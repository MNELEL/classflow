import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2, Users, Shuffle, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const STORAGE_KEY = 'classmanager_groups';

export function loadGroups() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}

export function saveGroups(groups) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(groups)); } catch {}
}

const GROUP_TYPES = [
  { value: 'together', label: '🤝 לישיבה יחד', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  { value: 'separate', label: '↔️ לישיבה רחוק', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' },
  { value: 'task', label: '📋 קבוצת משימה', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
];

export function getGroupTypeColor(type) {
  return GROUP_TYPES.find(t => t.value === type)?.color || 'bg-muted text-muted-foreground';
}
export function getGroupTypeLabel(type) {
  return GROUP_TYPES.find(t => t.value === type)?.label || type;
}

// ── Random group generator ──────────────────────────────────────────────────
function RandomGroupGen({ students, onGroupsGenerated }) {
  const [groupSize, setGroupSize] = useState(3);
  const [method, setMethod] = useState('random'); // random | level | gender
  const [result, setResult] = useState([]);
  const [open, setOpen] = useState(false);

  function generate() {
    let pool = [...students];

    if (method === 'level') {
      // Mix levels: sort by academic_level then interleave
      const ORDER = { weak: 0, below_average: 1, average: 2, above_average: 3, strong: 4, excellent: 5 };
      pool.sort((a, b) => (ORDER[a.academic_level] || 2) - (ORDER[b.academic_level] || 2));
      // Interleave strong with weak
      const strong = pool.filter((_, i) => i >= Math.floor(pool.length / 2));
      const weak = pool.filter((_, i) => i < Math.floor(pool.length / 2));
      pool = [];
      const max = Math.max(strong.length, weak.length);
      for (let i = 0; i < max; i++) {
        if (strong[i]) pool.push(strong[i]);
        if (weak[i]) pool.push(weak[i]);
      }
    } else if (method === 'gender') {
      // Alternate genders
      const males = pool.filter(s => s.gender === 'male').sort(() => Math.random() - 0.5);
      const females = pool.filter(s => s.gender === 'female').sort(() => Math.random() - 0.5);
      const other = pool.filter(s => s.gender !== 'male' && s.gender !== 'female').sort(() => Math.random() - 0.5);
      pool = [];
      const max = Math.max(males.length, females.length);
      for (let i = 0; i < max; i++) {
        if (males[i]) pool.push(males[i]);
        if (females[i]) pool.push(females[i]);
      }
      pool = [...pool, ...other];
    } else {
      pool = pool.sort(() => Math.random() - 0.5);
    }

    const groups = [];
    for (let i = 0; i < pool.length; i += groupSize) {
      groups.push({ label: `קבוצה ${groups.length + 1}`, members: pool.slice(i, i + groupSize) });
    }
    setResult(groups);
    toast.success(`נוצרו ${groups.length} קבוצות`);
  }

  return (
    <div className="bg-muted/30 rounded-xl border border-border/60">
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between px-3 py-2.5">
        <span className="text-sm font-semibold flex items-center gap-2"><Shuffle className="w-4 h-4 text-primary" /> מחולל קבוצות אקראי</span>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden">
            <div className="px-3 pb-3 space-y-3 border-t border-border/40 pt-3">
              {/* Method */}
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">שיטת חלוקה:</p>
                <div className="flex gap-1.5">
                  {[['random','🎲 אקראי'], ['level','📊 מעורב רמות'], ['gender','⚥ מעורב מגדר']].map(([v, l]) => (
                    <button key={v} onClick={() => setMethod(v)}
                      className={`flex-1 text-xs py-1.5 rounded-lg border transition-colors ${method === v ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/40'}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Group size */}
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">גודל קבוצה:</p>
                <div className="flex gap-1.5">
                  {[2,3,4,5,6].map(n => (
                    <button key={n} onClick={() => setGroupSize(n)}
                      className={`w-9 h-8 rounded-lg border text-sm font-medium transition-all ${groupSize === n ? 'bg-primary text-primary-foreground border-primary' : 'border-border'}`}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <Button size="sm" className="w-full gap-1" onClick={generate} disabled={students.length === 0}>
                <Shuffle className="w-3.5 h-3.5" /> צור קבוצות
              </Button>

              {/* Result */}
              {result.length > 0 && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    {result.map((g, i) => (
                      <div key={i} className="bg-card border border-border rounded-xl p-2.5">
                        <p className="text-xs font-bold text-muted-foreground mb-1.5">{g.label}</p>
                        {g.members.map(s => (
                          <p key={s.id} className="text-xs truncate">{s.name}</p>
                        ))}
                      </div>
                    ))}
                  </div>
                  <Button size="sm" variant="outline" className="w-full text-xs" onClick={generate}>
                    <Shuffle className="w-3 h-3 ml-1" /> ערבב מחדש
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────
export default function GroupsManager({ open, onClose, students }) {
  const [groups, setGroups] = useState(loadGroups);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('together');

  function addGroup() {
    if (!newName.trim()) return;
    const updated = [...groups, { id: Date.now().toString(), name: newName.trim(), type: newType }];
    setGroups(updated);
    saveGroups(updated);
    setNewName('');
  }

  function deleteGroup(id) {
    const updated = groups.filter(g => g.id !== id);
    setGroups(updated);
    saveGroups(updated);
  }

  function getMemberCount(groupName) {
    return students.filter(s => s.learning_group === groupName || s.group === groupName).length;
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" /> ניהול קבוצות
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Random generator */}
          <RandomGroupGen students={students} />

          {/* Add named group */}
          <div className="bg-muted/40 rounded-xl p-3 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">קבוצה קבועה חדשה</p>
            <Input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="שם הקבוצה..."
              onKeyDown={e => e.key === 'Enter' && addGroup()}
            />
            <div className="flex flex-wrap gap-1.5">
              {GROUP_TYPES.map(t => (
                <button key={t.value} onClick={() => setNewType(t.value)}
                  className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${newType === t.value ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border hover:border-primary/40'}`}>
                  {t.label}
                </button>
              ))}
            </div>
            <Button onClick={addGroup} size="sm" className="w-full" disabled={!newName.trim()}>
              <Plus className="w-4 h-4 ml-1" /> הוסף קבוצה
            </Button>
          </div>

          {/* Groups list */}
          {groups.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-20" />
              אין קבוצות קבועות עדיין
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">קבוצות קבועות ({groups.length})</p>
              {groups.map(g => (
                <div key={g.id} className="flex items-center justify-between bg-card border border-border rounded-xl px-3 py-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <div>
                      <p className="font-medium text-sm truncate">{g.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${getGroupTypeColor(g.type)}`}>
                          {getGroupTypeLabel(g.type)}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{getMemberCount(g.name)} תלמידים</span>
                      </div>
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive/60 hover:text-destructive shrink-0" onClick={() => deleteGroup(g.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <p className="text-[11px] text-muted-foreground text-center bg-muted/30 rounded-lg p-2">
            💡 שייך תלמידים לקבוצות דרך טופס עריכת התלמיד (שדה "קבוצת למידה")
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}