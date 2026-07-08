import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MobileSelect, SelectItem } from '@/components/ui/MobileSelect';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, Sparkles, ClipboardList, Save, Plus } from 'lucide-react';
import { toast } from 'sonner';

const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: 'קל', desc: 'תרגול בסיסי, הכוונה צמודה' },
  { value: 'medium', label: 'בינוני', desc: 'איזון בין יסודות לאתגר' },
  { value: 'hard', label: 'קשה', desc: 'חשיבה עצמאית, הרחבות' },
];

const TASK_TYPES = [
  { value: 'practice', label: 'תרגול' },
  { value: 'review', label: 'חזרה' },
  { value: 'project', label: 'פרויקט' },
  { value: 'assessment', label: 'הערכה' },
];

export default function TaskGenerator() {
  const qc = useQueryClient();
  const [selectedItemId, setSelectedItemId] = useState('');
  const [customTopic, setCustomTopic] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [taskType, setTaskType] = useState('practice');
  const [numTasks, setNumTasks] = useState(5);
  const [generating, setGenerating] = useState(false);
  const [tasks, setTasks] = useState([]);

  const { data: libraryItems = [] } = useQuery({
    queryKey: ['library'],
    queryFn: () => base44.entities.LibraryItem.list('-created_date', 100),
  });
  const { data: students = [] } = useQuery({
    queryKey: ['students'],
    queryFn: () => base44.entities.Student.filter({ is_active: true }),
  });

  const itemsWithContent = libraryItems.filter(i => i.transcript || i.ai_summary);

  async function handleGenerate() {
    const item = libraryItems.find(i => i.id === selectedItemId);
    const topic = item?.title || customTopic.trim();
    if (!topic) { toast.error('בחר חומר או הזן נושא'); return; }

    setGenerating(true);
    setTasks([]);
    try {
      const content = item?.transcript || item?.ai_summary || '';
      const diffDesc = DIFFICULTY_OPTIONS.find(d => d.value === difficulty)?.desc || '';
      const typeLabel = TASK_TYPES.find(t => t.value === taskType)?.label || '';

      const prompt = `אתה מורה מומחה. צור ${numTasks} משימות לימודיות מותאמות.

נושא: "${topic}"
${item?.subject ? `מקצוע: ${item.subject}` : ''}
סוג משימה: ${typeLabel}
רמת קושי: ${diffDesc}
${content ? `תוכן רקע:\n"""\n${content.slice(0, 3000)}\n"""` : ''}

צור ${numTasks} משימות בעברית בלבד. לכל משימה:
- כותרת קצרה וברורה
- תיאור מפורט מה על התלמיד לעשות
- משך זמן מוערך (בדקות)
- נקודות/ציון מומלץ

התאם את רמת הקושי ל${diffDesc}.`;

      const res = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            tasks: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string' },
                  duration_minutes: { type: 'number' },
                  points: { type: 'number' },
                },
              },
            },
          },
        },
      });

      setTasks(res.tasks || []);
      toast.success(`${res.tasks?.length || 0} משימות הופקו!`);
    } catch (err) {
      toast.error('שגיאה ביצירת משימות: ' + (err.message || ''));
    } finally {
      setGenerating(false);
    }
  }

  async function handleSaveAll() {
    if (tasks.length === 0) return;
    try {
      const item = libraryItems.find(i => i.id === selectedItemId);
      const subject = item?.subject || '';
      for (const t of tasks) {
        await base44.entities.Task.create({
          title: t.title,
          description: t.description,
          subject,
          status: 'pending',
          priority: difficulty === 'hard' ? 'high' : difficulty === 'easy' ? 'low' : 'medium',
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        });
      }
      qc.invalidateQueries({ queryKey: ['tasks'] });
      toast.success(`${tasks.length} משימות נשמרו!`);
      setTasks([]);
    } catch {
      toast.error('שגיאה בשמירת משימות');
    }
  }

  return (
    <Card className="border-border/60">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
            <ClipboardList className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="font-bold text-sm">מחולל משימות</h3>
            <p className="text-[11px] text-muted-foreground">משימות לימודיות לפי נושא, רמה וכמות</p>
          </div>
        </div>

        {/* Source */}
        <div className="space-y-2">
          <label className="text-xs font-semibold">מקור הנושא</label>
          <MobileSelect value={selectedItemId} onValueChange={(v) => { setSelectedItemId(v); if (v) setCustomTopic(''); }} placeholder="בחר מהספרייה (אופציונלי)..." className="h-10">
            <SelectItem value={null}>— ללא, אכתוב נושא ידנית —</SelectItem>
            {itemsWithContent.map(i => (
              <SelectItem key={i.id} value={i.id}>{i.title}{i.subject ? ` · ${i.subject}` : ''}</SelectItem>
            ))}
          </MobileSelect>
          {!selectedItemId && (
            <Input
              placeholder="או הזן נושא חופשי (לדוגמה: כפל מטריצות, פרשת נח)"
              value={customTopic}
              onChange={e => setCustomTopic(e.target.value)}
              className="h-10"
            />
          )}
        </div>

        {/* Difficulty */}
        <div>
          <label className="text-xs font-semibold mb-1.5 block">רמת קושי</label>
          <div className="grid grid-cols-3 gap-2">
            {DIFFICULTY_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setDifficulty(opt.value)}
                disabled={generating}
                className={`p-2.5 rounded-xl border text-center transition-all min-h-[60px] ${difficulty === opt.value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}
              >
                <p className="text-xs font-bold">{opt.label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Type + count */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold mb-1.5 block">סוג משימה</label>
            <MobileSelect value={taskType} onValueChange={setTaskType} className="h-9 text-xs">
              {TASK_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </MobileSelect>
          </div>
          <div>
            <label className="text-xs font-semibold mb-1.5 block">מספר משימות</label>
            <div className="flex gap-1">
              {[3, 5, 8, 10].map(n => (
                <button
                  key={n}
                  onClick={() => setNumTasks(n)}
                  disabled={generating}
                  className={`flex-1 h-9 rounded-lg border text-xs font-medium transition-all ${numTasks === n ? 'bg-primary text-primary-foreground border-primary' : 'border-border'}`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>

        <Button onClick={handleGenerate} disabled={generating || (!selectedItemId && !customTopic.trim())} className="w-full gap-2 h-11">
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {generating ? 'מייצר משימות...' : `צור ${numTasks} משימות`}
        </Button>

        {/* Results */}
        {tasks.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0">{tasks.length} משימות</Badge>
              <Button size="sm" className="text-xs gap-1 h-7" onClick={handleSaveAll}>
                <Save className="w-3 h-3" /> שמור הכל למשימות
              </Button>
            </div>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {tasks.map((t, i) => (
                <div key={i} className="bg-muted/30 rounded-xl p-3 border border-border/60">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-bold flex-1">{i + 1}. {t.title}</p>
                    <div className="flex gap-1 shrink-0">
                      {t.duration_minutes && <Badge variant="outline" className="text-[10px]">⏱ {t.duration_minutes}ד׳</Badge>}
                      {t.points && <Badge variant="outline" className="text-[10px]">⭐ {t.points}</Badge>}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{t.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}