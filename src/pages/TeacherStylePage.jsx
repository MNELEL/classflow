import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Brain, RefreshCw, Trash2, CheckCircle2, Sparkles,
  BookOpen, Mic, FileText, AlertCircle, ChevronDown, ChevronUp,
  Zap, Target, MessageSquare, Layers, Quote
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  extractStyleFromLibrary, loadStyleProfile,
  clearStyleProfile, saveStyleProfile
} from '@/lib/teacherStyle';

const SOURCE_TYPE_LABELS = {
  pdf: { label: 'PDF', icon: FileText, color: 'text-red-500' },
  word_doc: { label: 'Word', icon: FileText, color: 'text-blue-500' },
  audio_recording: { label: 'הקלטת שיעור', icon: Mic, color: 'text-violet-500' },
  audio_file: { label: 'קובץ קול', icon: Mic, color: 'text-violet-500' },
  text_note: { label: 'הערה', icon: FileText, color: 'text-emerald-500' },
  presentation: { label: 'מצגת', icon: Layers, color: 'text-orange-500' },
  youtube_link: { label: 'YouTube', icon: BookOpen, color: 'text-red-500' },
  worksheet: { label: 'דף עבודה', icon: BookOpen, color: 'text-primary' },
};

function getItemContent(item) {
  return [item.transcript, item.ai_summary, ...(item.ai_key_points || []), item.description]
    .filter(Boolean).join('\n').trim();
}

function ItemChip({ item }) {
  const meta = SOURCE_TYPE_LABELS[item.source_type] || { label: item.source_type, icon: FileText, color: 'text-muted-foreground' };
  const Icon = meta.icon;
  const hasContent = getItemContent(item).length > 80;
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs ${hasContent ? 'border-primary/20 bg-primary/5' : 'border-border bg-muted/30 opacity-50'}`}>
      <Icon className={`w-3 h-3 ${meta.color}`} />
      <span className="font-medium truncate max-w-[120px]">{item.title}</span>
      {hasContent && <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />}
    </div>
  );
}

function ProfileSection({ icon: Icon, title, children }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold">{title}</span>
      </div>
      {children}
    </div>
  );
}

function TextRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="grid grid-cols-[90px_1fr] gap-2 text-xs">
      <span className="text-muted-foreground pt-0.5">{label}</span>
      <span className="text-foreground leading-relaxed">{value}</span>
    </div>
  );
}

export default function TeacherStylePage() {
  const [profile, setProfile] = useState(loadStyleProfile);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [expandedSection, setExpandedSection] = useState('writing');

  const { data: libraryItems = [] } = useQuery({
    queryKey: ['library'],
    queryFn: () => base44.entities.LibraryItem.list('-created_date', 200),
  });

  const richItems  = libraryItems.filter(i => !i.is_archived && getItemContent(i).length > 80);
  const readyItems = libraryItems.filter(i => !i.is_archived && i.ai_status === 'ready' && getItemContent(i).length > 80);
  const totalItems = libraryItems.filter(i => !i.is_archived).length;

  async function handleLearnStyle() {
    if (richItems.length === 0) {
      toast.error('אין חומרים עם תוכן בספרייה — העלה קבצים ועבד אותם עם AI קודם');
      return;
    }
    setLoading(true);
    setProgress(0);
    try {
      const result = await extractStyleFromLibrary(libraryItems, (label, pct) => {
        setProgressLabel(label);
        setProgress(pct);
      });
      if (result) {
        setProfile(result);
        toast.success(`פרופיל עודכן — נותח מ-${result.items_count} חומרים!`);
      }
    } catch (e) {
      toast.error('שגיאה בניתוח — נסה שוב');
    }
    setLoading(false);
    setProgress(0);
  }

  function handleClear() {
    clearStyleProfile();
    setProfile(null);
    toast.success('פרופיל הסגנון נמחק');
  }

  const sections = [
    { id: 'writing',   label: 'סגנון כתיבה', icon: MessageSquare },
    { id: 'questions', label: 'שאלות',        icon: Quote },
    { id: 'pedagogy',  label: 'פדגוגיה',      icon: Target },
    { id: 'vocab',     label: 'אוצר מילים',  icon: Zap },
  ];

  return (
    <AppLayout>
      <div className="p-4 max-w-2xl mx-auto space-y-5 pb-8" dir="rtl">

        {/* Hero */}
        <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/15 p-5">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center shrink-0">
              <Brain className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-lg">פרופיל הסגנון שלי</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                הבינה המלאכותית לומדת את סגנון ההוראה הייחודי שלך מהחומרים שהעלת, ומשתמשת בו בכל יצירת תוכן.
              </p>
            </div>
          </div>
        </div>

        {/* Library status */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              חומרים בספרייה
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-xl bg-muted/40">
                <div className="text-xl font-bold text-foreground">{totalItems}</div>
                <div className="text-[10px] text-muted-foreground">סה"כ חומרים</div>
              </div>
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20">
                <div className="text-xl font-bold text-emerald-600">{readyItems.length}</div>
                <div className="text-[10px] text-muted-foreground">עובדו ע"י AI</div>
              </div>
              <div className="p-2 rounded-xl bg-primary/5">
                <div className="text-xl font-bold text-primary">{richItems.length}</div>
                <div className="text-[10px] text-muted-foreground">מוכנים לניתוח</div>
              </div>
            </div>

            {richItems.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">חומרים שינותחו:</p>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                  {richItems.slice(0, 20).map(item => <ItemChip key={item.id} item={item} />)}
                  {richItems.length > 20 && (
                    <div className="px-2.5 py-1.5 rounded-lg border border-border text-xs text-muted-foreground">
                      +{richItems.length - 20} נוספים
                    </div>
                  )}
                </div>
              </div>
            )}

            {richItems.length === 0 && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-300">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>העלה חומרים לספרייה (קבצי PDF, Word, הקלטות שיעור) ועבד אותם עם AI — ואז לחץ "למד סגנון"</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action button */}
        {loading ? (
          <Card className="border-primary/20">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-primary animate-pulse" />
                <span className="text-sm font-medium">{progressLabel || 'מנתח...'}</span>
              </div>
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                מנתח {richItems.length} חומרים — זה ייקח כ-30 שניות
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="flex gap-2">
            <Button className="flex-1 gap-2" onClick={handleLearnStyle} disabled={richItems.length === 0}>
              {profile
                ? <><RefreshCw className="w-4 h-4" /> עדכן פרופיל ({richItems.length} חומרים)</>
                : <><Brain className="w-4 h-4" /> למד את הסגנון שלי ({richItems.length} חומרים)</>
              }
            </Button>
            {profile && (
              <Button variant="outline" size="icon" className="text-destructive hover:text-destructive border-destructive/20" onClick={handleClear}>
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}

        {/* Profile display */}
        <AnimatePresence>
          {profile && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {/* Status banner */}
              <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                    פרופיל פעיל — AI ישתמש בסגנון שלך
                  </span>
                  <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70">
                    נותח מ-{profile.items_count} חומרים · {new Date(profile.generated_at).toLocaleDateString('he-IL', { day: 'numeric', month: 'long' })}
                  </p>
                </div>
                <Sparkles className="w-4 h-4 text-emerald-500 shrink-0" />
              </div>

              {/* Section tabs */}
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                {sections.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setExpandedSection(expandedSection === s.id ? null : s.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border ${
                      expandedSection === s.id
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border text-muted-foreground hover:border-primary/30'
                    }`}
                  >
                    <s.icon className="w-3 h-3" />
                    {s.label}
                  </button>
                ))}
              </div>

              {/* Section content */}
              <AnimatePresence mode="wait">
                {expandedSection === 'writing' && (
                  <motion.div key="writing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <Card>
                      <CardContent className="p-4 space-y-3">
                        <ProfileSection icon={MessageSquare} title="סגנון כתיבה">
                          <div className="space-y-2">
                            <TextRow label="שפה" value={profile.language_style} />
                            <TextRow label="משפטים" value={profile.sentence_patterns} />
                            <TextRow label="הסברים" value={profile.explanation_style} />
                            <TextRow label="מבנה" value={profile.structure_preference} />
                            <TextRow label="פורמט" value={profile.formatting_habits} />
                            <TextRow label="טון" value={profile.tone} />
                          </div>
                        </ProfileSection>

                        {profile.sample_sentences?.length > 0 && (
                          <>
                            <Separator />
                            <div className="space-y-1.5">
                              <p className="text-xs font-medium text-muted-foreground">משפטים בסגנון שלך:</p>
                              {profile.sample_sentences.map((s, i) => (
                                <div key={i} className="text-xs italic bg-muted/30 rounded-lg p-2.5 border-r-2 border-primary/40">
                                  "{s}"
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {expandedSection === 'questions' && (
                  <motion.div key="questions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <Card>
                      <CardContent className="p-4 space-y-3">
                        <ProfileSection icon={Quote} title="סגנון שאלות">
                          <TextRow label="אופי" value={profile.question_style} />
                          <TextRow label="מבחנים" value={profile.assessment_style} />
                        </ProfileSection>

                        {profile.question_openings?.length > 0 && (
                          <>
                            <Separator />
                            <div className="space-y-1.5">
                              <p className="text-xs font-medium text-muted-foreground">פתיחות שאלות אופייניות:</p>
                              <div className="flex flex-wrap gap-1.5">
                                {profile.question_openings.map((q, i) => (
                                  <Badge key={i} variant="secondary" className="text-xs">{q}</Badge>
                                ))}
                              </div>
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {expandedSection === 'pedagogy' && (
                  <motion.div key="pedagogy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <Card>
                      <CardContent className="p-4 space-y-3">
                        <ProfileSection icon={Target} title="גישה פדגוגית">
                          <div className="space-y-2">
                            <TextRow label="גישה" value={profile.pedagogical_approach} />
                            <TextRow label="רמת קושי" value={profile.difficulty_calibration} />
                            <TextRow label="הדגשים" value={profile.emphasis_patterns} />
                            <TextRow label="דרגתיות" value={profile.learning_progression} />
                            <TextRow label="מוטיבציה" value={profile.motivational_elements} />
                          </div>
                        </ProfileSection>

                        {profile.teaching_methods?.length > 0 && (
                          <>
                            <Separator />
                            <div className="space-y-1.5">
                              <p className="text-xs font-medium text-muted-foreground">שיטות הוראה:</p>
                              <div className="flex flex-wrap gap-1.5">
                                {profile.teaching_methods.map((m, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">{m}</Badge>
                                ))}
                              </div>
                            </div>
                          </>
                        )}

                        {profile.topics_covered?.length > 0 && (
                          <>
                            <Separator />
                            <div className="space-y-1.5">
                              <p className="text-xs font-medium text-muted-foreground">תחומי הוראה:</p>
                              <div className="flex flex-wrap gap-1.5">
                                {profile.topics_covered.map((t, i) => (
                                  <Badge key={i} className="text-xs bg-primary/10 text-primary border-primary/20">{t}</Badge>
                                ))}
                              </div>
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {expandedSection === 'vocab' && (
                  <motion.div key="vocab" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <Card>
                      <CardContent className="p-4 space-y-3">
                        {profile.key_vocabulary?.length > 0 && (
                          <ProfileSection icon={Zap} title="מילות מפתח ייחודיות">
                            <div className="flex flex-wrap gap-1.5">
                              {profile.key_vocabulary.map((w, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">{w}</Badge>
                              ))}
                            </div>
                          </ProfileSection>
                        )}

                        {profile.recurring_phrases?.length > 0 && (
                          <>
                            <Separator />
                            <ProfileSection icon={Quote} title="ביטויים חוזרים">
                              <div className="space-y-1">
                                {profile.recurring_phrases.map((p, i) => (
                                  <div key={i} className="text-xs bg-muted/30 rounded-lg px-2.5 py-1.5 border-r-2 border-primary/30">
                                    "{p}"
                                  </div>
                                ))}
                              </div>
                            </ProfileSection>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* How it works */}
        {!profile && (
          <Card className="border-dashed">
            <CardContent className="p-4 space-y-3">
              <p className="text-sm font-semibold text-center">איך זה עובד?</p>
              {[
                { step: '1', text: 'העלה חומרים — PDF, Word, הקלטות שיעור, מבחנים — לספרייה' },
                { step: '2', text: 'עבד אותם עם AI (כפתור "נתח עם AI" בספרייה)' },
                { step: '3', text: 'לחץ "למד סגנון" — הבינה המלאכותית תנתח את כל חומריך' },
                { step: '4', text: 'מעכשיו כל מה שה-AI יצור — ייצא בסגנון הייחודי שלך' },
              ].map(({ step, text }) => (
                <div key={step} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {step}
                  </div>
                  <p className="text-sm text-muted-foreground">{text}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}