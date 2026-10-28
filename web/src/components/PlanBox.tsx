// WP23 PLAN IT on an accepted signal: the meeting point if set; otherwise
// "Plan the meeting point" gets a draft (AI / DRAFT, or IDEA without a model)
// that a person CONFIRMs or CHANGEs. The agent never confirms anything.
import { useState } from "preact/hooks";
import { api } from "../api";
import { Workings } from "./Workings";

interface Point { spot: string; time: string; proposedBy: string }
interface Draft { spot: string; time: string; why: string | null }

const hhmm = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

function todayAt(value: string): string | null {
  const m = /^(\d{2}):(\d{2})$/.exec(value);
  if (!m) return null;
  const d = new Date();
  d.setHours(Number(m[1]), Number(m[2]), 0, 0);
  return d.toISOString();
}

export function PlanBox({ signalId, spots, point, onSaved }: { signalId: string; spots: string[]; point: Point | null; onSaved: () => void }) {
  const [draft, setDraft] = useState<{ draft: Draft; source: string; token: string; workingsId: string | null } | null>(null);
  const [changing, setChanging] = useState(false);
  const [spot, setSpot] = useState("");
  const [at, setAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  async function ask() {
    setBusy(true);
    setNote("");
    const res = await api<{ draft: Draft; source: string; confirmationToken: string; workingsId: string | null }>("POST", `/api/here/signals/${signalId}/plan`);
    setBusy(false);
    if (res.status !== 200) return setNote("No draft right now. Pick a spot yourself?");
    setDraft({ draft: res.data.draft, source: res.data.source, token: res.data.confirmationToken, workingsId: res.data.workingsId });
  }

  async function save(body: Record<string, unknown>) {
    const res = await api("POST", `/api/here/signals/${signalId}/meeting-point`, body);
    if (res.status !== 200) return setNote(res.data.error === "bad_meeting_point" ? "Pick one of the spots and a time before the signal ends." : "That draft has expired. Ask again?");
    setDraft(null);
    setChanging(false);
    onSaved();
  }

  if (point) {
    return <p class="lcd-block meeting-point"><span class="lcd-kicker">Meeting point</span> {point.spot}, {hhmm(point.time)}</p>;
  }

  return (
    <div class="plan">
      {!draft && !changing && (
        <ul class="key-list">
          <li><button class="lcd-key" type="button" onClick={ask} disabled={busy}>{busy ? "Planning..." : "Plan the meeting point"}</button></li>
        </ul>
      )}
      {draft && !changing && (
        <div class="lcd-block">
          <p class="lcd-kicker">{draft.source === "ai" ? "AI / draft" : "Idea"}</p>
          <p class="signal-topic">{draft.draft.spot} at {hhmm(draft.draft.time)}?</p>
          {draft.draft.why && <p class="lcd-small">{draft.draft.why}</p>}
          <ul class="key-list">
            <li><button class="lcd-key lcd-key--primary" type="button" onClick={() => save({ spot: draft.draft.spot, time: draft.draft.time, confirmationToken: draft.token })}>Confirm</button></li>
            <li><button class="lcd-key" type="button" onClick={() => { setChanging(true); setSpot(draft.draft.spot); }}>Change</button></li>
          </ul>
          <Workings id={draft.workingsId} />
        </div>
      )}
      {changing && (
        <form onSubmit={(e) => { e.preventDefault(); const t = todayAt(at); if (!t || !spot) return setNote("Pick a spot and a time."); save({ spot, time: t }); }} noValidate>
          <fieldset class="chips">
            <legend class="lcd-label">Where?</legend>
            {spots.map((s) => (
              <label class="chip" key={s}>
                <input type="radio" name={`mp-${signalId}`} checked={spot === s} onChange={() => setSpot(s)} /><span>{s}</span>
              </label>
            ))}
          </fieldset>
          <label class="lcd-label" for={`mp-time-${signalId}`}>When?</label>
          <input class="lcd-field" id={`mp-time-${signalId}`} type="time" value={at} onInput={(e) => setAt(e.currentTarget.value)} />
          <ul class="key-list">
            <li><button class="lcd-key lcd-key--primary" type="submit">Set it</button></li>
            <li><button class="lcd-key" type="button" onClick={() => setChanging(false)}>Back</button></li>
          </ul>
        </form>
      )}
      {note && <p class="lcd-small" role="status">{note}</p>}
    </div>
  );
}
