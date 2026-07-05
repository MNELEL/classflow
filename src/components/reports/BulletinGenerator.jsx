import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, Loader2, Printer, ChevronDown, ChevronUp, FileDown } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
export default function BulletinGenerator() {
  const qc = useQueryClient();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [className, setClassName] = useState('');
  const [generating, setGenerating] = useState(false);
  const [bulletin, setBulletin] = useState(null);
  const [showRiddle, setShowRiddle] = useState(false);

  const { data: grades = [] } = useQuery({ queryKey: ['grades'], queryFn: () => base44.entities.Grade.list('-date', 100) });
  const { data: libraryItems = [] } = useQuery({ queryKey: ['library'], queryFn: () => base44.entities.LibraryItem.list('-created_date', 50) });
  const { data: rewards = [] } = useQuery({ queryKey: ['rewards'], queryFn: () => base44.entities.Reward.list('-date', 100) });

  async function generatePDF() {
    if (!bulletin) { toast.error('צור ניוזלטר לפני ייצוא PDF'); return; }
    
    const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
      import('jspdf'),
      import('html2canvas'),
    ]);
    const doc = new jsPDF({ direction: 'rtl', unit: 'mm', format: 'a4' });
    const canvas = await html2canvas(document.getElementById('classpro-a4-canvas'), { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL('image/png');
    const imgWidth = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    doc.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    doc.save(`חוברת-שבועית-${className || 'כיתה'}-${startDate}.pdf`);
    toast.success('ה-PDF ייוצר בהצלחה!');
  }

  async function generate() {
    if (!startDate || !endDate) { toast.error('בחר טווח תאריכים'); return; }
    setGenerating(true);
    setBulletin(null);

    const rangeGrades = grades.filter(g => g.date >= startDate && g.date <= endDate);
    const rangeItems = libraryItems.filter(i => i.created_date?.slice(0, 10) >= startDate && i.created_date?.slice(0, 10) <= endDate);
    const rangeRewards = rewards.filter(r => r.date >= startDate && r.date <= endDate);

    // Top students this week by reward points
    const rewardMap = {};
    rangeRewards.filter(r => r.points > 0).forEach(r => { rewardMap[r.student_name] = (rewardMap[r.student_name] || 0) + r.points; });
    const topStudents = Object.entries(rewardMap).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([n,p])=>`${n} (${p} נקודות)`);

    // Most improving (positive rewards)
    const investingStudents = Object.entries(rewardMap).sort((a,b)=>b[1]-a[1]).slice(3,6).map(([n])=>n);

    const context = [
      rangeGrades.length ? `מבחנים שנערכו: ${[...new Set(rangeGrades.map(g => g.subject))].join(', ')}` : '',
      rangeItems.length ? `חומרים שנלמדו השבוע: ${rangeItems.map(i => i.title).slice(0, 6).join(', ')}` : '',
      rangeItems[0]?.ai_summary ? `סיכום חומר עיקרי: ${rangeItems[0].ai_summary}` : '',
      topStudents.length ? `מצטיינים השבוע: ${topStudents.join(', ')}` : '',
      investingStudents.length ? `משקיעים השבוע: ${investingStudents.join(', ')}` : '',
    ].filter(Boolean).join('\n');

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `צור חוברת שבועית לכיתה "${className || 'כיתה'}" עבור השבוע ${startDate} עד ${endDate}.

מידע על השבוע:
${context || 'שבוע לימודים רגיל'}

צור חוברת שבועית מלאה עם:
1. סיכום קצר וידידותי להורים (3-4 משפטים) על מה למדנו
2. 4-5 נקודות לימוד עיקריות לשיחה בבית (נגזרות מהחומר שנלמד)
3. 4 שאלות חזרה על החומר שנלמד — כל שאלה עם תשובה מפורטת
4. 2 חידות מהנות הקשורות לחומר השבוע (כל חידה עם תשובה)
5. רשימת מצטיינים השבוע עם נימוק (אם יש נתונים)
6. רשימת משקיינים השבוע (אם יש נתונים)
7. 2 פעילויות מוצעות לבית

הטון: חם, ידידותי, חגיגי, מכבד.`,
        response_json_schema: {
          type: "object",
          properties: {
            digestSummary: { type: "string" },
            studyPoints: { type: "array", items: { type: "string" } },
            recapQuestions: { type: "array", items: { type: "object", properties: { question: { type: "string" }, answer: { type: "string" } } } },
            weeklyRiddle: { type: "string" },
            weeklyRiddleAnswer: { type: "string" },
            weeklyRiddle2: { type: "string" },
            weeklyRiddle2Answer: { type: "string" },
            topStudents: { type: "array", items: { type: "string" } },
            investingStudents: { type: "array", items: { type: "string" } },
            activities: { type: "array", items: { type: "string" } }
          }
        }
      });

      const saved = await base44.entities.WeeklyBulletin.create({
        start_date: startDate,
        end_date: endDate,
        class_name: className,
        digest_summary: result.digestSummary,
        study_points: result.studyPoints,
        recap_questions: result.recapQuestions,
        weekly_riddle: result.weeklyRiddle,
        weekly_riddle_answer: result.weeklyRiddleAnswer,
        activities: result.activities,
      });

      setBulletin(result);
      toast.success('ניוזלטר נוצר בהצלחה!');
    } catch {
      toast.error('שגיאה ביצירת הניוזלטר');
    }
    setGenerating(false);
  }

  return (
    <div className="space-y-4" dir="rtl">
      {/* Controls */}
      <div className="bg-card border border-border/70 rounded-2xl p-4 space-y-3">
        <p className="text-sm font-medium">הגדרות הניוזלטר</p>
        <Input placeholder="שם הכיתה (אופציונלי)" value={className} onChange={e => setClassName(e.target.value)} />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">מתאריך</label>
            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">עד תאריך</label>
            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="text-sm" />
          </div>
        </div>
        <Button className="w-full gap-2" onClick={generate} disabled={generating}>
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {generating ? 'מייצר ניוזלטר...' : '✨ צור ניוזלטר שבתי'}
        </Button>
      </div>

      {/* Result */}
      {bulletin && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border/70 rounded-2xl overflow-hidden">
          {/* Print header */}
          <div className="flex justify-between items-center px-4 py-2.5 border-b border-border/50 bg-primary/5">
            <p className="text-sm font-bold text-primary">📰 ניוזלטר שבתי</p>
            <div className="flex gap-1.5">
              <Button size="sm" variant="outline" className="gap-1 text-xs h-7" onClick={generatePDF}>
                <FileDown className="w-3 h-3" /> ייצא PDF
              </Button>
              <Button size="sm" variant="outline" className="gap-1 text-xs h-7" onClick={() => window.print()}>
                <Printer className="w-3 h-3" /> הדפס
              </Button>
            </div>
          </div>

          <div id="classpro-a4-canvas" className="p-5 space-y-5">
            {/* Header */}
            <div className="text-center border-b border-border pb-4">
              <h2 className="text-xl font-black text-primary">ניוזלטר שבועי</h2>
              <p className="text-sm text-muted-foreground">{className || 'הכיתה'} • {startDate} – {endDate}</p>
            </div>

            {/* Summary */}
            {bulletin.digestSummary && (
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase mb-2">📝 סיכום השבוע</p>
                <p className="text-sm leading-relaxed bg-blue-50 dark:bg-blue-900/10 rounded-xl p-3">{bulletin.digestSummary}</p>
              </div>
            )}

            {/* Study points */}
            {bulletin.studyPoints?.length > 0 && (
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase mb-2">📚 נקודות ללימוד בבית</p>
                <ul className="space-y-1.5">
                  {bulletin.studyPoints.map((pt, i) => (
                    <li key={i} className="flex gap-2 text-sm">
                      <span className="text-primary font-bold shrink-0">•</span>
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recap questions */}
            {bulletin.recapQuestions?.length > 0 && (
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase mb-2">❓ שאלות חזרה</p>
                <div className="space-y-2">
                  {bulletin.recapQuestions.map((q, i) => (
                    <div key={i} className="bg-muted/40 rounded-xl p-3">
                      <p className="text-sm font-medium">{i + 1}. {q.question}</p>
                      <p className="text-xs text-muted-foreground mt-1">↳ {q.answer}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Riddle */}
            {bulletin.weeklyRiddle && (
              <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
                <p className="text-xs font-bold text-yellow-700 dark:text-yellow-400 mb-1">🧩 חידת השבוע</p>
                <p className="text-sm">{bulletin.weeklyRiddle}</p>
                <button onClick={() => setShowRiddle(v => !v)}
                  className="text-xs text-yellow-600 dark:text-yellow-400 mt-2 flex items-center gap-1">
                  {showRiddle ? <><ChevronUp className="w-3 h-3" /> הסתר תשובה</> : <><ChevronDown className="w-3 h-3" /> הצג תשובה</>}
                </button>
                {showRiddle && <p className="text-sm font-bold text-yellow-700 dark:text-yellow-400 mt-1">תשובה: {bulletin.weeklyRiddleAnswer}</p>}
              </div>
            )}

            {/* Top students */}
            {(bulletin.topStudents?.length > 0) && (
              <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
                <p className="text-xs font-bold text-yellow-700 dark:text-yellow-400 mb-2">🏆 מצטיינים השבוע</p>
                <ul className="space-y-1">
                  {bulletin.topStudents.map((s, i) => (
                    <li key={i} className="text-sm flex gap-2"><span className="text-yellow-500">★</span>{s}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Investing students */}
            {(bulletin.investingStudents?.length > 0) && (
              <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                <p className="text-xs font-bold text-blue-700 dark:text-blue-400 mb-2">💪 משקיעים השבוע</p>
                <ul className="space-y-1">
                  {bulletin.investingStudents.map((s, i) => (
                    <li key={i} className="text-sm flex gap-2"><span className="text-blue-500">↑</span>{s}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Second riddle */}
            {bulletin.weeklyRiddle2 && (
              <div className="bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800 rounded-xl p-4">
                <p className="text-xs font-bold text-purple-700 dark:text-purple-400 mb-1">🧩 חידה נוספת</p>
                <p className="text-sm">{bulletin.weeklyRiddle2}</p>
                <button onClick={() => setShowRiddle(v => !v)}
                  className="text-xs text-purple-600 dark:text-purple-400 mt-2 flex items-center gap-1">
                  {showRiddle ? <><ChevronUp className="w-3 h-3" /> הסתר תשובה</> : <><ChevronDown className="w-3 h-3" /> הצג תשובה</>}
                </button>
                {showRiddle && <p className="text-sm font-bold text-purple-700 dark:text-purple-400 mt-1">תשובה: {bulletin.weeklyRiddle2Answer}</p>}
              </div>
            )}

            {/* Activities */}
            {bulletin.activities?.length > 0 && (
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase mb-2">🎯 פעילויות מוצעות לבית</p>
                <ul className="space-y-1">
                  {bulletin.activities.map((a, i) => (
                    <li key={i} className="text-sm flex gap-2"><span className="text-green-500">✓</span>{a}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}