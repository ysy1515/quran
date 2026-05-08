import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import fs from "fs";

function renameHtmlPlugin(): Plugin {
  return {
    name: "rename-mobile-html",
    closeBundle() {
      const from = path.resolve(import.meta.dirname, "dist/mobile/index.mobile.html");
      const to = path.resolve(import.meta.dirname, "dist/mobile/index.html");
      if (fs.existsSync(from)) {
        fs.renameSync(from, to);
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");

  const apiBaseUrl = env.VITE_API_BASE_URL ?? "";

  if (!apiBaseUrl) {
    console.warn(
      "\n⚠️  VITE_API_BASE_URL is not set.\n" +
      "   Set it before building: VITE_API_BASE_URL=https://your-app.replit.app pnpm build:mobile\n" +
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
