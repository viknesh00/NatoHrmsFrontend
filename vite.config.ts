import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), tailwindcss()],
    resolve: { extensions: ['.mjs', '.ts', '.tsx', '.js', '.jsx', '.json'], alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    define: { 'import.meta.env.VITE_API_BASE_URL': JSON.stringify(env.VITE_API_BASE_URL || env.REACT_APP_API_BASE_URL || '') },
    build: {
      outDir: 'build', manifest: true, sourcemap: false, target: 'es2022',
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) return 'react-vendor';
            if (id.includes('node_modules/xlsx')) return 'spreadsheet-export';
            if (id.includes('node_modules/jspdf') || id.includes('node_modules/html2canvas')) return 'pdf-export';
          }
        }
      },
    },
    worker: { format: 'es' },
    server: {
      port: 3000,
      host: true,
    },
  };
});
