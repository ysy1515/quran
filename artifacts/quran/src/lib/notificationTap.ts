// What tapping a prayer notification does with audio.
//
// iOS plays at most 30 seconds of a notification sound, so the alert carries a
// clip of the adhan. Tapping it opens the app, which then plays the full adhan of
// the selected muezzin (the clip stops when the notification is opened, so the two
// never overlap). Only for a tap shortly after the prayer time: an old notification
// opened hours later does not start an adhan.
//
// Android already plays the full recording as the notification sound, and opening
// the notification stops it; starting it again in the app would play it twice.

export const FULL_ADHAN_TAP_WINDOW_MS = 30 * 60_000;

export function shouldPlayFullAdhanOnTap(
  extra: unknown,
  platform: "ios" | "android" | "web",
  alertSound: "adhan" | "device",
  nowMs: number,
): boolean {
  if (platform !== "ios" || alertSound !== "adhan") return false;
  if (typeof extra !== "object" || extra === null) return false;
  const { kind, at } = extra as { kind?: unknown; at?: unknown };
  if (kind !== "adhan") return false;
  const atMs = Number(at);
  if (!Number.isFinite(atMs)) return false;
  return nowMs >= atMs - 60_000 && nowMs - atMs <= FULL_ADHAN_TAP_WINDOW_MS;
}
