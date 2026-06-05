import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Star, CheckSquare, Square, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useQueryClient, useQuery } from '@tanstack/react-query';

const CRITERIA = [
  { id: 'all', label: '👥 כולם' },
  { id: 'excellent', label: '🌟 מצטיינים', filter: s => s.academic_level === 'excellent' || s.academic_level === 'above_average' },
  { id: 'struggling', label: '💪 זקוקים לעידוד', filter: s => (s.traits || []).includes('struggling') || (s.traits || []).includes('needs_encouragement') },
  { id: 'leaders', label: '🎖️ מנהיגים', filter: s => (s.traits || []).includes('leader') },
  { id: 'attentive', label: '🎯 קשובים', filter: s => (s.traits || []).includes('attentive') },
];

export default function BulkReward({ students, onDone }) {
  const qc = useQueryClient();
  const [activeCriterion, setActiveCriterion] = useState('all');
  const [selected, setSelected] = useState(new Set(students.map(s => s.id)));
  const [points, setPoints] = useState(1);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const QUICK_REASONS = ['השתתפות מצוינת', 'עבודה טובה', 'עזרה לחבר', 'שיפור ניכר', 'עמידה במשימה'];

  function applyCriterion(cid) {
    setActiveCriterion(cid);
    if (cid === 'all') {
      setSelected(new Set(students.map(s => s.id)));
    } else {
      const crit = CRITERIA.find(c => c.id === cid);
      if (crit?.filter) {
        setSelected(new Set(students.filter(crit.filter).map(s => s.id)));
      }
    }
  }

  function toggleAll() {
    if (selected.size === students.length) setSelected(new Set());
    else setSelected(new Set(students.map(s => s.id)));
  }

  function toggle(id) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function submit() {
    if (!reason.trim() || selected.size === 0) { toast.error('בחר תלמידים וסיבה'); return; }
    setLoading(true);
    const date = format(new Date(), 'yyyy-MM-dd');
    const records = [...selected].map(id => {
      const s = students.find(x => x.id === id);
      return { student_id: id, student_name: s?.name || '', points: Number(points), reason, date };
    });
    await base44.entities.Reward.bulkCreate(records);
    qc.invalidateQueries({ queryKey: ['rewards'] });
    toast.success(`✨ נקודות הוענקו ל-${selected.size} תלמידים!`);
    setLoading(false);
    onDone?.();
  }

  return (
    <div className="space-y-4">
      {/* Criteria selector */}
      <div>
        <p className="text-xs text-muted-foreground mb-1.5 font-medium flex items-center gap-1"><Filter className="w-3 h-3" /> בחר קריטריון:</p>
        <div className="flex flex-wrap gap-1.5">
          {CRITERIA.map(c => (
            <button key={c.id} onClick={() => applyCriterion(c.id)}
              className={`px-2.5 py-1 rounded-full text-xs border transition-all ${activeCriterion === c.id ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/40'}`}>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Points selector */}
      <div>
        <p className="text-xs text-muted-foreground mb-1.5 font-medium">נקודות לכל תלמיד:</p>
        <div className="flex gap-1.5">
          {[1, 2, 3, 5, 10].map(p => (
            <button key={p} onClick={() => setPoints(p)}
              className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-all ${points === p ? 'bg-primary text-primary-foreground border-primary' : 'border-border bg-card hover:border-primary/40'}`}>
              +{p}
            </button>
          ))}
        </div>
      </div>

      {/* Reason */}
      <div>
        <p className="text-xs text-muted-foreground mb-1.5 font-medium">סיבה:</p>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {QUICK_REASONS.map(r => (
            <button key={r} onClick={() => setReason(r)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${reason === r ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/40'}`}>
              {r}
            </button>
          ))}
        </div>
        <Input placeholder="סיבה מותאמת..." value={reason} onChange={e => setReason(e.target.value)} className="h-8 text-sm" />
      </div>

      {/* Student selection */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-muted-foreground font-medium">בחר תלמידים ({selected.size}/{students.length}):</p>
          <button onClick={toggleAll} className="text-xs text-primary flex items-center gap-1">
            {selected.size === students.length ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
            {selected.size === students.length ? 'בטל הכל' : 'בחר הכל'}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
          {students.map(s => (
            <button key={s.id} onClick={() => toggle(s.id)}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs text-right border transition-all ${selected.has(s.id) ? 'bg-primary/10 border-primary/40 text-primary' : 'bg-card border-border text-muted-foreground'}`}>
              <div className={`w-4 h-4 rounded flex items-center justify-center border ${selected.has(s.id) ? 'bg-primary border-primary' : 'border-border'}`}>
                {selected.has(s.id) && <span className="text-white text-[9px]">✓</span>}
              </div>
              <span className="truncate">{s.name}</span>
            </button>
          ))}
        </div>
      </div>

      <Button className="w-full gap-1.5" onClick={submit} disabled={loading || !reason || selected.size === 0}>
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4" />}
        הענק ל-{selected.size} תלמידים
      </Button>
    </div>
  );
}