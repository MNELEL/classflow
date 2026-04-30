import jsPDF from 'jspdf';

// ── Excel Export ──────────────────────────────────────────────────────────────
export function exportToExcel(seats, students, rows, cols) {
  const studentMap = Object.fromEntries(students.map(s => [s.id, s]));

  // Build 2-D grid (row × col)
  const grid = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => {
      const seat = seats.find(s => s.row === r && s.col === c);
      if (!seat || seat.is_hidden) return '';
      if (seat.is_gap) return '—';
      return seat.student_id ? (studentMap[seat.student_id]?.name || '') : '';
    })
  );

  // Build CSV rows (RTL: reverse columns for natural Hebrew reading)
  const header = Array.from({ length: cols }, (_, i) => `עמודה ${i + 1}`).join(',');
  const rowLabels = grid.map((row, i) => [`שורה ${i + 1}`, ...row].join(','));
  const csv = [['', header].join('\n'), ...rowLabels].join('\n');
  // Simpler: single header row + data
  const colHeaders = ['', ...Array.from({ length: cols }, (_, i) => `עמודה ${i + 1}`)].join(',');
  const dataRows = grid.map((row, i) => [`שורה ${i + 1}`, ...row].join(','));
  const fullCsv = '\uFEFF' + [colHeaders, ...dataRows].join('\n'); // BOM for Hebrew in Excel

  const blob = new Blob([fullCsv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `מפת_ישיבה_${new Date().toLocaleDateString('he-IL').replace(/\//g, '-')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── PDF Export ─────────────────────────────────────────────────────────────────
export function exportToPDF(seats, students, rows, cols) {
  const studentMap = Object.fromEntries(students.map(s => [s.id, s]));
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 12;
  const usableW = pageW - margin * 2;
  const usableH = pageH - margin * 2 - 20; // 20 for title

  const cellW = usableW / cols;
  const cellH = Math.min(usableH / rows, 18);

  const dateStr = new Date().toLocaleDateString('he-IL');

  // Title (right-aligned for RTL feel)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(`Seating Map - ${dateStr}`, pageW - margin, margin + 6, { align: 'right' });

  // Teacher board
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setDrawColor(99, 102, 241);
  doc.setFillColor(238, 238, 255);
  const boardW = 50;
  doc.roundedRect(pageW / 2 - boardW / 2, margin + 10, boardW, 7, 2, 2, 'FD');
  doc.setTextColor(60, 60, 200);
  doc.text('Teacher Board', pageW / 2, margin + 15, { align: 'center' });
  doc.setTextColor(0, 0, 0);

  const startY = margin + 22;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // PDF columns: mirror for RTL (col 0 = rightmost visually → leftmost in PDF x)
      const x = margin + c * cellW;
      const y = startY + r * cellH;

      const seat = seats.find(s => s.row === r && s.col === c);

      if (!seat || seat.is_hidden) continue;

      if (seat.is_gap) {
        doc.setFillColor(230, 230, 230);
        doc.setDrawColor(200, 200, 200);
        doc.roundedRect(x + 1, y + 1, cellW - 2, cellH - 2, 1, 1, 'F');
        continue;
      }

      const student = seat.student_id ? studentMap[seat.student_id] : null;

      if (student) {
        doc.setFillColor(237, 233, 254); // light purple
        doc.setDrawColor(139, 92, 246);
      } else {
        doc.setFillColor(250, 250, 250);
        doc.setDrawColor(200, 200, 200);
      }

      doc.roundedRect(x + 1, y + 1, cellW - 2, cellH - 2, 1.5, 1.5, 'FD');

      if (student) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(Math.min(8, cellW / 5));
        doc.setTextColor(60, 20, 120);
        // Truncate long names
        const name = student.name.length > 14 ? student.name.slice(0, 13) + '…' : student.name;
        doc.text(name, x + cellW / 2, y + cellH / 2 + 1, { align: 'center' });
      }

      // Lock indicator
      if (seat.is_locked) {
        doc.setFontSize(6);
        doc.setTextColor(100, 100, 100);
        doc.text('🔒', x + 2, y + 3);
      }
    }
  }

  // Row numbers on right margin
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  for (let r = 0; r < rows; r++) {
    doc.text(`R${r + 1}`, margin - 8, startY + r * cellH + cellH / 2 + 1);
  }

  doc.save(`מפת_ישיבה_${dateStr.replace(/\//g, '-')}.pdf`);
}