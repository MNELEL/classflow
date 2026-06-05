import React from 'react';
import { Button } from '@/components/ui/button';
import { Wand2, Shuffle, Hash, EyeOff, RefreshCw, FileDown, FileSpreadsheet, Printer, ClipboardList, Undo2, Redo2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { exportToPDF, exportToExcel, printSeating, printCleanSeating } from '@/lib/exportUtils';

const QUICK_SORT_PREFS = [
  { value: 'none', label: 'ברירת מחדל' },
  { value: 'front', label: '⬆️ קדמה' },
  { value: 'middle', label: '↔️ אמצע' },
  { value: 'back', label: '⬇️ אחורה' },
  { value: 'left', label: '◀️ שמאל' },
  { value: 'center', label: '⬛ מרכז' },
  { value: 'right', label: '▶️ ימין' },
];

export default function GridControls({
  rows, cols, onRowsChange, onColsChange,
  onSmartSort, onQuickSort, quickSortPref, onQuickSortPrefChange,
  onClearAll,
  showNumbers, onToggleNumbers,
  satisfactionScore,
  unseatedCount,
  isLoading,
  seats,
  students,
  onUndo, onRedo, canUndo, canRedo,
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      {/* Score */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground">מדד שביעות רצון</span>
        <Badge
          className={`text-sm font-bold ${
            satisfactionScore >= 80 ? 'bg-success text-white' :
            satisfactionScore >= 50 ? 'bg-warning text-white' :
            'bg-destructive text-white'
          }`}
        >
          {satisfactionScore}%
        </Badge>
      </div>

      {unseatedCount > 0 && (
        <div className="text-xs text-warning font-medium">
          ⚠️ {unseatedCount} תלמידים ממתינים לשיבוץ
        </div>
      )}

      {/* Grid size */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[11px] text-muted-foreground mb-1 block">שורות</label>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="outline" className="h-7 w-7 text-xs" onClick={() => onRowsChange(Math.max(1, rows - 1))}>−</Button>
            <span className="w-6 text-center text-sm font-medium">{rows}</span>
            <Button size="icon" variant="outline" className="h-7 w-7 text-xs" onClick={() => onRowsChange(rows + 1)}>+</Button>
          </div>
        </div>
        <div>
          <label className="text-[11px] text-muted-foreground mb-1 block">טורים</label>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="outline" className="h-7 w-7 text-xs" onClick={() => onColsChange(Math.max(1, cols - 1))}>−</Button>
            <span className="w-6 text-center text-sm font-medium">{cols}</span>
            <Button size="icon" variant="outline" className="h-7 w-7 text-xs" onClick={() => onColsChange(cols + 1)}>+</Button>
          </div>
        </div>
      </div>

      {/* Undo / Redo */}
      <div className="flex gap-1.5">
        <Button
          variant="outline" size="sm" className="flex-1 gap-1"
          onClick={onUndo} disabled={!canUndo}
          title="ביטול פעולה אחרונה"
        >
          <Undo2 className="w-3.5 h-3.5" /> ביטול
        </Button>
        <Button
          variant="outline" size="sm" className="flex-1 gap-1"
          onClick={onRedo} disabled={!canRedo}
          title="שחזור פעולה"
        >
          <Redo2 className="w-3.5 h-3.5" /> שחזור
        </Button>
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <Button
          className="w-full bg-primary"
          size="sm"
          onClick={onSmartSort}
          disabled={isLoading}
        >
          <Wand2 className="w-4 h-4 ml-1" />
          {isLoading ? 'מסדר...' : 'סידור חכם (AI)'}
        </Button>
        <div className="space-y-1">
          <label className="text-[11px] text-muted-foreground block">העדפה לסידור מהיר</label>
          <select
            value={quickSortPref}
            onChange={e => onQuickSortPrefChange(e.target.value)}
            className="w-full text-xs border border-border rounded-md px-2 py-1.5 bg-background text-foreground"
          >
            {QUICK_SORT_PREFS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          <Button variant="outline" size="sm" className="w-full" onClick={onQuickSort}>
            <Shuffle className="w-4 h-4 ml-1" /> סידור מהיר
          </Button>
        </div>
        <Button variant="ghost" size="sm" className="w-full text-destructive hover:text-destructive" onClick={onClearAll}>
          <RefreshCw className="w-4 h-4 ml-1" /> נקה הכל
        </Button>
      </div>

      {/* Show numbers */}
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={onToggleNumbers}
      >
        {showNumbers ? <EyeOff className="w-4 h-4 ml-1" /> : <Hash className="w-4 h-4 ml-1" />}
        {showNumbers ? 'הסתר מספרים' : 'הצג מספרים'}
      </Button>

      {/* Export */}
      <div className="border-t border-border pt-3 space-y-1.5">
        <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">ייצוא</p>
        <Button variant="outline" size="sm" className="w-full gap-1.5" onClick={() => exportToPDF(seats, students, rows, cols)}>
          <FileDown className="w-3.5 h-3.5" /> ייצוא PDF
        </Button>
        <Button variant="outline" size="sm" className="w-full gap-1.5" onClick={() => exportToExcel(seats, students, rows, cols)}>
          <FileSpreadsheet className="w-3.5 h-3.5" /> ייצוא Excel
        </Button>
        <Button variant="outline" size="sm" className="w-full gap-1.5" onClick={() => printSeating(seats, students, rows, cols)}>
          <Printer className="w-3.5 h-3.5" /> הדפסה
        </Button>
        <Button variant="outline" size="sm" className="w-full gap-1.5" onClick={() => printCleanSeating(seats, students, rows, cols)}>
          <ClipboardList className="w-3.5 h-3.5" /> הדפסה נקייה
        </Button>
      </div>
    </div>
  );
}