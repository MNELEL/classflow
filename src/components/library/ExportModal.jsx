import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, FileText, File, Printer, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Convert Markdown to clean HTML for export
function markdownToHtml(md) {
  return md
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^---$/gm, '<hr>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');
}

function buildPrintHtml(title, content, opts = {}) {
  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
<meta charset="utf-8">
<title>${title}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { 
    font-family: 'Heebo', Arial, sans-serif; 
    direction: rtl; 
    line-height: 1.7; 
    color: #1a1a2e;
    background: white;
  }
  .page { max-width: 210mm; margin: 0 auto; padding: 20mm; }
  .header { 
    border-bottom: 3px solid #6366f1; 
    padding-bottom: 12px; 
    margin-bottom: 24px; 
    display: flex; 
    justify-content: space-between;
    align-items: flex-end;
  }
  .header h1 { font-size: 22px; color: #312e81; font-weight: 700; }
  .header .meta { font-size: 11px; color: #6b7280; text-align: left; }
  ${opts.studentFields ? `
  .student-fields { 
    display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; 
    margin-bottom: 20px; padding: 12px; 
    border: 1px solid #e5e7eb; border-radius: 8px; background: #f9fafb;
  }
  .field-box { border-bottom: 1px solid #374151; padding-bottom: 2px; font-size: 12px; color: #374151; }
  .field-label { font-size: 10px; color: #9ca3af; margin-bottom: 4px; }
  ` : ''}
  h1 { font-size: 20px; color: #312e81; margin: 20px 0 10px; font-weight: 700; }
  h2 { font-size: 16px; color: #4338ca; margin: 18px 0 8px; font-weight: 600; border-bottom: 1px solid #e0e7ff; padding-bottom: 4px; }
  h3 { font-size: 14px; color: #5b21b6; margin: 14px 0 6px; font-weight: 600; }
  p { margin: 8px 0; font-size: 13px; }
  ul, ol { padding-right: 20px; margin: 8px 0; }
  li { margin: 4px 0; font-size: 13px; }
  strong { font-weight: 700; color: #1e1b4b; }
  em { font-style: italic; color: #4b5563; }
  hr { border: none; border-top: 1px solid #e5e7eb; margin: 16px 0; }
  blockquote { border-right: 4px solid #6366f1; padding: 8px 14px; background: #f5f3ff; margin: 12px 0; border-radius: 0 8px 8px 0; }
  .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #9ca3af; text-align: center; }
  @media print { 
    @page { margin: 15mm; size: A4; } 
    body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
  }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div>
      <h1>${title}</h1>
      ${opts.subtitle ? `<p style="font-size:12px;color:#6b7280;margin-top:4px">${opts.subtitle}</p>` : ''}
    </div>
    <div class="meta">
      ${opts.date ? `תאריך: ${opts.date}<br>` : ''}
      ${opts.grade ? `שכבה: ${opts.grade}` : ''}
    </div>
  </div>
  ${opts.studentFields ? `
  <div class="student-fields">
    <div><div class="field-label">שם התלמיד/ה</div><div class="field-box">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div></div>
    <div><div class="field-label">כיתה</div><div class="field-box">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div></div>
    <div><div class="field-label">תאריך</div><div class="field-box">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div></div>
  </div>
  ` : ''}
  <div class="content">${markdownToHtml(content)}</div>
  <div class="footer">נוצר עם ClassManager Pro • ${new Date().toLocaleDateString('he-IL')}</div>
</div>
</body>
</html>`;
}

// Word export (RTF format that Word can open)
function buildWordRtf(title, content) {
  const clean = content
    .replace(/^#+\s+(.+)$/gm, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/^-\s+/gm, '• ')
    .replace(/^(\d+)\.\s+/gm, '$1. ');

  return `{\\rtf1\\ansi\\ansicpg1255\\deff0
{\\fonttbl{\\f0\\froman\\fcharset177 Arial;}}
{\\colortbl ;\\red99\\green102\\blue241;}
\\paperw11906\\paperh16838\\margl1440\\margr1440\\margt1440\\margb1440
\\rtlpar\\cf1\\f0\\fs28\\b ${title}\\b0\\par
\\cf0\\fs24\\par
${clean.replace(/\n/g, '\\par\n')}
\\par}`;
}

export default function ExportModal({ open, onClose, title, content, grade, subtitle }) {
  const [format, setFormat] = useState('pdf');
  const [includeStudentFields, setIncludeStudentFields] = useState(true);
  const [customTitle, setCustomTitle] = useState(title || '');
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      if (format === 'print') {
        const html = buildPrintHtml(customTitle || title, content, {
          subtitle,
          grade,
          date: new Date().toLocaleDateString('he-IL'),
          studentFields: includeStudentFields,
        });
        const w = window.open('', '_blank');
        w.document.write(html);
        w.document.close();
        setTimeout(() => { w.print(); setExporting(false); }, 800);
        return;
      }

      if (format === 'pdf') {
        const html = buildPrintHtml(customTitle || title, content, {
          subtitle,
          grade,
          date: new Date().toLocaleDateString('he-IL'),
          studentFields: includeStudentFields,
        });
        const w = window.open('', '_blank');
        w.document.write(html);
        w.document.close();
        setTimeout(() => {
          w.print();
          toast.success('שמור כ-PDF דרך תיבת ההדפסה (בחר "שמור כ-PDF")');
          setExporting(false);
        }, 800);
        return;
      }

      if (format === 'word') {
        const rtf = buildWordRtf(customTitle || title, content);
        const blob = new Blob([rtf], { type: 'application/rtf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${(customTitle || title || 'document').replace(/[^a-zA-Z0-9\u0590-\u05FF]/g, '_')}.rtf`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('הקובץ הורד — פתח עם Word או Google Docs');
      }

      if (format === 'txt') {
        const clean = content.replace(/\*\*/g, '').replace(/\*/g, '').replace(/^#+\s+/gm, '');
        const blob = new Blob([customTitle + '\n' + '='.repeat(40) + '\n\n' + clean], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${(customTitle || title || 'document').replace(/[^a-zA-Z0-9\u0590-\u05FF]/g, '_')}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('הקובץ הורד כטקסט');
      }

    } catch {
      toast.error('שגיאה בייצוא');
    }
    setExporting(false);
    onClose();
  };

  const formats = [
    { id: 'print', icon: <Printer className="w-5 h-5" />, label: 'הדפסה', desc: 'שלח למדפסת ישירות' },
    { id: 'pdf', icon: <File className="w-5 h-5" />, label: 'PDF', desc: 'שמור כ-PDF להדפסה' },
    { id: 'word', icon: <FileText className="w-5 h-5" />, label: 'Word', desc: 'ערוך ב-Word / Google Docs' },
    { id: 'txt', icon: <Download className="w-5 h-5" />, label: 'טקסט', desc: 'קובץ טקסט פשוט' },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5 text-primary" />
            ייצוא / הדפסה
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Title */}
          <div>
            <Label className="text-xs mb-1 block">כותרת המסמך</Label>
            <Input
              value={customTitle}
              onChange={e => setCustomTitle(e.target.value)}
              placeholder="כותרת..."
              className="h-8 text-sm"
            />
          </div>

          {/* Format selection */}
          <div>
            <Label className="text-xs mb-2 block">פורמט</Label>
            <div className="grid grid-cols-2 gap-2">
              {formats.map(f => (
                <button
                  key={f.id}
                  onClick={() => setFormat(f.id)}
                  className={cn(
                    'flex flex-col items-center gap-1 p-3 rounded-xl border transition-all',
                    format === f.id
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border hover:bg-accent text-muted-foreground'
                  )}
                >
                  {f.icon}
                  <span className="text-xs font-semibold">{f.label}</span>
                  <span className="text-[10px] opacity-70 text-center">{f.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Options */}
          {(format === 'pdf' || format === 'print') && (
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={includeStudentFields}
                onChange={e => setIncludeStudentFields(e.target.checked)}
                className="rounded"
              />
              הוסף שורות שם / כיתה / תאריך
            </label>
          )}

          {format === 'word' && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                📝 הקובץ ייפתח ב-Word, LibreOffice או Google Docs ויהיה ניתן לעריכה מלאה
              </p>
            </div>
          )}

          <Button className="w-full gap-2" onClick={handleExport} disabled={exporting}>
            {exporting
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : format === 'print' ? <Printer className="w-4 h-4" /> : <Download className="w-4 h-4" />
            }
            {format === 'print' ? 'הדפס עכשיו' : `הורד כ-${format.toUpperCase()}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}