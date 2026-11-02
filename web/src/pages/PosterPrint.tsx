// Print view for the A4 poster: bare page, the poster only, so printing
// gives exactly one page. Query: hook (0-2, or own with text), place,
// paper (green or saver). The maker links here; the PDF check loads it.
import { useLocation } from "preact-iso";
import { READY_HOOKS } from "../../../src/content/posters";
import { posterPlaceName, wrapHook } from "../../../src/rules/poster";
import { PosterArt } from "../components/PosterArt";

export function PosterPrint() {
  const { query } = useLocation();
  const hookParam = typeof query.hook === "string" ? query.hook : "0";
  const saver = query.paper === "saver";
  const place = posterPlaceName(typeof query.place === "string" ? query.place : "");
  const origin = window.location.origin;
  const host = window.location.host;
  const qrUrl = place === "this place" ? `${origin}/p` : `${origin}/p?place=${encodeURIComponent(place)}`;
  let lines: string[];
  if (hookParam === "own") {
    const wrapped = wrapHook(typeof query.text === "string" ? query.text : "");
    lines = Array.isArray(wrapped) ? wrapped : ["YOUR HOOK", "GOES HERE."];
  } else {
    const i = Number.parseInt(hookParam, 10);
    lines = READY_HOOKS[Number.isInteger(i) && i >= 0 && i < READY_HOOKS.length ? i : 0].lines;
  }
  return (
    <div class="poster-print">
      <PosterArt lines={lines} place={place} saver={saver} qrUrl={qrUrl} host={host} />
    </div>
  );
}
