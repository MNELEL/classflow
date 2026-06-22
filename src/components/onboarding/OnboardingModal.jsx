import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, Users, MapPin, GraduationCap, Target, ArrowLeft, Check, Rocket, Building2, BookOpen, Shield } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const STORAGE_KEY = 'classflow_onboarding_done';

const PRINCIPAL_TYPES = [
  { id: 'school_principal', label: 'מנהל בית ספר', icon: Building2, desc: 'מוסד חינוכי כללי' },
  { id: 'talmud_torah_principal', label: 'מנהל תלמוד תורה', icon: BookOpen, desc: 'מוסד תורני' },
  { id: 'teacher', label: 'מורה / מחנך', icon: Users, desc: 'ניהול כיתה בודדת' },
];

const STEPS = [
  { id: 'welcome', icon: Sparkles, title: 'ברוכים הבאים ל-ClassFlow! 🎓', desc: 'מערכת חכמה לניהול כיתה. בואו נגדיר את החשבון שלכם ב-5 צעדים פשוטים.', color: 'from-violet-500 to-purple-500' },
  { id: 'role', icon: Shield, title: 'מה התפקיד שלך?', desc: 'נתאים את המערכת לסוג המוסד שלך', color: 'from-indigo-500 to-blue-500' },
  { id: 'profile', icon: Users, title: 'הפרטים שלך', desc: 'כדי שהתלמידים וההורים יכירו אותך', color: 'from-blue-500 to-cyan-500' },
  { id: 'class', icon: MapPin, title: 'הכיתה שלך', desc: 'מידע בסיסי על הכיתה', color: 'from-emerald-500 to-teal-500' },
  { id: 'goals', icon: Target, title: 'המטרות שלך', desc: 'מה הכי חשוב לך השנה?', color: 'from-amber-500 to-orange-500' },
  { id: 'done', icon: Rocket, title: 'מוכנים להמראה! 🚀', desc: 'הכל מוגדר. אפשר להתחיל לנהל את הכיתה.', color: 'from-pink-500 to-rose-500' },
];

const GOAL_OPTIONS = [
  { id: 'seating', label: 'סידור ישיבה חכם', icon: '🪑', path: '/seating' },
  { id: 'attendance', label: 'מעקב נוכחות', icon: '📅', path: '/attendance' },
  { id: 'grades', label: 'ניהול ציונים', icon: '📊', path: '/grades' },
  { id: 'library', label: 'ספריית חומרים', icon: '📚', path: '/library' },
  { id: 'homework', label: 'שיעורי בית', icon: '📝', path: '/homework' },
  { id: 'parents', label: 'תקשורת הורים', icon: '👨‍👩‍👧', path: '/parents' },
  { id: 'analytics', label: 'ניתוח נתונים', icon: '📈', path: '/analytics' },
  { id: 'gamification', label: 'גמיפיקציה', icon: '🏆', path: '/gamification' },
];

export default function OnboardingModal({ open, onClose, forceShow }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [data, setData] = useState({ principalType: '', teacherName: '', className: '', school: '', subject: '', gradeLevel: '', goals: [] });

  useEffect(() => {
    if (open) {
      const done = localStorage.getItem(STORAGE_KEY);
      if (done && !forceShow) { onClose(); return; }
      setStep(0);
    }
  }, [open]);

  function next() { if (step < STEPS.length - 1) setStep(step + 1); }
  function prev() { if (step > 0) setStep(step - 1); }

  function toggleGoal(id) {
    setData(d => ({ ...d, goals: d.goals.includes(id) ? d.goals.filter(g => g !== id) : [...d.goals, id] }));
  }

  async function finish() {
    try {
      // Save to user metadata
      await base44.auth.updateMe({
        principal_type: data.principalType,
        teacher_name: data.teacherName,
        class_name: data.className,
        school: data.school,
        subject: data.subject,
        grade_level: data.gradeLevel,
        onboarding_goals: data.goals,
      });
    } catch (e) {}
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, completedAt: new Date().toISOString() }));
    toast.success('ההגדרה הושלמה! 🎉');
    // Navigate to first goal
    const firstGoal = GOAL_OPTIONS.find(g => g.id === data.goals[0]);
    if (firstGoal) navigate(firstGoal.path);
    else navigate('/');
    onClose();
  }

  const StepIcon = STEPS[step].icon;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[300] bg-background/95 backdrop-blur-sm flex items-center justify-center p-4"
          dir="rtl">
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.92, opacity: 0 }}
            className="bg-card border border-border rounded-3xl shadow-2xl max-w-md w-full overflow-hidden">
            {/* Progress bar */}
            <div className="h-1.5 bg-muted">
              <motion.div className={`h-full bg-gradient-to-l ${STEPS[step].color}`}
                animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }} transition={{ duration: 0.3 }} />
            </div>

            {/* Step content */}
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <span className="text-xs text-muted-foreground">שלב {step + 1} מתוך {STEPS.length}</span>
                {step > 0 && step < STEPS.length - 1 && (
                  <button onClick={prev} className="text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground">
                    <ArrowLeft className="w-3 h-3" /> חזרה
                  </button>
                )}
              </div>

              {/* Step icon */}
              <div className={`w-16 h-16 mx-auto rounded-3xl bg-gradient-to-br ${STEPS[step].color} flex items-center justify-center mb-4 shadow-lg`}>
                <StepIcon className="w-8 h-8 text-white" />
              </div>

              <h2 className="text-xl font-bold text-center mb-1">{STEPS[step].title}</h2>
              <p className="text-sm text-muted-foreground text-center mb-6">{STEPS[step].desc}</p>

              {/* Step-specific content */}
              {step === 0 && (
                <div className="space-y-3">
                  <div className="bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800 rounded-2xl p-4 text-center">
                    <p className="text-sm">🎓 ClassFlow משלבת:</p>
                    <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                      <span className="bg-card rounded-xl p-2">🪑 סידור חכם</span>
                      <span className="bg-card rounded-xl p-2">📚 ספריית חומרים</span>
                      <span className="bg-card rounded-xl p-2">📊 ניתוח AI</span>
                      <span className="bg-card rounded-xl p-2">🔔 התראות</span>
                    </div>
                  </div>
                  <Button onClick={next} className="w-full h-11">בואו נתחיל!</Button>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    {PRINCIPAL_TYPES.map(pt => {
                      const PtIcon = pt.icon;
                      const selected = data.principalType === pt.id;
                      return (
                        <button key={pt.id} onClick={() => setData(d => ({ ...d, principalType: pt.id }))}
                          className={`w-full p-3 rounded-xl border-2 text-right transition-all flex items-center gap-3 ${selected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}>
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selected ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                            <PtIcon className="w-5 h-5" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold">{pt.label}</p>
                            <p className="text-xs text-muted-foreground">{pt.desc}</p>
                          </div>
                          {selected && <Check className="w-4 h-4 text-primary" />}
                        </button>
                      );
                    })}
                  </div>
                  <Button onClick={next} disabled={!data.principalType} className="w-full h-11">המשך</Button>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">השם שלך</label>
                    <Input value={data.teacherName} onChange={e => setData(d => ({ ...d, teacherName: e.target.value }))} placeholder="הרב / המורה..." className="h-11" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">מקצוע עיקרי</label>
                    <Input value={data.subject} onChange={e => setData(d => ({ ...d, subject: e.target.value }))} placeholder="גמרא, תנ״ך, מתמטיקה..." className="h-11" />
                  </div>
                  <Button onClick={next} disabled={!data.teacherName} className="w-full h-11">המשך</Button>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">שם הכיתה</label>
                    <Input value={data.className} onChange={e => setData(d => ({ ...d, className: e.target.value }))} placeholder="כיתה ז׳, ישיבה תיכונית..." className="h-11" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">מוסד הלימוד</label>
                    <Input value={data.school} onChange={e => setData(d => ({ ...d, school: e.target.value }))} placeholder="ישיבת..., בית ספר..." className="h-11" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">שכבת גיל</label>
                    <Input value={data.gradeLevel} onChange={e => setData(d => ({ ...d, gradeLevel: e.target.value }))} placeholder="ז׳, ח׳, תיכון..." className="h-11" />
                  </div>
                  <Button onClick={next} disabled={!data.className} className="w-full h-11">המשך</Button>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    {GOAL_OPTIONS.map(g => (
                      <button key={g.id} onClick={() => toggleGoal(g.id)}
                        className={`p-3 rounded-xl border-2 text-right transition-all flex items-center gap-2 ${data.goals.includes(g.id) ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}>
                        <span className="text-lg">{g.icon}</span>
                        <span className="text-xs font-semibold flex-1">{g.label}</span>
                        {data.goals.includes(g.id) && <Check className="w-3.5 h-3.5 text-primary" />}
                      </button>
                    ))}
                  </div>
                  <Button onClick={next} disabled={data.goals.length === 0} className="w-full h-11">
                    {data.goals.length > 0 ? `המשך (${data.goals.length} נבחרו)` : 'בחרו לפחות אחד'}
                  </Button>
                </div>
              )}

              {step === 5 && (
                <div className="space-y-3">
                  <div className="bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-950/20 dark:to-rose-950/20 border border-pink-200 dark:border-pink-800 rounded-2xl p-4 text-center space-y-2">
                    <p className="text-sm font-semibold">סיכום:</p>
                    <p className="text-xs">👤 {PRINCIPAL_TYPES.find(p => p.id === data.principalType)?.label || ''}</p>
                    <p className="text-xs">👋 {data.teacherName} • {data.subject}</p>
                    <p className="text-xs">🏫 {data.className} • {data.school}</p>
                    <p className="text-xs">🎯 {data.goals.length} תחומי מיקוד</p>
                  </div>
                  <Button onClick={finish} className="w-full h-12 gap-2" size="lg">
                    <Rocket className="w-5 h-5" /> התחילו עכשיו!
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}