import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { toast } from 'sonner';

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
function buildSeatingTable(seats, students, rows, cols) {
  const studentMap = Object.fromEntries(students.map(s => [s.id, s]));
  const cellW = Math.min(110, Math.floor(860 / cols));
  const cellH = Math.min(64, Math.floor(520 / rows));
  const fontSize = cellW > 90 ? 13 : cellW > 65 ? 11 : 9;

  let tableRows = '';
  for (let r = 0; r < rows; r++) {
    let cells = '';
    // LTR order (col 0 → cols-1) — direction:rtl on the table handles display order
    for (let c = 0; c < cols; c++) {
      const seat = seats.find(s => s.row === r && s.col === c);
      if (!seat || seat.is_hidden) {
        cells += `<td style="width:${cellW}px;height:${cellH}px;padding:0;"></td>`;
        continue;
      }
      if (seat.is_gap || seat.is_blocked) {
        cells += `<td style="
          width:${cellW}px; height:${cellH}px;
          background:#f5f5f5; border:1px dashed #ccc;
          border-radius:6px; padding:0;
        "></td>`;
        continue;
      }
      const student = seat.student_id ? studentMap[seat.student_id] : null;
      const name = student?.name || '';
      const bg = student ? '#f3f0ff' : '#fafafa';
      const border = student ? '1.5px solid #a78bfa' : '1px solid #e5e7eb';
      const color = student ? '#2e1065' : '#d1d5db';
      cells += `<td style="
        width:${cellW}px; height:${cellH}px; max-width:${cellW}px;
        background:${bg}; border:${border}; border-radius:8px;
        text-align:center; vertical-align:middle; padding:4px 3px;
        font-family:'Heebo',Arial,sans-serif;
        font-size:${fontSize}px; font-weight:${student ? 600 : 400}; color:${color};
        overflow:hidden;
      ">
        <span style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;direction:rtl;">${name}</span>
      </td>`;
    }
    tableRows += `<tr>${cells}</tr>`;
  }
  return { tableRows, cellW, cellH };
}

// ── Styled HTML → PDF Export ──────────────────────────────────────────────────
export async function exportToPDF(seats, students, rows, cols, title = '') {
  const dateStr = new Date().toLocaleDateString('he-IL');
  const { tableRows, cellW } = buildSeatingTable(seats, students, rows, cols);
  const tableWidth = cellW * cols + (cols - 1) * 6;

  const htmlContent = `
    <div id="pdf-root" style="
      font-family:'Heebo',Arial,sans-serif;
      direction:rtl;
      background:#fff;
      padding:28px;
      width:${tableWidth + 56}px;
    ">
      <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:18px;border-bottom:2px solid #7c3aed;padding-bottom:12px;">
        <div>
          <div style="font-size:22px;font-weight:800;color:#1e1b4b;">${title || 'מפת ישיבה'}</div>
          <div style="font-size:12px;color:#6b7280;margin-top:4px;">${dateStr} · ${rows} שורות × ${cols} טורים</div>
        </div>
        <div style="background:#ede9fe;border-radius:8px;padding:6px 16px;font-size:12px;color:#5b21b6;font-weight:600;">ClassManager Pro</div>
      </div>

      <div style="text-align:center;margin-bottom:16px;">
        <div style="display:inline-block;background:#e0e7ff;border:2px solid #6366f1;border-radius:10px;padding:6px 36px;color:#3730a3;font-weight:700;font-size:13px;letter-spacing:1px;">
          לוח המורה
        </div>
      </div>

      <table style="border-collapse:separate;border-spacing:6px;margin:0 auto;direction:rtl;">
        <tbody>${tableRows}</tbody>
      </table>
    </div>
  `;

  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;top:-9999px;left:-9999px;z-index:-1;';
  container.innerHTML = htmlContent;
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container.querySelector('#pdf-root'), {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/png');
    const imgW = canvas.width / 2;
    const imgH = canvas.height / 2;

    const orientation = imgW > imgH ? 'landscape' : 'portrait';
    const doc = new jsPDF({ orientation, unit: 'px', format: [imgW + 40, imgH + 40] });
    doc.addImage(imgData, 'PNG', 20, 20, imgW, imgH);
    doc.save(`מפת_ישיבה_${dateStr.replace(/\//g, '-')}.pdf`);
    toast.success('קובץ PDF הורד בהצלחה!');
  } finally {
    document.body.removeChild(container);
  }
}

// ── Print Export ──────────────────────────────────────────────────────────────
export function printSeating(seats, students, rows, cols, title = '') {
  const dateStr = new Date().toLocaleDateString('he-IL');
  const { tableRows } = buildSeatingTable(seats, students, rows, cols);

  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html dir="rtl" lang="he">
    <head>
      <meta charset="UTF-8">
      <title>מפת ישיבה</title>
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
        table { border-collapse:separate; border-spacing:6px; margin:0 auto; direction:rtl; }
        @media print { @page { size: auto; margin: 10mm; } body { padding: 0; } }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="title">${title || 'מפת ישיבה'}</div>
          <div class="subtitle">${dateStr} · ${rows} שורות × ${cols} טורים</div>
        </div>
        <div class="badge">ClassManager Pro</div>
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