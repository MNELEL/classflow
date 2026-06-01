import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';
import { Users, TrendingUp, Heart, AlertTriangle, CheckCircle2, Shield } from 'lucide-react';
import { getStudentSeat, isAdjacent, getDistance, detectConflicts } from '@/lib/seatingUtils';
import { motion } from 'framer-motion';
import StudentReportGenerator from '@/components/reports/StudentReportGenerator';
import StudentAIReport from '@/components/reports/StudentAIReport';
import BulletinGenerator from '@/components/reports/BulletinGenerator';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

function loadSeats() {
  try { return JSON.parse(localStorage.getItem('classmanager_seats') || 'null'); } catch { return null; }
}

export default function ReportsPage() {
  const [tab, setTab] = useState('stats');
  const { data: students = [], isLoading } = useQuery({
    queryKey: ['students'],
    queryFn: () => base44.entities.Student.list(),
  });

  const seats = loadSeats() || [];
  const active = students.filter(s => s.is_active !== false);

  // ── Height distribution ──
  const heightData = useMemo(() => {
    const counts = { short: 0, medium: 0, tall: 0 };
    active.forEach(s => { if (counts[s.height] !== undefined) counts[s.height]++; else counts.medium++; });
    return [
      { name: 'נמוך', value: counts.short },
      { name: 'בינוני', value: counts.medium },
      { name: 'גבוה', value: counts.tall },
    ].filter(d => d.value > 0);
  }, [active]);

  // ── Special needs ──
  const needsData = useMemo(() => {
    const labels = { vision: '👁️ ראייה', hearing: '👂 שמיעה', adhd: '⚡ קשב', mobility: '♿ ניידות', other: '✨ אחר' };
    const counts = {};
    active.forEach(s => (s.special_needs || []).forEach(n => { counts[n] = (counts[n] || 0) + 1; }));
    return Object.entries(counts).map(([k, v]) => ({ name: labels[k] || k, value: v }));
  }, [active]);

  // ── Seating satisfaction analysis ──
  const seatingStats = useMemo(() => {
    if (!seats.length || !active.length) return null;

    let friendsTogether = 0, friendsTotal = 0;
    let conflictsResolved = 0, conflictsTotal = 0;
    let separateOk = 0, separateTotal = 0;
    let rowPrefMet = 0, rowPrefTotal = 0;

    const totalRows = Math.max(...seats.map(s => s.row), 0) + 1;

    active.forEach(student => {
      const mySeat = getStudentSeat(seats, student.id);
      if (!mySeat) return;

      // Friends
      (student.friends || []).forEach(fid => {
        friendsTotal++;
        const fSeat = getStudentSeat(seats, fid);
        if (fSeat && isAdjacent(mySeat, fSeat)) friendsTogether++;
      });

      // Avoid (conflicts)
      (student.avoid || []).forEach(aid => {
        conflictsTotal++;
        const aSeat = getStudentSeat(seats, aid);
        if (!aSeat || !isAdjacent(mySeat, aSeat)) conflictsResolved++;
      });

      // Separate
      (student.separate || []).forEach(sid => {
        separateTotal++;
        const sSeat = getStudentSeat(seats, sid);
        if (!sSeat || getDistance(mySeat, sSeat) >= 3) separateOk++;
      });

      // Row preference
      if (student.row_preference && student.row_preference !== 'none') {
        rowPrefTotal++;
        const mid = Math.floor(totalRows / 2);
        if (
          (student.row_preference === 'front' && mySeat.row === 0) ||
          (student.row_preference === 'back' && mySeat.row === totalRows - 1) ||
          (student.row_preference === 'middle' && Math.abs(mySeat.row - mid) <= 1)
        ) rowPrefMet++;
      }
    });

    const seatedCount = new Set(seats.filter(s => s.student_id).map(s => s.student_id)).size;

    return { friendsTogether, friendsTotal, conflictsResolved, conflictsTotal, separateOk, separateTotal, rowPrefMet, rowPrefTotal, seatedCount };
  }, [seats, active]);

  // ── Groups ──
  const groupData = useMemo(() => {
    const counts = {};
    active.forEach(s => {
      const g = s.learning_group || s.group;
      if (g) counts[g] = (counts[g] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [active]);

  const satisfactionBar = seatingStats ? [
    { name: 'חברים יחד', value: seatingStats.friendsTotal ? Math.round((seatingStats.friendsTogether / seatingStats.friendsTotal) * 100) : 100, total: seatingStats.friendsTotal },
    { name: 'קונפליקטים נמנעו', value: seatingStats.conflictsTotal ? Math.round((seatingStats.conflictsResolved / seatingStats.conflictsTotal) * 100) : 100, total: seatingStats.conflictsTotal },
    { name: 'הפרדות קוימו', value: seatingStats.separateTotal ? Math.round((seatingStats.separateOk / seatingStats.separateTotal) * 100) : 100, total: seatingStats.separateTotal },
    { name: 'העדפת שורה', value: seatingStats.rowPrefTotal ? Math.round((seatingStats.rowPrefMet / seatingStats.rowPrefTotal) * 100) : 100, total: seatingStats.rowPrefTotal },
  ] : [];

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-5 max-w-3xl mx-auto overflow-y-auto h-full space-y-5" dir="rtl">

        {/* Tabs */}
        <div className="flex gap-1 bg-muted/50 rounded-xl p-1">
          {[['stats','📊 סטטיסטיקות'], ['student','🤖 דוח תלמיד AI'], ['bulletin','📰 ניוזלטר']].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${tab === id ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              {label}
            </button>
          ))}
        </div>

        {tab === 'student' && <StudentAIReport students={students} />}
        {tab === 'bulletin' && <BulletinGenerator />}

        {tab === 'stats' && <>
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">דוחות כיתה</h1>
            <p className="text-muted-foreground text-sm mt-0.5">{active.length} תלמידים פעילים</p>
          </div>
          <StudentReportGenerator students={students} />
        </motion.div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: <Users className="w-4 h-4" />, label: 'תלמידים', value: active.length, color: 'text-primary', bg: 'bg-primary/10' },
            { icon: <Shield className="w-4 h-4" />, label: 'צרכים מיוחדים', value: active.filter(s => s.special_needs?.length).length, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30' },
            { icon: <Heart className="w-4 h-4" />, label: 'קשרים חברתיים', value: active.filter(s => s.friends?.length || s.avoid?.length).length, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
            { icon: <TrendingUp className="w-4 h-4" />, label: 'משובצים', value: seatingStats?.seatedCount ?? 0, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
              <Card className="border-border/60">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center ${s.color} shrink-0`}>{s.icon}</div>
                  <div>
                    <p className="text-2xl font-bold">{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Seating satisfaction */}
        {seatingStats && satisfactionBar.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="border-border/60">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-primary" /> מדד שביעות רצון — סידור ישיבה
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-3">
                {satisfactionBar.map((item, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">{item.name}</span>
                      <span className="font-semibold tabular-nums">
                        {item.total === 0 ? <span className="text-muted-foreground">לא רלוונטי</span> : `${item.value}%`}
                      </span>
                    </div>
                    {item.total > 0 && (
                      <div className="w-full bg-muted rounded-full h-2">
                        <motion.div
                          className={`h-2 rounded-full ${item.value >= 75 ? 'bg-emerald-500' : item.value >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${item.value}%` }}
                          transition={{ duration: 0.7, delay: 0.3 + i * 0.08 }}
                        />
                      </div>
                    )}
                  </div>
                ))}
                <div className="pt-2 border-t border-border flex gap-4 text-xs text-muted-foreground flex-wrap">
                  <span>👥 חברים שיושבים יחד: <b className="text-foreground">{seatingStats.friendsTogether}/{seatingStats.friendsTotal}</b></span>
                  <span>🚫 קונפליקטים נמנעו: <b className="text-foreground">{seatingStats.conflictsResolved}/{seatingStats.conflictsTotal}</b></span>
                  <span>↔️ הפרדות: <b className="text-foreground">{seatingStats.separateOk}/{seatingStats.separateTotal}</b></span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {!seats.length && (
          <div className="bg-muted/40 rounded-xl p-4 text-center text-sm text-muted-foreground">
            <AlertTriangle className="w-5 h-5 mx-auto mb-1 opacity-40" />
            אין סידור ישיבה שמור — עבור ל<b>מפת ישיבה</b> ליצירת סידור
          </div>
        )}

        {/* Height distribution */}
        <div className="grid sm:grid-cols-2 gap-4">
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }}>
            <Card className="border-border/60">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm">📏 התפלגות גבהים</CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-4">
                {heightData.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">אין נתונים</p>
                ) : (
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={heightData} cx="50%" cy="50%" outerRadius={65} dataKey="value" label={({ name, value }) => `${name} (${value})`} labelLine={false}>
                        {heightData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v) => [`${v} תלמידים`]} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Special needs */}
          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
            <Card className="border-border/60">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm">🌟 ריכוז צרכים מיוחדים</CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-4">
                {needsData.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">אין תלמידים עם צרכים מיוחדים</p>
                ) : (
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={needsData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip formatter={(v) => [`${v} תלמידים`]} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {needsData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Groups */}
        {groupData.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            <Card className="border-border/60">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm">🧩 תלמידים לפי קבוצה</CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-4">
                <div className="flex flex-wrap gap-2">
                  {groupData.map((g, i) => (
                    <div key={i} className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-1.5">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="text-sm font-medium">{g.name}</span>
                      <Badge variant="secondary" className="text-xs">{g.value}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

      </> }
      </div>
    </AppLayout>
  );
}