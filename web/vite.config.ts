// WP27: the web app build. `npm run build` writes web/dist, which the Worker
// serves. `npm run dev:web` proxies the API to `npm run dev` (wrangler, :8787).
import preact from "@preact/preset-vite";
import { defineConfig } from "vite";

const api = "http://localhost:8787";

export default defineConfig({
  root: import.meta.dirname,
  plugins: [preact()],
  build: { outDir: "dist", emptyOutDir: true },
  server: { proxy: { "/api": api, "/auth": api } },
});
