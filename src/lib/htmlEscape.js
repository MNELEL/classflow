/**
 * Escapes HTML special characters in a string to prevent XSS when
 * interpolating dynamic content into HTML templates (e.g. document.write).
 *
 * @param {*} value — any value (coerced to string; null/undefined → '')
 * @returns {string} — HTML-entity-escaped string
 */
export function escapeHtml(value) {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}