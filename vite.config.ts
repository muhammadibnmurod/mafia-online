import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const SERVER_PORT = Number(process.env.PORT ?? 3000);

export default defineConfig({
  root: 'client',
  plugins: [react()],
  server: {
    host: true, // LAN'dagi telefon/kompyuterlar ham ulana olsin
    port: 5173,
    proxy: {
      '/socket.io': { target: `http://localhost:${SERVER_PORT}`, ws: true },
    },
  },
  build: {
    outDir: '../dist/client',
    emptyOutDir: true,
  },
});
