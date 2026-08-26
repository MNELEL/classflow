import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Newspaper, Mail } from 'lucide-react';
import BulletinTab from './BulletinTab';
import WeeklySheetTab from './WeeklySheetTab';

// The "דוחות שבועיים" main tab bundles the two weekly report formats — the
// bulletin (עלון שבועי) and the parent contact sheet (דף קשר להורים) — under
// a sub-tab selector. The active sub-tab is mirrored to ?sub= so deep links
// like /weekly-bulletin and /weekly-sheet land on the right view.
export default function WeeklyReportsTab() {
  const [params, setParams] = useSearchParams();
  const sub = ['bulletin', 'sheet'].includes(params.get('sub')) ? params.get('sub') : 'bulletin';

  return (
    <div className="space-y-4">
      <Tabs value={sub} onValueChange={(v) => setParams({ tab: 'reports', sub: v }, { replace: true })}>
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="bulletin" className="gap-1.5 text-xs sm:text-sm">
            <Newspaper className="w-4 h-4" />
            <span>עלון שבועי</span>
          </TabsTrigger>
          <TabsTrigger value="sheet" className="gap-1.5 text-xs sm:text-sm">
            <Mail className="w-4 h-4" />
            <span>דף קשר להורים</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="bulletin" className="mt-4"><BulletinTab /></TabsContent>
        <TabsContent value="sheet" className="mt-4"><WeeklySheetTab /></TabsContent>
      </Tabs>
    </div>
  );
}