import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, ChevronDown, ChevronUp } from 'lucide-react';

// בבא קמא: דפים ב-קיט
const TOTAL_DAFIM = 119;
const DAF_LETTERS = [
  'ב','ג','ד','ה','ו','ז','ח','ט','י','יא','יב','יג','יד','טו','טז','יז','יח','יט','כ',
  'כא','כב','כג','כד','כה','כו','כז','כח','כט','ל','לא','לב','לג','לד','לה','לו','לז','לח','לט','מ',
  'מא','מב','מג','מד','מה','מו','מז','מח','מט','נ','נא','נב','נג','נד','נה','נו','נז','נח','נט','ס',
  'סא','סב','סג','סד','סה','סו','סז','סח','סט','ע','עא','עב','עג','עד','עה','עו','עז','עח','עט','פ',
  'פא','פב','פג','פד','פה','פו','פז','פח','פט','צ','צא','צב','צג','צד','צה','צו','צז','צח','צט','ק',
  'קא','קב','קג','קד','קה','קו','קז','קח','קט','קי','קיא','קיב','קיג','קיד','קטו','קטז','קיז','קיח','קיט'
];

const STORAGE_KEY = 'classmanager_bk_tracker';

function loadProgress() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}
function saveProgress(arr) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
}

export default function BavaKammaTracker() {
  const [completed, setCompleted] = useState(loadProgress);
  const [expanded, setExpanded] = useState(false);

  function toggleDaf(daf) {
    setCompleted(prev => {
      const next = prev.includes(daf) ? prev.filter(d => d !== daf) : [...prev, daf];
      saveProgress(next);
      return next;
    });
  }

  const count = completed.length;
  const percent = Math.round((count / TOTAL_DAFIM) * 100);

  // Split into chapters (roughly) — Bava Kamma has 10 chapters
  const CHAPTERS = [
    { name: 'ארבעה אבות נזיקין', dafim: DAF_LETTERS.slice(0, 11) },   // ב–יב
    { name: 'כיצד הרגל', dafim: DAF_LETTERS.slice(11, 19) },           // יג–כ
    { name: 'המניח את הכד', dafim: DAF_LETTERS.slice(19, 26) },        // כא–כז
    { name: 'שור שנגח', dafim: DAF_LETTERS.slice(26, 37) },            // כח–לז
    { name: 'שור שנגח את הפרה', dafim: DAF_LETTERS.slice(37, 44) },   // לח–מד
    { name: 'מרובה', dafim: DAF_LETTERS.slice(44, 66) },               // מה–סה
    { name: 'הכונס', dafim: DAF_LETTERS.slice(66, 80) },               // סו–פ
    { name: 'שור שנגח חמור', dafim: DAF_LETTERS.slice(80, 93) },      // פא–צג
    { name: 'הגוזל עצים', dafim: DAF_LETTERS.slice(93, 107) },        // צד–קו
    { name: 'הגוזל בתרא', dafim: DAF_LETTERS.slice(107) },             // קז–קיט
  ];

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2 pt-4 px-4">
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setExpanded(v => !v)}
        >
          <CardTitle className="text-sm flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-amber-600" />
            מעקב הספקים — בבא קמא
            <Badge className="bg-amber-100 text-amber-800 border-0 text-[10px]">
              {count}/{TOTAL_DAFIM} דפים
            </Badge>
          </CardTitle>
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>

        {/* Progress bar always visible */}
        <div className="mt-2">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] text-muted-foreground">{count} דפים הוספקו</span>
            <span className="text-[10px] font-bold text-amber-700">{percent}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="h-2 rounded-full bg-amber-500 transition-all duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="px-4 pb-4 space-y-3">
          {CHAPTERS.map(chapter => {
            const chapterDone = chapter.dafim.filter(d => completed.includes(d)).length;
            return (
              <div key={chapter.name}>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[11px] font-semibold text-muted-foreground">{chapter.name}</p>
                  <span className="text-[10px] text-muted-foreground">{chapterDone}/{chapter.dafim.length}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {chapter.dafim.map(daf => {
                    const done = completed.includes(daf);
                    return (
                      <button
                        key={daf}
                        onClick={() => toggleDaf(daf)}
                        className={`w-8 h-7 rounded text-[11px] font-medium border transition-all ${
                          done
                            ? 'bg-amber-500 border-amber-500 text-white shadow-sm'
                            : 'bg-background border-border text-muted-foreground hover:border-amber-400 hover:text-amber-700'
                        }`}
                        title={`דף ${daf}`}
                      >
                        {daf}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <div className="flex justify-between items-center pt-1 border-t border-border/40">
            <span className="text-[10px] text-muted-foreground">סה"כ: {TOTAL_DAFIM} דפים</span>
            <button
              onClick={() => { setCompleted([]); saveProgress([]); }}
              className="text-[10px] text-destructive hover:underline"
            >
              איפוס
            </button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}