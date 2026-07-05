import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BookOpen, Plus, Trash2, ChevronDown, ChevronUp, X, Edit2, Check } from 'lucide-react';
import { motion } from 'framer-motion';

const STORAGE_KEY = 'classmanager_study_trackers';

function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch { return null; }
}
function save(data) { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }

const DEFAULT_TRACKERS = [
  {
    id: 'bava-kamma',
    name: 'בבא קמא',
    color: 'amber',
    type: 'items',
    items: [
      'ב','ג','ד','ה','ו','ז','ח','ט','י','יא','יב','יג','יד','טו','טז','יז','יח','יט','כ',
      'כא','כב','כג','כד','כה','כו','כז','כח','כט','ל','לא','לב','לג','לד','לה','לו','לז','לח','לט','מ',
      'מא','מב','מג','מד','מה','מו','מז','מח','מט','נ','נא','נב','נג','נד','נה','נו','נז','נח','נט','ס',
      'סא','סב','סג','סד','סה','סו','סז','סח','סט','ע','עא','עב','עג','עד','עה','עו','עז','עח','עט','פ',
      'פא','פב','פג','פד','פה','פו','פז','פח','פט','צ','צא','צב','צג','צד','צה','צו','צז','צח','צט','ק',
      'קא','קב','קג','קד','קה','קו','קז','קח','קט','קי','קיא','קיב','קיג','קיד','קטו','קטז','קיז','קיח','קיט'
    ],
    completed: [],
    unit_label: 'דף',
  }
];

const COLORS = [
  { key: 'amber', bar: 'bg-amber-500', badge: 'bg-amber-100 text-amber-800', btn_on: 'bg-amber-500 border-amber-500 text-white', btn_off: 'hover:border-amber-400 hover:text-amber-700' },
  { key: 'blue', bar: 'bg-blue-500', badge: 'bg-blue-100 text-blue-800', btn_on: 'bg-blue-500 border-blue-500 text-white', btn_off: 'hover:border-blue-400 hover:text-blue-700' },
  { key: 'green', bar: 'bg-green-500', badge: 'bg-green-100 text-green-800', btn_on: 'bg-green-500 border-green-500 text-white', btn_off: 'hover:border-green-400 hover:text-green-700' },
  { key: 'purple', bar: 'bg-purple-500', badge: 'bg-purple-100 text-purple-800', btn_on: 'bg-purple-500 border-purple-500 text-white', btn_off: 'hover:border-purple-400 hover:text-purple-700' },
  { key: 'rose', bar: 'bg-rose-500', badge: 'bg-rose-100 text-rose-800', btn_on: 'bg-rose-500 border-rose-500 text-white', btn_off: 'hover:border-rose-400 hover:text-rose-700' },
  { key: 'teal', bar: 'bg-teal-500', badge: 'bg-teal-100 text-teal-800', btn_on: 'bg-teal-500 border-teal-500 text-white', btn_off: 'hover:border-teal-400 hover:text-teal-700' },
];

function colorFor(key) { return COLORS.find(c => c.key === key) || COLORS[0]; }

export default function StudyProgressTracker() {
  const [trackers, setTrackers] = useState(() => load() || DEFAULT_TRACKERS);
  const [expandedId, setExpandedId] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // new tracker form
  const [newName, setNewName] = useState('');
  const [newItems, setNewItems] = useState('');
  const [newColor, setNewColor] = useState('blue');
  const [newUnitLabel, setNewUnitLabel] = useState('יחידה');

  function update(updated) { setTrackers(updated); save(updated); }

  function toggleItem(trackerId, item) {
    update(trackers.map(t => {
      if (t.id !== trackerId) return t;
      const completed = t.completed.includes(item)
        ? t.completed.filter(c => c !== item)
        : [...t.completed, item];
      return { ...t, completed };
    }));
  }

  function addTracker() {
    if (!newName.trim() || !newItems.trim()) return;
    const items = newItems.split(/[\n,،،]+/).map(s => s.trim()).filter(Boolean);
    const tracker = {
      id: Date.now().toString(),
      name: newName.trim(),
      color: newColor,
      type: 'items',
      items,
      completed: [],
      unit_label: newUnitLabel.trim() || 'יחידה',
    };
    update([...trackers, tracker]);
    setNewName(''); setNewItems(''); setNewColor('blue'); setNewUnitLabel('יחידה');
    setShowAdd(false);
  }

  function deleteTracker(id) {
    update(trackers.filter(t => t.id !== id));
    if (expandedId === id) setExpandedId(null);
  }

  function resetTracker(id) {
    update(trackers.map(t => t.id === id ? { ...t, completed: [] } : t));
  }

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            מעקב התקדמות לימוד
            <Badge className="bg-primary/10 text-primary border-0 text-[10px]">{trackers.length} מעקבים</Badge>
          </CardTitle>
          <Button size="sm" variant="ghost" className="h-7 px-2 gap-1 text-xs" aria-label="הוסף מעקב חדש" onClick={() => setShowAdd(v => !v)}>
            <Plus className="w-3.5 h-3.5" /> הוסף
          </Button>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4 space-y-3">
        {/* Add new tracker form */}
        {showAdd && (
          <div className="border border-dashed border-primary/40 rounded-xl p-3 bg-primary/5 space-y-2">
            <p className="text-xs font-semibold text-primary">מעקב חדש</p>
            <Input
              placeholder="שם המעקב (למשל: בבא מציעא, פרקי אבות, הלכות שבת)"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className="h-8 text-xs"
            />
            <textarea
              placeholder="פרט את היחידות — מופרדות בפסיק או שורה חדשה&#10;לדוגמה: ב, ג, ד, ה, ו&#10;או: פרק א, פרק ב, פרק ג"
              value={newItems}
              onChange={e => setNewItems(e.target.value)}
              className="w-full border border-input rounded-md px-3 py-2 text-xs bg-background min-h-[60px] resize-none"
            />
            <div className="flex gap-2 items-center flex-wrap">
              <Input
                placeholder='תווית יחידה (דף / פרק / שיעור...)'
                value={newUnitLabel}
                onChange={e => setNewUnitLabel(e.target.value)}
                className="h-8 text-xs flex-1 min-w-[100px]"
              />
              <div className="flex gap-1">
                {COLORS.map(c => (
                  <button
                    key={c.key}
                    onClick={() => setNewColor(c.key)}
                    className={`w-5 h-5 rounded-full ${c.bar} ${newColor === c.key ? 'ring-2 ring-offset-1 ring-current' : 'opacity-60'}`}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={addTracker} className="flex-1 h-7 text-xs">צור מעקב</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)} className="h-7 px-2"><X className="w-3.5 h-3.5" /></Button>
            </div>
          </div>
        )}

        {/* Trackers list */}
        {trackers.map(tracker => {
          const col = colorFor(tracker.color);
          const count = tracker.completed.length;
          const total = tracker.items.length;
          const percent = total > 0 ? Math.round((count / total) * 100) : 0;
          const isOpen = expandedId === tracker.id;

          return (
            <div key={tracker.id} className="border border-border/50 rounded-xl overflow-hidden">
              {/* Header row */}
              <div
                className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted/30"
                onClick={() => setExpandedId(isOpen ? null : tracker.id)}
              >
                <div className={`w-2.5 h-2.5 rounded-full ${col.bar} shrink-0`} />
                <span className="text-xs font-semibold flex-1">{tracker.name}</span>
                <Badge className={`${col.badge} border-0 text-[10px]`}>{count}/{total} {tracker.unit_label}</Badge>
                <span className="text-[10px] font-bold" style={{ color: 'inherit' }}>{percent}%</span>
                {isOpen ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
              </div>

              {/* Progress bar with ring for completed */}
              <div className="px-3 pb-1 flex items-center gap-2">
                {percent === 100 && (
                  <span className="text-emerald-600 text-sm">✅</span>
                )}
                <div className="flex-1 w-full bg-muted rounded-full h-2">
                  <motion.div
                    className={`h-2 rounded-full ${col.bar} transition-all duration-700`}
                    initial={{ width: 0 }}
                    animate={{ width: `${percent}%` }}
                    transition={{ duration: 0.8 }}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>

              {/* Expanded: item grid */}
              {isOpen && (
                <div className="px-3 pb-3 pt-2 border-t border-border/40">
                  <div className="flex flex-wrap gap-1 mb-2">
                    {tracker.items.map(item => {
                      const done = tracker.completed.includes(item);
                      return (
                        <button
                          key={item}
                          onClick={() => toggleItem(tracker.id, item)}
                          aria-label={`${item} - ${done ? 'הוסף' : 'סמן כהושלם'}`}
                          className={`min-w-[32px] px-1.5 h-7 rounded text-[11px] font-medium border transition-all ${
                            done
                              ? `${col.btn_on} shadow-sm`
                              : `bg-background border-border text-muted-foreground ${col.btn_off}`
                          }`}
                        >
                          {item}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-border/30">
                    <span className="text-[10px] text-muted-foreground">סה"כ {total} {tracker.unit_label}ות</span>
                    <div className="flex gap-2">
                      <button onClick={() => resetTracker(tracker.id)} className="text-[10px] text-muted-foreground hover:underline">איפוס</button>
                      <button onClick={() => deleteTracker(tracker.id)} className="text-[10px] text-destructive hover:underline">מחק</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {trackers.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-3">אין מעקבים. לחץ "הוסף" ליצירת מעקב ראשון.</p>
        )}
      </CardContent>
    </Card>
  );
}