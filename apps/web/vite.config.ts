import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    proxy: {
      // Flask (listings, requests, orders, allocations) – Dashboard, Listings, Requests
      "/flask-api": {
        target: "http://127.0.0.1:5002",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/flask-api/, "/api"),
      },
      // FastAPI (map, reserve, business Mongo)
      "/api": { target: "http://127.0.0.1:5001", changeOrigin: true },
    },
  },
});
