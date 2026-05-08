import { createRoot } from "react-dom/client";
import { setBaseUrl } from "@workspace/api-client-react";
import App from "./App";
import "./index.css";

declare const __MOBILE_API_BASE_URL__: string;

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
  (typeof __MOBILE_API_BASE_URL__ !== "undefined" ? __MOBILE_API_BASE_URL__ : "");

if (!API_BASE) {
  console.error(
    "[Quran App] VITE_API_BASE_URL is not configured. " +
    "Set this to your deployed backend URL before building the mobile app. " +
    "Example: VITE_API_BASE_URL=https://your-app.replit.app pnpm build:mobile"
  );
} else {
  console.log(`[Quran App] API base: ${API_BASE}`);
}

setBaseUrl(API_BASE || null);

createRoot(document.getElementById("root")!).render(<App />);
