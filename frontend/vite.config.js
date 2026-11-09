import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

const page = (path) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  plugins: [react()],
  appType: "mpa", 
  server: {
    host: true,
    port: 5173,
    watch: { usePolling: true },
    proxy: {
      "/api": process.env.API_PROXY_TARGET || "http://backend:3000",
    },
  },
  build: {
    rollupOptions: {
      input: {
        home: page("./index.html"),
        login: page("./login/index.html"),
        dashboard: page("./dashboard/index.html"),
      },
    },
  },
});
