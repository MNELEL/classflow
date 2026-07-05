import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import AppLayout from '@/components/layout/AppLayout';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Square, RotateCcw, Users, Shuffle, Clock, ChevronDown, ChevronUp, Music, Eye } from 'lucide-react';
import { toast } from 'sonner';
import FlashCards from '@/components/toolkit/FlashCards';
import NoiseMeter from '@/components/toolkit/NoiseMeter';
import ExitTicket from '@/components/toolkit/ExitTicket';
import RandomWordBoard from '@/components/toolkit/RandomWordBoard';

// ────── NAME WHEEL ──────
function NameWheel({ students }) {
  const canvasRef = useRef(null);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState(null);
  const [rotation, setRotation] = useState(0);
  const angleRef = useRef(0);
  const animRef = useRef(null);

  const names = students.map(s => s.name);
  const colors = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#f97316','#14b8a6'];

  useEffect(() => {
    if (!canvasRef.current || names.length === 0) return;
    drawWheel(canvasRef.current, names, colors, angleRef.current);
  }, [names]);

  function drawWheel(canvas, names, colors, angle) {
    const ctx = canvas.getContext('2d');
    const cx = canvas.width / 2, cy = canvas.height / 2, r = cx - 10;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const slice = (Math.PI * 2) / names.length;
    names.forEach((name, i) => {
      const start = angle + i * slice, end = start + slice;
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, start, end);
      ctx.fillStyle = colors[i % colors.length]; ctx.fill();
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(start + slice / 2);
      ctx.textAlign = 'right'; ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.min(14, 80 / names.length)}px Heebo`;
      ctx.fillText(name.slice(0, 10), r - 8, 5);
      ctx.restore();
    });
    // Center circle
    ctx.beginPath(); ctx.arc(cx, cy, 18, 0, Math.PI * 2);
    ctx.fillStyle = '#1e1b4b'; ctx.fill();
    // Arrow
    ctx.beginPath(); ctx.moveTo(cx + r - 5, cy);
    ctx.lineTo(cx + r + 15, cy - 8); ctx.lineTo(cx + r + 15, cy + 8);
    ctx.fillStyle = '#f59e0b'; ctx.fill();
  }

  function spin() {
    if (spinning || names.length === 0) return;
    setSpinning(true); setWinner(null);
    const extra = Math.PI * 2 * (8 + Math.random() * 6);
    const duration = 3500;
    const start = performance.now();
    const startAngle = angleRef.current;

    function frame(now) {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - t, 4);
      const cur = startAngle + extra * ease;
      angleRef.current = cur;
      drawWheel(canvasRef.current, names, colors, cur);
      if (t < 1) { animRef.current = requestAnimationFrame(frame); }
      else {
        const slice = (Math.PI * 2) / names.length;
        const norm = ((cur % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        const idx = Math.floor(((Math.PI * 2 - norm) / slice)) % names.length;
        setWinner(names[idx]); setSpinning(false);
      }
    }
    animRef.current = requestAnimationFrame(frame);
  }

  return (
    <div className="bg-card border border-border/70 rounded-2xl p-4">
      <h3 className="font-bold text-sm mb-3 flex items-center gap-2">🎡 גלגל השמות</h3>
      {names.length === 0 ? <p className="text-xs text-muted-foreground">אין תלמידים</p> : (
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <canvas ref={canvasRef} width={220} height={220}
              onLoad={() => drawWheel(canvasRef.current, names, colors, 0)} />
          </div>
          {winner && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
              className="text-center bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-xl px-6 py-3">
              <p className="text-2xl mb-1">🎉</p>
              <p className="font-black text-lg text-yellow-700 dark:text-yellow-400">{winner}</p>
            </motion.div>
          )}
          <div className="flex gap-2">
            <Button size="sm" onClick={spin} disabled={spinning} className="gap-1">
              <Play className="w-3.5 h-3.5" /> {spinning ? 'מסתובב...' : 'סובב!'}
            </Button>
            <Button size="sm" variant="outline" aria-label="אפס גלגל" onClick={() => { setWinner(null); angleRef.current = 0; drawWheel(canvasRef.current, names, colors, 0); }}>
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ────── GROUP GENERATOR ──────
function GroupGenerator({ students }) {
  const [mode, setMode] = useState('bySize'); // bySize | byCount
  const [groupSize, setGroupSize] = useState(3);
  const [groupCount, setGroupCount] = useState(4);
  const [groups, setGroups] = useState([]);

  const maxGroups = Math.max(2, students.length);
  const savedGroupCount = (() => {
    try { return JSON.parse(localStorage.getItem('classmanager_groups') || '[]').length; } catch { return 0; }
  })();

  function generate() {
    const shuffled = [...students].sort(() => Math.random() - 0.5);
    const result = [];
    if (mode === 'bySize') {
      for (let i = 0; i < shuffled.length; i += groupSize) result.push(shuffled.slice(i, i + groupSize));
    } else {
      // byCount — divide evenly
      const count = mode === 'byExisting' ? savedGroupCount : groupCount;
      for (let i = 0; i < count; i++) {
        result.push(shuffled.filter((_, idx) => idx % count === i));
      }
    }
    setGroups(result);
    toast.success(`נוצרו ${result.length} קבוצות`);
  }

  return (
    <div className="bg-card border border-border/70 rounded-2xl p-4">
      <h3 className="font-bold text-sm mb-3 flex items-center gap-2"><Users className="w-4 h-4" /> מחולל קבוצות</h3>

      {/* Mode toggle */}
      <div className="flex gap-1 bg-muted/50 rounded-lg p-1 mb-3">
        <button onClick={() => setMode('bySize')}
          className={`flex-1 py-1 rounded-md text-xs font-medium transition-all ${mode === 'bySize' ? 'bg-card shadow text-foreground' : 'text-muted-foreground'}`}>
          לפי גודל קבוצה
        </button>
        <button onClick={() => setMode('byCount')}
          className={`flex-1 py-1 rounded-md text-xs font-medium transition-all ${mode === 'byCount' ? 'bg-card shadow text-foreground' : 'text-muted-foreground'}`}>
          לפי מספר קבוצות
        </button>
      </div>

      {mode === 'bySize' ? (
        <div className="flex items-center gap-2 mb-3">
          <label className="text-xs text-muted-foreground shrink-0">תלמידים בקבוצה:</label>
          <div className="flex gap-1">
            {[2,3,4,5,6].map(n => (
              <button key={n} onClick={() => setGroupSize(n)}
                className={`w-8 h-7 rounded-lg border text-xs font-medium transition-all ${groupSize === n ? 'bg-primary text-primary-foreground border-primary' : 'border-border'}`}>
                {n}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 mb-3">
          <label className="text-xs text-muted-foreground shrink-0">מספר קבוצות:</label>
          <div className="flex gap-1 flex-wrap">
            {[2,3,4,5,6,7,8].map(n => (
              <button key={n} onClick={() => setGroupCount(n)}
                className={`w-8 h-7 rounded-lg border text-xs font-medium transition-all ${groupCount === n ? 'bg-primary text-primary-foreground border-primary' : 'border-border'}`}>
                {n}
              </button>
            ))}
            {savedGroupCount > 0 && (
              <button onClick={() => { setGroupCount(savedGroupCount); }}
                className={`px-2 h-7 rounded-lg border text-xs font-medium transition-all ${groupCount === savedGroupCount ? 'bg-primary text-primary-foreground border-primary' : 'border-dashed border-primary/50 text-primary'}`}>
                {savedGroupCount} קבועות
              </button>
            )}
          </div>
        </div>
      )}

      <Button size="sm" className="w-full gap-1 mb-3" onClick={generate} disabled={students.length === 0}>
        <Shuffle className="w-3.5 h-3.5" /> צור קבוצות אקראיות
      </Button>
      {students.length > 0 && (
        <p className="text-[10px] text-muted-foreground text-center mb-2">
          {mode === 'bySize'
            ? `${students.length} תלמידים ÷ ${groupSize} = ~${Math.ceil(students.length / groupSize)} קבוצות`
            : `${students.length} תלמידים ÷ ${groupCount} קבוצות = ~${Math.ceil(students.length / groupCount)} לכל קבוצה`}
        </p>
      )}
      {groups.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {groups.map((g, i) => (
            <div key={i} className="bg-muted/40 rounded-xl p-2.5">
              <p className="text-xs font-bold text-muted-foreground mb-1.5">קבוצה {i + 1} ({g.length})</p>
              {g.map(s => <p key={s.id} className="text-xs">{s.name}</p>)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ────── COUNTDOWN TIMER ──────
function CountdownTimer() {
  const [minutes, setMinutes] = useState(5);
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [remaining, setRemaining] = useState(null);
  const intervalRef = useRef(null);

  function start() {
    const total = minutes * 60 + seconds;
    if (total <= 0) return;
    setRemaining(total);
    setRunning(true);
  }

  useEffect(() => {
    if (running && remaining !== null) {
      intervalRef.current = setInterval(() => {
        setRemaining(r => {
          if (r <= 1) { clearInterval(intervalRef.current); setRunning(false); toast.success('⏰ הזמן הסתיים!'); return 0; }
          return r - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [running]);

  function stop() { clearInterval(intervalRef.current); setRunning(false); }
  function reset() { stop(); setRemaining(null); }

  const display = remaining !== null ? remaining : minutes * 60 + seconds;
  const mm = String(Math.floor(display / 60)).padStart(2, '0');
  const ss = String(display % 60).padStart(2, '0');
  const pct = remaining !== null ? (remaining / (minutes * 60 + seconds)) * 100 : 100;

  return (
    <div className="bg-card border border-border/70 rounded-2xl p-4">
      <h3 className="font-bold text-sm mb-3 flex items-center gap-2"><Clock className="w-4 h-4" /> טיימר ספירה לאחור</h3>
      <div className="flex flex-col items-center gap-3">
        <div className="relative w-28 h-28">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="44" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
            <circle cx="50" cy="50" r="44" fill="none" stroke="hsl(var(--primary))" strokeWidth="8"
              strokeDasharray={`${2 * Math.PI * 44}`}
              strokeDashoffset={`${2 * Math.PI * 44 * (1 - pct / 100)}`}
              className="transition-all duration-1000" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-black text-2xl tabular-nums">{mm}:{ss}</span>
          </div>
        </div>
        {!running && remaining === null && (
          <div className="flex gap-2 items-center">
            <button onClick={() => setMinutes(m => Math.max(0, m - 1))} aria-label="הפחת דקות"><ChevronDown className="w-4 h-4" /></button>
            <span className="text-sm font-medium w-12 text-center">{minutes} דקות</span>
            <button onClick={() => setMinutes(m => m + 1)} aria-label="הוסף דקות"><ChevronUp className="w-4 h-4" /></button>
          </div>
        )}
        <div className="flex gap-2">
          {!running ? (
            <Button size="sm" onClick={start} className="gap-1"><Play className="w-3.5 h-3.5" /> התחל</Button>
          ) : (
            <Button size="sm" variant="outline" onClick={stop} className="gap-1"><Square className="w-3.5 h-3.5" /> עצור</Button>
          )}
          <Button size="sm" variant="ghost" aria-label="אפס טיימר" onClick={reset}><RotateCcw className="w-3.5 h-3.5" /></Button>
        </div>
      </div>
    </div>
  );
}

// ────── PAGE ──────
export default function ToolkitPage() {
  const navigate = useNavigate();
  const { data: students = [] } = useQuery({
    queryKey: ['students'],
    queryFn: () => base44.entities.Student.filter({ is_active: true }),
  });

  return (
    <AppLayout>
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-9 h-9 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center text-xl">🔧</div>
          <h1 className="font-bold text-base">ארגז כלים</h1>
        </div>
        
        {/* Quick links to new pages */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            className="gap-2 h-auto py-3"
            onClick={() => navigate('/sound-board')}
          >
            <Music className="w-5 h-5 text-purple-600" />
            <div className="text-right">
              <p className="text-xs font-bold">ניהול סאונד</p>
              <p className="text-[10px] text-muted-foreground">צלילים והישגים</p>
            </div>
          </Button>
          <Button
            variant="outline"
            className="gap-2 h-auto py-3"
            onClick={() => navigate('/student-view')}
          >
            <Eye className="w-5 h-5 text-green-600" />
            <div className="text-right">
              <p className="text-xs font-bold">תצוגת תלמידים</p>
              <p className="text-[10px] text-muted-foreground">להקרנה בכיתה</p>
            </div>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <NameWheel students={students} />
          <CountdownTimer />
          <GroupGenerator students={students} />
          <RandomWordBoard />
        </div>
        <FlashCards />
        <ExitTicket />
        <NoiseMeter />
      </div>
    </AppLayout>
  );
}