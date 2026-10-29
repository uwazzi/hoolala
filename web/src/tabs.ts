// The softkey trio follows the screen: Today for home and the private
// compass, Around for places and the people in them, Friends for crews.
// Flows (check-in, meet, join, sign-in) and side pages keep Back.

export type TopTab = "today" | "around" | "friends";

const TABS: Record<string, TopTab> = {
  "/": "today",
  "/compass": "today",
  "/around": "around",
  "/here": "around",
  "/place": "around",
  "/friends": "friends",
};

/** The active trio tab for a path, or null for Back. Pure, tested. */
export function tabForPath(path: string): TopTab | null {
  return TABS[path] ?? null;
}
