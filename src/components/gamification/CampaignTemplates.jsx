import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

const TEMPLATES = [
  { emoji: '📚', title: 'שבוע הקריאה', description: 'תלמידים שמביאים ספר ומספרים עליו', target_points: 50, reward_description: 'שעת סרט/פעילות חופשית' },
  { emoji: '🤝', title: 'אלוף העזרה', description: 'תלמידים שעוזרים לחברים ללא בקשה', target_points: 30, reward_description: 'תעודת "אלוף הכיתה"' },
  { emoji: '🎯', title: 'כוכב השיעורי בית', description: 'הגשת שיעורי בית בזמן ובאיכות גבוהה', target_points: 40, reward_description: 'שיעור ללא שיעורי בית' },
  { emoji: '🌟', title: 'שבוע הנימוסים', description: 'הדגמת נימוסים יפים ואכפתיות', target_points: 60, reward_description: 'ארוחת צהריים מיוחדת' },
  { emoji: '🔬', title: 'חוקרי הכיתה', description: 'שאלות מעניינות ומחקר עצמאי', target_points: 35, reward_description: 'ניסוי מדעי כייפי' },
  { emoji: '🎨', title: 'מבצע היצירתיות', description: 'עבודות ופרויקטים יצירתיים', target_points: 45, reward_description: 'שיעור אמנות חופשי' },
];

export default function CampaignTemplates({ onSelect }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">בחר תבנית מוכנה או צור מבצע מאפס:</p>
      <div className="grid grid-cols-1 gap-2">
        {TEMPLATES.map((t, i) => (
          <button key={i} onClick={() => onSelect(t)}
            className="flex items-center gap-3 bg-card border border-border/70 rounded-xl p-3 text-right hover:border-primary/40 hover:bg-accent/20 transition-all group">
            <span className="text-2xl">{t.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">{t.title}</p>
              <p className="text-xs text-muted-foreground truncate">{t.description}</p>
              <p className="text-xs text-primary mt-0.5">🎁 {t.reward_description} · יעד: {t.target_points} נקודות</p>
            </div>
            <Plus className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}