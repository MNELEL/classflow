/**
 * Decodes a Base64 string to UTF-8 text, preserving Hebrew characters.
 * Uses TextDecoder for correct multi-byte decoding, with a legacy fallback.
 * @param {string} base64
 * @returns {string}
 */
export function decodeBase64ToUtf8(base64) {
  if (!base64) return '';
  try {
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder('utf-8').decode(bytes);
  } catch {
    try {
      return decodeURIComponent(escape(atob(base64)));
    } catch {
      return atob(base64);
    }
  }
}