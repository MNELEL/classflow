import { toast } from 'sonner';
import { loadBranding } from '@/lib/branding';
import { convertOklchColors } from '@/lib/colorUtils';
import { escapeHtml } from '@/lib/htmlEscape';
import { resolveTemplateDesign, fontStackFromDesign } from '@/lib/templateDesign';
import { getDocSettings, formatDateForDoc } from '@/lib/documentDesign';

// ── Certificate templates ──────────────────────────────────────────────────
// Each template supplies default title/body text and an accent color.
// The teacher can still override title/body per-certificate.
export const CERTIFICATE_TEMPLATES = {
  excellence: {
    label: 'תעודת הצטיינות',
    defaultTitle: 'תעודת הצטיינות',
    defaultBody: 'מוענקת בזאת תעודה זו להוקרה על הצטיינות, שקידה ומאמץ יוצא דופן',
    accent: '#7c3aed',
    accentLight: '#ede9fe',
    icon: '★',
  },
  participation: {
    label: 'תעודת השתתפות',
    defaultTitle: 'תעודת השתתפות',
    defaultBody: 'מוענקת בזאת תעודה זו להוקרה על השתתפות פעילה ומחויבות',
    accent: '#2563eb',
    accentLight: '#dbeafe',
    icon: '🎗',
  },
  topic_completion: {
    label: 'תעודת סיום נושא',
    defaultTitle: 'תעודת סיום נושא לימודי',
    defaultBody: 'מוענקת בזאת תעודה זו על השלמה מוצלחת של הנושא הנלמד',
    accent: '#059669',
    accentLight: '#d1fae5',
    icon: '🎓',
  },
  custom: {
    label: 'תעודה מותאמת אישית',
    defaultTitle: 'תעודת הוקרה',
    defaultBody: '',
    accent: '#b45309',
    accentLight: '#fef3c7',
    icon: '🏅',
  },
};

function buildCertificateHtml(cert) {
  const b = loadBranding();

  // A template-based certificate borrows its accent color and default
  // wording from an AI-analyzed CertificateTemplate record (cert.templateData),
  // instead of one of the four fixed built-in templates.
  const templateData = cert.templateData;
  const isTemplateBased = cert.template === 'template_based' && templateData;
  const design = isTemplateBased ? resolveTemplateDesign(templateData) : null;

  const tpl = isTemplateBased
    ? {
        label: templateData.name || 'תבנית מותאמת אישית',
        defaultTitle: templateData.detected_title || 'תעודת הוקרה',
        defaultBody: templateData.detected_body_text || '',
        accent: design.accent,
        accentLight: design.secondary,
        icon: design.iconSymbol,
      }
    : (CERTIFICATE_TEMPLATES[cert.template] || CERTIFICATE_TEMPLATES.custom);

  const doc = getDocSettings();
  const accent = doc.accentColor || tpl.accent;

  const title = escapeHtml(cert.title || tpl.defaultTitle);
  const bodyText = escapeHtml(cert.body_text || tpl.defaultBody);
  const studentName = escapeHtml(cert.student_name || '');
  const subject = escapeHtml(cert.subject || (cert.subjects || []).join('• ') || '');
  const signedBy = escapeHtml(cert.signed_by || b.teacher_name || '');
  const schoolName = escapeHtml(b.school_name || '');
  const docTitle = escapeHtml(doc.title || '');
  const dateLine = escapeHtml(formatDateForDoc(cert.date, doc.dateFormat));

  const logoHtml = b.logo_url
    ? `<img src="${escapeHtml(b.logo_url)}" style="height:56px;width:56px;object-fit:contain;border-radius:10px;" />`
    : '';

  const fontStack = fontStackFromDesign(design);
  const bg = design?.background || '#fffdf8';
  const fc = design?.frameColor || accent;

  let frameHtml;
  if (!design) {
    frameHtml = `<div style="position:absolute; inset:16px; border:3px solid ${accent}; border-radius:16px; pointer-events:none;"></div>
      <div style="position:absolute; inset:26px; border:1px solid ${accent}55; border-radius:10px; pointer-events:none;"></div>`;
  } else {
    switch (design.frameStyle) {
      case 'none': frameHtml = ''; break;
      case 'single': frameHtml = `<div style="position:absolute; inset:16px; border:2px solid ${fc}; border-radius:14px; pointer-events:none;"></div>`; break;
      case 'ornate':
        frameHtml = `<div style="position:absolute; inset:14px; border:3px double ${fc}; border-radius:16px; pointer-events:none;"></div>
          <div style="position:absolute; inset:24px; border:1px solid ${fc}66; border-radius:10px; pointer-events:none;"></div>
          <div style="position:absolute; top:10px; right:10px; font-size:18px; color:${fc};">✦</div>
          <div style="position:absolute; top:10px; left:10px; font-size:18px; color:${fc};">✦</div>
          <div style="position:absolute; bottom:10px; right:10px; font-size:18px; color:${fc};">✦</div>
          <div style="position:absolute; bottom:10px; left:10px; font-size:18px; color:${fc};">✦</div>`;
        break;
      case 'double':
      default:
        frameHtml = `<div style="position:absolute; inset:16px; border:3px solid ${fc}; border-radius:16px; pointer-events:none;"></div>
          <div style="position:absolute; inset:26px; border:1px solid ${fc}55; border-radius:10px; pointer-events:none;"></div>`;
    }
  }

  const watermarkHtml = design?.hasWatermark && design.watermarkText
    ? `<div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; pointer-events:none; opacity:0.07; font-size:90px; font-weight:800; color:${fc}; transform:rotate(-18deg);">${escapeHtml(design.watermarkText)}</div>`
    : '';

  const titleAlignStyle = design?.titleAlign === 'right' ? 'align-self:flex-start;' : '';

  return `
    <div id="cert-root" style="
      font-family:${fontStack};
      direction:rtl;
      background:${bg};
      width:900px;
      height:640px;
      box-sizing:border-box;
      position:relative;
      padding:36px;
    ">
      ${watermarkHtml}
      ${frameHtml}

      <div style="position:relative; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:28px 56px;">

        ${docTitle ? `
          <div style="font-size:13px; color:${accent}; font-weight:700; letter-spacing:0.5px; margin-bottom:10px; opacity:0.85;">
            ${docTitle}
          </div>
        ` : ''}

        ${logoHtml || schoolName ? `
          <div style="display:flex; align-items:center; gap:10px; margin-bottom:18px;">
            ${logoHtml}
            ${schoolName ? `<div style="font-size:15px; color:#6b7280; font-weight:600;">${schoolName}</div>` : ''}
          </div>
        ` : ''}

        <div style="font-size:40px; margin-bottom:6px;">${tpl.icon}</div>

        <div style="font-size:34px; font-weight:800; color:${accent}; margin-bottom:4px; ${titleAlignStyle}">
          ${title}
        </div>

        <div style="width:120px; height:3px; background:${accent}; border-radius:2px; margin:14px 0 22px;"></div>

        <div style="font-size:16px; color:#374151; margin-bottom:10px;">מוענקת בזאת ל</div>

        <div style="font-size:44px; font-weight:800; color:#1e1b4b; margin-bottom:20px; font-family:${fontStack};">
          ${studentName}
        </div>

        <div style="font-size:16px; color:#4b5563; line-height:1.8; max-width:620px; margin-bottom:8px;">
          ${bodyText}${subject ? `<br/><span style="color:${accent}; font-weight:700;">${subject}</span>` : ''}
        </div>

        <div style="flex:1;"></div>

        <div style="display:flex; justify-content:space-between; align-items:flex-end; width:100%; margin-top:24px;">
          <div style="text-align:center; min-width:160px;">
            <div style="border-top:1.5px solid #9ca3af; padding-top:6px; font-size:13px; color:#374151; font-weight:600;">
              ${signedBy || '&nbsp;'}
            </div>
            <div style="font-size:11px; color:#9ca3af; margin-top:2px;">חתימת המחנך/ת</div>
          </div>

          <div style="text-align:center; min-width:240px;">
            <div style="border-top:1.5px solid #9ca3af; padding-top:6px; font-size:14px; color:#374151; font-weight:600; direction:rtl;">
              ${dateLine}
            </div>
            <div style="font-size:11px; color:#9ca3af; margin-top:2px;">תאריך</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

async function renderCertificateToCanvas(cert) {
  const html = buildCertificateHtml(cert);
  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;top:-9999px;left:-9999px;z-index:-1;';
  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    const { default: html2canvas } = await import('html2canvas');
    const el = container.querySelector('#cert-root');
    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#fffdf8',
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
 * Exports a single certificate as a one-page A4-landscape PDF.
 * cert: { student_name, template, title, body_text, subject, date, signed_by }
 */
export async function exportCertificatePDF(cert) {
  const { default: jsPDF } = await import('jspdf');
  const canvas = await renderCertificateToCanvas(cert);
  const imgData = canvas.toDataURL('image/png');

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 10;
  const usableW = pageW - margin * 2;
  const usableH = pageH - margin * 2;
  const imgRatio = canvas.width / canvas.height;
  let drawW = usableW;
  let drawH = drawW / imgRatio;
  if (drawH > usableH) { drawH = usableH; drawW = drawH * imgRatio; }
  const offsetX = margin + (usableW - drawW) / 2;
  const offsetY = margin + (usableH - drawH) / 2;
  doc.addImage(imgData, 'PNG', offsetX, offsetY, drawW, drawH);

  const safeName = (cert.student_name || 'תלמיד').replace(/[\\/:*?"<>|]/g, '');
  doc.save(`תעודה_${safeName}.pdf`);
  toast.success('התעודה הופקה בהצלחה!');
}

/**
 * Exports multiple certificates as a single multi-page PDF —
 * one certificate per landscape A4 page, in the given order.
 */
export async function exportCertificateBatchPDF(certs, batchLabel = 'תעודות') {
  if (!certs?.length) {
    toast.error('לא נבחרו תלמידים להפקת תעודות');
    return;
  }

  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 10;
  const usableW = pageW - margin * 2;
  const usableH = pageH - margin * 2;

  for (let i = 0; i < certs.length; i++) {
    const canvas = await renderCertificateToCanvas(certs[i]);
    const imgData = canvas.toDataURL('image/png');
    const imgRatio = canvas.width / canvas.height;
    let drawW = usableW;
    let drawH = drawW / imgRatio;
    if (drawH > usableH) { drawH = usableH; drawW = drawH * imgRatio; }
    const offsetX = margin + (usableW - drawW) / 2;
    const offsetY = margin + (usableH - drawH) / 2;

    if (i > 0) doc.addPage('a4', 'landscape');
    doc.addImage(imgData, 'PNG', offsetX, offsetY, drawW, drawH);
  }

  const dateStr = new Date().toLocaleDateString('he-IL').replace(/\//g, '-');
  const safeLabel = batchLabel.replace(/[\\/:*?"<>|]/g, '');
  doc.save(`${safeLabel}_${dateStr}.pdf`);
  toast.success(`הופקו ${certs.length} תעודות בקובץ אחד!`);
}