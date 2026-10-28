// WP25 THIS PLACE: details people keep right. CONFIRMED HERE first, then
// AI / FOUND with their source, then what someone here said. THAT'S RIGHT,
// FIX IT, NOT ANY MORE. Private place points. PLACE IT fills the card once a
// month, on the first visit.
import { useEffect, useState } from "preact/hooks";
import type { CheckinView } from "../../../src/types";
import { api } from "../api";
import { Screen } from "../components/Screen";
import { Workings } from "../components/Workings";

interface Fact { id: string; field: string; label: string; value: string; source: string; sourceUrl: string | null; sourceDomain: string | null; state: string; confirmations: number; mine: boolean }
interface Card { place: { id: string; name: string; kind: string; city: string | null } | null; facts: Fact[]; canFetch: boolean; points: { counted: number; pending: number } }

const FIELDS = [
  ["hours", "Opening hours"], ["menu_item", "On the menu"], ["price", "A price"], ["spot", "A spot to sit"],
  ["wifi", "Wi-fi"], ["sockets", "Sockets"], ["quiet", "Noise"], ["rule", "House rule"],
] as const;

const ERRORS: Record<string, string> = {
  own: "That's yours. Someone else has to confirm it.",
  already: "You've confirmed that one this month.",
  not_here: "Check in here first.",
  too_many: "That's a lot of details. Try again later.",
  bad_value: "One short line, please.",
};

export function Place() {
  const [placeId, setPlaceId] = useState<string | null>(null);
  const [card, setCard] = useState<Card | null>(null);
  const [reading, setReading] = useState(false);
  const [workingsId, setWorkingsId] = useState<string | null | undefined>(undefined);
  const [fixing, setFixing] = useState<Fact | null>(null);
  const [field, setField] = useState<string>("hours");
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const [away, setAway] = useState(false);

  async function load(id: string) {
    const res = await api<Card>("GET", `/api/places/${id}/card`);
    if (res.status !== 200) return setAway(true);
    setCard(res.data);
    if (res.data.canFetch) {
      setReading(true);
      const fetched = await api<Card & { workingsId: string | null }>("POST", `/api/places/${id}/fetch`);
      setReading(false);
      if (fetched.status === 200) {
        setCard(fetched.data);
        setWorkingsId(fetched.data.workingsId);
      }
    }
  }

  useEffect(() => {
    api<{ checkin: CheckinView | null }>("GET", "/api/checkin").then((res) => {
      if (res.status !== 200 || !res.data.checkin) return setAway(true);
      setPlaceId(res.data.checkin.place.id);
      load(res.data.checkin.place.id);
    });
  }, []);

  async function act(path: string, body?: unknown, done = "") {
    const res = await api<Card>("POST", path, body ?? {});
    if (res.status !== 200) {
      return setNote((res.data as { message?: string }).message ?? ERRORS[res.data.error ?? ""] ?? "Something went wrong. Try again.");
    }
    setCard(res.data);
    setNote(done);
  }

  async function submit(event: Event) {
    event.preventDefault();
    if (!placeId) return;
    const body = fixing ? { field: fixing.field, value, replaces: fixing.id } : { field, value };
    await act(`/api/places/${placeId}/facts`, body, fixing ? "Fixed. Points arrive when someone else confirms it." : "Added. Points arrive when someone else confirms it.");
    setFixing(null);
    setValue("");
  }

  if (away) {
    return (
      <Screen title="This place">
        <h1 class="screen-title">This place</h1>
        <p class="lcd-block">Check in at a place to see its details.</p>
        <ul class="key-list"><li><a class="lcd-key lcd-key--primary" href="/arrive">Where are you?</a></li></ul>
      </Screen>
    );
  }

  const confirmed = card?.facts.filter((f) => f.state === "confirmed") ?? [];
  const others = card?.facts.filter((f) => f.state !== "confirmed") ?? [];

  const row = (f: Fact) => (
    <li class="lcd-block idea" key={f.id}>
      <p class="lcd-kicker">{f.label}{f.state === "confirmed" ? " · confirmed here" : f.source === "web" ? " · AI / found" : " · someone here said"}</p>
      <p>{f.value}</p>
      {f.sourceUrl && <p class="lcd-small"><a href={f.sourceUrl} target="_blank" rel="noopener noreferrer">&gt; {f.sourceDomain}</a></p>}
      <div class="tiny-actions">
        {!f.mine && <button type="button" onClick={() => placeId && act(`/api/places/facts/${f.id}/confirm`, {}, "Thanks. +2 place points, just for you.")}>That's right</button>}
        <button type="button" onClick={() => { setFixing(f); setValue(f.value); setNote(""); }}>Fix it</button>
        <button type="button" onClick={() => act(`/api/places/facts/${f.id}/dispute`, {}, "Noted.")}>Not any more</button>
      </div>
    </li>
  );

  return (
    <Screen title="This place">
      <h1 class="screen-title">{card?.place?.name ?? "This place"}</h1>
      {reading && <p class="lcd-kicker" role="status">Reading the place...</p>}
      {workingsId !== undefined && <Workings id={workingsId} />}

      {card && card.facts.length === 0 && !reading && <p class="lcd-block">No details yet. Know something useful? Add it below.</p>}
      {confirmed.length > 0 && <ul class="lcd-menu">{confirmed.map(row)}</ul>}
      {others.length > 0 && <ul class="lcd-menu">{others.map(row)}</ul>}

      <form onSubmit={submit} noValidate>
        <h2 class="lcd-label">{fixing ? `Fix: ${fixing.label}` : "Add a detail"}</h2>
        {!fixing && (
          <select class="lcd-field" aria-label="What kind of detail" value={field} onChange={(e) => setField(e.currentTarget.value)}>
            {FIELDS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        )}
        <div class="field-stack">
          <input class="lcd-field" aria-label="The detail" maxLength={80} value={value} onInput={(e) => setValue(e.currentTarget.value)} placeholder="Flat white CHF 5.20" />
        </div>
        <ul class="key-list">
          <li><button class="lcd-key lcd-key--primary" type="submit">{fixing ? "Fix it" : "Add it"}</button></li>
          {fixing && <li><button class="lcd-key" type="button" onClick={() => { setFixing(null); setValue(""); }}>Back</button></li>}
        </ul>
      </form>

      <p class="lcd-small" role="status" aria-live="polite">{note}</p>
      {card && (
        <p class="lcd-small">
          Your place points: {card.points.counted}{card.points.pending ? ` (${card.points.pending} waiting for someone to confirm)` : ""}. Only you see this.
        </p>
      )}
    </Screen>
  );
}
