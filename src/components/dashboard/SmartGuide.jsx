import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, ChevronDown, ChevronUp, ExternalLink, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const STEPS = [
  {
    id: 1,
    icon: '👥',
    title: 'הוסף את תלמידיך',
    description: 'התחל ביצירת פרופיל לכל תלמיד — שם, מגדר, גובה, צרכים מיוחדים, והעדפות ישיבה. ככל שתמלא יותר פרטים, כך הסידור האוטומטי יהיה מדויק יותר.',
    tips: ['הוסף חברים ואילוצים חברתיים לאפשרויות ישיבה מיטביות', 'ציין צרכים מיוחדים (ראייה, שמיעה, ADHD)', 'ניתן לייבא רשימת תלמידים מ-CSV'],
    link: '/students',
    linkLabel: 'לניהול תלמידים',
    color: 'bg-blue-500/10 border-blue-500/30',
    iconBg: 'bg-blue-100',
  },
  {
    id: 2,
    icon: '🪑',
    title: 'בנה סידור ישיבה',
    description: 'הגדר את ממדי הכיתה ותן לאלגוריתם לסדר את התלמידים אוטומטית לפי הפרופילים שיצרת. תוכל לגרור ולשחרר ידנית, לנעול מושבים, וליצור פערים.',
    tips: ['השתמש ב"מיון חכם" לסידור אוטומטי מלא', 'נעל מושבים חשובים לפני הרצת האלגוריתם', 'בדוק את ציון שביעות הרצון — מעל 75% זה מצוין'],
    link: '/seating',
    linkLabel: 'לסידור ישיבה',
    color: 'bg-emerald-500/10 border-emerald-500/30',
    iconBg: 'bg-emerald-100',
  },
  {
    id: 3,
    icon: '📚',
    title: 'מלא את ספריית החומרים',
    description: 'העלה קבצים, קישורים, הקלטות שיעורים, ומצגות. ה-AI מנתח כל חומר ומפיק סיכום, נקודות מפתח, וחומרי למידה נוספים באופן אוטומטי.',
    tips: ['הקלט שיעורים ישירות מהאפליקציה', 'ה-AI מייצר שאלות, דפי עבודה וחידות מהחומר', 'ניתן לסנן לפי נושא ורמת קושי'],
    link: '/library',
    linkLabel: 'לספריית חומרים',
    color: 'bg-purple-500/10 border-purple-500/30',
    iconBg: 'bg-purple-100',
  },
  {
    id: 4,
    icon: '📝',
    title: 'צור דפי עבודה ומבחנים',
    description: 'השתמש ב"יוצר דפ"ע" כדי לייצר דפי עבודה מותאמים אישית בעזרת AI, ובמרכז העזרים כדי לבנות מבחנים מבנק השאלות שנוצר מחומרי הספרייה.',
    tips: ['בחר נושא, רמה וסוגי שאלות', 'שלב שאלות ממספר דפי עבודה', 'הדפס ישירות מהאפליקציה'],
    link: '/worksheets',
    linkLabel: 'ליוצר דפ"ע',
    color: 'bg-orange-500/10 border-orange-500/30',
    iconBg: 'bg-orange-100',
  },
  {
    id: 5,
    icon: '📊',
    title: 'עקוב אחר נוכחות וציונים',
    description: 'רשום נוכחות יומית ועדכן ציונים. ה-AI יכול לנתח מגמות ולהפיק דוח אישי לכל תלמיד שאפשר לשלוח להורים.',
    tips: ['השתמש בקלט AI לציונים לייבוא מהיר', 'צור דוח PDF מפורט לכל תלמיד', 'עקוב אחר תלמידים עם היעדרויות חוזרות'],
    link: '/attendance',
    linkLabel: 'לניהול נוכחות',
    color: 'bg-cyan-500/10 border-cyan-500/30',
    iconBg: 'bg-cyan-100',
  },
  {
    id: 6,
    icon: '🏆',
    title: 'הפעל מערכת גמול',
    description: 'צור מבצעים, הענק נקודות לתלמידים, ועקוב אחר לוח המצטיינים. מערכת הגמול מחזקת התנהגות חיובית ומוטיבציה.',
    tips: ['הגדר מבצע עם יעד נקודות ופרס', 'הענק נקודות בודדות או קבוצתיות', 'הצג את לוח המצטיינים בכיתה'],
    link: '/gamification',
    linkLabel: 'למערכת גמול',
    color: 'bg-yellow-500/10 border-yellow-500/30',
    iconBg: 'bg-yellow-100',
  },
];

function StepCard({ step, isOpen, onToggle }) {
  return (
    <div className={`rounded-xl border ${step.color} transition-all`}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-3 text-right"
      >
        <div className={`w-9 h-9 rounded-xl ${step.iconBg} flex items-center justify-center text-lg shrink-0`}>
          {step.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-muted-foreground">שלב {step.id}</span>
          </div>
          <p className="font-semibold text-sm leading-tight">{step.title}</p>
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 space-y-3">
              <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
              <ul className="space-y-1.5">
                {step.tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-foreground/80">
                    <span className="text-primary mt-0.5">✓</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
              <Button size="sm" variant="outline" asChild className="gap-1.5">
                <Link to={step.link}>
                  <ExternalLink className="w-3.5 h-3.5" />
                  {step.linkLabel}
                </Link>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function SmartGuide({ onClose }) {
  const [openStep, setOpenStep] = useState(1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.97 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col border border-border">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-border">
          <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-base">מדריך חכם</h2>
            <p className="text-xs text-muted-foreground">מפת דרכים אינטראקטיבית</p>
          </div>
          <button onClick={onClose} aria-label="סגור מדריך" className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Steps */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <div className="flex items-center gap-1.5 mb-3 text-xs text-muted-foreground">
            <MapPin className="w-3.5 h-3.5" />
            <span>לחץ על כל שלב לפרטים ולהמלצות</span>
          </div>
          {STEPS.map((step) => (
            <StepCard
              key={step.id}
              step={step}
              isOpen={openStep === step.id}
              onToggle={() => setOpenStep(openStep === step.id ? null : step.id)}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}