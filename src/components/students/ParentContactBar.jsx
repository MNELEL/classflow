import React from 'react';
import { Phone, Mail, MapPin, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { CUSTOM_FIELD_LABELS } from './StudentCustomFields';

const PHONE_RE = /^[0+][\d\s\-()]{6,}$/;

function isPhone(v) { return PHONE_RE.test(String(v).trim()); }
function isEmail(v) { const s = String(v); return s.includes('@') && s.includes('.'); }
function digits(v) { return String(v).replace(/[^\d+]/g, ''); }

export default function ParentContactBar({ student }) {
  const cf = student?.custom_fields || {};
  const items = [];
  Object.keys(cf).forEach(k => {
    const v = cf[k];
    if (!v) return;
    const label = CUSTOM_FIELD_LABELS[k] || k;
    const kl = k.toLowerCase();
    if (isPhone(v) || kl.includes('phone') || label.includes('טלפון')) items.push({ type: 'phone', label, value: String(v).trim() });
    else if (isEmail(v) || kl.includes('email') || kl.includes('mail')) items.push({ type: 'email', label, value: String(v).trim() });
    else if (kl.includes('address') || label.includes('כתובת')) items.push({ type: 'address', label, value: String(v).trim() });
  });

  if (!items.length) return null;

  const copy = (v) => { try { navigator.clipboard.writeText(v); toast.success('הועתק ללוח'); } catch { toast.error('העתקה נכשלה'); } };

  return (
    <div className="bg-card border border-border rounded-2xl p-3.5 space-y-2">
      <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> יצירת קשר עם הורים</p>
      <div className="grid grid-cols-2 gap-2">
        {items.map((it, i) => {
          const Icon = it.type === 'phone' ? Phone : it.type === 'email' ? Mail : MapPin;
          const colorCls = it.type === 'phone' ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' : it.type === 'email' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'text-violet-600 bg-violet-50 dark:bg-violet-900/20';
          const href = it.type === 'phone' ? `tel:${digits(it.value)}` : it.type === 'email' ? `mailto:${it.value}` : null;
          const Wrapper = href ? 'a' : 'div';
          return (
            <Wrapper key={i} href={href} className="flex items-center gap-2 bg-muted/30 border border-border/60 rounded-xl px-2.5 py-2 hover:bg-primary/5 transition-colors min-w-0">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${colorCls}`}><Icon className="w-3.5 h-3.5" /></div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-muted-foreground leading-none mb-0.5">{it.label}</p>
                <p className="text-xs font-medium truncate" dir="ltr" style={{ textAlign: 'right' }}>{it.value}</p>
              </div>
              <button onClick={(e) => { if (e.preventDefault) e.preventDefault(); copy(it.value); }} className="text-muted-foreground hover:text-primary transition-colors shrink-0 p-1" aria-label="העתק">
                <Copy className="w-3.5 h-3.5" />
              </button>
            </Wrapper>
          );
        })}
      </div>
    </div>
  );
}