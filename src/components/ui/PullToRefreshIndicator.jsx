import React from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PullToRefreshIndicator({ pullY, refreshing, threshold = 72 }) {
  const progress = Math.min(pullY / threshold, 1);
  const triggered = progress >= 1;

  if (pullY <= 0 && !refreshing) return null;

  return (
    <div
      className="absolute top-0 inset-x-0 flex justify-center items-center z-50 pointer-events-none"
      style={{ height: `${refreshing ? threshold : pullY}px`, transition: refreshing ? 'height 0.2s ease' : 'none' }}
    >
      <div className={cn(
        'w-9 h-9 rounded-full bg-card border border-border shadow-md flex items-center justify-center',
        triggered || refreshing ? 'text-primary' : 'text-muted-foreground'
      )}>
        <RefreshCw
          className={cn('w-4 h-4 transition-transform', refreshing && 'animate-spin')}
          style={{ transform: `rotate(${progress * 360}deg)`, transition: refreshing ? '' : 'none' }}
        />
      </div>
    </div>
  );
}