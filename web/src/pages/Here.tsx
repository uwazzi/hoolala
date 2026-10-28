// WP22 HERE: your signal and its curious requests, the ones you answered,
// and up to three to discover. Refreshes every 5 seconds while open.
// Anonymous until both accept; quick replies only. No AI.
import { useEffect, useState } from "preact/hooks";
import type { CheckinView } from "../../../src/types";
import { api } from "../api";
import { Screen } from "../components/Screen";

interface Reply { from: string; text: string; at: string }
interface Request { id: string; line: string | null; state: string; name: string | null }
interface Mine { id: string; topic: string; whenAt: string; spot: string; capacity: number; expiresAt: string; state: string; requests: Request[]; replies: Reply[] }
interface Joined { responseId: string; signalId: string; topic: string; whenAt: string; spot: string; expiresAt: string; state: string; signalState: string; ownerName: string | null; replies: Reply[] }
interface Found { id: string; topic: string; whenAt: string; spot: string; capacity: number; expiresAt: string }
interface HereView { checkin: CheckinView | null; spots: string[]; mine: Mine[]; joined: Joined[]; discover: Found[] }

const QUICK = [
  { kind: "on_my_way", label: "On my way" },
  { kind: "five_late", label: "5 minutes late" },
  { kind: "cant_make_it", label: "Can't make it" },
  { kind: "at_spot", label: "We're at the spot" },
];

const ERRORS: Record<string, string> = {
  too_many_open: "Two signals at a time. Cancel one to post another.",
  too_many_curious: "That's a lot of curiosity for one hour. Try again a bit later.",
  already_curious: "You've already said you're curious.",
  full: "That one's full now.",
  not_found: "That one has gone.",
  not_checked_in: "Check in first.",
  bad_when: "Pick a time within the next 90 minutes.",
};

const time = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

function whenText(iso: string): string {
  return Date.parse(iso) <= Date.now() + 60_000 ? "Now" : time(iso);
}

/** "15:10" today, as ISO, for WHEN at a time. */
function todayAt(hhmm: string): string | null {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm);
  if (!m) return null;
  const d = new Date();
  d.setHours(Number(m[1]), Number(m[2]), 0, 0);
  return d.toISOString();
}

function Replies({ replies }: { replies: Reply[] }) {
  if (!replies.length) return null;
  return (
    <ul class="reply-list">
      {replies.map((r) => <li key={r.at + r.from}><strong>{r.from}:</strong> {r.text}</li>)}
    </ul>
  );
}

export function Here() {
  const [data, setData] = useState<HereView | null>(null);
  const [signedOut, setSignedOut] = useState(false);
  const [note, setNote] = useState("");
  const [posting, setPosting] = useState(false);
  const [curiousFor, setCuriousFor] = useState<string | null>(null);
  const [line, setLine] = useState("");
  // Post form
  const [topic, setTopic] = useState("");
  const [when, setWhen] = useState<"now" | "in30" | "at">("now");
  const [at, setAt] = useState("");
  const [spot, setSpot] = useState("");
  const [capacity, setCapacity] = useState(1);

  async function load() {
    const res = await api<HereView>("GET", "/api/here");
    if (res.status === 401) return setSignedOut(true);
    if (res.status === 200) setData(res.data);
  }

  useEffect(() => {
    load();
    const timer = setInterval(() => document.visibilityState === "visible" && load(), 5000);
    return () => clearInterval(timer);
  }, []);

  async function act(path: string, body?: unknown, done?: string) {
    const res = await api("POST", path, body ?? {});
    if (res.status !== 200) {
      setNote((res.data as { message?: string }).message ?? ERRORS[res.data.error ?? ""] ?? "Something went wrong. Try again.");
      return false;
    }
    setNote(done ?? "");
    await load();
    return true;
  }

  async function postSignal(event: Event) {
    event.preventDefault();
    const whenValue = when === "at" ? todayAt(at) : when;
    if (!whenValue) return setNote("Pick a time.");
    if (!spot) return setNote("Pick where in the place.");
    const res = await api<{ signal: { expiresAt: string } }>("POST", "/api/here/signals", { topic, when: whenValue, spot, capacity });
    if (res.status !== 200) {
      return setNote((res.data as { message?: string }).message ?? ERRORS[res.data.error ?? ""] ?? "Something went wrong. Try again.");
    }
    setTopic("");
    setPosting(false);
    setNote(`Signal up. Visible to people here until ${time(res.data.signal.expiresAt)}.`);
    load();
  }

  async function sendCurious(id: string) {
    if (await act(`/api/here/signals/${id}/curious`, line.trim() ? { line } : {}, "Sent. If they say yes, you'll both see first names.")) {
      setCuriousFor(null);
      setLine("");
    }
  }

  function safety(target: { signalId?: string; responseId?: string }) {
    return (
      <div class="tiny-actions">
        <button type="button" onClick={() => {
          const reason = window.prompt("What's wrong? (optional)") ?? "";
          act("/api/report", { ...target, reason }, "Reported. It's hidden now, and we'll look at it.");
        }}>Report</button>
        <button type="button" onClick={() => {
          if (window.confirm("Block them? Neither of you will see the other again, anywhere.")) act("/api/block", target, "Blocked.");
        }}>Block</button>
      </div>
    );
  }

  if (signedOut) {
    return (
      <Screen title="Here">
        <h1 class="screen-title">Here</h1>
        <p class="lcd-block">Sign in first, then check in where you are.</p>
        <ul class="key-list"><li><a class="lcd-key lcd-key--primary" href="/signin">Sign in</a></li></ul>
      </Screen>
    );
  }

  if (!data) {
    return <Screen title="Here"><p class="lcd-kicker" role="status">Loading...</p></Screen>;
  }

  if (!data.checkin) {
    return (
      <Screen title="Here">
        <h1 class="screen-title">What's here?</h1>
        <p class="lcd-block">Signals are for people in the same place, right now. Check in first.</p>
        <ul class="key-list"><li><a class="lcd-key lcd-key--primary" href="/arrive">Where are you?</a></li></ul>
      </Screen>
    );
  }

  const openMine = data.mine.filter((s) => s.state === "open" || s.state === "full");

  return (
    <Screen title="Here">
      <p class="lcd-kicker">{data.checkin.place.name} · here until {time(data.checkin.endsAt)}</p>

      {data.mine.map((s) => {
        const accepted = s.requests.filter((r) => r.state === "accepted");
        return (
          <section class="lcd-block" key={s.id} aria-label="Your signal">
            <p class="lcd-kicker">Your signal</p>
            <p class="signal-topic">{s.topic}</p>
            <p class="lcd-small">{whenText(s.whenAt)} · {s.spot} · for {s.capacity} · until {time(s.expiresAt)}</p>
            {s.requests.filter((r) => r.state === "requested").map((r) => (
              <div class="request" key={r.id}>
                <p>Someone here is curious{r.line ? `: "${r.line}"` : "."}</p>
                <ul class="key-list">
                  <li><button class="lcd-key lcd-key--primary" type="button" onClick={() => act(`/api/here/responses/${r.id}/accept`)}>Accept</button></li>
                  <li><button class="lcd-key" type="button" onClick={() => act(`/api/here/responses/${r.id}/decline`, {}, "Not this time. They'll see it kindly.")}>Not this time</button></li>
                </ul>
                {safety({ responseId: r.id })}
              </div>
            ))}
            {accepted.map((r) => (
              <p key={r.id}><strong>{r.name ?? "Someone"}</strong> is in. Meet at {s.spot.toLowerCase()}, {whenText(s.whenAt).toLowerCase()}.</p>
            ))}
            <Replies replies={s.replies} />
            {accepted.length > 0 && <QuickReplies onSend={(kind) => act(`/api/here/signals/${s.id}/quick`, { kind })} />}
            {accepted.length > 0 && (
              <ul class="key-list"><li><a class="lcd-key lcd-key--primary" href={`/meet?signal=${s.id}`}>Meet: show my QR</a></li></ul>
            )}
            <div class="tiny-actions">
              <button type="button" onClick={() => act(`/api/here/signals/${s.id}/cancel`, {}, "Signal taken down.")}>Cancel signal</button>
            </div>
          </section>
        );
      })}

      {data.joined.map((j) => (
        <section class="lcd-block" key={j.responseId} aria-label="A signal you answered">
          <p class="lcd-kicker">You're curious</p>
          <p class="signal-topic">{j.topic}</p>
          {j.state === "requested" && (j.signalState === "open" || j.signalState === "full") && <p>Sent. Waiting for them.</p>}
          {j.state === "requested" && j.signalState !== "open" && j.signalState !== "full" && <p>They had to go.</p>}
          {j.state === "declined" && <p>Not this time. No hard feelings.</p>}
          {j.state === "accepted" && (
            <>
              <p>Accepted. <strong>{j.ownerName ?? "Someone"}</strong> · {j.spot.toLowerCase()} · {whenText(j.whenAt).toLowerCase()}.</p>
              <Replies replies={j.replies} />
              <QuickReplies onSend={(kind) => act(`/api/here/signals/${j.signalId}/quick`, { kind })} />
              <ul class="key-list"><li><a class="lcd-key lcd-key--primary" href="/meet">Meet: scan or type their code</a></li></ul>
            </>
          )}
        </section>
      ))}

      <h1 class="screen-title">What's here?</h1>
      {data.discover.map((s) => (
        <section class="lcd-block" key={s.id} aria-label="A signal here">
          <p class="signal-topic">{s.topic}</p>
          <p class="lcd-small">Someone here · {whenText(s.whenAt)} · {s.spot} · for {s.capacity} · until {time(s.expiresAt)}</p>
          {curiousFor === s.id ? (
            <form onSubmit={(e) => { e.preventDefault(); sendCurious(s.id); }}>
              <label class="lcd-label" for={`line-${s.id}`}>Add a line? (optional)</label>
              <input class="lcd-field" id={`line-${s.id}`} maxLength={60} value={line} onInput={(e) => setLine(e.currentTarget.value)} />
              <ul class="key-list">
                <li><button class="lcd-key lcd-key--primary" type="submit">Send</button></li>
                <li><button class="lcd-key" type="button" onClick={() => setCuriousFor(null)}>Back</button></li>
              </ul>
            </form>
          ) : (
            <ul class="key-list">
              <li><button class="lcd-key lcd-key--primary" type="button" onClick={() => { setCuriousFor(s.id); setLine(""); }}>I'm curious</button></li>
            </ul>
          )}
          {safety({ signalId: s.id })}
        </section>
      ))}
      <p class="lcd-small">That's everything here right now.{openMine.length < 2 && !posting ? " Post one?" : ""}</p>

      {posting ? (
        <form onSubmit={postSignal} noValidate>
          <label class="lcd-label" for="topic">What's the topic?</label>
          <input class="lcd-field" id="topic" maxLength={60} required value={topic} onInput={(e) => setTopic(e.currentTarget.value)}
            placeholder="Coffee break at 15:00. Small talk welcome." />
          <p class="lcd-small">{topic.length}/60 · Not dating, not selling. Just a chat.</p>
          <fieldset class="chips">
            <legend class="lcd-label">When?</legend>
            {([["now", "Now"], ["in30", "In 30 min"], ["at", "At a time"]] as const).map(([id, label]) => (
              <label class="chip" key={id}>
                <input type="radio" name="when" checked={when === id} onChange={() => setWhen(id)} /><span>{label}</span>
              </label>
            ))}
          </fieldset>
          {when === "at" && <input class="lcd-field" type="time" aria-label="Time" value={at} onInput={(e) => setAt(e.currentTarget.value)} />}
          <fieldset class="chips">
            <legend class="lcd-label">Where in the place?</legend>
            {data.spots.map((sp) => (
              <label class="chip" key={sp}>
                <input type="radio" name="spot" checked={spot === sp} onChange={() => setSpot(sp)} /><span>{sp}</span>
              </label>
            ))}
          </fieldset>
          <fieldset class="chips">
            <legend class="lcd-label">For how many?</legend>
            {[1, 2, 3].map((n) => (
              <label class="chip" key={n}>
                <input type="radio" name="capacity" checked={capacity === n} onChange={() => setCapacity(n)} /><span>{n}</span>
              </label>
            ))}
          </fieldset>
          <ul class="key-list">
            <li><button class="lcd-key lcd-key--primary" type="submit">Signal up</button></li>
            <li><button class="lcd-key" type="button" onClick={() => setPosting(false)}>Not now</button></li>
          </ul>
        </form>
      ) : (
        openMine.length < 2 && (
          <ul class="key-list"><li><button class="lcd-key lcd-key--primary" type="button" onClick={() => { setPosting(true); setNote(""); }}>Post one</button></li></ul>
        )
      )}

      <p class="lcd-small" role="status" aria-live="polite">{note}</p>
      <ul class="key-list">
        <li><button class="lcd-key" type="button" onClick={async () => { await api("POST", "/api/checkin/leave"); location.href = "/arrive"; }}>I'm leaving</button></li>
      </ul>
    </Screen>
  );
}

function QuickReplies({ onSend }: { onSend: (kind: string) => void }) {
  return (
    <div class="chips" role="group" aria-label="Quick replies">
      {QUICK.map((q) => (
        <button class="lcd-key" type="button" key={q.kind} onClick={() => onSend(q.kind)}>{q.label}</button>
      ))}
    </div>
  );
}
