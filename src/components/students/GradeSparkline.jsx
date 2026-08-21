import React, { useMemo } from 'react';
import { LineChart, Line, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

/**
 * Compact sparkline showing a student's grade trend across the year.
 * Each point is a single grade (most recent ~12), with a dot per grade.
 * No axes — just the trend line — sized to fit inside the grades card.
 */
export default function GradeSparkline({ grades = [], height = 56 }) {
  const data = useMemo(
    () =>
      grades
        .filter((g) => typeof g.score === 'number')
        .map((g, i) => ({ i, score: g.score, name: g.test_name || g.subject || '' }))
        .slice(-12),
    [grades]
  );

  if (data.length < 2) return null;

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 4, right: 6, left: 6, bottom: 4 }}>
          <YAxis domain={[0, 100]} hide />
          <Tooltip
            contentStyle={{
              fontSize: 11,
              borderRadius: 8,
              border: '1px solid hsl(var(--border))',
              padding: '4px 8px',
            }}
            labelFormatter={() => ''}
            formatter={(v, _n, p) => [`${v}${p?.payload?.name ? ' · ' + p.payload.name : ''}`, 'ציון']}
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ r: 2.5, fill: 'hsl(var(--primary))' }}
            activeDot={{ r: 4 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}