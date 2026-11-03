import { useSyncExternalStore } from "react";

// One shared player for adhan audio inside the app (settings preview, and the full
// adhan after the user taps a prayer notification). Starting one recording always
// stops the other, so two adhans never play at the same time.
//
// This is ordinary in-app playback in the WebView: it plays while the app is open
// and follows the device's silent switch and volume. It is not background audio;
// when the app is closed only the notification's own sound can play.

export interface PlayerState {
  /** Muezzin id currently playing, or null. */
  playing: string | null;
}

let audio: HTMLAudioElement | null = null;
let state: PlayerState = { playing: null };
const listeners = new Set<() => void>();

function set(next: PlayerState) {
  state = next;
  listeners.forEach((l) => l());
}

export function stopAdhan() {
  if (audio) {
    audio.onended = null;
    audio.onerror = null;
    audio.pause();
    audio.src = "";
    audio = null;
  }
  if (state.playing) set({ playing: null });
}

/** Plays `url` for muezzin `id`. Resolves false if the file could not be played. */
export async function playAdhan(id: string, url: string): Promise<boolean> {
  stopAdhan();
  const a = new Audio(url);
  audio = a;
  a.onended = () => {
    if (audio === a) stopAdhan();
  };
  a.onerror = () => {
    if (audio === a) stopAdhan();
  };
  set({ playing: id });
  try {
    await a.play();
    return true;
  } catch (err) {
    if (audio === a) stopAdhan();
    // AbortError: stopped by a newer play() before it started; not a failure.
    return err instanceof DOMException && err.name === "AbortError";
  }
}

export function useAdhanPlayer(): PlayerState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => state,
  );
}
