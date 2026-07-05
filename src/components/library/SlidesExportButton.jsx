import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Presentation, Loader2, ExternalLink, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function SlidesExportButton({ plan, planId, disabled }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const generate = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('slidesLessonPlan', { plan, planId });
      setResult(res.data);
      toast.success('המצגת Google Slides נוצרה!');
      window.open(res.data.url, '_blank');
    } catch (err) {
      toast.error('שגיאה ביצירת המצגת');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-success flex items-center gap-1">
          <Check className="w-3.5 h-3.5" /> {result.slidesCount} שקופיות
        </span>
        <Button size="sm" variant="outline" className="gap-1 text-xs" asChild>
          <a href={result.url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="w-3.5 h-3.5" /> פתח מצגת
          </a>
        </Button>
        <Button size="sm" variant="ghost" className="text-xs" onClick={() => setResult(null)}>
          מצגת חדשה
        </Button>
      </div>
    );
  }

  return (
    <Button
      size="sm"
      variant="outline"
      className="gap-1 text-xs"
      onClick={generate}
      disabled={disabled || loading || (!plan && !planId)}
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Presentation className="w-3.5 h-3.5" />}
      צור מצגת Slides
    </Button>
  );
}