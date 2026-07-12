import React from 'react';
import { getScoreBg } from '@/lib/performanceScore';
import { TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react';

export default function PerformanceBadge({ score, trend, size = 'sm', showTrend = false }) {
  if (score === undefined || score === null) return null;
  const bg = getScoreBg(score);
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-red-500' : 'text-muted-foreground';

  if (size === 'lg') {
    return (
      <div className="flex items-center gap-2">
        <div className={`px-3 py-1.5 rounded-xl font-bold text-lg ${bg}`}>
          {score}
          <span className="text-xs font-normal opacity-70">/100</span>
        </div>
        {showTrend && trend !== 'stable' && (
          <TrendIcon className={`w-5 h-5 ${trendColor}`} />
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-0.5">
      <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-bold ${bg}`}>
        {score}
      </span>
      {showTrend && trend !== 'stable' && (
        <TrendIcon className={`w-3 h-3 ${trendColor}`} />
      )}
    </div>
  );
}