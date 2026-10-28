import type { ComponentChildren } from "preact";
import { useEffect } from "preact/hooks";

interface Props {
  /** Shown in the browser tab as "<title>. Hoolala!" */
  title?: string;
  /** Left softkey; BACK goes home. Omit on the home screen. */
  back?: boolean;
  softkeys?: ComponentChildren;
  children: ComponentChildren;
}

/** One LCD screen: content, then the softkey bar. */
export function Screen({ title, back = true, softkeys, children }: Props) {
  useEffect(() => {
    document.title = title ? `${title}. Hoolala!` : "Hoolala!";
  }, [title]);

  return (
    <>
      <main>{children}</main>
      <nav class="lcd-softkeys" aria-label="Shortcuts">
        {softkeys ?? (
          <>
            {back && <a class="lcd-softkey" href="/">Back</a>}
            <span class="lcd-softkey" aria-hidden="true"></span>
          </>
        )}
      </nav>
    </>
  );
}
