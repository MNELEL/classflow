import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis
} from 'recharts';
import { TrendingUp, TrendingDown, Plus, X, ChevronLeft, Star, AlertCircle, BookOpen, BarChart2, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SUBJECT_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];

export default function AnalyticsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: grades = [] } = useQuery({ queryKey: ['grades'], queryFn: () => base44.entities.Grade.list('-date', 500) });
  const { data: students = [] } = useQuery({ queryKey: ['students'], queryFn: () => base44.entities.Student.list() });

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'subjects' | 'students'
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [showAddSubject, setShowAddSubject] = useState(false);

  // Local subject priorities from localStorage
  const [subjectPriorities, setSubjectPriorities] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cm_subject_priorities') || '{}'); } catch { return {}; }
  });

  const savePriority = (subject, priority) => {
    const updated = { ...subjectPriorities, [subject]: priority };
    setSubjectPriorities(updated);
    localStorage.setItem('cm_subject_priorities', JSON.stringify(updated));
  };

  const studentMap = useMemo(() => Object.fromEntries(students.map(s => [s.id, s])), [students]);

  // All subjects from grades + custom added
  const [customSubjects, setCustomSubjects] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cm_custom_subjects') || '[]'); } catch { return []; }
  });

  const allSubjects = useMemo(() => {
    const fromGrades = [...new Set(grades.map(g => g.subject).filter(Boolean))];
    const merged = [...new Set([...fromGrades, ...customSubjects])];
    return merged.sort();
  }, [grades, customSubjects]);

  const addCustomSubject = () => {
    const trimmed = newSubjectName.trim();
    if (!trimmed || customSubjects.includes(trimmed)) return;
    const updated = [...customSubjects, trimmed];
    setCustomSubjects(updated);
    localStorage.setItem('cm_custom_subjects', JSON.stringify(updated));
    setNewSubjectName('');
    setShowAddSubject(false);
  };

  const removeCustomSubject = (subject) => {
    const updated = customSubjects.filter(s => s !== subject);
    setCustomSubjects(updated);
    localStorage.setItem('cm_custom_subjects', JSON.stringify(updated));
  };

  // Per-subject stats
  const subjectStats = useMemo(() => {
    return allSubjects.map(subject => {
      const subjectGrades = grades.filter(g => g.subject === subject);
      const avg = subjectGrades.length ? Math.round(subjectGrades.reduce((s, g) => s + (g.score || 0), 0) / subjectGrades.length) : null;
      const below60 = subjectGrades.filter(g => g.score < 60).length;
      const priority = subjectPriorities[subject] ?? 'normal'; // 'low' | 'normal' | 'high'
      return { subject, avg, count: subjectGrades.length, below60, priority };
    });
  }, [allSubjects, grades, subjectPriorities]);

  // Monthly trend data
  const trendData = useMemo(() => {
    const byMonth = {};
    grades.forEach(g => {
      if (!g.date || !g.subject) return;
      const month = g.date.substring(0, 7);
      if (!byMonth[month]) byMonth[month] = {};
      if (!byMonth[month][g.subject]) byMonth[month][g.subject] = [];
      byMonth[month][g.subject].push(g.score);
    });
    return Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b)).map(([month, subjects]) => {
      const row = { month: month.replace('-', '/') };
      Object.entries(subjects).forEach(([sub, scores]) => {
        row[sub] = Math.round(scores.reduce((s, v) => s + v, 0) / scores.length);
      });
      return row;
    });
  }, [grades]);

  // Per-student comparison
  const studentStats = useMemo(() => {
    return students
      .filter(s => s.is_active !== false)
      .map(s => {
        const sg = grades.filter(g => g.student_id === s.id);
        const avg = sg.length ? Math.round(sg.reduce((sum, g) => sum + (g.score || 0), 0) / sg.length) : null;
        return { student: s, avg, count: sg.length };
      })
      .filter(x => x.avg !== null)
      .sort((a, b) => a.avg - b.avg);
  }, [students, grades]);

  // Needs attention: subjects with avg < 70 or high 'below60' count (excluding low priority)
  const needsAttention = subjectStats
    .filter(s => s.avg !== null && s.avg < 70 && s.priority !== 'low')
    .sort((a, b) => a.avg - b.avg);

  const priorityLabel = { low: 'פחות חשוב', normal: 'רגיל', high: 'חשוב מאוד' };
  const priorityColors = { low: 'text-muted-foreground bg-muted', normal: 'text-blue-600 bg-blue-50', high: 'text-red-600 bg-red-50' };

  return (
    <AppLayout>
      <div className="p-4 max-w-4xl mx-auto pb-8" dir="rtl">
        <div className="flex items-center gap-3 mb-5">
          <BarChart2 className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold">ניתוח ציונים</h1>
            <p className="text-xs text-muted-foreground">מגמות, נושאים ותלמידים</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted/60 rounded-xl p-1 mb-5">
          {[
            { id: 'overview', label: 'סקירה' },
            { id: 'subjects', label: 'נושאים' },
            { id: 'students', label: 'תלמידים' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.id ? 'bg-white dark:bg-card shadow text-primary' : 'text-muted-foreground'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ═══ OVERVIEW TAB ═══ */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Needs Attention */}
            {needsAttention.length > 0 && (
              <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-900/10">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm text-orange-700 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4" /> נושאים הדורשים תשומת לב
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-2">
                  {needsAttention.map(s => (
                    <button
                      key={s.subject}
                      onClick={() => { setSelectedSubject(s.subject); setActiveTab('subjects'); }}
                      className="w-full flex items-center justify-between bg-white dark:bg-card border border-orange-100 rounded-lg px-3 py-2 hover:border-orange-300 transition-colors text-right"
                    >
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-orange-500" />
                        <span className="text-sm font-medium">{s.subject}</span>
                        <span className="text-xs text-muted-foreground">({s.count} ציונים)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold ${s.avg < 60 ? 'text-red-600' : 'text-orange-600'}`}>{s.avg}</span>
                        <ArrowLeft className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                    </button>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Monthly Trend Chart */}
            {trendData.length > 0 && (
              <Card>
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-primary" /> מגמת ציונים לאורך זמן
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-2 pb-4">
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      {allSubjects.slice(0, 6).map((sub, i) => (
                        <Line key={sub} type="monotone" dataKey={sub} stroke={SUBJECT_COLORS[i % SUBJECT_COLORS.length]} strokeWidth={2} dot={false} />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Subject avg bars */}
            {subjectStats.filter(s => s.avg !== null).length > 0 && (
              <Card>
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm flex items-center gap-1.5">
                    <BarChart2 className="w-4 h-4 text-primary" /> ממוצע לפי נושא
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-2 pb-4">
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={subjectStats.filter(s => s.avg !== null)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="subject" tick={{ fontSize: 10 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="avg" name="ממוצע" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {grades.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <BarChart2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">אין ציונים עדיין. הוסף ציונים בעמוד הציונים כדי לראות ניתוח.</p>
                <Button size="sm" variant="outline" className="mt-3" onClick={() => navigate('/grades')}>
                  עבור לציונים
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ═══ SUBJECTS TAB ═══ */}
        {activeTab === 'subjects' && (
          <div className="space-y-4">
            {/* Add subject */}
            <div className="flex gap-2">
              {showAddSubject ? (
                <>
                  <Input
                    value={newSubjectName}
                    onChange={e => setNewSubjectName(e.target.value)}
                    placeholder="שם הנושא..."
                    className="flex-1"
                    onKeyDown={e => e.key === 'Enter' && addCustomSubject()}
                    autoFocus
                  />
                  <Button size="sm" onClick={addCustomSubject}>הוסף</Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowAddSubject(false)}><X className="w-4 h-4" /></Button>
                </>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setShowAddSubject(true)} className="gap-1.5">
                  <Plus className="w-4 h-4" /> הוסף נושא
                </Button>
              )}
            </div>

            {/* Subject list */}
            <div className="space-y-2">
              {allSubjects.map((subject, idx) => {
                const stats = subjectStats.find(s => s.subject === subject);
                const isCustom = customSubjects.includes(subject);
                const isSelected = selectedSubject === subject;
                const priority = subjectPriorities[subject] ?? 'normal';

                return (
                  <div key={subject}>
                    <button
                      onClick={() => setSelectedSubject(isSelected ? null : subject)}
                      className={`w-full flex items-center justify-between rounded-xl border px-4 py-3 transition-all text-right ${isSelected ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/40'}`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: SUBJECT_COLORS[idx % SUBJECT_COLORS.length] }} />
                        <span className="font-medium text-sm">{subject}</span>
                        {stats?.count > 0 && <span className="text-xs text-muted-foreground">({stats.count} ציונים)</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityColors[priority]}`}>
                          {priorityLabel[priority]}
                        </span>
                        {stats?.avg !== null && stats?.avg !== undefined && (
                          <span className={`text-base font-bold ${stats.avg < 60 ? 'text-red-600' : stats.avg < 75 ? 'text-orange-500' : 'text-green-600'}`}>
                            {stats.avg}
                          </span>
                        )}
                      </div>
                    </button>

                    {/* Expanded subject panel */}
                    <AnimatePresence>
                      {isSelected && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="border border-t-0 border-primary/20 rounded-b-xl bg-primary/5 px-4 py-3 space-y-3">
                            {/* Priority selector */}
                            <div>
                              <p className="text-xs text-muted-foreground mb-1.5 font-medium">עדיפות הנושא:</p>
                              <div className="flex gap-1.5">
                                {['low', 'normal', 'high'].map(p => (
                                  <button
                                    key={p}
                                    onClick={() => savePriority(subject, p)}
                                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${priority === p ? priorityColors[p] + ' ring-1 ring-inset' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                                  >
                                    {priorityLabel[p]}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Stats */}
                            {stats && stats.count > 0 && (
                              <div className="grid grid-cols-3 gap-2">
                                <div className="bg-white dark:bg-card rounded-lg p-2 text-center">
                                  <div className="text-lg font-bold text-primary">{stats.avg}</div>
                                  <div className="text-[10px] text-muted-foreground">ממוצע</div>
                                </div>
                                <div className="bg-white dark:bg-card rounded-lg p-2 text-center">
                                  <div className="text-lg font-bold">{stats.count}</div>
                                  <div className="text-[10px] text-muted-foreground">ציונים</div>
                                </div>
                                <div className="bg-white dark:bg-card rounded-lg p-2 text-center">
                                  <div className={`text-lg font-bold ${stats.below60 > 0 ? 'text-red-600' : 'text-green-600'}`}>{stats.below60}</div>
                                  <div className="text-[10px] text-muted-foreground">מתחת 60</div>
                                </div>
                              </div>
                            )}

                            {/* Students struggling */}
                            {(() => {
                              const struggling = grades
                                .filter(g => g.subject === subject && g.score < 65)
                                .map(g => ({ student: studentMap[g.student_id], score: g.score }))
                                .filter(x => x.student)
                                .slice(0, 4);
                              if (!struggling.length) return null;
                              return (
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground mb-1.5">תלמידים מתקשים:</p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {struggling.map(({ student, score }) => (
                                      <button
                                        key={student.id}
                                        onClick={() => navigate(`/students?id=${student.id}`)}
                                        className="flex items-center gap-1.5 bg-white dark:bg-card border border-red-100 rounded-full px-2.5 py-1 text-xs hover:border-red-300 transition-colors"
                                      >
                                        <span>{student.name}</span>
                                        <span className="text-red-500 font-bold">{score}</span>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              );
                            })()}

                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" className="text-xs" onClick={() => navigate('/grades')}>
                                הוסף ציון לנושא זה
                              </Button>
                              {isCustom && (
                                <Button size="sm" variant="ghost" className="text-xs text-destructive" onClick={() => { removeCustomSubject(subject); setSelectedSubject(null); }}>
                                  הסר נושא
                                </Button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>

            {allSubjects.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-sm mb-2">אין נושאים עדיין. הוסף ציונים או הוסף נושא ידנית.</p>
              </div>
            )}
          </div>
        )}

        {/* ═══ STUDENTS TAB ═══ */}
        {activeTab === 'students' && (
          <div className="space-y-4">
            {studentStats.length > 0 ? (
              <>
                <Card>
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-sm">השוואת ממוצעים</CardTitle>
                  </CardHeader>
                  <CardContent className="px-2 pb-4">
                    <ResponsiveContainer width="100%" height={Math.max(180, studentStats.length * 28)}>
                      <BarChart data={studentStats.map(s => ({ name: s.student.name, avg: s.avg }))} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={70} />
                        <Tooltip />
                        <Bar dataKey="avg" name="ממוצע" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Student list with nav */}
                <div className="space-y-1.5">
                  {studentStats.map(({ student, avg, count }) => (
                    <button
                      key={student.id}
                      onClick={() => navigate(`/students?id=${student.id}`)}
                      className="w-full flex items-center justify-between bg-card border border-border rounded-xl px-4 py-3 hover:border-primary/40 transition-colors text-right"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                          {student.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{student.name}</p>
                          <p className="text-xs text-muted-foreground">{count} ציונים</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-lg font-bold ${avg < 60 ? 'text-red-600' : avg < 75 ? 'text-orange-500' : 'text-green-600'}`}>{avg}</span>
                        <ArrowLeft className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-16 text-muted-foreground">
                <p className="text-sm">אין ציונים לתלמידים עדיין.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}