import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Play, Loader2 } from 'lucide-react';

export default function RlsTestPanel() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const runTests = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('verifyRls', {});
      setResult(res.data);
    } catch (e) {
      setResult({ error: e.message || 'שגיאה לא ידועה' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="w-4 h-4 text-primary" />
          בדיקות RLS
          <Button size="sm" variant="outline" onClick={runTests} disabled={loading} className="mr-auto h-8 text-xs">
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
            הרץ בדיקות
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!result ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            לחץ "הרץ בדיקות" כדי לוודא שהרשאות הגישה ל-Classroom ו-Student תקינות
          </p>
        ) : result.error ? (
          <p className="text-sm text-destructive text-center py-4">שגיאה: {result.error}</p>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">משתמש נוכחי:</span>
              <Badge variant="outline">{result.user.role}</Badge>
              <Badge variant={result.summary.allPassed ? 'default' : 'destructive'} className="mr-auto">
                {result.summary.allPassed ? 'כל הבדיקות עברו' : 'יש כשלים'}
              </Badge>
            </div>
            {result.results.map((r, i) => (
              <div key={i} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg text-xs">
                <div>
                  <p className="font-medium">{r.entity}</p>
                  <p className="text-muted-foreground">
                    {r.userScopeCount} / {r.serviceRoleCount} רשומות נגישות
                  </p>
                </div>
                <Badge variant={r.rlsEnforced ? 'default' : 'destructive'} className="text-[10px]">
                  {r.status === 'admin_reads_all' ? 'OK — מנהל רואה הכל' : 'OK — מוגבל למשתמש'}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}