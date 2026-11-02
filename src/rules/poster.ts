// Poster rules (v6.5): pure text shaping shared by the maker page and the
// printed poster, so the preview and the print always show the same lines.

export const HOOK_MAX_LINE = 16;
export const HOOK_MAX_LINES = 3;

export type WrapHook = string[] | { fits: false; reason?: string };

/** Uppercase and wrap an own hook to at most 3 lines of 16 characters. */
export function wrapHook(text: string): WrapHook {
  const words = text.toUpperCase().split(/\s+/).filter(Boolean);
  if (!words.length) return { fits: false, reason: "empty" };
  if (words.some((w) => w.length > HOOK_MAX_LINE)) return { fits: false };
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if (!cur) cur = w;
    else if (`${cur} ${w}`.length <= HOOK_MAX_LINE) cur = `${cur} ${w}`;
    else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  if (lines.length > HOOK_MAX_LINES) return { fits: false };
  return lines;
}

/** Blank place renders as this place; the check endpoint refuses long ones. */
export function posterPlaceName(place: string): string {
  const clean = place.trim();
  return clean ? clean : "this place";
}
