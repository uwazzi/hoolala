// WP28, rule 43: Hoolala! types its prompts letter by letter with a block
// cursor; the keys rise in when the text is complete. Reduced motion shows
// everything at once. Never used for the person's own words.

import type { ComponentChildren } from "preact";
import { useEffect, useState } from "preact/hooks";

export function Typewriter({ lead, title, meta, children }: { lead: string; title: string; meta?: string | null; children?: ComponentChildren }) {
  const [typed, setTyped] = useState(0);
  const total = lead.length + title.length;
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setTyped(total);
      return;
    }
    setTyped(0);
    const timer = setInterval(() => {
      setTyped((t) => {
        if (t >= total) {
          clearInterval(timer);
          return t;
        }
        return t + 1;
      });
    }, 26);
    return () => clearInterval(timer);
  }, [lead, title]);
  const done = typed >= total;
  return (
    <>
      <div class="says-lead">
        {lead.slice(0, typed)}
        {!done && typed <= lead.length && <span class="lcd-cursor" aria-hidden="true" />}
      </div>
      <div class="says-title">
        {typed > lead.length ? title.slice(0, typed - lead.length) : ""}
        {!done && typed > lead.length && <span class="lcd-cursor" aria-hidden="true" />}
      </div>
      {meta && done && <div class="says-meta keys-rise">{meta}</div>}
      {done && children}
    </>
  );
}
