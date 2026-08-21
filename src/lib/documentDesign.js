// Centralized document design system — unifies the visual style of all
// issued certificates and weekly bulletins. Reads branding/doc settings
// (logo, fixed title, accent color, Hebrew date format) and resolves a
// single design object consumed by both the certificate and bulletin
// HTML builders, so every document carries the same professional look.

import { loadBranding } from '@/lib/branding';
import { toHebrewFull, toHebrewDate } from '@/lib/hebrewDate';
import { resolveTemplateDesign, fontStackFromDesign } from '@/lib/templateDesign';

export const DATE_FORMAT_OPTIONS = [
  { label: 'תאריך קצר (ז׳ אלול)', value: 'short', hint: 'תאריך עברי קצר — יום וחודש' },
  { label: 'תאריך: _______________', value: 'underscores', hint: 'קו תחתון להשלמה ידנית' },
  { label: 'תאריך מלא (ז׳ אלול תשפ״ו)', value: 'full_hebrew', hint: 'תאריך עברי מלא ומפורט' },
];

/** Format a single date (e.g. on a certificate) per the chosen Hebrew-date format. */
export function formatDateForDoc(date, format) {
  const fmt = format || 'full_hebrew';
  if (fmt === 'underscores') return 'תאריך: _______________';
  const d = date ? new Date(date) : new Date();
  if (fmt === 'short' || fmt === 'dotted') {
    const hebrew = toHebrewDate(d);
    return hebrew ? `תאריך: ${hebrew}` : `תאריך: ${d.toLocaleDateString('he-IL')}`;
  }
  const hebrew = toHebrewFull(d);
  return hebrew ? `תאריך: ${hebrew}` : `תאריך: ${d.toLocaleDateString('he-IL')}`;
}

/** Format a bulletin date range per the chosen Hebrew-date format. */
export function formatBulletinDate(bulletin, format) {
  const fmt = format || 'full_hebrew';
  if (fmt === 'underscores') return 'תאריך: _______________';
  if (!bulletin?.start_date || !bulletin?.end_date) return '';
  const s = new Date(bulletin.start_date);
  const e = new Date(bulletin.end_date);
  if (fmt === 'short' || fmt === 'dotted') {
    const hs = toHebrewDate(s);
    const he = toHebrewDate(e);
    if (hs && he) return `${hs} – ${he}`;
  } else {
    const hs = toHebrewFull(s);
    const he = toHebrewFull(e);
    if (hs && he) return `${hs} – ${he}`;
  }
  return `${s.toLocaleDateString('he-IL')} – ${e.toLocaleDateString('he-IL')}`;
}

/** Read the global document settings stored on the branding object. */
export function getDocSettings() {
  const b = loadBranding();
  return {
    accentColor: b.doc_accent_color || '',
    title: b.doc_title || '',
    dateFormat: b.doc_date_format || 'full_hebrew',
    logoUrl: b.logo_url || '',
    schoolName: b.school_name || '',
  };
}

/**
 * Resolve a unified design object. Branding's accent color (when set)
 * overrides the template-extracted accent, so the teacher can enforce a
 * single institutional color across all documents regardless of template.
 */
export function resolveUnifiedDesign(templateData) {
  const b = loadBranding();
  const td = templateData ? resolveTemplateDesign(templateData) : null;
  const accent = b.doc_accent_color || td?.accent || '#7c3aed';
  return {
    accent,
    secondary: td?.secondary || `${accent}22`,
    background: td?.background || '#fffdf8',
    frameStyle: td?.frameStyle || 'double',
    frameColor: td?.frameColor || accent,
    cornerDecoration: td?.cornerDecoration || 'none',
    titleFont: td?.titleFont || 'sans',
    titleAlign: td?.titleAlign || 'center',
    iconSymbol: td?.iconSymbol || '🎖',
    hasWatermark: td?.hasWatermark || false,
    watermarkText: td?.watermarkText || '',
    layoutDensity: td?.layoutDensity || 'airy',
    fontStack: fontStackFromDesign(td),
  };
}