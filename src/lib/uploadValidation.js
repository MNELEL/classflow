// Client-side pre-check before calling base44.integrations.Core.UploadFile.
//
// Base44 enforces a real 50MB limit server-side on every upload — this is
// not a security or data-integrity guard, it's purely so a user on a slow
// connection finds out immediately that a file is too large, instead of
// waiting through a failed upload attempt first. Every call site keeps its
// own file-type check (accept/mimetype requirements differ per feature),
// this only standardizes the size check and the Hebrew message.

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 50MB — matches Base44's platform-enforced limit

export function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

/**
 * Returns null if the file is within the allowed size, or a ready-to-show
 * Hebrew error string if it's too large.
 */
export function validateUploadSize(file, maxBytes = MAX_UPLOAD_BYTES) {
  if (!file) return null;
  if (file.size > maxBytes) {
    return `הקובץ גדול מדי (${formatBytes(file.size)}) — הגודל המרבי המותר הוא ${formatBytes(maxBytes)}`;
  }
  return null;
}
