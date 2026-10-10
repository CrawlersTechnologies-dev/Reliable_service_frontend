import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev: forward API and uploaded files to the Node backend so the panel and API share one origin.
const API = process.env.VITE_DEV_API || 'http://localhost:4000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': API,
      '/uploads': API,
    },
  },
});
