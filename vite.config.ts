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
  server: {
    headers: {
      "Content-Security-Policy": cspDev,
    },
  },
});
