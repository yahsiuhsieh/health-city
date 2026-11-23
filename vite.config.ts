import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  plugins: [react(), cloudflare()],
  server: { host: "127.0.0.1", port: 8787, strictPort: true },
  build: { target: "es2022" },
  environments: {
    client: {
      build: {
        rollupOptions: {
          input: { app: "index.html", inspection: "src/frontend/inspection.ts" },
          output: {
            entryFileNames: chunk => chunk.name === "inspection" ? "checks/form.js" : "assets/[name]-[hash].js",
          },
        },
      },
    },
  },
});
