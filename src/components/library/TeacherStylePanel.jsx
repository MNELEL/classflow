import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Brain, RefreshCw, Trash2, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { extractStyleFromLibrary, loadStyleProfile, clearStyleProfile } from '@/lib/teacherStyle';

export default function TeacherStylePanel() {
  const [profile, setProfile] = useState(loadStyleProfile);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const { data: libraryItems = [] } = useQuery({
    queryKey: ['library'],
    queryFn: () => base44.entities.LibraryItem.list('-created_date', 150),
  });

  const richCount = libraryItems.filter(i =>
    !i.is_archived && (i.transcript || i.ai_summary) && i.ai_status === 'ready'
  ).length;

  async function handleLearnStyle() {
    if (richCount === 0) {
      toast.error('אין חומרים מנותחים בספרייה — העלה חומרים ועבד אותם עם AI קודם');
      return;
    }
    setLoading(true);
    try {
      const result = await extractStyleFromLibrary(libraryItems);
      setProfile(result);
      toast.success('פרופיל הסגנון עודכן בהצלחה!');
    } catch {
      toast.error('שגיאה בניתוח הסגנון — נסה שוב');
    }
    setLoading(false);
  }

  function handleClear() {
    clearStyleProfile();
    setProfile(null);
    toast.success('פרופיל הסגנון נמחק');
  }

  return (
    <div className="space-y-2" dir="rtl">
      {/* Header row */}
      <div className="flex items-center gap-2 p-3 rounded-xl border border-primary/20 bg-primary/5">
        <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
          <Brain className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">סגנון הוראה אישי</p>
          <p className="text-xs text-muted-foreground">
            {profile
              ? `למד מ-${profile.items_count} חומרים · עודכן ${new Date(profile.generated_at).toLocaleDateString('he-IL')}`
              : richCount > 0
                ? `${richCount} חומרים מוכנים ללמידה`
                : 'העלה חומרים לספרייה כדי להתחיל'
            }
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {profile && (
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          )}
          {profile && (
            <button onClick={() => setExpanded(v => !v)} className="text-muted-foreground hover:text-foreground">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Profile details (expandable) */}
      {profile && expanded && (
        <Card className="border-primary/20">
          <CardContent className="p-3 space-y-2.5 text-sm">
            <Row label="סגנון שפה" value={profile.language_style} />
            <Row label="סגנון שאלות" value={profile.question_style} />
            <Row label="גישה פדגוגית" value={profile.pedagogical_approach} />
            <Row label="טון" value={profile.tone} />
            <Row label="מבנה מועדף" value={profile.structure_preference} />
            {profile.key_vocabulary?.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">אוצר מילים אופייני:</p>
                <div className="flex flex-wrap gap-1">
                  {profile.key_vocabulary.map((w, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">{w}</Badge>
                  ))}
                </div>
              </div>
            )}
            {profile.topics_covered?.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">נושאים:</p>
                <div className="flex flex-wrap gap-1">
                  {profile.topics_covered.map((t, i) => (
                    <Badge key={i} variant="outline" className="text-xs">{t}</Badge>
                  ))}
                </div>
              </div>
            )}
            {profile.sample_sentence_style && (
              <div className="bg-muted/40 rounded-lg p-2 text-xs italic border-r-2 border-primary">
                "{profile.sample_sentence_style}"
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={profile ? 'outline' : 'default'}
          className="flex-1 gap-1.5"
          onClick={handleLearnStyle}
          disabled={loading || richCount === 0}
        >
          {loading
            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> מנתח...</>
            : profile
              ? <><RefreshCw className="w-3.5 h-3.5" /> עדכן פרופיל</>
              : <><Brain className="w-3.5 h-3.5" /> למד את הסגנון שלי ({richCount} חומרים)</>
          }
        </Button>
        {profile && (
          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={handleClear}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

      {richCount === 0 && !profile && (
        <p className="text-xs text-muted-foreground text-center py-1">
          💡 הוסף חומרים לספרייה ועבד אותם עם AI — המערכת תלמד את הסגנון שלך אוטומטית
        </p>
      )}
    </div>
  );
}

function Row({ label, value }) {
  if (!value) return null;
  return (
    <div>
      <span className="text-xs text-muted-foreground">{label}: </span>
      <span className="text-xs">{value}</span>
    </div>
  );
}