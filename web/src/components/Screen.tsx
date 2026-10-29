import type { ComponentChildren } from "preact";
import { useEffect } from "preact/hooks";

interface Props {
  /** Shown in the browser tab as "<title>. Hoolala!" */
  title?: string;
  /** Default softkeys HOME and BACK. Omit on the home screen. */
  back?: boolean;
  softkeys?: ComponentChildren;
  children: ComponentChildren;
}

/** BACK goes to the previous screen, or home when there is none (a shared link). */
function goBack(event: Event) {
  if (history.length > 1 && document.referrer.startsWith(location.origin)) {
    event.preventDefault();
    history.back();
  }
}

/** One LCD screen: the status bar with the wordmark, content, then the softkey bar. */
export function Screen({ title, back = true, softkeys, children }: Props) {
  useEffect(() => {
    document.title = title ? `${title}. Hoolala!` : "Hoolala!";
  }, [title]);

  return (
    <>
      <header class="lcd-status">
        <span class="lcd-bars" aria-hidden="true"><i /><i /><i /><i /></span>
        <a class="lcd-wordmark" href="/" aria-label="Hoolala! home">Hoolala!</a>
        <span class="lcd-batt" aria-hidden="true"><i /><i /><i /></span>
      </header>
      <main>{children}</main>
      <nav class="lcd-softkeys" aria-label="Shortcuts">
        {softkeys ?? (
          <>
            {back && <a class="lcd-softkey" href="/">Home</a>}
            {back ? <a class="lcd-softkey" href="/" onClick={goBack}>Back</a> : <span class="lcd-softkey" aria-hidden="true"></span>}
          </>
        )}
      </nav>
    </>
  );
}
