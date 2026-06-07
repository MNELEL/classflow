# ClassManager Pro — מפרט מלא לבנייה מחדש

## סקירה כללית
אפליקציית ניהול כיתה למורים, בנויה כ-PWA (Progressive Web App) ב-React + Vite + Tailwind CSS + shadcn/ui.
כיוון RTL (עברית), נתמכת בדסקטופ ובמובייל (bottom navigation bar). 
Backend as a Service: Base44 (entities, auth, LLM integrations, file upload).

---

## ערימת טכנולוגיה
- **Framework**: React 18 + Vite
- **Styling**: Tailwind CSS + shadcn/ui (Radix UI based)
- **Routing**: React Router v6 (lazy loading כל העמודים)
- **State/Data**: @tanstack/react-query v5
- **Animations**: framer-motion
- **Icons**: lucide-react
- **Drag & Drop**: @hello-pangea/dnd
- **Charts**: recharts
- **Forms**: react-hook-form + zod
- **Rich Text**: react-quill
- **Export**: jsPDF, docx, html2canvas
- **Date**: date-fns + Hebrew calendar utilities (custom)
- **Fonts**: Plus Jakarta Sans + Heebo (Google Fonts)
- **Direction**: RTL (direction: rtl) בכל מקום

---

## עיצוב ו-Design System

### צבעים (CSS Variables ב-index.css)
```
Light theme:
--background: 40 30% 97%      → רקע חם לבן-קרם
--foreground: 224 40% 10%     → טקסט כהה אינדיגו
--card: 0 0% 100%             → לבן טהור לכרטיסים
--primary: 237 70% 55%        → אינדיגו-סגול (#4f46e5 בערך)
--primary-foreground: 0 0% 100% → לבן על כפתורים
--secondary: 220 18% 94%      → אפור-כחלחל בהיר
--muted: 220 16% 92%          → רקע muted
--muted-foreground: 220 10% 48% → טקסט אפור
--accent: 237 75% 96%         → רקע accent בהיר
--accent-foreground: 237 70% 42%→ טקסט accent
--destructive: 4 82% 56%      → אדום
--border: 220 16% 88%         → קו גבול אפור
--radius: 0.75rem             → rounded-xl כברירת מחדל

Dark theme:
--background: 224 28% 8%
--primary: 237 72% 66%
--card: 224 26% 11%
(כל שאר המשתנים מותאמים לdark)
```

### Sidebar (AppLayout)
- Sidebar background: לבן (#fff בlight)
- גבול: `--sidebar-border`

### Tailwind tokens ב-tailwind.config.js
נוסף: `fontFamily.heebo`, `fontFamily.inter`, `fontFamily.jakarta`
כל צבעי shadcn ממופים דרך CSS variables.

### Class utilities מיוחדות (index.css)
- `.card-hover` — hover עם shadow אינדיגו עדין + translateY(-2px)
- `.card-academic` — גבול עליון 3px בצבע primary/22%
- `.card-glass` — glassmorphism: backdrop-blur(10px) + border
- `.bg-academic-gradient` — gradient עדין אינדיגו על רקע
- `.no-scrollbar` — מסתיר scrollbars בכל הדפדפנים
- `.seat-card` — transition לborder/shadow על מושבים
- `.drag-over` — box-shadow כחול כשnearby drag

---

## Layout ראשי — AppLayout (`components/layout/AppLayout.jsx`)

### מבנה
```
<div dir="rtl" min-h-screen bg-background flex flex-col>
  <header sticky top-0 z-50>  ← Header עם padding safe-area
  <main flex-1 overflow-y-auto no-scrollbar pb=[64px+safe-area]>
    {children}
  </main>
  <nav fixed bottom-0 z-50>  ← Bottom Nav עם safe-area-bottom
</div>
```

### Header (sticky, z-50)
- `bg-white/90 backdrop-blur-md border-b border-border shadow-sm`
- padding: `env(safe-area-inset-top/left/right)`
- בדשבורד: לוגו (מברנדינג localStorage) + כותרת מרכזית + כפתור הגדרות
- בעמודים אחרים: כפתור "חזרה" (ChevronRight) + כותרת + כפתור הגדרות
- כותרת נקבעת מ-`branding.page_titles[pathname]` או `branding.school_name` או `ClassManager Pro`

### Bottom Navigation Bar
- 16 tabs (paths):
  `/` = BookOpen (דשבורד)
  `/seating` = LayoutGrid (סידור כיתה)
  `/students` = Users (תלמידים)
  `/attendance` = CalendarCheck (נוכחות)
  `/grades` = GraduationCap (ציונים)
  `/library` = Library (ספרייה)
  `/gamification` = Trophy (גמיפיקציה)
  `/toolkit` = Wrench (כלים)
  `/worksheets` = FileText (דפי עבודה)
  `/question-bank` = Layers (בנק שאלות)
  `/lesson-analyzer` = Mic (ניתוח שיעור)
  `/curriculum` = ClipboardList (תוכנית לימודים)
  `/homework` = ClipboardCheck (שיעורי בית)
  `/parents` = Contact (הורים)
  `/sound-board` = Music (לוח צלילים)
  `/student-view` = Eye (תצוגת תלמיד)
- Tab פעיל: `text-primary`, אייקון scale-110
- Tab לא פעיל: `text-muted-foreground hover:text-foreground`
- גובה min 56px, כל tab min-w-[44px]
- טקסט label: text-[10px] font-medium
- Labels נקבעים מ-`branding.nav_labels[path]` → fallback לpath עצמו

### גלילה
- כל tab שומר scroll position ב-ref (scrollPositions)
- לחיצה חוזרת על tab פעיל → גלילה לראש
- Pull-to-refresh בדשבורד (hook: `usePullToRefresh`)

---

## Entities (מסד הנתונים)

### Student
שדות: `name`, `gender`, `height` (short/medium/tall), `row_preference` (front/middle/back/none),
`permanent_row`, `permanent_col` (left/center/right/none), `side_preference`, `avoid_edges` (bool),
`special_needs` (array: vision/hearing/adhd/mobility/other), `learning_group`, `friends` (array of IDs),
`avoid` (array of IDs), `separate` (array of IDs), `group`, `notes`, `is_active` (bool),
`academic_level` (weak/below_average/average/above_average/strong/excellent),
`traits` (array: attentive/cooperative/struggling/fast_learner/needs_extra_explanation/
needs_teacher_attention/needs_encouragement/disruptive/leader/shy),
`achievements`, `custom_conditions`
RLS: created_by_id או admin

### Attendance
שדות: `student_id`, `date`, `status` (present/absent/late), `note`
RLS: created_by_id או admin

### Grade
שדות: `student_id`, `subject`, `test_name`, `score` (0-100), `max_score` (default 100),
`date`, `period` (weekly/monthly/exam/quiz/homework), `notes`
RLS: created_by_id או admin

### Reward
שדות: `student_id`, `student_name`, `points` (חיובי/שלילי), `reason`, `date`, `campaign_id`
RLS: created_by_id או admin

### Campaign
שדות: `title`, `description`, `target_points`, `start_date`, `end_date`, `reward_description`, `is_active`

### SeatingArrangement
שדות: `name`, `rows` (default 5), `cols` (default 6), `seats` (array of {id, row, col, student_id, is_hidden, is_locked, is_gap}),
`is_active`, `satisfaction_score`
RLS: created_by_id או admin

### SeatHistory
שדות: `student_id`, `arrangement_id`, `seat_id`, `row`, `col`, `sat_at` (datetime)

### LibraryItem
שדות: `title`, `description`, `category`, `subject`, `tags` (array), `difficulty` (קל/בינוני/קשה),
`source_type` (audio_recording/audio_file/pdf/word_doc/presentation/video_file/youtube_link/external_link/text_note/image),
`file_url`, `file_name`, `file_size`, `youtube_url`, `external_url`, `transcript`,
`ai_status` (pending/processing/ready/error), `ai_summary`, `ai_key_points` (array),
`ai_suggested_title`, `ai_suggested_category`, `ai_suggested_tags` (array),
`coverage_status` (not_started/in_progress/completed), `coverage_notes`,
`generated_artifacts` (array of {id, type, title, content, includes_answers, created_at}),
`lesson_log` (array of {id, date, student_ids, notes, coverage_percent, homework_assigned}),
`is_favorite`, `is_archived`

### LessonPlan
שדות: `title`, `description`, `subject`, `grade_level`, `learning_objectives` (array),
`blocks` (array of {id, title, description, duration_minutes, library_item_ids, worksheet_ids}),
`is_template`

### Worksheet
שדות: `title`, `subject`, `topic`, `grade_level`, `difficulty`, `question_types` (array),
`questions` (array of {id, type, question, options, answer, points}),
`num_questions`, `instructions`, `is_favorite`

### HomeworkAssignment
שדות: `title`, `subject`, `due_date`, `description`, `type` (homework/exam/project/quiz),
`submissions` (array of {student_id, student_name, submitted, submitted_at, reminder_sent, note}),
`student_ids` (array)

### CurriculumWeek
שדות: `week_label`, `week_start`, `subject`, `free_text_goals`, 
`parsed_goals` (array of {id, description, source_type, external_links, library_item_ids, is_completed, suggested_next}),
`notes`, `status` (planned/in_progress/completed)

### WeeklyPlan
שדות: `week_start`, `title`, `days` (array of {day_key, items:[{id, library_item_id, notes, hour}]}), `description`

### WeeklyBulletin
שדות: `start_date`, `end_date`, `class_name`, `digest_summary`, `study_points` (array),
`recap_questions` (array of {question, answer}), `weekly_riddle`, `weekly_riddle_answer`, `activities` (array)

### SharedLesson
שדות: `library_item_id`, `student_id`, `student_name`, `shared_at`, `viewed_at`, `parent_comment`, `lesson_title`, `summary_text`

### ParentContact
שדות: `student_id`, `date`, `type` (call/meeting/message/email/note), `summary`,
`parent_name`, `initiated_by` (teacher/parent/school), `follow_up_needed`, `follow_up_date`

### StudentPortfolioItem
שדות: `student_id`, `type` (document/photo/diagnosis/parent_letter/historical/other),
`title`, `description`, `file_url`, `file_name`, `academic_year`, `date`, `tags` (array)

### LessonCategory
שדות: `name`, `description`, `color_tag` (HEX), `icon` (emoji)

### Task
שדות: `student_id`, `title`, `description`, `due_date`, `status` (pending/in_progress/done), `subject`, `priority` (low/medium/high)

---

## עמודים (Pages)

### 1. DashboardPage (`/`)
**תיאור**: מרכז הפקודה - סקירה כללית של הכיתה

**UI**:
- כותרת: "סקירה כללית" + כפתור "מדריך חכם" (Map icon) → פותח `SmartGuide` overlay
- `DailyBriefing` — briefing יומי AI
- **שורת KPI 1** (grid 2x2 / md:4 עמודות): 4 כרטיסים עם framer-motion stagger
  - סה"כ תלמידים (Users icon, primary)
  - משובצים (CheckCircle2, emerald)
  - ממתינים (AlertTriangle, yellow/muted)
  - שביעות רצון % — עם SVG progress ring + progress bar מונפשים (emerald/yellow/red לפי ערך)
- **שורת KPI 2** (grid 2x2 / md:4): עם emoji icons
  - ממוצע ציונים (📊, blue)
  - נוכחות ממוצעת % (📅, emerald)
  - ספריית חומרים (📚, purple) — מציין כמה ממתינים לAI
  - נקודות הוענקו (🏆, yellow) + מספר פרסים
- **שורת פרטים** (grid md:2):
  - כרטיס "פרטי הסידור הנוכחי": שורות/טורים/תפוסה% — מ-localStorage
  - כרטיס "פרופיל הכיתה": תלמידים עם צרכים מיוחדים / אילוצים / ללא העדפות (Badge counts)
- `AcademicCalendar` component (לוח שנה עברי + BK tracker + study trackers)
- `StudyProgressTracker` component
- `AbsenceAlert` (אם יש תלמידים)
- `TasksAlert` (אם יש תלמידים)
- **כפתורי פעולה**: "פתח לוח כיתה" + "נהל תלמידים" + PDF/Excel/הדפסה (אם יש סידור שמור)
- Pull-to-refresh (PullToRefreshIndicator בראש)
- כל האלמנטים נכנסים עם `motion.div` opacity+y animation עם delay stagger
- skeleton loaders בזמן טעינה

**Data**: Student, Grade, Attendance, LibraryItem, Reward — כולם ב-React Query
**localStorage**: `classmanager_seats`, `classmanager_arrangement`

---

### 2. SeatingPage (`/seating`)
**תיאור**: ניהול מלא של סידור מקומות הכיתה

**UI**:
- `AppLayout` עוטף
- `ClassroomGrid` — גריד אינטראקטיבי של מושבים
- `GridControls` — sidebar/toolbar: כוונון גריד, sort algorithms, export
- `StudentPanel` — רשימת תלמידים לא מושבצים + drag source
- drag & drop עם @hello-pangea/dnd בין מושבים ופאנל
- כפתורי מצב: נעילת מושב, הסתרה, gap (מעבר)
- Satisfaction score — חישוב בזמן אמת
- undo/redo history
- `SatisfactionReport` dialog
- `ImportPreferencesModal`
- `QuickEditMode`
- אופטימיזציה: local algorithm + AI (InvokeLLM)

**Algorithms**:
- Smart sort (local): מכבד preferences, special_needs, friends/avoid/separate
- Strategic Leaders: מוביל חברתי בכל אזור
- Group Seating: לפי learning_group
- Conflict Helper: מזהה ומציע פתרון לקונפליקטים

**localStorage**: `classmanager_seats`, `classmanager_arrangement`, `classmanager_history`

---

### 3. StudentsPage (`/students`)
**תיאור**: ניהול תלמידים — רשימה, עריכה, פרופיל מלא

**Components**:
- `StudentList` — טבלה/כרטיסים עם search + filters
- `StudentForm` — טופס הוספה/עריכה מלא (כל שדות Student entity)
- `GroupsManager` — ניהול קבוצות
- `ImportStudentsModal` — ייבוא CSV
- `FreeTextImport` — ייבוא מטקסט חופשי (LLM מנתח)
- `GradeManager` — ציונים לתלמיד ספציפי
- `TaskManager` — משימות לתלמיד ספציפי
- `MobileSelect` — select מותאם מובייל
- per-student portfolio + parent contact log

---

### 4. AttendancePage (`/attendance`)
**תיאור**: ניהול נוכחות יומי

**Components**:
- `AttendanceManager` — רשימה יומית, toggle present/absent/late לכל תלמיד
- `AttendanceChart` — גרף נוכחות לאורך זמן (recharts)
- בחירת תאריך, search תלמידים
- ייצוא נתוני נוכחות

---

### 5. GradeManagementPage (`/grades`)
**תיאור**: ניהול ציונים — הזנה, צפייה, ניתוח

**Components**:
- `GradeReportPanel` — טבלה + ממוצעים לפי מקצוע
- `AIGradeInput` — הזנת ציונים בקול/טקסט חופשי (LLM מנתח)
- `AIGradeQuery` — שאילתות על ציונים בשפה טבעית
- chart לממוצעים per student / per subject

---

### 6. LibraryPage (`/library`)
**תיאור**: ספריית חומרי הוראה עם AI

**Tabs**:
1. ספרייה (כרטיסים) — `LibraryItemCard`, `LibrarySearch`
2. מתכנן שבועי — `WeeklyPlannerBoard` (drag & drop items ל-days)
3. תכנון שיעור — `LessonPlanningTab`, `LessonPlanEditor`
4. כיסוי חומר — `CoverageTracker`
5. פלייליסט — `PlaylistPanel`

**Upload**: `LibraryUploadModal` — תמיכה ב: audio_recording, audio_file, pdf, word_doc, presentation, video_file, youtube_link, external_link, text_note, image

**AI Features per item**:
- Transcription (audio → text) via TranscribeAudio
- Summary + key points + suggested title/category/tags via InvokeLLM
- Artifact generation: סיכום תלמיד / שאלות / מצגת / דף עבודה / הסבר מורחב
- Share to parent via `ShareModal` → creates SharedLesson entity

**`LibraryItemDetail`**: dialog מלא עם player/viewer, artifacts, lesson log, share

**`ExternalSourceSearch`**: חיפוש מקורות חיצוניים

---

### 7. GamificationPage (`/gamification`)
**תיאור**: מערכת נקודות ופרסים

**Tabs**:
1. לוח מובילים — `Leaderboard` (מיון לפי נקודות, בר progress לכל תלמיד)
2. מבצעים — Campaign cards (title, target, reward, תאריכים, is_active)
3. הוסף נקודות — טופס פשוט: בחר תלמיד/ים, נקודות, סיבה
4. `BulkReward` — נקודות לכל הכיתה בבת אחת
5. `CampaignTemplates` — תבניות מוכנות למבצעים
6. `RewardIdeas` — רעיונות לפרסים (LLM generated)

---

### 8. ToolkitPage (`/toolkit`)
**תיאור**: ארגז כלים אינטראקטיבי לשיעור

**כלים**:
- `NoiseMeter` — מד רעש (Web Audio API) עם אנימציה
- `ExitTicket` — כרטיס יציאה: שאלת סיכום לתלמידים
- `FlashCards` — כרטיסיות לחזרה (LLM יוצר מנושא)
- `RandomWordBoard` — גנרטור מילים/שאלות אקראי
- טיימר שיעור, גלגל מזל (בחירת תלמיד אקראי), מד קשב

---

### 9. ParentPortalPage (`/parents`)
**תיאור**: ניהול קשר עם הורים

**Tabs**:
1. שיתוף שיעורים — `SharedLessonsPanel` (רשימת SharedLesson records)
2. יומן קשר — `ParentContactLog` (CRUD על ParentContact)
3. דוחות — `StudentReportPDF` + `StudentReportGenerator` (PDF/Word/email/WhatsApp)
4. תיק תלמיד — `StudentPortfolio` + `DocumentsVault`
5. עלון שבועי — `BulletinGenerator` (LLM מייצר עלון מרשומות השבוע)

---

### 10. WorksheetGeneratorPage (`/worksheets`)
**תיאור**: יצירת דפי עבודה עם AI

**Flow**:
1. בחר נושא + מקצוע + כיתה + קושי + סוגי שאלות + מספר שאלות
2. LLM מייצר questions array
3. Preview + עריכה ידנית
4. שמירה ל-Worksheet entity
5. Export: PDF / הדפסה / Word / `WorksheetExportPanel`

---

### 11. QuestionBankPage (`/question-bank`)
**תיאור**: בנק שאלות — ניהול + ייצוא

**Features**:
- רשימת Worksheets שמורים עם filters (subject, difficulty, topic)
- צפייה בשאלות, עריכה, מחיקה
- `WorksheetExportPanel` — ייצוא עם/בלי תשובות
- LLM: הוסף שאלות נוספות לבוחן קיים
- AI search בבנק

---

### 12. LessonAnalyzerPage (`/lesson-analyzer`)
**תיאור**: הקלטה וניתוח שיעורים

**`LessonSummaryHub`**:
- הקלטת אודיו (MediaRecorder) / העלאת קובץ
- TranscribeAudio → תמליל
- InvokeLLM → סיכום + נקודות מפתח + קהל יעד + הצעות לשיפור
- שמירה ל-LibraryItem
- `SummaryTaskBoard` — יצירת tasks/reminders מהסיכום

---

### 13. CurriculumPlannerPage (`/curriculum`)
**תיאור**: תכנון תוכנית לימודים שבועית

**Components**:
- `TractateSelector` — בחירת מסכת/נושא (Talmud tractates רשימה מוגדרת)
- `WeekCard` — כרטיס שבוע: week_label, subject, free_text_goals, status
- `WeekGoalCard` — parsed_goals: כל יעד עם is_completed toggle + suggested_next
- AI: InvokeLLM מנתח free_text_goals → parsed_goals array
- status tracking: planned → in_progress → completed
- לינקים חיצוניים per goal

---

### 14. HomeworkPage (`/homework`)
**תיאור**: ניהול שיעורי בית

**`HomeworkTracker`** (+ `AcademicCalendar` component שם):
- רשימת HomeworkAssignment records
- יצירת מטלה: title, subject, due_date, type, בחירת תלמידים
- submissions tracking לכל תלמיד: submitted toggle + תאריך הגשה + note
- badge: % שהגישו
- filters: by subject, type, status
- reminder: WA/email לתלמידים שלא הגישו
- תצוגת לוח שנה חודשי עם events

---

### 15. SoundBoardPage (`/sound-board`)
**תיאור**: לוח צלילי כיתה וניהול אירועים

**`EventSoundMapper`**:
- רשימת אירועים מוגדרים מראש (כניסה לכיתה, שקט, מחיאות כפיים, ...)
- כפתורים לנגינת קובץ שמע + אנימציה
- הוספת צלילים מותאמים אישית (העלאת קובץ)
- רמת עוצמה + preview

---

### 16. ExamScannerPage (`/exam-scanner`)
**תיאור**: סריקת בחינות ידניות עם AI

**Flow**:
1. צלם/העלה תמונה של בחינה ידנית
2. InvokeLLM (vision) → מזהה שם תלמיד + ציון + שאלות + פידבק
3. מציג תוצאה: score, per-question analysis, strengths/weaknesses
4. שמירה אוטומטית ל-Grade entity
5. תמיכה בסריקות מרובות (batch)

---

### 17. StudentViewPage (`/student-view`)
**תיאור**: תצוגת תלמיד — ממשק לתלמידים/הורים

**Features**:
- בחירת תלמיד
- SharedLesson records שיוחסו לתלמיד זה
- צפייה בסיכום שיעור + תגובת הורה
- ציונים + נוכחות (read-only)
- מטלות + סטטוס הגשה

---

### 18. ReportsPage (`/reports`)
**תיאור**: דוחות וניתוחים

**Tabs**:
1. `PeriodReportGenerator` — דוח תקופתי: bar charts + tables לפי תקופה, LLM analysis, export PDF/Word/email/WA
2. `BulletinGenerator` — עלון שבועי לכיתה
3. `StudentReportGenerator` — דוח תלמיד ספציפי

---

### 19. SettingsPage (`/settings`)
**תיאור**: הגדרות

**`BrandingPanel`**:
- שם בית הספר / כיתה
- לוגו upload (UploadFile)
- ערכת נושא: Light/Dark/System
- page_titles ו-nav_labels מותאמים אישית לכל route
- כל הנתונים ב-localStorage תחת `classmanager_branding`

---

## Components משותפים מרכזיים

### AcademicCalendar (`components/dashboard/AcademicCalendar.jsx`)
**3 Tabs**:

**Tab 1: לוח שנה**
- Hebrew date conversion (custom functions: `toHebrewDate`, `hebrewMonthName`, `toHebrewNumeral`)
- לוח חודשי: כל יום תא עם תאריך עברי + לועזי
- אירועים: חגים עבריים (calculated), tasks מ-Task entity, grades
- highlight: היום + שבת + חגים
- קישור מהיר ל-WeeklyPlan הנוכחי

**Tab 2: מסכת בבא קמא (BavaKammaTracker)**
- 119 דפים מחולקים ל-10 פרקים
- כל דף = כפתור toggle (למד / לא למד)
- localStorage: `bk_progress`
- Circular progress ring (SVG animated)
- Linear progress bar
- סטטיסטיקות: דפים שנלמדו / אחוז השלמה / פרק נוכחי
- collapsible per chapter

**Tab 3: מעקבי לימוד (StudyProgressTracker standalone)**
- רשימת trackers מ-localStorage (`study_trackers`)
- כל tracker: שם, צבע, רשימת פריטים לחזרה, progress
- יצירת tracker חדש בטופס
- כל פריט: toggle completed
- progress bar + אחוז
- 4 ערכות צבע: indigo/emerald/amber/rose
- כפתור reset + מחיקה

### DailyBriefing (`components/dashboard/DailyBriefing.jsx`)
- LLM מייצר briefing יומי: "היום יש X תלמידים, Y בחינות..."
- נשמר ב-sessionStorage (מתרענן פעם ביום)
- skeleton loader בזמן ייצור
- כרטיס עם Sparkles icon + dismiss X

### AbsenceAlert (`components/dashboard/AbsenceAlert.jsx`)
- מציג תלמידים שהיו נעדרים יותר מ-3 פעמים בחודש האחרון
- badge עם ספירה, collapsible רשימה
- קישור לדף נוכחות

### TasksAlert (`components/dashboard/TasksAlert.jsx`)
- tasks בסטטוס pending שemerged_date עבר
- רשימה עם badge עדיפות
- קישור לניהול tasks

### SmartGuide (`components/dashboard/SmartGuide.jsx`)
- overlay/modal עם מדריך אינטראקטיבי
- step-by-step tour של הפיצ'רים
- framer-motion entrance animation

---

## ClassroomGrid & Seating System

### ClassroomGrid (`components/classroom/ClassroomGrid.jsx`)
- renders grid של rows × cols
- כל cell = `SeatCard`
- תמיכה ב: pair-right (שני מושבים צמודים), pair-down, aisle (מעבר)
- sequential numbering
- drag & drop (DragDropContext → Droppable → Draggable)
- Board label editor בראש הכיתה (כפתורי עריכה inline)

### SeatCard (`components/classroom/SeatCard.jsx`)
- מושב ריק: גבול מקוקו, "+" hover
- מושב עם תלמיד: שם + אות ראשונה avatar
- locked: מנעול icon
- hidden: לא מוצג בתצוגה ציבורית
- gap: מרחב ריק (no border)
- conflicts (avoid/separate נפגשים) → highlight אדום
- special_needs → indicator ייחודי

### seatingUtils.js (`lib/seatingUtils.js`)
- `calcSatisfactionScore(seats, students)` → 0-100
- `smartSort(seats, students, opts)` → seats sorted by algorithm
- conflict detection, row zone assignment, preference matching

### GridControls (`components/classroom/GridControls.jsx`)
- sliders/inputs: rows (3-8), cols (3-10)
- satisfaction badge + progress bar
- unseated count
- sort buttons: AI / Smart / Groups / Leaders / Conflicts
- undo/redo buttons
- export: PDF / Excel / print options
- reset button
- import preferences modal trigger

---

## AI Integrations (Core)

כל הקריאות ל-`base44.integrations.Core.*`:

### InvokeLLM
- params: `prompt` (string), `response_json_schema` (object), `add_context_from_internet` (bool), `model` (optional)
- שימושים: daily briefing, seating suggestions, artifact generation, curriculum parsing, grade analysis, worksheet creation, bulletin generation, free text import

### TranscribeAudio
- params: `file_url` (string)
- return: `{ transcription: string }`
- שימוש: lesson analyzer

### SendEmail
- params: `to`, `subject`, `body`
- שימוש: report sending, bulletin

### UploadFile
- params: `file` (File object)
- return: `{ file_url: string }`
- שימוש: library upload, portfolio, logo

### GenerateImage
- params: `prompt`
- return: `{ url: string }`
- שימוש: flashcards, worksheet illustrations (אופציונלי)

### ExtractDataFromUploadedFile
- params: `file_url`, `instructions`
- return: extracted structured data
- שימוש: exam scanner, CSV analysis

---

## Auth
- Base44 auth (email+password + Google OAuth)
- `AuthProvider` (React context) + `useAuth()` hook
- `ProtectedRoute` — כל routes תחת `/` מוגנים
- Unauthenticated → redirect `/login`
- `UserNotRegisteredError` — אם user בDB ולא registered כראוי

---

## PWA Configuration
- `public/manifest.json`:
  - name: "ClassManager Pro", short_name: "כיתה"
  - display: "standalone"
  - background_color: "#3730a3", theme_color: "#4f46e5"
  - icons: 192x192 + 512x512 (maskable)
- `index.html`: viewport + apple-touch-icon + manifest link + theme-color meta
- `index.css`: `overscroll-behavior: none`, `safe-area-inset` vars
- `body`: direction RTL, font Plus Jakarta Sans / Heebo

---

## Branding System (`lib/branding.js`)
- נשמר ב-localStorage תחת `classmanager_branding`
- fields: `school_name`, `logo_url`, `theme`, `page_titles` (map path→string), `nav_labels` (map path→string)
- `loadBranding()` / `saveBranding(data)` functions
- event: `window.dispatchEvent(new CustomEvent('branding-updated', { detail: branding }))`
- AppLayout מאזין ל-event ומתעדכן בזמן אמת

---

## Performance
- Lazy loading כל העמודים (`React.lazy` + `Suspense`)
- `queryClientInstance` משותף (staleTime, retry config)
- code splitting per route
- `requestAnimationFrame` לscroll restoration
- sessionStorage לcache LLM responses יומיים

---

## Export Utilities (`lib/exportUtils.js`)
- `exportToPDF(seats, students, rows, cols)` — html2canvas → jsPDF
- `exportToExcel(seats, students, rows, cols)` — CSV download
- `printSeating(seats, students, rows, cols)` — window.print() עם styled HTML

## Export Word (`lib/exportWord.js`)
- `createStudentReportWordDoc(student, grades, tasks, teacherName, period)` — docx library → blob download

---

## Data Flow Summary
```
Component → useQuery(base44.entities.X.list/filter) → React Query cache
Component → useMutation(base44.entities.X.create/update/delete) → invalidateQueries
LLM calls → base44.integrations.Core.InvokeLLM → response parsed by json_schema
File uploads → base44.integrations.Core.UploadFile → file_url stored in entity
Auth → base44.auth.me() / base44.auth.loginViaEmailPassword()
localStorage → branding, seats, arrangement, bk_progress, study_trackers, settings
```

---

## File Structure
```
src/
├── App.jsx                     ← Router (lazy imports, ProtectedRoute, AnimatedRoutes)
├── index.css                   ← Design tokens + global styles
├── main.jsx                    ← React root
├── api/base44Client.js         ← base44 SDK init
├── pages/
│   ├── DashboardPage.jsx
│   ├── SeatingPage.jsx
│   ├── StudentsPage.jsx
│   ├── AttendancePage.jsx
│   ├── GradeManagementPage.jsx
│   ├── LibraryPage.jsx
│   ├── GamificationPage.jsx
│   ├── ToolkitPage.jsx
│   ├── ParentPortalPage.jsx
│   ├── WorksheetGeneratorPage.jsx
│   ├── QuestionBankPage.jsx
│   ├── LessonAnalyzerPage.jsx
│   ├── CurriculumPlannerPage.jsx
│   ├── HomeworkPage.jsx
│   ├── SoundBoardPage.jsx
│   ├── ExamScannerPage.jsx
│   ├── StudentViewPage.jsx
│   ├── ReportsPage.jsx
│   ├── SettingsPage.jsx
│   ├── HistoryPage.jsx
│   ├── Login.jsx / Register.jsx / ForgotPassword.jsx / ResetPassword.jsx
├── components/
│   ├── layout/AppLayout.jsx
│   ├── dashboard/
│   │   ├── AcademicCalendar.jsx  (Hebrew calendar + BK + trackers tabs)
│   │   ├── BavaKammaTracker.jsx
│   │   ├── StudyProgressTracker.jsx
│   │   ├── DailyBriefing.jsx
│   │   ├── AbsenceAlert.jsx
│   │   ├── TasksAlert.jsx
│   │   └── SmartGuide.jsx
│   ├── classroom/
│   │   ├── ClassroomGrid.jsx
│   │   ├── SeatCard.jsx
│   │   ├── GridControls.jsx
│   │   ├── StudentPanel.jsx
│   │   ├── StudentPanelFilters.jsx
│   │   ├── SatisfactionReport.jsx
│   │   ├── BoardLabelEditor.jsx
│   │   ├── QuickEditMode.jsx
│   │   ├── ImportPreferencesModal.jsx
│   │   ├── ConflictHelper.jsx
│   │   ├── GroupSeatingOptimizer.jsx
│   │   └── StrategicLeadersOptimizer.jsx
│   ├── students/
│   │   ├── StudentList.jsx
│   │   ├── StudentForm.jsx
│   │   ├── GroupsManager.jsx
│   │   ├── ImportStudentsModal.jsx
│   │   ├── FreeTextImport.jsx
│   │   ├── GradeManager.jsx
│   │   ├── TaskManager.jsx
│   │   └── MobileSelect.jsx
│   ├── attendance/
│   │   ├── AttendanceManager.jsx
│   │   └── AttendanceChart.jsx
│   ├── grades/
│   │   ├── GradeReportPanel.jsx
│   │   ├── AIGradeInput.jsx
│   │   └── AIGradeQuery.jsx
│   ├── library/
│   │   ├── LibraryItemCard.jsx
│   │   ├── LibraryItemDetail.jsx
│   │   ├── LibraryUploadModal.jsx
│   │   ├── LibrarySearch.jsx
│   │   ├── WeeklyPlannerBoard.jsx
│   │   ├── LessonPlanningTab.jsx
│   │   ├── LessonPlanEditor.jsx
│   │   ├── CoverageTracker.jsx
│   │   ├── PlaylistPanel.jsx
│   │   ├── ArtifactGenerator.jsx
│   │   ├── MultiSourceGenerator.jsx
│   │   ├── ExternalSourceSearch.jsx
│   │   ├── ExportModal.jsx
│   │   ├── ShareModal.jsx
│   │   └── AIProviderSettings.jsx
│   ├── reports/
│   │   ├── PeriodReportGenerator.jsx
│   │   ├── BulletinGenerator.jsx
│   │   ├── StudentReportGenerator.jsx
│   │   └── StudentAIReport.jsx
│   ├── gamification/
│   │   ├── Leaderboard.jsx
│   │   ├── BulkReward.jsx
│   │   ├── CampaignTemplates.jsx
│   │   └── RewardIdeas.jsx
│   ├── toolkit/
│   │   ├── NoiseMeter.jsx
│   │   ├── ExitTicket.jsx
│   │   ├── FlashCards.jsx
│   │   └── RandomWordBoard.jsx
│   ├── parents/
│   │   ├── SharedLessonsPanel.jsx
│   │   ├── ShareLessonModal.jsx
│   │   ├── StudentReportPDF.jsx
│   │   └── ParentContactLog.jsx  (in portfolio/)
│   ├── portfolio/
│   │   ├── StudentPortfolio.jsx
│   │   ├── DocumentsVault.jsx
│   │   └── ParentContactLog.jsx
│   ├── curriculum/
│   │   ├── TractateSelector.jsx
│   │   ├── WeekCard.jsx
│   │   └── WeekGoalCard.jsx
│   ├── homework/
│   │   ├── HomeworkTracker.jsx
│   │   └── AcademicCalendar.jsx
│   ├── lessonanalyzer/
│   │   ├── LessonSummaryHub.jsx
│   │   └── SummaryTaskBoard.jsx
│   ├── questionbank/
│   │   └── WorksheetExportPanel.jsx
│   ├── soundboard/
│   │   └── EventSoundMapper.jsx
│   ├── settings/
│   │   └── BrandingPanel.jsx
│   ├── data/
│   │   └── CsvImportModal.jsx
│   ├── ProtectedRoute.jsx
│   ├── AuthLayout.jsx
│   ├── UserNotRegisteredError.jsx
│   └── ui/ (כל shadcn components)
├── lib/
│   ├── AuthContext.jsx
│   ├── branding.js
│   ├── seatingUtils.js
│   ├── exportUtils.js
│   ├── exportWord.js
│   ├── query-client.js
│   ├── utils.js
│   ├── app-params.js
│   └── PageNotFound.jsx
├── hooks/
│   ├── usePullToRefresh.js
│   └── use-mobile.jsx
├── utils/index.ts
└── entities/ (JSON schemas — ראה רשימה למעלה)
```

---

## הערות מימוש חשובות
1. כל הטקסט בעברית, direction: rtl בכל מקום
2. framer-motion על כל כניסת עמוד (opacity + y, duration 0.2s)
3. AnimatePresence על routes ב-App.jsx (key=location.pathname)
4. Lazy loading עם Suspense + PageLoader (spinner מרכזי)
5. כל entity queries מגדירות RLS: created_by_id === user.id OR role=admin
6. Dark mode: class-based (`document.documentElement.classList.add('dark')`) — נשמר ב-localStorage תחת `classmanager_settings.theme`
7. Pull-to-refresh בדשבורד: custom hook שמאזין לtouch events
8. Bottom nav safe area: `padding-bottom: env(safe-area-inset-bottom)`
9. כל המשתנים של loading → skeleton placeholders (animate-pulse)
10. Toast notifications: sonner (`toast.success/error/info`) מיקום top-center