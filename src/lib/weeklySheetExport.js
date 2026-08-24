// ייצוא דף קשר שבועי ל-PDF — שלושה עמודים: שער, הספק החומר, דף חתימת הורים.
// אותה טכניקה כמו weeklyBulletinExport.js: DOM נסתר → html2canvas → jsPDF.
import { toast } from 'sonner';

function buildPage({ title, bodyHtml }) {
  const page = document.createElement('div');
  page.style.width = '780px';
  page.style.minHeight = '1000px';
  page.style.padding = '40px';
  page.style.background = '#ffffff';
  page.style.direction = 'rtl';
  page.style.fontFamily = 'Heebo, Arial, sans-serif';
  page.style.color = '#1f2420';
  page.style.boxSizing = 'border-box';
  page.innerHTML = `
    <div style="text-align:center;margin-bottom:22px;border-bottom:2px solid #4caf3d;padding-bottom:14px;">
      <div style="font-size:22px;font-weight:800;">${title}</div>
    </div>
    ${bodyHtml}
  `;
  return page;
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function nl2p(text) {
  return escapeHtml(text)
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => `<p style="margin:4px 0;font-size:13px;line-height:1.6;">${l}</p>`)
    .join('') || '<p style="color:#999;font-size:12px;">—</p>';
}

async function renderPagesToCanvases(draft) {
  const html2canvas = (await import('html2canvas')).default;

  const coverBody = `
    <div style="text-align:center;margin-top:60px;">
      <p style="font-size:20px;font-weight:700;">${escapeHtml(draft.className || 'הכיתה')}</p>
      <p style="font-size:16px;color:#4caf3d;font-weight:600;margin-top:10px;">פרשת ${escapeHtml(draft.parasha || '')}</p>
      <p style="font-size:13px;color:#6b7268;margin-top:6px;">${escapeHtml(draft.hebrewYear || '')}</p>
      <div style="margin-top:60px;font-size:13px;color:#6b7268;">
        <p>${escapeHtml(draft.teacherName || '')}</p>
        <p style="margin-top:4px;">${escapeHtml(draft.teacherPhone || '')}</p>
      </div>
    </div>`;

  const subjectsBody = `
    <div>
      ${draft.subjects.map((s) => `
        <div style="margin-bottom:14px;padding:10px 14px;background:#f7f6f2;border-radius:10px;">
          <p style="font-weight:700;font-size:14px;margin:0 0 4px;">${escapeHtml(s.subject)}</p>
          <p style="font-size:13px;margin:0;color:#333;">${escapeHtml(s.content) || '—'}</p>
        </div>`).join('')}
      <div style="margin-top:18px;">
        <p style="font-weight:700;font-size:14px;">מבחנים השבוע</p>
        ${nl2p(draft.exams)}
      </div>
      <div style="margin-top:14px;">
        <p style="font-weight:700;font-size:14px;">הודעות להורים</p>
        ${nl2p(draft.announcements)}
      </div>
      <div style="margin-top:14px;">
        <p style="font-weight:700;font-size:14px;">יישר כח לתלמידים</p>
        ${nl2p(draft.praise)}
      </div>
    </div>`;

  const signBody = `
    <div>
      <p style="font-weight:700;font-size:14px;">הנחיות להורים</p>
      <ul style="padding-right:18px;font-size:13px;line-height:1.7;">
        ${draft.guidelines.filter(Boolean).map((g) => `<li>${escapeHtml(g)}</li>`).join('')}
      </ul>
      <div style="margin-top:24px;border:1px solid #e7e5df;border-radius:12px;padding:16px;">
        <p style="font-weight:700;font-size:14px;margin:0 0 10px;">הערכת הורים</p>
        ${draft.evalFields.filter(Boolean).map((f) => `
          <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee;font-size:13px;">
            <span>${escapeHtml(f)}</span>
            <span style="color:#999;">________________</span>
          </div>`).join('')}
      </div>
      <div style="margin-top:20px;display:flex;justify-content:space-between;font-size:13px;">
        <span>חתימת הורה: ________________</span>
        <span>יש להחזיר עד: ${escapeHtml(draft.returnBy || '')}</span>
      </div>
    </div>`;

  const pages = [
    buildPage({ title: 'דף קשר שבועי להורים', bodyHtml: coverBody }),
    buildPage({ title: 'הספק החומר ועדכונים', bodyHtml: subjectsBody }),
    buildPage({ title: 'דף חתימת הורים', bodyHtml: signBody }),
  ];

  const holder = document.createElement('div');
  holder.style.position = 'fixed';
  holder.style.top = '-10000px';
  holder.style.left = '-10000px';
  pages.forEach((p) => holder.appendChild(p));
  document.body.appendChild(holder);

  try {
    const canvases = [];
    for (const page of pages) {
      canvases.push(await html2canvas(page, { scale: 2, backgroundColor: '#ffffff', useCORS: true }));
    }
    return canvases;
  } finally {
    document.body.removeChild(holder);
  }
}

export async function exportWeeklySheetPdf(draft) {
  const { default: jsPDF } = await import('jspdf');
  const canvases = await renderPagesToCanvases(draft);

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 8;
  const usableW = pageW - margin * 2;
  const usableH = pageH - margin * 2;

  canvases.forEach((canvas, i) => {
    const pxToMm = usableW / canvas.width;
    const heightMm = Math.min(canvas.height * pxToMm, usableH);
    if (i > 0) doc.addPage('a4', 'portrait');
    doc.addImage(canvas.toDataURL('image/png'), 'PNG', margin, margin, usableW, heightMm);
  });

  const safeName = (draft.className || 'כללי').replace(/[\\/:*?"<>|]/g, '_');
  doc.save(`דף_קשר_שבועי_${safeName}.pdf`);
  toast.success('דף הקשר הופק בהצלחה!');
}
