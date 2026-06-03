import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff } from 'lucide-react';
import { motion } from 'framer-motion';

const LEVELS = [
  { label: 'שקט מושלם', color: '#10b981', emoji: '😇', max: 15 },
  { label: 'שקט', color: '#34d399', emoji: '😌', max: 30 },
  { label: 'רגיל', color: '#f59e0b', emoji: '🙂', max: 50 },
  { label: 'רועש', color: '#f97316', emoji: '😬', max: 70 },
  { label: 'רועש מאוד!', color: '#ef4444', emoji: '🔊', max: 100 },
];

export default function NoiseMeter() {
  const [active, setActive] = useState(false);
  const [level, setLevel] = useState(0);
  const [peak, setPeak] = useState(0);
  const [error, setError] = useState('');
  const streamRef = useRef(null);
  const analyserRef = useRef(null);
  const animRef = useRef(null);

  function getLevelInfo(v) {
    return LEVELS.find(l => v <= l.max) || LEVELS[LEVELS.length - 1];
  }

  async function start() {
    setError('');
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => {
      setError('לא ניתן לגשת למיקרופון'); return null;
    });
    if (!stream) return;
    streamRef.current = stream;
    const ctx = new AudioContext();
    const src = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    src.connect(analyser);
    analyserRef.current = analyser;
    setActive(true);
    setPeak(0);

    function tick() {
      const data = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b, 0) / data.length;
      const normalized = Math.min(100, Math.round((avg / 128) * 100));
      setLevel(normalized);
      setPeak(p => Math.max(p, normalized));
      animRef.current = requestAnimationFrame(tick);
    }
    animRef.current = requestAnimationFrame(tick);
  }

  function stop() {
    cancelAnimationFrame(animRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    setActive(false);
    setLevel(0);
  }

  useEffect(() => () => stop(), []);

  const info = getLevelInfo(level);
  const bars = 20;

  return (
    <div className="bg-card border border-border/70 rounded-2xl p-4 space-y-3">
      <h3 className="font-bold text-sm flex items-center gap-2">🔊 מד רעש כיתתי</h3>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {/* Level bars */}
      <div className="flex items-end gap-0.5 h-16 justify-center">
        {Array.from({ length: bars }).map((_, i) => {
          const threshold = (i / bars) * 100;
          const lit = level > threshold;
          const barInfo = getLevelInfo(threshold);
          return (
            <motion.div
              key={i}
              animate={{ height: lit ? `${20 + (i / bars) * 80}%` : '20%', opacity: lit ? 1 : 0.2 }}
              transition={{ duration: 0.05 }}
              className="flex-1 rounded-sm"
              style={{ backgroundColor: lit ? barInfo.color : 'hsl(var(--muted))' }}
            />
          );
        })}
      </div>

      {/* Status */}
      <div className="text-center">
        <motion.div key={info.label} initial={{ scale: 0.8 }} animate={{ scale: 1 }}
          className="text-3xl mb-1">{info.emoji}</motion.div>
        <p className="font-bold text-sm" style={{ color: info.color }}>{info.label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">רמה: {level}% · שיא: {peak}%</p>
      </div>

      <div className="flex gap-2">
        {!active ? (
          <Button size="sm" className="w-full gap-1" onClick={start}>
            <Mic className="w-3.5 h-3.5" /> הפעל מיקרופון
          </Button>
        ) : (
          <Button size="sm" variant="outline" className="w-full gap-1" onClick={stop}>
            <MicOff className="w-3.5 h-3.5" /> עצור
          </Button>
        )}
      </div>
    </div>
  );
}