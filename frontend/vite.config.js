import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

const page = (path) => fileURLToPath(new URL(path, import.meta.url));
function mpaFallback() {
  return {
    name: "mpa-fallback",
    configureServer(server) {
      return () => {
        server.middlewares.use((req, res, next) => {
          const url = req.url?.split("?")[0];

          if (url?.startsWith("/employee/")) {
            req.url = "/employee/index.html";
          } else if (url?.startsWith("/manager/")) {
            req.url = "/manager/index.html";
          }

          next();
        });
      };
    },
  };
}

export default defineConfig({
  plugins: [react(), mpaFallback()],
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
        manager: page("./manager/index.html"),
        employee: page("./employee/index.html"),
      },
    },
  },
});
