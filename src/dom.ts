// Small DOM helpers shared by the handoff and diagnostics pages.

export const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

/** Copies text to the clipboard. Falls back to execCommand for webviews without the Clipboard API. */
export async function copyText(text: string): Promise<boolean> {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Permission denied or no focus (common in in-app browsers): try the fallback.
    }
  }
  const t = document.createElement("textarea");
  t.value = text;
  t.setAttribute("readonly", "");
  t.style.position = "fixed";
  t.style.opacity = "0";
  document.body.appendChild(t);
  t.select();
  let ok = false;
  try { ok = document.execCommand("copy"); } catch {}
  document.body.removeChild(t);
  return ok;
}

/** Copies text and briefly swaps `label` to "Copied" or "Copy failed". */
export function copyWithFeedback(text: string, label: HTMLElement, idle: string, ms = 1800): Promise<boolean> {
  return copyText(text).then((ok) => {
    label.textContent = ok ? "Copied" : "Copy failed";
    setTimeout(() => { label.textContent = idle; }, ms);
    return ok;
  });
}
