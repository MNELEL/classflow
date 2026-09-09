import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import TranscriptPanel from '@/components/library/analysis/TranscriptPanel';
import AnalysisPanel from '@/components/library/analysis/AnalysisPanel';
import { base44 } from '@/api/base44Client';

// Dual-pane analysis view: the recording's transcript on one side and the
// smart assistant's automatic analysis on the other. Side-by-side on
// desktop, stacked on mobile; each pane scrolls independently.
export default function LibraryAnalysisPage() {
  const { itemId } = useParams();
  const { data: item, isLoading } = useQuery({
    queryKey: ['library-item', itemId],
    queryFn: () => base44.entities.LibraryItem.get(itemId),
    enabled: !!itemId,
    // Keep polling while transcription/analysis is still in flight
    refetchInterval: (data) => (data?.ai_status === 'processing' || !data?.transcript) ? 5000 : false,
  });

  return (
    <AppLayout>
      {isLoading || !item ? (
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-4 lg:p-4 max-w-[1600px] mx-auto">
          <div className="bg-card border border-border lg:rounded-2xl overflow-hidden h-[60vh] lg:h-[calc(100dvh-150px)]">
            <TranscriptPanel item={item} />
          </div>
          <div className="bg-card border border-border lg:rounded-2xl overflow-hidden h-[60vh] lg:h-[calc(100dvh-150px)]">
            <AnalysisPanel item={item} />
          </div>
        </div>
      )}
    </AppLayout>
  );
}