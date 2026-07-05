/**
 * Media Warmup Utility
 * Preloads images and audio assets to reduce first-load latency.
 * Call warmDashboardMedia() after auth, or warmMedia() with custom URLs.
 */

const preloadedCache = new Set();

/**
 * Preload a single image into the browser cache.
 * @param {string} url
 * @returns {Promise<void>}
 */
export function preloadImage(url) {
  if (!url || preloadedCache.has(url)) return Promise.resolve();
  preloadedCache.add(url);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = url;
  });
}

/**
 * Preload a single audio file into the browser cache.
 * @param {string} url
 * @returns {Promise<void>}
 */
export function preloadAudio(url) {
  if (!url || preloadedCache.has(url)) return Promise.resolve();
  preloadedCache.add(url);
  return new Promise((resolve) => {
    const audio = new Audio();
    audio.preload = 'auto';
    audio.oncanplaythrough = () => resolve();
    audio.onerror = () => resolve();
    audio.src = url;
    // Fallback timeout — don't block forever
    setTimeout(resolve, 3000);
  });
}

/**
 * Batch-preload a mix of media assets.
 * Pass objects: { url, type: 'image' | 'audio' }
 * Or pass plain strings (auto-detected as image).
 * @param {Array<string|{url:string,type?:string}>} assets
 */
export function warmMedia(assets = []) {
  const list = assets.map(a => typeof a === 'string' ? { url: a } : a).filter(a => a.url);
  return Promise.all(list.map(({ url, type }) => {
    if (type === 'audio') return preloadAudio(url);
    // Auto-detect audio by extension
    if (/\.(mp3|wav|ogg|m4a|webm|flac|aac)$/i.test(url)) return preloadAudio(url);
    return preloadImage(url);
  }));
}

/**
 * Warm media assets used on the dashboard:
 * - Branding logo
 * - Default app logo
 */
export function warmDashboardMedia() {
  const urls = [];

  // Branding logo from localStorage
  try {
    const branding = JSON.parse(localStorage.getItem('classmanager_branding') || '{}');
    if (branding.logo_url) urls.push(branding.logo_url);
  } catch { /* ignore */ }

  // Default ClassFlow logo
  urls.push('https://media.base44.com/images/public/69efc0a68bae1b1d07582eda/ec7fc8c0a_generated_image.png');

  return warmMedia(urls);
}

/**
 * Warm sound board audio assets from LibraryItem sounds.
 * @param {Array<{file_url?:string}>} sounds
 */
export function warmSoundBoardMedia(sounds = []) {
  const urls = sounds
    .map(s => s.file_url)
    .filter(Boolean)
    .slice(0, 20); // limit to avoid overloading
  return warmMedia(urls.map(url => ({ url, type: 'audio' })));
}

/**
 * Warm media for a specific route.
 * @param {string} routePath
 * @param {object} options - optional data (e.g. sounds array for sound-board)
 */
export function warmRouteMedia(routePath, options = {}) {
  switch (routePath) {
    case '/':
    case '/seating':
    case '/students':
      return warmDashboardMedia();
    case '/sound-board':
      if (options.sounds?.length) return warmSoundBoardMedia(options.sounds);
      return Promise.resolve();
    default:
      return Promise.resolve();
  }
}