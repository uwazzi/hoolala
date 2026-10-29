import type { ComponentChildren } from "preact";
import { useEffect } from "preact/hooks";

export type TopTab = "today" | "around" | "friends";

interface Props {
  /** Shown in the browser tab as "<title>. Hoolala!" */
  title?: string;
  /** Left softkey; BACK goes home. Omit on the home screen. */
  back?: boolean;
  softkeys?: ComponentChildren;
  /** Top-level screens get the TODAY · AROUND · FRIENDS trio with one active. */
  tab?: TopTab;
  children: ComponentChildren;
}

const TABS: { id: TopTab; label: string; href: string }[] = [
  { id: "today", label: "Today", href: "/" },
  // WP31 add-on: AROUND points at Here until WP32 builds /around.
  { id: "around", label: "Around", href: "/here" },
  { id: "friends", label: "Friends", href: "/friends" },
];

/** One LCD screen: brand bar, content, then the softkey bar. */
export function Screen({ title, back = true, softkeys, tab, children }: Props) {
  useEffect(() => {
    document.title = title ? `${title}. Hoolala!` : "Hoolala!";
  }, [title]);

  return (
    <>
      <header class="brand-bar">
        <span class="brand-bar-name">Hoolala!</span>
        <span class="brand-bar-tag">You never know until you go.</span>
      </header>
      <main>{children}</main>
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
    </>
  );
}
