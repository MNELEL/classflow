import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { RefreshCw, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function GlobalSyncButton({ className, variant = 'outline', size = 'sm' }) {
  const qc = useQueryClient();
  const [syncing, setSyncing] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSync() {
    setSyncing(true);
    setDone(false);
    try {
      await qc.invalidateQueries();
      await qc.refetchQueries({ type: 'active' });
      setDone(true);
      toast.success('כל הנתונים סונכרנו!');
      setTimeout(() => setDone(false), 2000);
    } catch {
      toast.error('שגיאה בסנכרון');
    } finally {
      setSyncing(false);
    }
  }

  return (
    <Button
      onClick={handleSync}
      disabled={syncing}
      variant={variant}
      size={size}
      className={className}
    >
      {done ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />}
      {syncing ? 'מסנכרן...' : done ? 'סונכרן!' : 'סנכרן מערכת'}
    </Button>
  );
}