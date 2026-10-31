import type { ComponentChildren } from "preact";
import { useEffect } from "preact/hooks";
import { useLocation } from "preact-iso";
import { tabForPath, type TopTab } from "../tabs";

interface Props {
  /** Shown in the browser tab as "<title>. Hoolala!" */
  title?: string;
  /** Left softkey; BACK goes home. Omit on the home screen. */
  back?: boolean;
  softkeys?: ComponentChildren;
  /** No softkey bar at all (the onboarding story brings its own controls). */
  bare?: boolean;
  children: ComponentChildren;
}

const TABS: { id: TopTab; label: string; href: string }[] = [
  { id: "today", label: "Today", href: "/" },
  { id: "around", label: "Around", href: "/around" },
  { id: "friends", label: "Friends", href: "/friends" },
];

/** One LCD screen: brand bar, content, then the softkey bar. The trio follows the route. */
export function Screen({ title, back = true, softkeys, bare = false, children }: Props) {
  const { path } = useLocation();
  const tab = tabForPath(path);
  useEffect(() => {
    document.title = title ? `${title}. Hoolala!` : "Hoolala!";
  }, [title]);

  return (
    <>
      <header class="brand-bar">
        <a class="brand-bar-name" href="/">Hoolala!</a>
        <span class="brand-bar-tag">You never know until you go.</span>
      </header>
      <main>{children}</main>
      {!bare && (
      <nav class="lcd-softkeys" aria-label="Shortcuts">
        {tab ? (
          TABS.map((t) => (
            <a key={t.id} class={`lcd-softkey softkey-tab${t.id === tab ? " on" : ""}`} href={t.href} aria-current={t.id === tab ? "page" : undefined}>
              {t.label}
            </a>
          ))
        ) : (
          softkeys ?? (
            <>
              {back && <a class="lcd-softkey" href="/">Back</a>}
              <span class="lcd-softkey" aria-hidden="true"></span>
            </>
          )
        )}
      </nav>
      )}
      <footer class="brand-footer">
        Powered by <a href="https://hg-labs.io" target="_blank" rel="noopener noreferrer">hg-labs.io</a> · <a href={`/say-hi?from=${encodeURIComponent(path)}`}>Say hi</a>
      </footer>
    </>
  );
}
