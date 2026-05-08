import { defineConfig, type Plugin } from "vite";
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

export default defineConfig({
  base: "/",
  plugins: [react(), tailwindcss(), renameHtmlPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(
        import.meta.dirname,
        "..",
        "..",
        "attached_assets",
      ),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/mobile"),
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(import.meta.dirname, "index.mobile.html"),
    },
  },
});
