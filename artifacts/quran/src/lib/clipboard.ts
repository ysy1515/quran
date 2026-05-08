import { toast } from "sonner";

export async function copyToClipboard(text: string, successMsg = "تم النسخ"): Promise<void> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      toast.success(successMsg);
      return;
    }
    // Fallback for older browsers / restricted contexts
    const el = document.createElement("textarea");
    el.value = text;
    el.style.cssText = "position:fixed;left:-9999px;top:-9999px;opacity:0;";
    document.body.appendChild(el);
    el.focus();
    el.select();
    try {
      document.execCommand("copy");
      toast.success(successMsg);
    } catch {
      toast.error("تعذّر النسخ، يرجى المحاولة مرة أخرى");
    } finally {
      document.body.removeChild(el);
    }
  } catch {
    toast.error("تعذّر النسخ، يرجى المحاولة مرة أخرى");
  }
}

export function formatAyahForCopy(text: string, surahName: string, verseNumber: number): string {
  return `${text}\n— سورة ${surahName}، الآية ${verseNumber}`;
}
