
export type SubtitleOptions = {
  maxLineChars?: number;
  lineDurationMs?: number;
  gapMs?: number;
  wpm?: number;
  minMs?: number;
  maxMs?: number;
};

export function showSubtitle(text: string, options?: SubtitleOptions, append: boolean = false) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent("__radio_subtitle__", {
    detail: { text, options, append }
  }));
}

export function clearSubtitle() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent("__radio_subtitle__", {
    detail: { text: "" }
  }));
}
