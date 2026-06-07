# 🏫 ClassManager Pro — AI Builder Prompt
## "בנה לי את האפליקציה הזו בדיוק"

---

> העתק את כל הטקסט הזה והדבק אותו ב-AI builder כלשהו (Cursor, v0, Bolt, Lovable, וכו').

---

## בקשה כללית

בנה אפליקציית ניהול כיתה למורים בשם **ClassManager Pro**.
האפליקציה היא PWA מובייל-ראשון, כיוון RTL מלא (עברית), עם bottom navigation bar.
ערימת טכנולוגיה: **React 18 + Vite + TypeScript/JavaScript + Tailwind CSS + shadcn/ui + React Router v6 + @tanstack/react-query v5 + framer-motion + lucide-react**.

---

## 🎨 עיצוב ו-Design System

### גופנים
```css
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700;800&display=swap');
body { font-family: 'Plus Jakarta Sans', 'Heebo', sans-serif; direction: rtl; }
```

### CSS Variables (index.css) — Light Theme
```css
:root {
  --background: 40 30% 97%;       /* קרם חם */
  --foreground: 224 40% 10%;      /* אינדיגו כהה */
  --card: 0 0% 100%;
  --card-foreground: 224 40% 10%;
  --primary: 237 70% 55%;         /* אינדיגו #4f46e5 */
  --primary-foreground: 0 0% 100%;
  --secondary: 220 18% 94%;
  --secondary-foreground: 224 30% 22%;
  --muted: 220 16% 92%;
  --muted-foreground: 220 10% 48%;
  --accent: 237 75% 96%;
  --accent-foreground: 237 70% 42%;
  --destructive: 4 82% 56%;
  --border: 220 16% 88%;
  --input: 220 16% 90%;
  --ring: 237 70% 55%;
  --radius: 0.75rem;
}
.dark {
  --background: 224 28% 8%;
  --foreground: 220 18% 93%;
  --card: 224 26% 11%;
  --primary: 237 72% 66%;
  --secondary: 224 22% 16%;
  --muted: 224 22% 15%;
  --accent: 237 50% 20%;
  --border: 224 22% 18%;
}
```

### CSS Classes מיוחדות
```css
/* hover עם shadow אינדיגו עדין */
.card-hover { transition: box-shadow 0.2s, transform 0.2s, border-color 0.2s; }
.card-hover:hover { box-shadow: 0 6px 24px rgba(79,70,229,0.12); transform: translateY(-2px); border-color: hsl(237 70% 55% / 0.3); }

/* גבול עליון אינדיגו על כרטיסים */
.card-academic { border-top: 3px solid hsl(237 70% 55% / 0.22); }

/* glassmorphism */
.card-glass { background: rgba(255,255,255,0.85); backdrop-filter: blur(10px); border: 1px solid hsl(220 16% 88%); }

/* gradient רקע לheader */
.bg-academic-gradient { background: linear-gradient(135deg, hsl(237 70% 55% / 0.08) 0%, hsl(40 30% 97%) 60%); }

/* hide scrollbars */
.no-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
.no-scrollbar::-webkit-scrollbar { display: none; }

/* safe areas */
:root { --sat: env(safe-area-inset-top,0px); --sab: env(safe-area-inset-bottom,0px); }
body { overscroll-behavior: none; -webkit-tap-highlight-color: transparent; }
```

---

## 🏗️ Layout ראשי — AppLayout

### מבנה HTML
```
<div dir="rtl" class="min-h-screen bg-background flex flex-col">
  <header class="bg-white/90 backdrop-blur-md border-b border-border sticky top-0 z-50 shadow-sm"
          style="padding-top: env(safe-area-inset-top)">
    <!-- בדשבורד: לוגו + כותרת מרכזית + כפתור הגדרות -->
    <!-- בעמודים אחרים: ChevronRight חזרה + כותרת + כפתור הגדרות -->
  </header>

  <main class="flex-1 overflow-y-auto no-scrollbar"
        style="padding-bottom: calc(64px + env(safe-area-inset-bottom))">
    {children}
  </main>

  <nav class="fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur-md border-t border-border"
       style="padding-bottom: env(safe-area-inset-bottom)">
    <!-- 16 tabs - ראה רשימה למטה -->
  </nav>
</div>
```

### Bottom Navigation — 16 Tabs
| Path | Icon (lucide) | תווית |
|------|--------------|-------|
| `/` | BookOpen | דשבורד |
| `/seating` | LayoutGrid | סידור |
| `/students` | Users | תלמידים |
| `/attendance` | CalendarCheck | נוכחות |
| `/grades` | GraduationCap | ציונים |
| `/library` | Library | ספרייה |
| `/gamification` | Trophy | גמיפיקציה |
| `/toolkit` | Wrench | כלים |
| `/worksheets` | FileText | דפי עבודה |
| `/question-bank` | Layers | בנק שאלות |
| `/lesson-analyzer` | Mic | ניתוח שיעור |
| `/curriculum` | ClipboardList | תוכנית לימודים |
| `/homework` | ClipboardCheck | שיעורי בית |
| `/parents` | Contact | הורים |
| `/sound-board` | Music | לוח צלילים |
| `/student-view` | Eye | תצוגת תלמיד |

**עיצוב Tab**:
- כל tab: `flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[56px] py-2`
- פעיל: `text-primary`, אייקון `scale-110`
- לא פעיל: `text-muted-foreground hover:text-foreground`
- שמירת scroll position per tab בref + חזרה לhead בלחיצה חוזרת על tab פעיל

### Header Logic
- בדשבורד (`/`): לוגו עגול (primary bg, BookOpen icon) + שם בית ספר מ-localStorage + gear icon לsettings
- בכל עמוד אחר: ChevronRight → navigate(-1) + כותרת העמוד + gear icon
- כותרת נקבעת מ: `branding.page_titles[pathname]` || `branding.school_name` || `ClassManager Pro`

---

## 📊 עמוד דשבורד (`/`)

### אנימציות כניסה
כל section נכנס עם framer-motion: `initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }}` עם delay stagger (0.07s בין אלמנטים).

### מבנה
```
1. Header: "סקירה כללית" + כפתור "מדריך חכם" (Map icon) → SmartGuide overlay
2. DailyBriefing component
3. KPI Row 1 — grid-cols-2 md:grid-cols-4, gap-3:
   א. סה"כ תלמידים — Users icon, text-primary, bg-primary/10
   ב. משובצים — CheckCircle2, text-emerald-600, bg-emerald-500/10
   ג. ממתינים — AlertTriangle, text-yellow-600 (אם >0), bg-yellow-500/10
   ד. שביעות רצון % — TrendingUp + SVG ring מונפש + progress bar
      - ≥75%: emerald, ≥50%: yellow, <50%: red
4. KPI Row 2 — grid-cols-2 md:grid-cols-4:
   📊 ממוצע ציונים, text-blue-600
   📅 נוכחות ממוצעת %, text-emerald-600
   📚 ספריית חומרים (כמה פריטים), text-purple-600
   🏆 נקודות הוענקו, text-yellow-600
5. Details Row — grid md:grid-cols-2:
   - "פרטי הסידור הנוכחי": שורות/טורים/תפוסה% (מlocalStorage) — אם ריק → כפתור "צור סידור ראשון"
   - "פרופיל הכיתה": תלמידים עם צרכים מיוחדים / אילוצים / ללא העדפות (Badge counts)
6. AcademicCalendar component (3 tabs: לוח שנה עברי / BK tracker / מעקבי לימוד)
7. StudyProgressTracker component
8. AbsenceAlert component
9. TasksAlert component
10. כפתורי פעולה: "פתח לוח כיתה" + "נהל תלמידים" + PDF/Excel/הדפסה (אם יש נתונים)
```

### SVG Progress Ring (בkpi שביעות רצון)
```jsx
<svg className="w-8 h-8 -rotate-90" viewBox="0 0 32 32">
  <circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" strokeWidth="3" className="opacity-20"/>
  <motion.circle cx="16" cy="16" r="13" fill="none"
    stroke={score>=75?'#22c55e':score>=50?'#eab308':'#ef4444'}
    strokeWidth="3" strokeLinecap="round"
    strokeDasharray={`${2*Math.PI*13}`}
    initial={{ strokeDashoffset: 2*Math.PI*13 }}
    animate={{ strokeDashoffset: 2*Math.PI*13*(1-score/100) }}
    transition={{ duration:1, delay:0.4 }}
  />
</svg>
```

### Skeleton Loaders
בזמן טעינה: `<div className="bg-card border rounded-xl p-4 animate-pulse">` עם divs מוחשכים

---

## 🪑 סידור כיתה (`/seating`)

### ClassroomGrid
- גריד rows×cols של כרטיסי מושב (SeatCard)
- DragDropContext (hello-pangea/dnd): גרור תלמידים בין מושבים ומפאנל
- כל מושב: seat ID, student_id, is_hidden, is_locked, is_gap
- BoardLabelEditor בראש הגריד (כפתור עריכה inline, שמור בlocalStorage)
- pair-right/pair-down: שני מושבים צמודים ויזואלית
- מושב עם קונפליקט (avoid/separate): highlight אדום

### SeatCard
```
ריק: border-dashed border-border/60 + "+" בhover
עם תלמיד: avatar עגול (ראשי שם, bg-primary/10) + שם מקוצר
נעול: מנעול icon בפינה
hidden: opacity 40%
gap: ריק ללא border
```

### GridControls (sidebar/toolbar)
- Sliders: שורות (3-8), טורים (3-10)
- satisfaction score badge + progress bar
- כפתורי מיון: AI / חכם / קבוצות / מנהיגים / קונפליקטים
- undo/redo (history stack)
- export: PDF / Excel / הדפסה
- reset + ייבוא העדפות

### StudentPanel
- רשימת תלמידים לא מושבצים (drag source)
- search bar
- filters: קבוצה, צרכים מיוחדים, העדפות

### Satisfaction Score Algorithm
```
לכל תלמיד משובץ, בדוק:
- row_preference מתאים? +15 נקודות
- side_preference מתאים? +10
- friends יושבים קרוב (<2 מושבים)? +10 כל אחד
- avoid לא יושבים קרוב? +10 כל אחד שלא קרוב
- separate מרוחקים? +15 כל אחד
- special_needs קדמי? +15
- avoid_edges לא בקצה? +10
ממוצע מכל התלמידים = score 0-100
```

### localStorage keys
- `classmanager_seats` — מערך seats [{id, row, col, student_id, is_hidden, is_locked, is_gap}]
- `classmanager_arrangement` — {rows, cols, name}
- `classmanager_history` — undo/redo stack

---

## 👨‍🎓 תלמידים (`/students`)

### Student Entity — כל השדות
```typescript
{
  name: string (required)
  gender: 'male' | 'female' | 'other'
  height: 'short' | 'medium' | 'tall'
  row_preference: 'front' | 'middle' | 'back' | 'none'
  permanent_row: 'front' | 'middle' | 'back' | 'none'
  permanent_col: 'left' | 'center' | 'right' | 'none'
  side_preference: 'left' | 'right' | 'center' | 'none'
  avoid_edges: boolean
  special_needs: Array<'vision'|'hearing'|'adhd'|'mobility'|'other'>
  learning_group: string
  friends: string[] // student IDs
  avoid: string[]   // student IDs
  separate: string[] // student IDs
  group: string
  notes: string
  is_active: boolean (default true)
  academic_level: 'weak'|'below_average'|'average'|'above_average'|'strong'|'excellent'
  traits: Array<'attentive'|'cooperative'|'struggling'|'fast_learner'|
    'needs_extra_explanation'|'needs_teacher_attention'|'needs_encouragement'|
    'disruptive'|'leader'|'shy'>
  achievements: string
  custom_conditions: string
}
```

### StudentForm
- כל שדות Entity בטופס מסודר
- Multi-select לspecial_needs, traits, friends, avoid, separate
- תצוגת Avatar ב-preview

### StudentList
- טבלה + כרטיסים (toggle)
- Search (שם)
- Filters: קבוצה, academic_level, is_active
- כפתורי עריכה/מחיקה per row
- Badge לspecial_needs

### ייבוא CSV + FreeTextImport (LLM)
- FreeTextImport: הדבק טקסט חופשי → LLM מנתח לרשימת תלמידים → preview → שמירה

---

## 📅 נוכחות (`/attendance`)

### AttendanceManager
- בחירת תאריך (calendar popover)
- רשימת כל התלמידים הפעילים
- כל שורה: שם + toggle 3 מצבים: present ✅ / late ⏰ / absent ❌
- color coding: present=emerald, late=yellow, absent=red
- שמירת batch לentity Attendance
- הצגת נתוני נוכחות קיימים לתאריך שנבחר

### Attendance Entity
```
student_id: string
date: string (ISO date)
status: 'present' | 'absent' | 'late'
note: string
```

### AttendanceChart
- recharts BarChart: נוכחות אחרונות 30 יום
- X axis: תאריכים, Y axis: %, bars: present/absent/late stacked

---

## 📈 ציונים (`/grades`)

### Grade Entity
```
student_id: string
subject: string
test_name: string
score: number (0-100)
max_score: number (default 100)
date: string
period: 'weekly'|'monthly'|'exam'|'quiz'|'homework'
notes: string
```

### GradeReportPanel
- טבלה: תלמיד / מקצוע / ציון / תאריך
- filters: מקצוע, תקופה, תלמיד
- ממוצעים per subject (recharts LineChart)
- ranking: top/bottom 5 תלמידים

### AIGradeInput
- textarea: הדבק ציונים בטקסט חופשי ("משה 85, דוד 92...")
- LLM מנתח → preview table → שמירה batch

### AIGradeQuery
- input: "מי הציון הכי גבוה בחשבון?" → LLM מנתח על הנתונים → תשובה

---

## 📚 ספרייה (`/library`)

### LibraryItem Entity
```
title: string
source_type: 'audio_recording'|'audio_file'|'pdf'|'word_doc'|
  'presentation'|'video_file'|'youtube_link'|'external_link'|'text_note'|'image'
file_url: string
youtube_url: string
external_url: string
transcript: string
ai_status: 'pending'|'processing'|'ready'|'error'
ai_summary: string
ai_key_points: string[]
ai_suggested_title: string
ai_suggested_category: string
ai_suggested_tags: string[]
coverage_status: 'not_started'|'in_progress'|'completed'
generated_artifacts: Array<{id, type, title, content, includes_answers, created_at}>
lesson_log: Array<{id, date, student_ids, notes, coverage_percent, homework_assigned}>
category: string
subject: string
tags: string[]
difficulty: 'קל'|'בינוני'|'קשה'
is_favorite: boolean
is_archived: boolean
```

### LibraryItemCard
- כרטיס עם: כותרת, category badge, ai_status indicator, source_type icon
- hover: shadow + scale(1.01)
- favorite star button

### 5 Tabs בעמוד
1. **ספרייה**: grid כרטיסים + search + filters
2. **מתכנן שבועי**: drag & drop items ל-5 ימים (א-ה)
3. **תכנון שיעור**: LessonPlan builder עם blocks (drag order)
4. **כיסוי חומר**: progress per item — not_started/in_progress/completed
5. **פלייליסט**: ordered list לשיעור, play order

### LibraryItemDetail Dialog
- player/viewer לפי source_type (audio: HTMLAudio, youtube: iframe embed, pdf: iframe)
- transcript display
- AI Summary + key points
- Artifacts list + generate new artifact
- Lesson log entries
- Share to parent button

### Artifact Types (LLM generated)
- `student_summary` — סיכום לתלמיד
- `questions` — שאלות הבנה
- `quiz` — בוחן (עם/בלי תשובות)
- `presentation_outline` — מתאר מצגת
- `worksheet` — דף עבודה
- `extended_explanation` — הסבר מורחב

---

## 🏆 גמיפיקציה (`/gamification`)

### Reward Entity
```
student_id: string
student_name: string
points: number (positive or negative)
reason: string
date: string
campaign_id: string
```

### Campaign Entity
```
title: string
target_points: number
start_date: string
end_date: string
reward_description: string
is_active: boolean
```

### 4 Tabs
1. **לוח מובילים**: תלמידים ממוינים לפי סה"כ נקודות, progress bar לtarget, מדליות 🥇🥈🥉
2. **הוסף נקודות**: בחר תלמיד/ים + נקודות + סיבה → שמירה
3. **מבצעים**: Campaign cards עם progress + is_active toggle
4. **נקודות לכיתה**: BulkReward — כל התלמידים בבת אחת

---

## 🛠️ ארגז כלים (`/toolkit`)

### כלים (כל אחד בכרטיס עצמאי)

**NoiseMeter**
- Web Audio API: analyser node
- מד אנלוגי (SVG arc) 0-100% רעש
- צבע: green→yellow→red
- כפתור start/stop

**ExitTicket**
- הזן שאלת סיכום
- LLM מייצר 3 תשובות אפשריות (multiple choice)
- תצוגת QR קישור (לדף תלמיד)

**FlashCards**
- הזן נושא → LLM מייצר 10 כרטיסיות שאלה/תשובה
- flip animation (3D CSS transform)
- prev/next navigation

**RandomWordBoard**
- הזן מילות מפתח/תלמידים
- כפתור "בחר אקראי" → highlight אחד באנימציה

**טיימר שיעור**
- countdown timer עם עיצוב digital clock
- צבע אדום ב-5 דקות אחרונות
- צלצול בסיום

---

## 👩‍👧 הורים (`/parents`)

### 5 Tabs

**שיתוף שיעורים**
- רשימת SharedLesson records (library items ששותפו)
- כל שורה: שם תלמיד, כותרת שיעור, תאריך, viewed_at status, parent_comment

**יומן קשר**
- ParentContact records: תאריך, type, summary, parent_name, initiated_by, follow_up
- הוסף/ערוך/מחק
- filter לפי תלמיד / follow_up_needed

**דוחות תלמיד** (StudentReportGenerator)
- בחר תלמיד + תקופה + שם מורה
- preview: ציונים/משימות/תכונות summary
- export: PDF (print window) / Word (.docx) / WhatsApp (wa.me link) / Email (SendEmail integration)

**תיק תלמיד** (StudentPortfolio + DocumentsVault)
- StudentPortfolioItem records per student
- types: document/photo/diagnosis/parent_letter/historical/other
- upload file, view, download
- filter לפי year

**עלון שבועי** (BulletinGenerator)
- בחר תאריכי תחילה/סיום + שם כיתה
- LLM מייצר: digest_summary, study_points[], recap_questions[], weekly_riddle + answer, activities[]
- תצוגת preview מעוצב
- הדפסה / PDF

---

## 📝 דפי עבודה (`/worksheets`)

### Worksheet Entity
```
title: string
subject: string
topic: string
grade_level: string
difficulty: 'קל'|'בינוני'|'קשה'
question_types: string[]
questions: Array<{id, type, question, options:string[], answer, points}>
num_questions: number
instructions: string
is_favorite: boolean
```

### Flow יצירה
1. טופס: נושא + מקצוע + כיתה + קושי + types (רב-ברירה/פתוח/נכון-לא נכון/השלמה) + מספר שאלות
2. "צור עם AI" → LLM מחזיר questions array
3. Preview: שאלות בכרטיסים עם עריכה ידנית inline
4. "שמור" → Worksheet entity
5. Export: PDF / Word / הדפסה עם/בלי תשובות

---

## 🎙️ ניתוח שיעור (`/lesson-analyzer`)

### Flow
1. כפתור "הקלט" → MediaRecorder → blob
2. או: "העלה קובץ" → UploadFile integration
3. "תמלל" → TranscribeAudio → transcript text
4. "נתח" → InvokeLLM:
   ```json
   prompt: "נתח את תמליל השיעור הבא ותחזיר JSON",
   response_json_schema: {
     summary: string,
     key_points: string[],
     target_audience: string,
     suggested_title: string,
     suggested_category: string,
     improvement_suggestions: string[],
     estimated_level: string
   }
   ```
5. תצוגת תוצאה: כרטיס עם כל השדות
6. "שמור לספרייה" → יוצר LibraryItem
7. SummaryTaskBoard: המרת key_points ל-Tasks עם due_date

---

## 📋 תוכנית לימודים (`/curriculum`)

### CurriculumWeek Entity
```
week_label: string (e.g. "שבוע א' תשפ\"ו")
week_start: string (ISO date)
subject: string
free_text_goals: string (מה המורה כתב בחופשיות)
parsed_goals: Array<{
  id: string,
  description: string,
  is_completed: boolean,
  suggested_next: string,
  library_item_ids: string[],
  external_links: Array<{label, url}>
}>
notes: string
status: 'planned'|'in_progress'|'completed'
```

### TractateSelector
- dropdown של מסכתות (בבא קמא, בבא מציעא, ברכות, שבת, וכו')
- בחירה → filter שבועות לפי subject

### WeekCard
- כרטיס שבוע: week_label + subject + status badge
- expand → WeekGoalCard per goal
- "נתח עם AI" → InvokeLLM מפרק free_text_goals ל-parsed_goals

### WeekGoalCard
- checkbox is_completed
- description
- suggested_next badge
- כפתורים: קישורים חיצוניים + library items

---

## 🏠 שיעורי בית (`/homework`)

### HomeworkAssignment Entity
```
title: string
subject: string
due_date: string
description: string
type: 'homework'|'exam'|'project'|'quiz'
submissions: Array<{
  student_id, student_name, submitted:boolean,
  submitted_at:string, note:string
}>
student_ids: string[]
```

### HomeworkTracker
- רשימת assignments עם filters (type, subject, תאריך)
- כרטיס assignment: כותרת + due_date + type badge + progress bar (% submitted)
- expand → כל תלמיד עם toggle submitted
- "שלח תזכורת" → WA link לתלמידים שלא הגישו

---

## 🔔 לוח צלילים (`/sound-board`)

### EventSoundMapper
- רשימת אירועים מוגדרים: "כניסה לכיתה", "שקט!", "מחיאות כפיים", "זמן עבד", "הפסקה", "חירום"
- כל אירוע: כפתור גדול עם emoji + שם
- לחיצה → מנגן sound effect (Audio HTML5)
- upload sound מותאם אישית per event
- volume slider

---

## 🔍 בנק שאלות (`/question-bank`)

- רשימת Worksheets שמורים (grid/list toggle)
- search + filters: subject, difficulty, topic
- WorksheetExportPanel:
  - export עם תשובות / בלי תשובות
  - PDF / Word / הדפסה
- הוסף שאלות לWorksheet קיים (LLM)
- preview dialog לכל worksheet

---

## 👁️ תצוגת תלמיד (`/student-view`)

- בחר תלמיד (dropdown)
- SharedLesson records שיוחסו לתלמיד זה:
  - כותרת שיעור + תאריך שיתוף + viewed? badge
  - סיכום השיעור (summary_text)
  - תגובת הורה (parent_comment) — editable
- ציונים אחרונים (read-only cards)
- נוכחות summary (% בחודש האחרון)
- מטלות פתוחות עם status

---

## 📊 דוחות (`/reports`)

### PeriodReportGenerator
- בחר תקופה (מחצית א/ב, רבעון, שנתי)
- בחר כיתה/קבוצה
- Generate → LLM מייצר ניתוח:
  - מגמות ציונים
  - תלמידים מצטיינים / תלמידים הזקוקים לעזרה
  - המלצות פדגוגיות
- תצוגת HTML report מעוצב (tables + charts)
- Export: PDF (print) / Word (.docx) / Email (SendEmail) / WhatsApp

---

## ⚙️ הגדרות (`/settings`)

### BrandingPanel
```javascript
// localStorage key: 'classmanager_branding'
{
  school_name: string,
  logo_url: string,      // מupload
  theme: 'light'|'dark'|'system',
  page_titles: { '/': 'שם', '/seating': 'שם', ... },
  nav_labels: { '/': 'שם', ... }
}
```
- שינוי שם → event `window.dispatchEvent(new CustomEvent('branding-updated', {detail: branding}))`
- Logo upload → UploadFile integration
- Theme toggle: מוסיף/מסיר `dark` class מ-`document.documentElement`

---

## 📅 AcademicCalendar Component (Dashboard)

### 3 Tabs

**לוח שנה עברי**
```javascript
// Gregorian → Hebrew date conversion
function toHebrewDate(date) { /* המרה לתאריך עברי */ }
function hebrewMonthName(month) {
  const months = ['תשרי','חשון','כסלו','טבת','שבט','אדר','ניסן','אייר','סיון','תמוז','אב','אלול'];
  return months[month-1];
}
function toHebrewNumeral(n) { /* מספר → גימטריה */ }
```
- לוח חודשי grid 7×6
- כל תא: תאריך עברי (קטן) + לועזי (גדול)
- היום: bg-primary text-white rounded-full
- שבת (יום 7): text-muted-foreground
- חגים עבריים: badge צהוב
- אירועים מTask entity: נקודה צבעונית

**מסכת בבא קמא (BavaKammaTracker)**
```javascript
// 119 דפים ב-10 פרקים
const CHAPTERS = [
  { name: 'פרק א', pages: ['ב','ג','ד','ה','ו','ז','ח','ט','י','יא','יב'] },
  // ... עד פרק י
];
// localStorage: 'bk_progress' — Set של דפים שנלמדו
```
- כל פרק: collapsible card
- כל דף: כפתור קטן toggle (bg-primary אם נלמד, border אם לא)
- Circular SVG progress ring (animated)
- Linear progress bar
- סטטיסטיקות: X/119 דפים, Y% השלמה

**מעקבי לימוד (StudyProgressTracker)**
```javascript
// localStorage: 'study_trackers'
// כל tracker: { id, name, color, items: [{id, text, completed}] }
const COLOR_SCHEMES = {
  indigo: { bg: 'bg-indigo-50', bar: 'bg-indigo-500', ... },
  emerald: { ... },
  amber: { ... },
  rose: { ... }
};
```
- רשימת trackers בכרטיסים
- כל כרטיס: שם + progress bar + אחוז + expand לפריטים
- כל פריט: checkbox toggle
- כפתור "הוסף tracker" → form: שם + צבע
- reset + מחיקה per tracker

---

## 🤖 AI Integration Pattern

### כל LLM call:
```javascript
const result = await base44.integrations.Core.InvokeLLM({
  prompt: "...",
  response_json_schema: {
    type: "object",
    properties: { ... }
  },
  add_context_from_internet: false  // true רק כשצריך
});
```

### Loading states
- isLoading → `<Loader2 className="w-4 h-4 animate-spin" />`
- כפתור disabled בזמן loading
- toast.success/error בסיום (sonner library)

---

## 🔐 Authentication

### Routes
```jsx
<Route path="/login" element={<Login />} />
<Route path="/register" element={<Register />} />
<Route path="/forgot-password" element={<ForgotPassword />} />
<Route path="/reset-password" element={<ResetPassword />} />
<Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
  {/* כל שאר הroutes */}
</Route>
```

### Login Page
- Email + Password
- "המשך עם Google" (Google OAuth)
- "שכחתי סיסמה" → /forgot-password
- עיצוב: card מרכזי, לוגו, gradient רקע

---

## 📱 PWA Configuration

### manifest.json
```json
{
  "name": "ClassManager Pro",
  "short_name": "כיתה",
  "display": "standalone",
  "background_color": "#3730a3",
  "theme_color": "#4f46e5",
  "orientation": "portrait",
  "icons": [{ "sizes": "512x512", "purpose": "any maskable" }]
}
```

### index.html
```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#4f46e5">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<link rel="manifest" href="/manifest.json">
```

---

## 🗄️ כל Entities (Database Schema)

```
Student, Attendance, Grade, Reward, Campaign,
SeatingArrangement, SeatHistory,
LibraryItem, LessonPlan, Worksheet,
HomeworkAssignment, CurriculumWeek, WeeklyPlan, WeeklyBulletin,
SharedLesson, ParentContact, StudentPortfolioItem,
LessonCategory, Task
```
(ראה שדות מלאים בקובץ APP_SPEC.md)

---

## 🔄 React Query Pattern

```javascript
// Fetch
const { data = [], isLoading } = useQuery({
  queryKey: ['entityName', filters],
  queryFn: () => base44.entities.EntityName.list('-created_date', 50),
});

// Mutate
const mutation = useMutation({
  mutationFn: (data) => base44.entities.EntityName.create(data),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['entityName'] }),
});
```

---

## ✅ קווים מנחים לעיצוב

1. **כל כרטיס**: `rounded-xl border border-border/60 bg-card shadow-sm`
2. **hover effect**: `hover:shadow-md transition-shadow duration-200`
3. **כפתור ראשי**: `bg-primary text-primary-foreground rounded-md px-4 py-2`
4. **badge**: `rounded-md px-2.5 py-0.5 text-xs font-semibold`
5. **input**: `border border-input rounded-md px-3 py-1.5 bg-transparent`
6. **פרידה בין sections**: `mb-6` בין כל section
7. **padding עמוד**: `p-4 md:p-5 max-w-5xl mx-auto`
8. **skeleton**: `animate-pulse bg-muted rounded` בגדלים מתאימים
9. **toast**: sonner — `toast.success()` / `toast.error()` / `toast.loading()`
10. **dialog**: shadcn Dialog עם `max-w-lg max-h-[90vh] overflow-y-auto`
11. **RTL**: תמיד `dir="rtl"` על containers ראשיים, `text-right` ברירת מחדל
12. **אנימציות כניסה**: כל עמוד — `motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}}`
13. **spacing mobile**: padding bottom תמיד מתחשב ב-bottom nav (64px + safe-area)

---

## 📁 מבנה קבצים מינימלי

```
src/
├── App.jsx                    (Router + lazy imports + ProtectedRoute + AnimatePresence)
├── index.css                  (design tokens כמתואר למעלה)
├── pages/ (19 עמודים)
├── components/
│   ├── layout/AppLayout.jsx   (header + main + bottom nav)
│   ├── dashboard/ (5 components)
│   ├── classroom/ (10 components)
│   ├── students/ (7 components)
│   ├── library/ (14 components)
│   ├── reports/ (4 components)
│   └── [שאר הcategories]
├── lib/
│   ├── seatingUtils.js        (satisfaction score + sort algorithms)
│   ├── exportUtils.js         (PDF/Excel/print)
│   ├── exportWord.js          (docx generation)
│   ├── branding.js            (load/save branding from localStorage)
│   └── AuthContext.jsx
└── hooks/
    └── usePullToRefresh.js    (touch events → onRefresh callback)
``