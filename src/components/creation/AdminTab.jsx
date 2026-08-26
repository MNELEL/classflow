import React from 'react';
import SummaryGenerator from '@/components/generators/SummaryGenerator';
import TaskGenerator from '@/components/generators/TaskGenerator';
import SchoolUpdatesManager from '@/components/admin/SchoolUpdatesManager';
import GlobalSyncButton from '@/components/common/GlobalSyncButton';
import { Sparkles } from 'lucide-react';

export default function AdminTab() {
  return (
    <div className="h-full overflow-y-auto" dir="rtl">
      <div className="p-4 max-w-2xl mx-auto space-y-5 pb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-violet-100 dark:bg-violet-900/30 rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h1 className="font-bold text-lg">מרכז מחוללים — ניהול</h1>
              <p className="text-xs text-muted-foreground">כלי AI למנהל — סיכומים, משימות ועדכונים</p>
            </div>
          </div>
          <GlobalSyncButton />
        </div>

        <SchoolUpdatesManager />
        <SummaryGenerator />
        <TaskGenerator />
      </div>
    </div>
  );
}