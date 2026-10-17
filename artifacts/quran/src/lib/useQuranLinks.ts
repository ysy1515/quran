import type { AyahRef } from "@workspace/quran-meta";

/** Route that opens the reader at an ayah. */
export function readerHref(ref: AyahRef, opts: { wird?: boolean } = {}): string {
  const q = new URLSearchParams({ ayah: String(ref.ayah) });
  if (opts.wird) q.set("wird", "1");
  return `/mushaf/${ref.surah}?${q.toString()}`;
}
