import { resolve } from "node:path";
import { defineConfig } from "vite";

// Two static pages: the handoff page (/) and diagnostics (/check/).
export default defineConfig({
  build: {
    target: "es2020",
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, "index.html"),
        check: resolve(import.meta.dirname, "check/index.html")
      }
    }
  }
});
