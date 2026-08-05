import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Users, BookOpen, ClipboardList, ChevronLeft } from 'lucide-react';

export default function TeacherProgressCard({ teacher }) {
  const navigate = useNavigate();
  return (
    <Card className="border-border/60 hover:border-primary/30 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <p className="font-semibold text-sm truncate">{teacher.full_name}</p>
            {teacher.subject && <Badge variant="outline" className="text-xs shrink-0">{teacher.subject}</Badge>}
          </div>
          <Badge variant={teacher.is_active !== false ? 'default' : 'secondary'} className="text-xs shrink-0">
            {teacher.is_active !== false ? 'פעיל' : 'לא פעיל'}
          </Badge>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-3 text-center">
          <div className="p-2 rounded-lg bg-muted/30">
            <BookOpen className="w-3.5 h-3.5 mx-auto text-purple-600 mb-1" />
            <p className="text-lg font-bold">{teacher.classroomCount}</p>
            <p className="text-[10px] text-muted-foreground">כיתות</p>
          </div>
          <div className="p-2 rounded-lg bg-muted/30">
            <Users className="w-3.5 h-3.5 mx-auto text-blue-600 mb-1" />
            <p className="text-lg font-bold">{teacher.studentCount}</p>
            <p className="text-[10px] text-muted-foreground">תלמידים</p>
          </div>
          <div className="p-2 rounded-lg bg-muted/30">
            <ClipboardList className="w-3.5 h-3.5 mx-auto text-amber-600 mb-1" />
            <p className="text-lg font-bold">{teacher.taskCount}</p>
            <p className="text-[10px] text-muted-foreground">משימות</p>
          </div>
        </div>
        {teacher.taskCount > 0 ? (
          <div className="mb-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">השלמת משימות</span>
              <span className="font-medium">{teacher.completionRate}%</span>
            </div>
            <Progress value={teacher.completionRate} className="h-1.5" />
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center mb-3">אין משימות משויכות</p>
        )}
        <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => navigate(`/teacher-profile/${teacher.id}`)}>
          פרופיל מלא <ChevronLeft className="w-3 h-3" />
        </Button>
      </CardContent>
    </Card>
  );
}