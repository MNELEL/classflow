import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, LayoutGrid, AlertTriangle, CheckCircle2, Clock, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { calcSatisfactionScore } from '@/lib/seatingUtils';

export default function DashboardPage() {
  const { data: students = [], isLoading: loadingStudents } = useQuery({
    queryKey: ['students'],
    queryFn: () => base44.entities.Student.list(),
  });

  const activeStudents = students.filter(s => s.is_active !== false);
  const studentsWithNeeds = students.filter(s => s.special_needs?.length > 0);
  const studentsWithConstraints = students.filter(
    s => s.friends?.length > 0 || s.avoid?.length > 0 || s.separate?.length > 0
  );

  const savedSeats = (() => {
    try { return JSON.parse(localStorage.getItem('classmanager_seats') || 'null'); } catch { return null; }
  })();
  const savedArrangement = (() => {
    try { return JSON.parse(localStorage.getItem('classmanager_arrangement') || 'null'); } catch { return null; }
  })();

  const satisfactionScore = savedSeats ? calcSatisfactionScore(savedSeats, students) : null;
  const seatedCount = savedSeats ? new Set(savedSeats.filter(s => s.student_id).map(s => s.student_id)).size : 0;
  const unseatedCount = activeStudents.length - seatedCount;

  const scoreColor = satisfactionScore === null ? 'text-muted-foreground'
    : satisfactionScore >= 75 ? 'text-green-600'
    : satisfactionScore >= 50 ? 'text-yellow-600'
    : 'text-red-600';

  const scoreBg = satisfactionScore === null ? 'bg-muted'
    : satisfactionScore >= 75 ? 'bg-green-500'
    : satisfactionScore >= 50 ? 'bg-yellow-500'
    : 'bg-red-500';

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto" dir="rtl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">סקירה כללית</h1>
          <p className="text-muted-foreground mt-1">מצב הכיתה שלך במבט אחד</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> סה"כ תלמידים
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{activeStudents.length}</div>
              <p className="text-xs text-muted-foreground mt-0.5">תלמידים פעילים</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> משובצים
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{seatedCount}</div>
              <p className="text-xs text-muted-foreground mt-0.5">מתוך {activeStudents.length}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" /> ממתינים
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${unseatedCount > 0 ? 'text-yellow-600' : 'text-muted-foreground'}`}>
                {unseatedCount}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">לא משובצים</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" /> שביעות רצון
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${scoreColor}`}>
                {satisfactionScore !== null ? `${satisfactionScore}%` : '—'}
              </div>
              {satisfactionScore !== null && (
                <div className="mt-2 w-full bg-muted rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full transition-all ${scoreBg}`}
                    style={{ width: `${satisfactionScore}%` }}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Details row */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">פרטי הסידור הנוכחי</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {savedArrangement ? (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">שורות</span>
                    <span className="font-medium">{savedArrangement.rows}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">טורים</span>
                    <span className="font-medium">{savedArrangement.cols}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">סה"כ מושבים</span>
                    <span className="font-medium">{savedArrangement.rows * savedArrangement.cols}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">תפוסה</span>
                    <span className="font-medium">
                      {savedArrangement.rows * savedArrangement.cols > 0
                        ? Math.round((seatedCount / (savedArrangement.rows * savedArrangement.cols)) * 100)
                        : 0}%
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground text-sm">אין סידור שמור</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">פרופיל הכיתה</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">עם צרכים מיוחדים</span>
                <Badge variant={studentsWithNeeds.length > 0 ? 'default' : 'secondary'}>
                  {studentsWithNeeds.length} תלמידים
                </Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">עם אילוצים חברתיים</span>
                <Badge variant="secondary">{studentsWithConstraints.length} תלמידים</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">בלי העדפות</span>
                <Badge variant="outline">
                  {students.filter(s =>
                    !s.friends?.length && !s.avoid?.length && !s.special_needs?.length &&
                    s.row_preference === 'none' && s.side_preference === 'none'
                  ).length} תלמידים
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex gap-3 flex-wrap">
          <Button asChild>
            <Link to="/">
              <LayoutGrid className="w-4 h-4 ml-1" /> פתח לוח כיתה
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/students">
              <Users className="w-4 h-4 ml-1" /> נהל תלמידים
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/settings">
              <Clock className="w-4 h-4 ml-1" /> הגדרות
            </Link>
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}