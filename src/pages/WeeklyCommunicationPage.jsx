import React from 'react';
import { useSearchParams } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Newspaper, Users, Contact } from 'lucide-react';
import ContactSheetTab from '@/components/weekly-communication/ContactSheetTab';
import ParentMessagesTab from '@/components/weekly-communication/ParentMessagesTab';
import WeeklyReportsTab from '@/components/weekly-communication/WeeklyReportsTab';

// Unified weekly-communication hub: three accessible tabs for quick switching
// between the contact book (חוברת קשר), parent messages (הודעות להורים) and
// weekly reports (דוחות שבועיים — bulletin + parent sheet as sub-tabs).
const TABS = [
  { id: 'contacts', label: 'חוברת קשר', icon: Contact },
  { id: 'parents', label: 'הודעות להורים', icon: Users },
  { id: 'reports', label: 'דוחות שבועיים', icon: Newspaper },
];

export default function WeeklyCommunicationPage() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.some((t) => t.id === params.get('tab')) ? params.get('tab') : 'contacts';

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto p-4 space-y-4" dir="rtl">
        <div>
          <h1 className="text-xl font-bold">תקשורת שבועית</h1>
          <p className="text-xs text-muted-foreground">חוברת קשר, הודעות להורים ודוחות שבועיים — ממקום אחד</p>
        </div>

        <Tabs value={tab} onValueChange={(v) => setParams({ tab: v }, { replace: true })}>
          <TabsList className="grid grid-cols-3 w-full">
            {TABS.map((t) => (
              <TabsTrigger key={t.id} value={t.id} className="gap-1.5 text-xs sm:text-sm">
                <t.icon className="w-4 h-4" />
                <span className="hidden xs:inline sm:inline">{t.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="contacts" className="mt-4"><ContactSheetTab /></TabsContent>
          <TabsContent value="parents" className="mt-4"><ParentMessagesTab /></TabsContent>
          <TabsContent value="reports" className="mt-4"><WeeklyReportsTab /></TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}