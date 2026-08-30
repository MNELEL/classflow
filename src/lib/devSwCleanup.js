// In development, a previously-registered production service worker
// (VitePWA, registerType: 'prompt') can outlive its install and start
// controlling the dev preview, serving stale precached JS chunks that
// reference a different React instance than the fresh dev bundle.
// That mismatch leaves React's hook dispatcher null and throws
// "Cannot read properties of null (reading 'useState')" in AuthProvider.
// So in DEV: unregister every service worker and wipe caches before render.
// Production keeps the normal prompt-type update flow (see UpdatePrompt).
export async function cleanupDevServiceWorker() {
  if (!import.meta.env.DEV) return;
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister()));
  } catch {}
  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {}
}