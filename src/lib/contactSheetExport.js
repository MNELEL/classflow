// ייצוא דף קשר מוסדי ל-PDF — DOM נסתר → html2canvas → jsPDF, בקבוצות לפי קטגוריה.
import { toast } from 'sonner';

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

async function renderToCanvas(rows, className) {
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

  const header = `
    <div style="text-align:center;margin-bottom:20px;border-bottom:2px solid #4caf3d;padding-bottom:14px;">
      <div style="font-size:22px;font-weight:800;">דף קשר</div>
      ${className ? `<div style="font-size:13px;color:#6b7268;margin-top:4px;">${escapeHtml(className)}</div>` : ''}
    </div>`;

  const categories = [...new Set(rows.map((r) => r.category))];
  const body = categories.map((cat) => `
    <div style="margin-bottom:18px;break-inside:avoid;">
      <div style="font-size:14px;font-weight:700;background:#f0f6ee;padding:6px 10px;border-radius:8px;margin-bottom:6px;">
        ${escapeHtml(cat)}
      </div>
      ${rows.filter((r) => r.category === cat).map((r) => `
        <div style="padding:8px;border-bottom:1px solid #eee;font-size:12px;">
          <div style="font-weight:600;">
            ${escapeHtml(r.name)}${r.role ? ` <span style="font-weight:400;color:#6b7268;">· ${escapeHtml(r.role)}</span>` : ''}
          </div>
          <div style="color:#6b7268;margin-top:2px;">
            ${[r.phone, r.email, r.notes].filter(Boolean).map(escapeHtml).join(' · ') || 'טרם הושלמו פרטים'}
          </div>
        </div>`).join('')}
    </div>`).join('');

  container.innerHTML = header + body;
  document.body.appendChild(container);

  try {
    return await html2canvas(container, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
  } finally {
    document.body.removeChild(container);
  }
}

export async function exportContactSheetPdf(rows, { className } = {}) {
  const { default: jsPDF } = await import('jspdf');
  const canvas = await renderToCanvas(rows, className);

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
      sliceCanvas.getContext('2d').drawImage(canvas, 0, renderedPx, canvas.width, sliceHeightPx, 0, 0, canvas.width, sliceHeightPx);
      if (!first) doc.addPage('a4', 'portrait');
      first = false;
      doc.addImage(sliceCanvas.toDataURL('image/png'), 'PNG', margin, margin, usableW, sliceHeightPx * pxToMm);
      renderedPx += sliceHeightPx;
    }
  }

  doc.save('דף_קשר.pdf');
  toast.success('דף הקשר הופק בהצלחה!');
}
