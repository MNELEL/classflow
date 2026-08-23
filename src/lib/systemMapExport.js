// ייצוא מפת המערכת ל-PDF — בונה DOM נסתר עם הרשימה המסוננת שכבר מוצגת
// למשתמש, מרנדר ל-canvas עם html2canvas, ואז חותך לעמודי A4 לפי גובה
// (אותה טכניקה כמו weeklyBulletinExport.js — בלי הטמעת פונט, כי הטקסט
// עובר כתמונה).
import { toast } from 'sonner';

async function renderMapToCanvas(sections, className) {
  const html2canvas = (await import('html2canvas')).default;

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '-10000px';
  container.style.left = '-10000px';
  container.style.width = '780px';
  container.style.padding = '32px';
  container.style.background = '#ffffff';
  container.style.direction = 'rtl';
  container.style.fontFamily = 'Heebo, Arial, sans-serif';
  container.style.color = '#1f2420';

  const dateStr = new Date().toLocaleDateString('he-IL');
  const header = `
    <div style="text-align:center;margin-bottom:20px;border-bottom:2px solid #4caf3d;padding-bottom:14px;">
      <div style="font-size:22px;font-weight:800;">מפת המערכת</div>
      <div style="font-size:12px;color:#6b7268;margin-top:4px;">
        ${className ? `כיתה: ${className} · ` : ''}הופק בתאריך ${dateStr}
      </div>
    </div>`;

  const sectionsHtml = sections
    .map((s) => `
      <div style="margin-bottom:16px;break-inside:avoid;">
        <div style="font-size:14px;font-weight:700;background:#f0f6ee;padding:6px 10px;border-radius:8px;margin-bottom:6px;">
          ${s.title}
        </div>
        ${s.items
          .map(
            (it) => `
          <div style="display:flex;gap:8px;padding:6px 8px;font-size:12px;border-bottom:1px solid #eee;">
            <div style="font-weight:600;min-width:170px;">${it.label}</div>
            <div style="color:#6b7268;">${it.sub}</div>
          </div>`,
          )
          .join('')}
      </div>`)
    .join('');

  container.innerHTML = header + sectionsHtml;
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
    });
    return canvas;
  } finally {
    document.body.removeChild(container);
  }
}

/**
 * מייצא את מפת המערכת (הרשימה המסוננת המוצגת כרגע) לקובץ PDF בעימוד A4,
 * עם חיתוך אוטומטי לעמודים נוספים אם הרשימה ארוכה מעמוד אחד.
 */
export async function exportSystemMapPdf(sections, { className } = {}) {
  const { default: jsPDF } = await import('jspdf');
  const canvas = await renderMapToCanvas(sections, className);

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 8;
  const usableW = pageW - margin * 2;
  const usableH = pageH - margin * 2;

  const pxToMm = usableW / canvas.width;
  const fullHeightMm = canvas.height * pxToMm;

  if (fullHeightMm <= usableH) {
    doc.addImage(canvas.toDataURL('image/png'), 'PNG', margin, margin, usableW, fullHeightMm);
  } else {
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

  doc.save('מפת_המערכת.pdf');
  toast.success('מפת המערכת הופקה בהצלחה!');
}
