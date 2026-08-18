// Resolves structured design tokens extracted by the AI from an uploaded
// template image (CertificateTemplate.design / analyzed_layout.design) into a
// single normalized object used by both the certificate and weekly-bulletin
// HTML builders, so newly generated documents carry a design similar to the
// uploaded template — not just the text data.

export function resolveTemplateDesign(templateData) {
  if (!templateData) return null;
  const raw = templateData.design || templateData.analyzed_layout?.design || {};
  const accent = raw.accent_color || templateData.accent_color || '#7c3aed';
  return {
    accent,
    secondary: raw.secondary_color || `${accent}22`,
    background: raw.background_color || '#fffdf8',
    frameStyle: raw.frame_style || 'double',
    frameColor: raw.frame_color || accent,
    cornerDecoration: raw.corner_decoration || 'none',
    titleFont: raw.title_font || 'sans',
    titleAlign: raw.title_align || 'center',
    iconSymbol: raw.icon_symbol || '🎖',
    hasWatermark: !!raw.has_watermark,
    watermarkText: raw.watermark_text || '',
    layoutDensity: raw.layout_density || 'airy',
  };
}

export function fontStackFromDesign(design) {
  if (!design) return "'Heebo',Arial,sans-serif";
  if (design.titleFont === 'serif') return "'Times New Roman', Georgia, serif";
  if (design.titleFont === 'decorative') return "'Sora','Heebo',sans-serif";
  return "'Heebo',Arial,sans-serif";
}