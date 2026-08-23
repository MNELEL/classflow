import React from 'react';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * In-place print button.
 *
 * Calls `window.print()` and relies on the global print stylesheet
 * (src/index.css @media print) which hides app chrome — top header,
 * bottom nav, and all buttons — so the current page prints clean,
 * right where the user is viewing it. The button itself is hidden
 * during print by the same rule (button:not(.print-button)).
 *
 * Drop into any report/page header to enable printing "במקום".
 */
export default function PrintButton({ label = 'הדפסה', variant = 'outline', size = 'sm', className = '', ...props }) {
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={`no-print shrink-0 ${className}`}
      onClick={() => window.print()}
      aria-label={typeof label === 'string' ? label : 'הדפסה'}
      {...props}
    >
      <Printer className="w-4 h-4" />
      {label}
    </Button>
  );
}