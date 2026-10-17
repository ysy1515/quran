import { useSyncExternalStore } from "react";

// Whether the app chrome (header + tab bar) is hidden. Only the Quran reader's
// focus mode hides it; every other screen keeps both bars fixed on screen.
let hidden = false;
const listeners = new Set<() => void>();

export function setChromeHidden(value: boolean) {
  if (hidden === value) return;
  hidden = value;
  listeners.forEach((l) => l());
}

export function useChromeHidden(): boolean {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => hidden,
    () => false,
  );
}
