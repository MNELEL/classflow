import React from 'react';
import { Button } from '@/components/ui/button';
import { Wand2, Shuffle, Hash, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function GridControls({
  rows, cols, onRowsChange, onColsChange,
  onSmartSort, onQuickSort, onClearAll,
  showNumbers, onToggleNumbers,
  satisfactionScore,
  unseatedCount,
  isLoading,
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
        <Button variant="outline" size="sm" className="w-full" onClick={onQuickSort}>
          <Shuffle className="w-4 h-4 ml-1" /> סידור מהיר
        </Button>
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
    </div>
  );
}