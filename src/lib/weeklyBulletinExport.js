import { toast } from 'sonner';
import { loadBranding } from '@/lib/branding';
import { convertOklchColors } from '@/lib/colorUtils';
import { escapeHtml } from '@/lib/htmlEscape';
import { resolveTemplateDesign, fontStackFromDesign } from '@/lib/templateDesign';

const DEFAULT_ACCENT = '#2563eb';

function buildBulletinHtml(bulletin, templateData) {
  const b = loadBranding();
  const design = templateData ? resolveTemplateDesign(templateData) : null;
  const accent = design?.accent || templateData?.accent_color || DEFAULT_ACCENT;
  const secondary = design?.secondary || `${accent}22`;
  const bg = design?.background || '#ffffff';
  const fontStack = fontStackFromDesign(design);
  const frameStyle = design?.frameStyle || 'none';
  const title = escapeHtml(templateData?.detected_title || 'חוברת קשר שבועית');
  const introText = escapeHtml(templateData?.detected_body_text || '');
  const className = escapeHtml(bulletin.class_name || '');
  const schoolName = escapeHtml(b.school_name || '');
  const dateRange = bulletin.start_date && bulletin.end_date
    ? `${new Date(bulletin.start_date).toLocaleDateString('he-IL')} – ${new Date(bulletin.end_date).toLocaleDateString('he-IL')}`
    : '';

  const digest = escapeHtml(bulletin.digest_summary || '');
  const points = (bulletin.study_points || []).map((p) => `<li style="margin-bottom:6px;">${escapeHtml(p)}</li>`).join('');
  const questions = (bulletin.recap_questions || [])
    .map((q, i) => `
      <div style="margin-bottom:10px;">
        <div style="font-weight:700; color:${accent}; font-size:13.5px;">${i + 1}. ${escapeHtml(q.question || '')}</div>
        ${q.answer ? `<div style="color:#6b7280; font-size:12.5px; margin-top:2px;">${escapeHtml(q.answer)}</div>` : ''}
      </div>
    `).join('');
  const activities = (bulletin.activities || []).map((a) => `<li style="margin-bottom:6px;">${escapeHtml(a)}</li>`).join('');
  const extraNotes = escapeHtml(bulletin.extra_notes || '');
  const riddle = escapeHtml(bulletin.weekly_riddle || '');

  const logoHtml = b.logo_url
    ? `<img src="${escapeHtml(b.logo_url)}" style="height:44px;width:44px;object-fit:contain;border-radius:8px;" />`
    : '';

  const section = (label, content) => content ? `
    <div style="margin-bottom:16px;">
      <div style="font-size:14px; font-weight:800; color:${accent}; margin-bottom:6px; padding:3px 8px 3px 8px; border-right:3px solid ${accent}; background:${secondary}; border-radius:0 6px 6px 0;">
        ${label}
      </div>
      <div style="font-size:13px; color:#374151; line-height:1.7; padding-right:11px;">
        ${content}
      </div>
    </div>
  ` : '';

  const frameHtml = design && frameStyle !== 'none'
    ? `<div style="position:absolute; inset:12px; border:${frameStyle === 'single' ? '2px solid' : '3px double'} ${accent}; border-radius:14px; pointer-events:none;"></div>`
    : '';

  const watermarkHtml = design?.hasWatermark && design.watermarkText
    ? `<div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; pointer-events:none; opacity:0.06; font-size:80px; font-weight:800; color:${accent}; transform:rotate(-18deg);">${escapeHtml(design.watermarkText)}</div>`
    : '';

  return `
    <div id="bulletin-root" style="
      font-family:${fontStack};
      direction:rtl;
      background:${bg};
      width:794px;
      box-sizing:border-box;
      padding:32px 36px;
      position:relative;
    ">
      ${watermarkHtml}
      ${frameHtml}
      <div style="position:relative;">
        <div style="display:flex; align-items:center; justify-content:space-between; border-bottom:2px solid ${accent}; padding-bottom:14px; margin-bottom:18px;">
          <div style="display:flex; align-items:center; gap:10px;">
            ${logoHtml}
            <div>
              <div style="font-size:20px; font-weight:800; color:${accent};">${title}</div>
              ${className || schoolName ? `<div style="font-size:12px; color:#6b7280;">${[schoolName, className].filter(Boolean).join(' · ')}</div>` : ''}
            </div>
          </div>
          ${dateRange ? `<div style="font-size:12px; color:#6b7280; font-weight:600;">${dateRange}</div>` : ''}
        </div>

        ${introText ? `<div style="font-size:12.5px; color:#6b7280; margin-bottom:16px; line-height:1.6;">${introText}</div>` : ''}

        ${section('מה למדנו השבוע', digest)}
        ${section('נקודות עיקריות', points ? `<ul style="margin:0; padding-right:18px;">${points}</ul>` : '')}
        ${section('שאלות חזרה', questions)}
        ${section('פעילויות', activities ? `<ul style="margin:0; padding-right:18px;">${activities}</ul>` : '')}
        ${riddle ? section('חידת השבוע', `${riddle}`) : ''}
        ${section('הודעות נוספות', extraNotes)}

        <div style="margin-top:24px; padding-top:12px; border-top:1px solid #e5e7eb; font-size:11px; color:#9ca3af; text-align:center;">
          חוברת קשר שבועית${schoolName ? ` · ${schoolName}` : ''}
        </div>
      </div>
    </div>
  `;
}

async function renderBulletinToCanvas(bulletin, templateData) {
  const html = buildBulletinHtml(bulletin, templateData);
  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;top:-9999px;left:-9999px;z-index:-1;';
  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    const { default: html2canvas } = await import('html2canvas');
    const el = container.querySelector('#bulletin-root');
    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      width: el.scrollWidth,
      height: el.scrollHeight,
      onclone: (clonedDoc) => convertOklchColors(clonedDoc),
    });
    return canvas;
  } finally {
    document.body.removeChild(container);
  }
}

/**
 * Exports a WeeklyBulletin as a portrait A4 PDF, laid out with the style
 * detected from an (optional) CertificateTemplate of kind 'weekly_bulletin'.
 * Paginates automatically if the content is taller than one page.
 */
export async function exportWeeklyBulletinPDF(bulletin, templateData) {
  const { default: jsPDF } = await import('jspdf');
  const canvas = await renderBulletinToCanvas(bulletin, templateData);

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 8;
  const usableW = pageW - margin * 2;

  const pxToMm = usableW / canvas.width;
  const fullHeightMm = canvas.height * pxToMm;
  const usableH = pageH - margin * 2;

  if (fullHeightMm <= usableH) {
    doc.addImage(canvas.toDataURL('image/png'), 'PNG', margin, margin, usableW, fullHeightMm);
  } else {
    // Slice the tall canvas into page-sized chunks
    const pageCanvasHeightPx = Math.floor(usableH / pxToMm);
    let renderedPx = 0;
    let first = true;
    while (renderedPx < canvas.height) {
      const sliceHeightPx = Math.min(pageCanvasHeightPx, canvas.height - renderedPx);
      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = sliceHeightPx;
      const ctx = sliceCanvas.getContext('2d');
      ctx.drawImage(canvas, 0, renderedPx, canvas.width, sliceHeightPx, 0, 0, canvas.width, sliceHeightPx);

      if (!first) doc.addPage('a4', 'portrait');
      first = false;
      doc.addImage(sliceCanvas.toDataURL('image/png'), 'PNG', margin, margin, usableW, sliceHeightPx * pxToMm);
      renderedPx += sliceHeightPx;
    }
  }

  const dateStr = bulletin.start_date
    ? new Date(bulletin.start_date).toLocaleDateString('he-IL').replace(/\//g, '-')
    : new Date().toLocaleDateString('he-IL').replace(/\//g, '-');
  doc.save(`חוברת_קשר_${dateStr}.pdf`);
  toast.success('חוברת הקשר הופקה בהצלחה!');
}