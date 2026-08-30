import base44 from "@base44/vite-plugin"
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  logLevel: 'error', // Suppress warnings, only show errors
  // Force a clean re-bundle of optimized deps on each dev server start. A
  // stale .vite/deps cache — React and react-dom chunks ending up with
  // mismatched ?v= hashes — resolves `react` to null at runtime and produces
  // "Cannot read properties of null (reading 'useState')" in AuthProvider.
  optimizeDeps: {
    force: true,
  },
  // Deduplicate React: some transitive deps resolve their own copy of
  // react/react-dom, which leaves the app rendering with renderer A while
  // hooks come from React B (React's internal dispatcher is null →
  // "Cannot read properties of null (reading 'useState')"). Pinning both
  // packages to a single resolution guarantees one React copy app-wide.
  resolve: {
    dedupe: ['react', 'react-dom', 'react/jsx-runtime'],
  },
  plugins: [
    base44({
      // Support for legacy code that imports the base44 SDK with @/integrations, @/entities, etc.
      // can be removed if the code has been updated to use the new SDK imports from @base44/sdk
      legacySDKImports: process.env.BASE44_LEGACY_SDK_IMPORTS === 'true',
      hmrNotifier: true,
      navigationNotifier: true,
      analyticsTracker: true,
      visualEditAgent: true
    }),
    react(),
    VitePWA({
      // 'prompt': never swap in new app code behind the user's back. A new
      // service worker installs and waits; the app shows its own "update
      // available" UI (see src/components/UpdatePrompt.jsx) and only
      // activates on explicit confirmation. Silent/auto updates are riskier
      // here since a forced reload mid-lesson (e.g. mid seating-chart edit)
      // would lose unsaved state.
      registerType: 'prompt',
      // We already own public/manifest.json (linked directly in index.html)
      // — don't let the plugin generate a second, competing manifest.
      manifest: false,
      workbox: {
        // Precache only the app's own built static assets (JS/CSS/HTML/
        // fonts/icons). Deliberately NOT caching API responses from
        // base44 — serving stale grades/attendance/student data from
        // cache is worse than no offline support, since a teacher could
        // act on data that's silently out of date. Runtime API calls
        // always hit the network; only the app shell becomes available
        // offline.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        // Don't try to precache the base44 media CDN or any cross-origin
        // resource — keep the precache scoped to same-origin build output.
        navigateFallbackDenylist: [/^\/api\//],
      },
      devOptions: {
        // Keep the service worker out of local dev entirely; it only
        // matters for the deployed build, and running it in dev makes
        // HMR/debugging confusing for no real benefit.
        enabled: false,
      },
    }),
  ]
});