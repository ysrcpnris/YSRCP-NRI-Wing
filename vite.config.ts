import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const cspDev = `
  default-src 'self';
  connect-src
    'self'
    https://rcpcmjrahhzayqxexpkv.supabase.co
    wss://rcpcmjrahhzayqxexpkv.supabase.co
    https://api.supabase.io
    ws://localhost:*
    https://www.googleapis.com
    https://youtube.googleapis.com;
  script-src
    'self'
    'unsafe-eval'
    'unsafe-inline'
    https://platform.twitter.com
    https://connect.facebook.net
    https://www.instagram.com;
  style-src
    'self'
    'unsafe-inline'
    https://fonts.googleapis.com;
  font-src
    'self'
    data:
    https://fonts.gstatic.com;
  img-src
    'self'
    data:
    blob:
    https://rcpcmjrahhzayqxexpkv.supabase.co
    https://*.ytimg.com
    https://pbs.twimg.com
    https://ton.twimg.com
    https://www.instagram.com
    https://scontent.cdninstagram.com;
  frame-src
    https://www.youtube.com
    https://platform.twitter.com
    https://syndication.twitter.com
    https://www.facebook.com
    https://www.instagram.com;
  media-src 'self' data: blob:;
`.replace(/\n/g, " ");

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ["lucide-react"],
  },
  // Explicit cross-browser build target. Vite's default targets
  // ES2020, which works on modern Chrome / Firefox / Safari / Edge
  // but excludes anything older. The list below mirrors the
  // browserslist entry in package.json so autoprefixer + esbuild
  // produce matching output. iOS 15 / Safari 15 are the practical
  // floor — older NRI users on aging devices still get a working
  // site, just without a few CSS-grid niceties.
  build: {
    target: ["chrome90", "firefox88", "safari15", "edge90"],
    cssTarget: ["chrome90", "firefox88", "safari15", "edge90"],
  },
  // Strip every console.* call and `debugger` statement from the
  // production bundle. Anything wrapped in `if (import.meta.env.DEV)`
  // is already tree-shaken; this catches the rest so production users
  // can't see profile photo URLs, leader query filters, or any other
  // diagnostic noise in DevTools.
  esbuild: {
    drop: ["console", "debugger"],
  },
  server: {
    headers: {
      "Content-Security-Policy": cspDev,
    },
  },
});
