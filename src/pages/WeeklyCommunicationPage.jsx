import React from 'react';
import { useSearchParams } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Newspaper, Mail, Contact } from 'lucide-react';
import BulletinTab from '@/components/weekly-communication/BulletinTab';
import WeeklySheetTab from '@/components/weekly-communication/WeeklySheetTab';
import ContactSheetTab from '@/components/weekly-communication/ContactSheetTab';

const TABS = [
  { id: 'bulletin', label: 'חוברת קשר', icon: Newspaper },
  { id: 'sheet', label: 'דף הורים', icon: Mail },
  { id: 'contacts', label: 'אנשי קשר מוסד', icon: Contact },
];

export default function WeeklyCommunicationPage() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.some((t) => t.id === params.get('tab')) ? params.get('tab') : 'bulletin';

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto p-4 space-y-4" dir="rtl">
        <div>
          <h1 className="text-xl font-bold">תקשורת שבועית</h1>
          <p className="text-xs text-muted-foreground">חוברת קשר, דף הורים ודף קשר מוסדי — ממקום אחד</p>
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
          <TabsContent value="bulletin" className="mt-4"><BulletinTab /></TabsContent>
          <TabsContent value="sheet" className="mt-4"><WeeklySheetTab /></TabsContent>
          <TabsContent value="contacts" className="mt-4"><ContactSheetTab /></TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}