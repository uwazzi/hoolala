// One typed line; the caller reveals keys when it completes.
// Reduced motion: the whole line at once.
import { useEffect, useRef, useState } from "preact/hooks";

export function Typed({ text, onDone, msPerChar = 22 }: { text: string; onDone: () => void; msPerChar?: number }) {
  const [typed, setTyped] = useState(0);
  const doneRef = useRef(false);
  useEffect(() => {
    doneRef.current = false;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setTyped(text.length);
      return;
    }
    setTyped(0);
    const timer = setInterval(() => {
      setTyped((t) => {
        if (t >= text.length) {
          clearInterval(timer);
          return t;
        }
        return t + 1;
      });
    }, msPerChar);
    return () => clearInterval(timer);
  }, [text, msPerChar]);
  useEffect(() => {
    if (typed >= text.length && !doneRef.current) {
      doneRef.current = true;
      onDone();
    }
  });
  return (
    <span>{text.slice(0, typed)}{typed < text.length && <span class="lcd-cursor" aria-hidden="true" />}</span>
  );
}
