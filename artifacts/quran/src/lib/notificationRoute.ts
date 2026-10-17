// Tapping a local notification opens the screen named in its `extra.route`.
// Only in-app paths are accepted; anything else leaves the app where it is.

const ALLOWED = [/^\/$/, /^\/adhan$/, /^\/athkar\/[a-z-]+$/, /^\/mushaf\/\d{1,3}$/];

export function notificationRoute(extra: unknown): string | null {
  const route = typeof extra === "object" && extra !== null ? (extra as { route?: unknown }).route : undefined;
  if (typeof route !== "string") return null;
  return ALLOWED.some((re) => re.test(route)) ? route : null;
}
