import type { CorsOptions } from "cors";
import rateLimit from "express-rate-limit";

// Origins that may call the API from a browser or WebView. CORS is not an
// access control on its own (non-browser clients ignore it); it only stops
// other websites from calling the API with a visitor's browser.
const DEFAULT_ORIGINS = [
  "https://quran.yahya.app",
  // Capacitor WebViews
  "capacitor://localhost",
  "https://localhost",
  "http://localhost",
];

export function allowedOrigins(env: NodeJS.ProcessEnv = process.env): Set<string> {
  const extra = (env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  // Replit sets REPLIT_DOMAINS (comma-separated hostnames) for the dev preview.
  const replit = (env.REPLIT_DOMAINS ?? "")
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean)
    .map((d) => `https://${d}`);
  return new Set([...DEFAULT_ORIGINS, ...extra, ...replit]);
}

export function corsOptions(origins: Set<string> = allowedOrigins()): CorsOptions {
  return {
    // Requests without an Origin header (same-origin GETs, server-to-server) are allowed;
    // disallowed origins simply get no CORS headers.
    origin: (origin, cb) => cb(null, !origin || origins.has(origin)),
    methods: ["GET", "POST", "PUT", "DELETE"],
    maxAge: 600,
  };
}

/** Applies to every /api request. */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many requests" },
});

/** Stricter limit for routes that write to the database. */
export const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many requests" },
});
