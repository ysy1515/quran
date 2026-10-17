import { copyToClipboard } from "./clipboard";

/** Native share sheet when available, otherwise copy to the clipboard. */
export async function shareOrCopy(data: { title?: string; text: string; url?: string }): Promise<void> {
  if (navigator.share) {
    try {
      await navigator.share(data);
      return;
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
    }
  }
  await copyToClipboard([data.text, data.url].filter(Boolean).join("\n"), "تم نسخ النص");
}
