// Centralized document design system — unifies the visual style of all
// issued certificates and weekly bulletins. Reads branding/doc settings
// (logo, fixed title, accent color, Hebrew date format) and resolves a
// single design object consumed by both the certificate and bulletin
// HTML builders, so every document carries the same professional look.

import { loadBranding } from '@/lib/branding';
import { toHebrewFull } from '@/lib/hebrewDate';
import { resolveTemplateDesign, fontStackFromDesign } from '@/lib/templateDesign';

export const DATE_FORMAT_OPTIONS = [
  { label: 'תאריך: ............', value: 'dotted', hint: 'שורה ריקה למילוי ידני' },
  { label: 'תאריך: _______________', value: 'underscores', hint: 'קו תחתון למילוי ידני' },
  { label: 'תאריך מלא (ז׳ אלול תשפ״ו)', value: 'full_hebrew', hint: 'תאריך עברי מלא' },
];

/** Format a single date (e.g. on a certificate) per the chosen Hebrew-date format. */
export function formatDateForDoc(date, format) {
  const fmt = format || 'full_hebrew';
  if (fmt === 'dotted') return 'תאריך: ............';
  if (fmt === 'underscores') return 'תאריך: _______________';
  const d = date ? new Date(date) : new Date();
  const hebrew = toHebrewFull(d);
  return hebrew ? `תאריך: ${hebrew}` : `תאריך: ${d.toLocaleDateString('he-IL')}`;
}

/** Format a bulletin date range per the chosen Hebrew-date format. */
export function formatBulletinDate(bulletin, format) {
  const fmt = format || 'full_hebrew';
  if (fmt === 'dotted') return 'תאריך: ............';
  if (fmt === 'underscores') return 'תאריך: _______________';
  if (!bulletin?.start_date || !bulletin?.end_date) return '';
  const s = toHebrewFull(new Date(bulletin.start_date));
  const e = toHebrewFull(new Date(bulletin.end_date));
  if (s && e) return `${s} – ${e}`;
  return `${new Date(bulletin.start_date).toLocaleDateString('he-IL')} – ${new Date(bulletin.end_date).toLocaleDateString('he-IL')}`;
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