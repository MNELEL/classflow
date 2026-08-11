import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, CartesianGrid,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const STATUS_COLORS = { pending: '#f59e0b', in_progress: '#3b82f6', done: '#10b981' };
const STATUS_LABELS = { pending: 'ממתינות', in_progress: 'בביצוע', done: 'הושלמו' };

export default function AdminCharts({ teachers, tasks }) {
  const teacherData = teachers
    .filter(t => t.taskCount > 0)
    .slice(0, 8)
    .map(t => ({ name: (t.full_name || 'מורה').split(' ')[0], rate: t.completionRate }));

  const statusData = ['pending', 'in_progress', 'done']
    .map(s => ({ name: STATUS_LABELS[s], value: tasks.filter(t => t.status === s).length, key: s }))
    .filter(d => d.value > 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">אחוז השלמת משימות לפי מורה</CardTitle>
        </CardHeader>
        <CardContent>
          {teacherData.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">אין נתוני משימות</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={teacherData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => `${v}%`} />
                <Bar dataKey="rate" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">פילוג משימות לפי סטטוס</CardTitle>
        </CardHeader>
        <CardContent>
          {statusData.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">אין משימות</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                  {statusData.map(d => <Cell key={d.key} fill={STATUS_COLORS[d.key]} />)}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}