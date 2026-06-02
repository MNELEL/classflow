import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Check, Share2, MessageCircle, Mail, X } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { Loader2 } from 'lucide-react';

const SOURCE_ICONS = {
  audio_recording: '🎙️', audio_file: '🎵', pdf: '📄', word_doc: '📝',
  presentation: '📊', video_file: '🎬', youtube_link: '▶️',
  external_link: '🔗', text_note: '✍️', image: '🖼️',
};

function buildLibraryShareText(item) {
  const icon = SOURCE_ICONS[item.source_type] || '📁';
  const lines = [];
  lines.push(`${icon} *${item.ai_suggested_title || item.title}*`);
  if (item.subject) lines.push(`📚 נושא: ${item.subject}`);
  if (item.difficulty) lines.push(`⚡ רמה: ${item.difficulty}`);
  if (item.ai_summary) lines.push(`\n📝 ${item.ai_summary}`);
  if (item.ai_key_points?.length) {
    lines.push('\n🔑 נקודות מפתח:');
    item.ai_key_points.slice(0, 4).forEach(p => lines.push(`  • ${p}`));
  }
  if (item.file_url) lines.push(`\n🔗 קובץ: ${item.file_url}`);
  if (item.youtube_url) lines.push(`\n▶️ יוטיוב: ${item.youtube_url}`);
  if (item.external_url) lines.push(`\n🌐 קישור: ${item.external_url}`);
  if (item.tags?.length) lines.push(`\n🏷️ ${item.tags.join(', ')}`);
  return lines.join('\n');
}

function buildLessonPlanShareText(plan) {
  const lines = [];
  lines.push(`📋 *מערך שיעור: ${plan.title}*`);
  if (plan.subject) lines.push(`📚 מקצוע: ${plan.subject}`);
  if (plan.grade_level) lines.push(`🎓 שכבה: ${plan.grade_level}`);
  if (plan.description) lines.push(`\n${plan.description}`);
  if (plan.learning_objectives?.length) {
    lines.push('\n🎯 יעדי למידה:');
    plan.learning_objectives.forEach(o => lines.push(`  • ${o}`));
  }
  if (plan.blocks?.length) {
    lines.push('\n📌 מבנה השיעור:');
    plan.blocks.forEach((b, i) => {
      const dur = b.duration_minutes ? ` (${b.duration_minutes} דק׳)` : '';
      lines.push(`  ${i + 1}. ${b.title}${dur}`);
      if (b.description) lines.push(`     ${b.description}`);
    });
  }
  return lines.join('\n');
}

export default function ShareModal({ item, type = 'library', onClose }) {
  const [copied, setCopied] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiText, setAiText] = useState('');

  const baseText = type === 'lesson'
    ? buildLessonPlanShareText(item)
    : buildLibraryShareText(item);

  const displayText = aiText || baseText;

  const copyText = () => {
    navigator.clipboard.writeText(displayText);
    setCopied(true);
    toast.success('הועתק ללוח!');
    setTimeout(() => setCopied(false), 2000);
  };

  const shareWhatsapp = () => {
    const encoded = encodeURIComponent(displayText);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  const shareEmail = () => {
    const subject = encodeURIComponent(item.title || 'חומר לימודי');
    const body = encodeURIComponent(displayText);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  const generateAiSummary = async () => {
    setAiLoading(true);
    const prompt = type === 'lesson'
      ? `כתוב הודעה קצרה ומשכנעת (עד 100 מילים) שמורה ישלח לקולגה כדי לשתף את מערך השיעור הבא:\n${baseText}\nהטון יהיה חברי ומקצועי. כתוב בעברית.`
      : `כתוב הודעה קצרה ומשכנעת (עד 80 מילים) שמורה ישלח לקולגה כדי לשתף את החומר הלימודי הבא:\n${baseText}\nהטון יהיה חברי ומקצועי. כתוב בעברית.`;
    const result = await base44.integrations.Core.InvokeLLM({ prompt });
    setAiText(result);
    setAiLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-4"
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-primary" />
            <span className="font-bold text-base">שתף עם קולגות</span>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Item name */}
        <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 truncate">
          {type === 'lesson' ? '📋' : (SOURCE_ICONS[item.source_type] || '📁')} {item.title}
        </div>

        {/* Text preview */}
        <div className="relative">
          <textarea
            readOnly
            value={displayText}
            className="w-full h-36 text-xs bg-muted/40 border border-border rounded-xl p-3 resize-none font-mono leading-relaxed"
          />
          {aiLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-card/80 rounded-xl">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          )}
        </div>

        {/* AI button */}
        <Button variant="outline" size="sm" className="w-full gap-2 text-xs" onClick={generateAiSummary}
          disabled={aiLoading}>
          ✨ {aiLoading ? 'מנסח...' : 'נסח הודעה חברית עם AI'}
        </Button>

        {/* Action buttons */}
        <div className="grid grid-cols-3 gap-2">
          <Button onClick={copyText} variant={copied ? 'default' : 'outline'} size="sm" className="gap-1.5 text-xs">
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'הועתק!' : 'העתק'}
          </Button>
          <Button onClick={shareWhatsapp} variant="outline" size="sm"
            className="gap-1.5 text-xs bg-green-50 border-green-200 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300">
            <MessageCircle className="w-3.5 h-3.5" />
            וואטסאפ
          </Button>
          <Button onClick={shareEmail} variant="outline" size="sm" className="gap-1.5 text-xs">
            <Mail className="w-3.5 h-3.5" />
            מייל
          </Button>
        </div>
      </div>
    </div>
  );
}