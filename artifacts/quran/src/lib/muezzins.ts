import { ar } from "./format";

// The five adhan recordings shipped with the app (public/audio/adhan/). Each one
// exists in three forms, one per way it is played:
// - preview and full in-app playback: the MP3 under public/audio/adhan/;
// - iOS notification sound: a clip of the first 29 seconds (iOS plays at most 30 s
//   for a notification sound and falls back to the default sound beyond that),
//   bundled in the app as ios/App/App/Sounds/adhan_N.caf;
// - Android notification sound: the full MP3 in android/app/src/main/res/raw/adhan_N.mp3,
//   attached to its own notification channel (a channel's sound cannot be changed
//   after it is created, so each recording has its own channel; see MainActivity.java).

export interface Muezzin {
  id: string;
  name: string;
  hint: string;
  /** Full recording, used for preview and for playback inside the app. */
  audioUrl: string;
  /** iOS notification sound file name in the app bundle (29-second clip). */
  iosSound: string;
  /** Android notification channel whose sound is the full recording. */
  androidChannel: string;
  /** The recording in android res/raw (used directly as the sound on Android 7, which has no channels). */
  androidRaw: string;
}

const HINTS = ["النمط الأول", "النمط الثاني", "النمط الثالث", "النمط الرابع", "النمط الخامس"];

export const MUEZZINS: Muezzin[] = [1, 2, 3, 4, 5].map((n) => ({
  id: `adhan-${n}`,
  name: `أذان ${ar(n)}`,
  hint: HINTS[n - 1]!,
  audioUrl: `/audio/adhan/adhan-${n}.mp3`,
  iosSound: `adhan_${n}.caf`,
  androidChannel: `prayer_adhan_${n}_v1`,
  androidRaw: `adhan_${n}`,
}));

export const DEFAULT_MUEZZIN_ID = "adhan-1";

/** Android channel for prayer alerts that use the device's default notification sound. */
export const ANDROID_PRAYER_DEFAULT_CHANNEL = "prayer_default_v1";
/** Android channel for the daily reminders (wird, athkar, surahs). */
export const ANDROID_REMINDERS_CHANNEL = "reminders_v1";

/**
 * The muezzin for a saved id. An id that is not one of the shipped recordings
 * (for example one saved by an older build) resolves to the default recording
 * for playback, without rewriting what the user saved.
 */
export function muezzinFor(id: string | undefined | null): Muezzin {
  return MUEZZINS.find((m) => m.id === id) ?? MUEZZINS[0]!;
}

export function isKnownMuezzin(id: unknown): id is string {
  return typeof id === "string" && MUEZZINS.some((m) => m.id === id);
}
