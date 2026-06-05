import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, BarChart2, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const LEVELS = [
  { label: 'שקט מושלם', color: '#10b981', emoji: '😇', max: 15 },
  { label: 'שקט', color: '#34d399', emoji: '😌', max: 30 },
  { label: 'רגיל', color: '#f59e0b', emoji: '🙂', max: 50 },
  { label: 'רועש', color: '#f97316', emoji: '😬', max: 70 },
  { label: 'רועש מאוד!', color: '#ef4444', emoji: '🔊', max: 100 },
];

function getScore(avgLevel, peakLevel, quietPercent) {
  // Score 1-10 based on average noise, peak, and % of time quiet
  let score = 10;
  score -= (avgLevel / 100) * 4;       // avg noise penalty (up to -4)
  score -= (peakLevel / 100) * 2;      // peak penalty (up to -2)
  score -= ((100 - quietPercent) / 100) * 4; // noisy time penalty (up to -4)
  return Math.max(1, Math.min(10, Math.round(score * 10) / 10));
}

function getFeedback(score, avgLevel, quietPercent) {
  if (score >= 9) return { text: 'שיעור מדהים! הכיתה עבדה בשקט מופתי לאורך כל הזמן.', color: '#10b981', badge: 'מצוין' };
  if (score >= 7.5) return { text: 'שיעור טוב מאוד. רמת הרעש הייתה נמוכה ברוב הזמן.', color: '#34d399', badge: 'טוב מאוד' };
  if (score >= 6) return { text: `הכיתה הייתה שקטה ${Math.round(quietPercent)}% מהזמן. יש מקום לשיפור.`, color: '#f59e0b', badge: 'סביר' };
  if (score >= 4) return { text: 'רמת הרעש הייתה גבוהה. מומלץ להכניס פעילות מיקוד או הפסקה.', color: '#f97316', badge: 'חלש' };
  return { text: 'הכיתה הייתה רועשת מאוד. שקול שינוי בניהול הכיתה או סידורי ישיבה.', color: '#ef4444', badge: 'קריטי' };
}

function ScoreDisplay({ score, feedback }) {
  const filled = Math.round(score);
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-3 rounded-xl border border-border bg-muted/40 p-3 space-y-2"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground">ניתוח שיעור</span>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: feedback.color }}>
          {feedback.badge}
        </span>
      </div>

      {/* Score stars */}
      <div className="flex items-center gap-1 justify-center">
        {Array.from({ length: 10 }).map((_, i) => (
          <Star
            key={i}
            className="w-4 h-4"
            fill={i < filled ? feedback.color : 'transparent'}
            stroke={i < filled ? feedback.color : 'hsl(var(--muted-foreground))'}
          />
        ))}
      </div>

      {/* Numeric score */}
      <div className="text-center">
        <span className="text-3xl font-extrabold" style={{ color: feedback.color }}>{score}</span>
        <span className="text-base text-muted-foreground">/10</span>
      </div>

      {/* Feedback text */}
      <p className="text-xs text-center text-muted-foreground leading-relaxed">{feedback.text}</p>
    </motion.div>
  );
}

export default function NoiseMeter() {
  const [active, setActive] = useState(false);
  const [level, setLevel] = useState(0);
  const [peak, setPeak] = useState(0);
  const [error, setError] = useState('');
  const [report, setReport] = useState(null); // { score, avgLevel, quietPercent, feedback }

  const streamRef = useRef(null);
  const analyserRef = useRef(null);
  const animRef = useRef(null);
  const samplesRef = useRef([]); // array of level readings

  function getLevelInfo(v) {
    return LEVELS.find(l => v <= l.max) || LEVELS[LEVELS.length - 1];
  }

  async function start() {
    setError('');
    setReport(null);
    samplesRef.current = [];
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
      samplesRef.current.push(normalized);
      animRef.current = requestAnimationFrame(tick);
    }
    animRef.current = requestAnimationFrame(tick);
  }

  function stop() {
    cancelAnimationFrame(animRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    setActive(false);
    setLevel(0);

    // Build report from collected samples
    const samples = samplesRef.current;
    if (samples.length > 10) {
      const avgLevel = Math.round(samples.reduce((a, b) => a + b, 0) / samples.length);
      const peakLevel = Math.max(...samples);
      const quietPercent = Math.round((samples.filter(s => s <= 30).length / samples.length) * 100);
      const score = getScore(avgLevel, peakLevel, quietPercent);
      const feedback = getFeedback(score, avgLevel, quietPercent);
      setReport({ score, avgLevel, peakLevel, quietPercent, feedback });
    }
  }

  useEffect(() => () => {
    cancelAnimationFrame(animRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
  }, []);

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
        <p className="text-xs text-muted-foreground mt-0.5">
          רמה: {level}%{active && ` · שיא: ${peak}%`}
          {active && samplesRef.current.length > 0 && (
            <> · מדידות: {samplesRef.current.length}</>
          )}
        </p>
      </div>

      <div className="flex gap-2">
        {!active ? (
          <Button size="sm" className="w-full gap-1" onClick={start}>
            <Mic className="w-3.5 h-3.5" /> הפעל מיקרופון
          </Button>
        ) : (
          <Button size="sm" variant="outline" className="w-full gap-1" onClick={stop}>
            <MicOff className="w-3.5 h-3.5" /> עצור וקבל ניתוח
          </Button>
        )}
      </div>

      {/* Report */}
      <AnimatePresence>
        {report && (
          <ScoreDisplay score={report.score} feedback={report.feedback} />
        )}
      </AnimatePresence>
    </div>
  );
}