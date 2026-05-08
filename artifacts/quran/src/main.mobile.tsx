import { createRoot } from "react-dom/client";
import { Component, type ReactNode } from "react";
import { setBaseUrl } from "@workspace/api-client-react";
import App from "./App";
import "./index.css";

declare const __MOBILE_API_BASE_URL__: string;

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
  (typeof __MOBILE_API_BASE_URL__ !== "undefined" ? __MOBILE_API_BASE_URL__ : "");

if (import.meta.env.DEV) {
  if (!API_BASE) {
    console.error(
      "[Quran App] VITE_API_BASE_URL is not configured. " +
      "Set this to your deployed backend URL before building the mobile app. " +
      "Example: VITE_API_BASE_URL=https://quran.yahya.app pnpm build:mobile"
    );
  } else {
    console.log(`[Quran App] API base: ${API_BASE}`);
  }
}

setBaseUrl(API_BASE || null);

function hideNativeLoadingOverlay() {
  const el = document.getElementById("app-loading");
  if (el) {
    el.classList.add("hidden");
    setTimeout(() => el.remove(), 500);
  }
}

interface ErrorBoundaryState {
  error: Error | null;
}

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error) {
    hideNativeLoadingOverlay();
    if (import.meta.env.DEV) {
      console.error("[Quran App] Startup error:", error);
    }
  }

  handleRetry = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <div
          dir="rtl"
          style={{
            position: "fixed",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(145deg, #0d2818, #1a4a2e)",
            color: "#86efac",
            fontFamily: "'Cairo', system-ui, sans-serif",
            padding: "2rem",
            textAlign: "center",
            gap: "1.5rem",
          }}
        >
          <div style={{ fontSize: "3rem", opacity: 0.6 }}>⚠</div>
          <h1 style={{ fontSize: "1.4rem", fontWeight: 700, margin: 0 }}>
            حدث خطأ أثناء تشغيل التطبيق
          </h1>
          <p style={{ fontSize: "0.95rem", opacity: 0.7, margin: 0, lineHeight: 1.7 }}>
            يُرجى المحاولة مرة أخرى. إذا استمرت المشكلة، أعد تثبيت التطبيق.
          </p>
          <button
            onClick={this.handleRetry}
            style={{
              background: "rgba(134,239,172,0.15)",
              border: "1px solid rgba(134,239,172,0.4)",
              color: "#86efac",
              borderRadius: "0.5rem",
              padding: "0.75rem 2rem",
              fontSize: "1rem",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            إعادة المحاولة
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

try {
  const rootEl = document.getElementById("root");
  if (!rootEl) throw new Error("Root element #root not found");

  createRoot(rootEl).render(
    <ErrorBoundary>
      <App onMounted={hideNativeLoadingOverlay} />
    </ErrorBoundary>
  );
} catch (err) {
  hideNativeLoadingOverlay();
  const rootEl = document.getElementById("root");
  if (rootEl) {
    rootEl.innerHTML = `
      <div dir="rtl" style="
        position:fixed;inset:0;display:flex;flex-direction:column;
        align-items:center;justify-content:center;
        background:linear-gradient(145deg,#0d2818,#1a4a2e);
        color:#86efac;font-family:'Cairo',system-ui,sans-serif;
        padding:2rem;text-align:center;gap:1.5rem;
      ">
        <div style="font-size:3rem;opacity:0.6">⚠</div>
        <h1 style="font-size:1.4rem;margin:0">حدث خطأ أثناء تشغيل التطبيق</h1>
        <p style="font-size:0.9rem;opacity:0.7;margin:0;line-height:1.7">
          يُرجى إعادة تشغيل التطبيق أو إعادة تثبيته.
        </p>
      </div>`;
  }
  if (import.meta.env.DEV) console.error("[Quran App] Critical startup error:", err);
}
