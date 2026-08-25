import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { HelpCircle } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { resolveHelp } from '@/lib/helpContent';

/**
 * HelpButton — global, context-aware help. Sits in the app header and shows
 * an explanation tailored to the current screen: purpose, available actions,
 * and an optional deeper note. Hidden on screens with no registered help.
 */
export default function HelpButton() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const help = resolveHelp(location.pathname);
  if (!help) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-accent transition-colors select-none"
        aria-label={`עזרה על ${help.title}`}
        title={`עזרה — ${help.title}`}
      >
        <HelpCircle className="w-5 h-5 text-muted-foreground" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <HelpCircle className="w-5 h-5 text-primary" />
              {help.title}
            </DialogTitle>
            <DialogDescription className="sr-only">
              הסבר על מסך זה
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            <p className="text-sm text-foreground/90 leading-relaxed">{help.purpose}</p>

            {help.functions?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2 text-foreground">מה אפשר לעשות כאן?</h4>
                <ul className="space-y-2">
                  {help.functions.map((f, i) => (
                    <li key={i} className="flex gap-2 text-sm">
                      <span className="text-primary mt-0.5 shrink-0">•</span>
                      <span className="text-muted-foreground leading-relaxed">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {help.details && (
              <div className="rounded-lg bg-accent/60 p-3 border border-border/60">
                <p className="text-sm text-muted-foreground leading-relaxed">{help.details}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}