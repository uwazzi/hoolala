// WP24 MY COMPASS: the person's own lines with their source, REMOVE, or
// delete it all. Only the owner ever sees this.
import { useEffect, useState } from "preact/hooks";
import { api } from "../api";
import { Screen } from "../components/Screen";

interface Line { id: string; part: string; text: string; sourceUrl: string | null; source: string }

const PART_LABEL: Record<string, string> = { interest: "Into", talk_about: "Happy to talk about", more_of: "Would like more of", filter: "Rather not talk about" };

export function Compass() {
  const [lines, setLines] = useState<Line[] | null>(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    api<{ compass: Line[] }>("GET", "/api/me/compass").then((res) => {
      if (res.status === 401) return (location.href = "/signin");
      setLines(res.data.compass);
    });
  }, []);

  async function remove(id: string) {
    const res = await api<{ compass: Line[] }>("DELETE", `/api/me/compass/${id}`);
    if (res.status === 200) setLines(res.data.compass);
  }

  async function removeAll() {
    if (!window.confirm("Delete your whole compass?")) return;
    await api("DELETE", "/api/me/compass");
    setLines([]);
    setNote("Deleted.");
  }

  return (
    <Screen title="My compass">
      <h1 class="screen-title">My compass</h1>
      {lines === null && <p class="lcd-kicker" role="status">Loading...</p>}
      {lines?.length === 0 && (
        <>
          <p class="lcd-block">No compass yet. It helps with topic ideas and puts signals that fit you first, just for you.</p>
          <ul class="key-list"><li><a class="lcd-key lcd-key--primary" href="/start">Get a head start</a></li></ul>
        </>
      )}
      {lines && lines.length > 0 && (
        <>
          <ul class="lcd-menu">
            {lines.map((l) => (
              <li class="lcd-block idea" key={l.id}>
                <p class="lcd-kicker">{PART_LABEL[l.part] ?? l.part}</p>
                <p>{l.text}</p>
                <div class="tiny-actions">
                  <span class="lcd-small">{l.sourceUrl ? <a href={l.sourceUrl} target="_blank" rel="noopener noreferrer">from: {l.source}</a> : "you said"}</span>
                  <button type="button" onClick={() => remove(l.id)}>Remove</button>
                </div>
              </li>
            ))}
          </ul>
          <ul class="key-list">
            <li><a class="lcd-key" href="/start">Redo it</a></li>
            <li><button class="lcd-key" type="button" onClick={removeAll}>Delete my compass</button></li>
          </ul>
        </>
      )}
      <p class="lcd-small">Only you see this. Never shown to anyone, never used to match or rank people.</p>
      <p class="lcd-small" role="status" aria-live="polite">{note}</p>
    </Screen>
  );
}
