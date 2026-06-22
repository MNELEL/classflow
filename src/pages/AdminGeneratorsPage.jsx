import React from 'react';
import AppLayout from '@/components/layout/AppLayout';
import SummaryGenerator from '@/components/generators/SummaryGenerator';
import TaskGenerator from '@/components/generators/TaskGenerator';
import SchoolUpdatesManager from '@/components/admin/SchoolUpdatesManager';
import GlobalSyncButton from '@/components/common/GlobalSyncButton';
import { Sparkles, ClipboardList, Megaphone, RefreshCw } from 'lucide-react';

export default function AdminGeneratorsPage() {
  return (
    <AppLayout>
      <div className="overflow-y-auto h-full">
        <div className="p-4 max-w-2xl mx-auto space-y-5 pb-8" dir="rtl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-violet-100 dark:bg-violet-900/30 rounded-xl flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <h1 className="font-bold text-lg">מרכז מחוללים וסיכומים</h1>
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
    </AppLayout>
  );
}