import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, GraduationCap } from 'lucide-react';

export default function About() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12" dir="rtl">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary mb-4">
            <GraduationCap className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">אודות ClassFlow</h1>
        </div>
        <div className="bg-card rounded-2xl shadow-sm border border-border p-8 space-y-4 text-muted-foreground leading-relaxed">
          <p>
            ClassFlow היא פלטפורמה חינמית לניהול כיתה המיועדת למורים, אנשי חינוך וצוותי הוראה בבתי ספר ובמוסדות חינוכיים. המערכת מאפשרת למורים לנהל את כל היבטי הכיתה במקום אחד — מסידור ישיבה חכם ומעקב נוכחות, דרך ניהול ציונים ומשימות, ועד לתקשורת עם הורים ויצירת דפי עבודה אינטראקטיביים.
          </p>
          <p>
            האפליקציה כוללת כלים לניהול ספריית שיעורים, תכנון שבועי, צלצולים חכמים, משחקי גמול ומוטיבציה לתלמידים, ניתוח פדגוגי מבוסס AI, ולוח מחוונים מקיף למנהלים. ClassFlow נועדה לחסוך זמן יקר למורים, לשפר את חוויית הלמידה של התלמידים, ולחזק את הקשר בין בית הספר לבית.
          </p>
          <p>
            הפלטפורמה נבנית ומתוחזקת על ידי צוות ClassFlow, המורכב מאנשי חינוך ומפתחי תוכנה המחויבים לחדשנות פדגוגית. אנו מאמינים שכלים דיגיטליים חכמים יכולים להעצים מורים ולאפשר להם להתמקד במה שחשוב באמת — ההוראה עצמה והקשר עם התלמידים.
          </p>
          <p>
            ClassFlow מתעדכנת ללא הרף בהתאם לצרכים של מורים בשטח ולמשוב מהשימוש בבתי ספר. אנו מזמינים כל מורה או מנהל להצטרף לקהילה ולספר לנו כיצד נוכל לשפר ולהרחיב את המערכת כדי שתשרת אתכם בצורה הטובה ביותר.
          </p>
        </div>
        <div className="text-center mt-6">
          <Link to="/login" className="inline-flex items-center gap-2 text-sm text-primary font-medium hover:underline">
            <ArrowRight className="w-4 h-4" />
            חזרה להתחברות
          </Link>
        </div>
      </div>
    </div>
  );
}