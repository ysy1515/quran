import { createRoot } from "react-dom/client";
import { setBaseUrl } from "@workspace/api-client-react";
import App from "./App";
import "./index.css";

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  "https://your-replit-app.replit.app";

setBaseUrl(API_BASE);

createRoot(document.getElementById("root")!).render(<App />);
