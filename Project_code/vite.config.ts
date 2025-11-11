import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const cspDev = `
  default-src 'self';
  connect-src 'self' https://vvemeahgetmhcxlkbnzq.supabase.co https://api.supabase.io ws://localhost:*;
  script-src 'self' 'unsafe-eval' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src * data: blob:;
`.replace(/\n/g, ' ');

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    headers: {
      'Content-Security-Policy': cspDev,
    },
  },
});
