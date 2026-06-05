import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { toast } from 'sonner';
import { loadBranding } from '@/lib/branding';

// ── Excel / CSV Export ────────────────────────────────────────────────────────
export async function exportToExcel(seats, students, rows, cols) {
  const studentMap = Object.fromEntries(students.map(s => [s.id, s]));

  const grid = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => {
      const seat = seats.find(s => s.row === r && s.col === c);
      if (!seat || seat.is_hidden) return '';
      if (seat.is_gap) return '—';
      return seat.student_id ? (studentMap[seat.student_id]?.name || '') : '';
    })
  );

  const colHeaders = ['', ...Array.from({ length: cols }, (_, i) => `עמודה ${i + 1}`)].join(',');
  const dataRows = grid.map((row, i) => [`שורה ${i + 1}`, ...row].join(','));
  const fullCsv = '\uFEFF' + [colHeaders, ...dataRows].join('\n');

  const blob = new Blob([fullCsv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `מפת_ישיבה_${new Date().toLocaleDateString('he-IL').replace(/\//g, '-')}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast.success('קובץ Excel (CSV) הורד בהצלחה!');
}

// ── Build clean seat grid HTML (shared between PDF and Print) ─────────────────
// pair_right on a seat means it shares a "desk" with its right neighbour → extra margin between groups
function buildSeatingTable(seats, students, rows, cols) {
  const studentMap = Object.fromEntries(students.map(s => [s.id, s]));

  // Decide cell size so the full grid fits on A4 landscape (≈1050px usable)
  const maxTableW = 1020;
  const maxTableH = 580;
  const cellW = Math.max(60, Math.min(130, Math.floor((maxTableW - cols * 6) / cols)));
  const cellH = Math.max(44, Math.min(80, Math.floor((maxTableH - rows * 6) / rows)));
  const fontSize = cellW > 100 ? 13 : cellW > 75 ? 11 : 9;

  let tableRows = '';
  for (let r = 0; r < rows; r++) {
    let cells = '';
    for (let c = 0; c < cols; c++) {
      const seat = seats.find(s => s.row === r && s.col === c);
      if (!seat || seat.is_hidden) {
        cells += `<td style="width:${cellW}px;height:${cellH}px;padding:0;"></td>`;
        continue;
      }
      if (seat.is_gap || seat.is_blocked) {
        cells += `<td style="
          width:${cellW}px; height:${cellH}px;
          background:#f9f9f9; padding:0;
        "></td>`;
        continue;
      }
      // Extra right margin when pair_right is set (aisle between desk pairs)
      const rightPad = seat.pair_right ? 'padding-right:14px;' : '';
      const bottomPad = seat.pair_down ? 'padding-bottom:12px;' : '';
      const student = seat.student_id ? studentMap[seat.student_id] : null;
      const name = student?.name || '';
      const bg = student ? '#f0edff' : '#fafafa';
      const border = student ? '1.5px solid #c4b5fd' : '1px solid #e5e7eb';
      const color = student ? '#1e1b4b' : '#d1d5db';
      cells += `<td style="
        width:${cellW}px; height:${cellH}px; max-width:${cellW}px;
        ${rightPad}${bottomPad}
      ">
        <div style="
          background:${bg}; border:${border}; border-radius:8px;
          width:100%; height:100%;
          display:flex; align-items:center; justify-content:center;
          font-family:'Heebo',Arial,sans-serif;
          font-size:${fontSize}px; font-weight:${student ? 600 : 400}; color:${color};
          overflow:hidden; text-align:center; padding:2px 4px;
        ">
          <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;direction:rtl;width:100%;text-align:center;">${name}</span>
        </div>
      </td>`;
    }
    tableRows += `<tr>${cells}</tr>`;
  }
  return { tableRows, cellW, cellH };
}

// ── Build branded header HTML ─────────────────────────────────────────────────
function buildBrandedHeader(dateStr, rows, cols, docTitle) {
  const b = loadBranding();
  const schoolName = b.school_name || 'ClassManager Pro';
  const teacherLine = [b.teacher_name, b.class_name].filter(Boolean).join(' · ');
  const logoHtml = b.logo_url
    ? `<img src="${b.logo_url}" style="height:48px;width:48px;object-fit:contain;border-radius:8px;" />`
    : `<div style="background:#ede9fe;border-radius:8px;padding:6px 16px;font-size:12px;color:#5b21b6;font-weight:600;">${schoolName}</div>`;

  return `
    <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:18px;border-bottom:2px solid #7c3aed;padding-bottom:12px;">
      <div>
        <div style="font-size:22px;font-weight:800;color:#1e1b4b;">${docTitle}</div>
        <div style="font-size:12px;color:#6b7280;margin-top:4px;">${dateStr} · ${rows} שורות × ${cols} טורים${teacherLine ? ' · ' + teacherLine : ''}</div>
      </div>
      ${logoHtml}
    </div>
  `;
}

// ── Styled HTML → PDF Export ──────────────────────────────────────────────────
export async function exportToPDF(seats, students, rows, cols, title = '') {
  const b = loadBranding();
  const dateStr = new Date().toLocaleDateString('he-IL');
  const { tableRows } = buildSeatingTable(seats, students, rows, cols);
  const docTitle = title || b.page_titles?.['/seating'] || 'מפת ישיבה';

  // Use a fixed A4-landscape width so everything always fits
  const PAGE_W = 1100;

  const htmlContent = `
    <div id="pdf-root" style="
      font-family:'Heebo',Arial,sans-serif;
      direction:rtl;
      background:#fff;
      padding:32px;
      width:${PAGE_W}px;
      box-sizing:border-box;
    ">
      ${buildBrandedHeader(dateStr, rows, cols, docTitle)}

      <div style="text-align:center;margin-bottom:14px;">
        <div style="display:inline-block;background:#e0e7ff;border:2px solid #6366f1;border-radius:10px;padding:6px 36px;color:#3730a3;font-weight:700;font-size:13px;letter-spacing:1px;">
          לוח המורה
        </div>
      </div>

      <div style="overflow:hidden;">
        <table style="border-collapse:separate;border-spacing:6px;margin:0 auto;direction:rtl;width:100%;">
          <tbody>${tableRows}</tbody>
        </table>
      </div>
    </div>
  `;

  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;top:-9999px;left:-9999px;z-index:-1;';
  container.innerHTML = htmlContent;
  document.body.appendChild(container);

  try {
    const el = container.querySelector('#pdf-root');
    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      width: el.scrollWidth,
      height: el.scrollHeight,
    });

    const imgData = canvas.toDataURL('image/png');
    // Scale to fit A4 landscape (297×210 mm)
    const A4_W_MM = 297, A4_H_MM = 210;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 8;
    const usableW = pageW - margin * 2;
    const usableH = pageH - margin * 2;
    const imgRatio = canvas.width / canvas.height;
    let drawW = usableW;
    let drawH = drawW / imgRatio;
    if (drawH > usableH) { drawH = usableH; drawW = drawH * imgRatio; }
    const offsetX = margin + (usableW - drawW) / 2;
    const offsetY = margin + (usableH - drawH) / 2;
    doc.addImage(imgData, 'PNG', offsetX, offsetY, drawW, drawH);
    doc.save(`מפת_ישיבה_${dateStr.replace(/\//g, '-')}.pdf`);
    toast.success('קובץ PDF הורד בהצלחה!');
  } finally {
    document.body.removeChild(container);
  }
}

// ── Print Export ──────────────────────────────────────────────────────────────
export function printSeating(seats, students, rows, cols, title = '') {
  const b = loadBranding();
  const dateStr = new Date().toLocaleDateString('he-IL');
  const { tableRows } = buildSeatingTable(seats, students, rows, cols);
  const docTitle = title || b.page_titles?.['/seating'] || 'מפת ישיבה';
  const schoolName = b.school_name || 'ClassManager Pro';
  const teacherLine = [b.teacher_name, b.class_name].filter(Boolean).join(' · ');
  const logoHtml = b.logo_url
    ? `<img src="${b.logo_url}" style="height:44px;width:44px;object-fit:contain;border-radius:8px;" />`
    : `<div class="badge">${schoolName}</div>`;

  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html dir="rtl" lang="he">
    <head>
      <meta charset="UTF-8">
      <title>${docTitle}</title>
      <link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;600;700;800&display=swap" rel="stylesheet">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Heebo', Arial, sans-serif; direction: rtl; padding: 24px; background: #fff; }
        .header { display:flex; justify-content:space-between; align-items:flex-end; border-bottom:2px solid #7c3aed; padding-bottom:10px; margin-bottom:16px; }
        .title { font-size:22px; font-weight:800; color:#1e1b4b; }
        .subtitle { font-size:12px; color:#6b7280; margin-top:3px; }
        .badge { background:#ede9fe; border-radius:8px; padding:5px 14px; font-size:12px; color:#5b21b6; font-weight:600; }
        .board { text-align:center; margin-bottom:14px; }
        .board-inner { display:inline-block; background:#e0e7ff; border:2px solid #6366f1; border-radius:10px; padding:6px 32px; color:#3730a3; font-weight:700; font-size:13px; }
        table { border-collapse:separate; border-spacing:6px; margin:0 auto; direction:rtl; width:100%; }
        td > div { box-sizing:border-box; }
        @media print {
          @page { size: A4 landscape; margin: 10mm; }
          body { padding: 0; }
          table { width: 100% !important; }
          td { page-break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="title">${docTitle}</div>
          <div class="subtitle">${dateStr} · ${rows} שורות × ${cols} טורים${teacherLine ? ' · ' + teacherLine : ''}</div>
        </div>
        ${logoHtml}
      </div>
      <div class="board"><div class="board-inner">לוח המורה</div></div>
      <table><tbody>${tableRows}</tbody></table>
      <script>window.onload = () => { window.print(); }<\/script>
    </body>
    </html>
  `);
  printWindow.document.close();
  toast.success('דף ההדפסה נפתח!');
}