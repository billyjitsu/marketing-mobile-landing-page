import { resolve } from "node:path";
import { defineConfig } from "vite";

// Two static pages: the handoff page (/) and diagnostics (/check/).
export default defineConfig({
  build: {
    // es2017 down-levels optional chaining etc. for older in-app webviews
    // (iOS 11+ / Chrome 61+, the first versions with ES module support).
    target: "es2017",
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, "index.html"),
        check: resolve(import.meta.dirname, "check/index.html")
      }
    }
  }
});
