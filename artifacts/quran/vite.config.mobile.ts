import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import fs from "fs";

function renameHtmlPlugin(): Plugin {
  return {
    name: "rename-mobile-html",
    closeBundle() {
      const outDir = path.resolve(import.meta.dirname, "dist/mobile");

      // Rename index.mobile.html → index.html (Capacitor requires index.html)
      const from = path.join(outDir, "index.mobile.html");
      const to = path.join(outDir, "index.html");
      if (fs.existsSync(from)) fs.renameSync(from, to);

      // Remove service worker from mobile build.
      // Capacitor iOS WKWebView has limited SW support and the PWA sw.js
      // is only for the web version.
      const sw = path.join(outDir, "sw.js");
      if (fs.existsSync(sw)) fs.unlinkSync(sw);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");

  const apiBaseUrl = env.VITE_API_BASE_URL ?? "";

  if (!apiBaseUrl) {
    console.warn(
      "\n⚠️  VITE_API_BASE_URL is not set.\n" +
      "   Set it before building: VITE_API_BASE_URL=https://quran.yahya.app pnpm build:mobile\n" +
      "   Or add it to .env.mobile\n"
    );
  } else {
    console.log(`✓ Mobile API base URL: ${apiBaseUrl}`);
  }

  return {
    base: "/",
    plugins: [react(), tailwindcss(), renameHtmlPlugin()],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "src"),
        "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
      },
      dedupe: ["react", "react-dom"],
    },
    root: path.resolve(import.meta.dirname),
    define: {
      __MOBILE_API_BASE_URL__: JSON.stringify(apiBaseUrl),
    },
    build: {
      outDir: path.resolve(import.meta.dirname, "dist/mobile"),
      emptyOutDir: true,
      rollupOptions: {
        input: path.resolve(import.meta.dirname, "index.mobile.html"),
      },
    },
  };
});
