import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// During development, `/transmission/rpc` is proxied to a real Transmission
// daemon. Point it elsewhere with:  TRANSMISSION_URL=http://nas:9091 npm run dev
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.TRANSMISSION_URL ?? 'http://localhost:9091';

  return {
    // Relative base so the built bundle works when served by Transmission
    // from /transmission/web/ (TRANSMISSION_WEB_HOME) or any other sub-path.
    base: './',
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      proxy: {
        '/transmission/rpc': { target, changeOrigin: true },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      chunkSizeWarningLimit: 800,
    },
  };
});
