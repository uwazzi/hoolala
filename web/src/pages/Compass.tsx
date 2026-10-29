// WP33 MY COMPASS: four directions, a first-time reveal after get personal or
// Surprise, and SAY IT YOUR WAY edits with UNDO. Only the owner ever sees
// this. The person's words are never typed letter by letter (that voice is
// Hoolala!'s); the reveal raises one line at a time instead.
import { useEffect, useState } from "preact/hooks";
import { useLocation } from "preact-iso";
import { api } from "../api";
import { Screen } from "../components/Screen";
import { Typewriter } from "../components/Typewriter";

interface Line { id: string; part: string; text: string; sourceUrl: string | null; source: string; origin: string }
interface FixTry { id: string; title: string; outcome: string }
interface Proposal { part: string; words: string; change: { before: string | null; after: string }; saw: { part: string; words: string }[] }
interface Change { id: string; kind: string; words: string; before: string | null; after: string | null; undone: boolean }

const DIRS: { parts: string[]; label: string; point: number; does: string; used: string }[] = [
  { parts: ["intention"], label: "More of", point: 0, does: "What you want more of. Shapes your tiny try.", used: "More of shapes today's tiny try." },
  { parts: ["interest"], label: "Talk about", point: 90, does: "What you like talking about. Puts matching signals first, just for you.", used: "Talk about puts matching signals first, just for you." },
  { parts: ["filter"], label: "Less of", point: 180, does: "What you'd rather skip. Filters every suggestion.", used: "Less of filters every suggestion." },
  { parts: ["delivery", "action"], label: "How I go", point: 270, does: "When and how you like going out. Shapes Around and your tiny try.", used: "How I go shapes Around and your tiny try." },
];

function sourceLabel(l: Line) {
  if (l.sourceUrl) return "from";
  if (l.origin === "feedback") return "from: your feedback";
  if (l.origin === "questions") return "from: Surprise me";
  return "you said";
}

const LINE_PICK = [
  { part: "intention", label: "More of" },
  { part: "interest", label: "Talk about" },
  { part: "filter", label: "Less of" },
  { part: "delivery", label: "How I go" },
  { part: "action", label: "Next time" },
];

const FEEDBACKS = ["went_well", "awkward", "no_reply", "didnt_happen"];

export function Compass() {
  const { query, route } = useLocation();
  const [lines, setLines] = useState<Line[] | null>(null);
  const [note, setNote] = useState("");
  const [fresh, setFresh] = useState(query.fresh === "1");
  const [shown, setShown] = useState(0);
  const [settle, setSettle] = useState(false);
  const [fixTry, setFixTry] = useState<FixTry | null>(null);
  const [fixTried, setFixTried] = useState(false);
  const [sayLine, setSayLine] = useState("");
  const [sayPart, setSayPart] = useState("interest");
  const [sayWords, setSayWords] = useState("");
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [changes, setChanges] = useState<Change[]>([]);
  const [people, setPeople] = useState<{ role: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [activeDir, setActiveDir] = useState<string | null>(null);
  const review = query.review === "delivery" || query.review === "suggest" ? (query.review as string) : null;
  const undoable = changes.some((c) => !c.undone);

  function refreshChanges() {
    api<{ changes: Change[] }>("GET", "/api/me/compass/changes").then((res) => {
      if (res.status === 200) setChanges(res.data.changes);
    });
  }

  useEffect(() => {
    api<{ compass: Line[] }>("GET", "/api/me/compass").then((res) => {
      if (res.status === 401) return (location.href = "/signin");
      setLines(res.data.compass);
    });
    refreshChanges();
    api<{ people: { role: string }[] }>("GET", "/api/me/compass/people").then((res) => {
      if (res.status === 200) setPeople(res.data.people);
    });
  }, []);

  // First-time reveal: the needle settles, then one line at a time.
  useEffect(() => {
    if (!fresh || !lines || lines.length === 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(lines.length);
      setSettle(true);
      return;
    }
    setShown(0);
    setSettle(false);
    const settleTimer = setTimeout(() => setSettle(true), 900);
    const timer = setInterval(() => {
      setShown((n) => {
        if (n >= (lines?.length ?? 0)) {
          clearInterval(timer);
          return n;
        }
        return n + 1;
      });
    }, 450);
    return () => {
      clearTimeout(settleTimer);
      clearInterval(timer);
    };
  }, [fresh, lines]);

  // COMPASS? from a try debrief: the try, and starter words for it.
  useEffect(() => {
    const fix = typeof query.fix === "string" ? query.fix : null;
    if (!fix || fixTried) return;
    setFixTried(true);
    api<{ try: FixTry }>("GET", `/api/tries/${fix}`).then(async (res) => {
      if (res.status !== 200) {
        setNote("That try is gone. Say it in your own words instead.");
        return;
      }
      setFixTry(res.data.try);
      if (!FEEDBACKS.includes(res.data.try.outcome)) return;
      const starter = await api<{ proposed: { part: string; words: string } }>("POST", "/api/me/compass/propose", { feedback: res.data.try.outcome });
      if (starter.status === 200) {
        setSayWords(starter.data.proposed.words);
        setSayPart(starter.data.proposed.part);
      }
    });
  }, [query.fix, fixTried]);

  function endReveal() {
    setFresh(false);
    route("/compass", true);
  }

  async function remove(id: string) {
    const res = await api<{ compass: Line[] }>("DELETE", `/api/me/compass/${id}`);
    if (res.status !== 200) return setNote("That didn't work. Try again?");
    setLines(res.data.compass);
    setProposal(null);
    refreshChanges();
    setNote("Removed. Changed your mind?");
  }

  async function undo() {
    const res = await api<{ compass: Line[]; restored?: { words: string } }>("POST", "/api/me/compass/undo");
    if (res.status !== 200) {
      refreshChanges();
      return setNote("Nothing left to undo.");
    }
    setLines(res.data.compass);
    refreshChanges();
    setNote(res.data.restored ? `Back: ${res.data.restored.words}` : "Undone.");
  }

  async function look() {
    if (!sayLine) return setNote("Pick a compass line first.");
    if (sayWords.trim().length < 2) return setNote("Say it in your own words first.");
    setBusy(true);
    setProposal(null);
    const res = await api<{ proposed: { part: string; words: string; change: { before: string | null; after: string } }; saw: { part: string; words: string }[]; why?: string }>(
      "POST",
      "/api/me/compass/propose",
      {
        lineId: sayLine,
        part: sayPart,
        words: sayWords,
        ...(review && !fixTry ? { reviewed: (lines ?? []).map((l) => l.id), source: review } : {}),
      },
    );
    setBusy(false);
    if (res.status !== 200) return setNote(typeof res.data.why === "string" ? res.data.why : "That didn't work. Try again?");
    setProposal({ ...res.data.proposed, saw: res.data.saw });
    setNote("");
  }

  async function confirmLine() {
    if (!proposal || !sayLine) return;
    setBusy(true);
    const res = await api<{ compass: Line[]; why?: string }>("POST", "/api/me/compass/confirm_line", {
      lineId: sayLine,
      part: proposal.part,
      words: proposal.words,
      ...(fixTry ? { source: "feedback", tryId: fixTry.id } : review ? { source: review } : {}),
    });
    setBusy(false);
    if (res.status !== 200) return setNote(typeof res.data.why === "string" ? res.data.why : "That didn't save. Try again?");
    setLines(res.data.compass);
    setProposal(null);
    setSayWords("");
    refreshChanges();
    setNote("Saved, in your words. Changed your mind?");
  }

  async function removePerson(role: string) {
    const res = await api<{ people: { role: string }[] }>("DELETE", `/api/me/compass/people/${encodeURIComponent(role)}`);
    if (res.status !== 200) return setNote("That didn't work. Try again?");
    setPeople(res.data.people);
    setNote("Removed. Tries will say someone instead.");
  }

  async function removeAll() {
    if (!window.confirm("Delete your whole compass?")) return;
    await api("DELETE", "/api/me/compass");
    setLines([]);
    setProposal(null);
    setChanges([]);
    setNote("Deleted.");
  }

  const sources = (lines ?? []).map((l) => l.source).filter((s, i, all) => all.indexOf(s) === i);

  return (
    <Screen title="My compass">
      <h1 class="screen-title">My compass</h1>
      {lines === null && <p class="lcd-kicker" role="status">Loading...</p>}
      {lines?.length === 0 && (
        <>
          <p class="lcd-block">No compass yet. It helps with topic ideas and puts signals that fit you first, just for you.</p>
          <ul class="key-list"><li><a class="lcd-key lcd-key--primary" href="/surprise">Get a head start</a></li></ul>
        </>
      )}
      {fresh && lines && lines.length > 0 && (
        <div onClick={endReveal} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && endReveal()} aria-label="Show my full compass">
          <div class={`compass-needle${settle ? " is-settled" : ""}`} aria-hidden="true">▲</div>
          <Typewriter lead="" title="Your world, according to you." />
          <p class="lcd-kicker" role="status">{settle ? "Your compass" : "Settling..."}</p>
          <ul class="lcd-menu">
            {lines.map((l, i) => (
              <li class={`lcd-block${i < shown ? " keys-rise" : " is-masked"}`} key={l.id}>
                {i < shown ? <p>{l.text}</p> : <p aria-hidden="true">···</p>}
              </li>
            ))}
          </ul>
          {shown >= lines.length && (
            <p class="lcd-small keys-rise">Sources: {sources.join(" · ")}. Tap anywhere for the full compass.</p>
          )}
        </div>
      )}
      {!fresh && lines && lines.length > 0 && (
        <>
          {fixTry && (
            <p class="lcd-block keys-rise">
              The try: {fixTry.title}. How should your compass change after that one?
            </p>
          )}
          <div class="compass-needle compass-needle--swing" style={activeDir ? `transform: rotate(${DIRS.find((d) => d.label === activeDir)?.point ?? 0}deg)` : undefined} aria-hidden="true">▲</div>
          {DIRS.map((d) => {
            const mine = lines.filter((l) => d.parts.includes(l.part));
            if (!mine.length) return null;
            const open = activeDir === d.label;
            return (
              <div key={d.label}>
                <button type="button" class="dir-head" onClick={() => setActiveDir(open ? null : d.label)} aria-expanded={open}>
                  <span class="lcd-kicker">{d.label}</span>
                  <span class="dir-count">{mine.length}</span>
                </button>
                {open && <Typewriter key={d.label} lead="" title={d.does} />}
                <ul class="lcd-menu">
                  {mine.map((l) => (
                    <li class={`lcd-block idea${open ? " keys-rise" : ""}`} key={l.id}>
                      <p>{l.text}</p>
                      <div class="tiny-actions">
                        <span class="lcd-small">{l.sourceUrl ? <a href={l.sourceUrl} target="_blank" rel="noopener noreferrer">from: {l.source}</a> : sourceLabel(l)}</span>
                        <button type="button" onClick={() => remove(l.id)}>Remove</button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
          <h2 class="lcd-kicker">People in your days</h2>
          {people.length > 0 ? (
            <ul class="lcd-menu">
              {people.map((p) => (
                <li class="lcd-block idea" key={p.role}>
                  <p>{p.role[0].toUpperCase()}{p.role.slice(1)}</p>
                  <div class="tiny-actions">
                    <span class="lcd-small">Roles only, never names</span>
                    <button type="button" onClick={() => removePerson(p.role)}>Remove</button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p class="lcd-small">Nobody named yet. Tries will say someone.</p>
          )}
          <h2 class="lcd-kicker">Say it your way</h2>
          <p class="lcd-small">Pick a line, say it in your own words, look, then confirm. Nothing changes until you confirm.</p>
          {review && !fixTry && <p class="lcd-small">Came from {review === "delivery" ? "Around" : "a suggestion"}: looking marks these lines reviewed.</p>}
          <label class="lcd-small" for="say-line">Compass line</label>
          <select class="lcd-field" id="say-line" value={sayLine} onChange={(e) => {
            const id = e.currentTarget.value;
            setSayLine(id);
            const found = lines.find((l) => l.id === id);
            if (found) {
              setSayPart(found.part);
              setSayWords(found.text);
            }
            setProposal(null);
          }}>
            <option value="">Pick one...</option>
            {lines.map((l) => (
              <option value={l.id} key={l.id}>{l.text}</option>
            ))}
          </select>
          <label class="lcd-small" for="say-part">Line</label>
          <select class="lcd-field" id="say-part" value={sayPart} onChange={(e) => { setSayPart(e.currentTarget.value); setProposal(null); }}>
            {LINE_PICK.map((p) => (
              <option value={p.part} key={p.part}>{p.label}</option>
            ))}
          </select>
          <label class="lcd-small" for="say-words">Your words</label>
          <textarea class="lcd-field" id="say-words" rows={2} maxLength={60} value={sayWords} onInput={(e) => { setSayWords(e.currentTarget.value); setProposal(null); }} placeholder="quiet mornings, small groups" />
          <ul class="key-list">
            <li><button class="lcd-key" type="button" onClick={look} disabled={busy}>{busy ? "Looking..." : "Look"}</button></li>
          </ul>
          {proposal && (
            <div class="lcd-block keys-rise">
              <p class="lcd-kicker">Your words, on {LINE_PICK.find((p) => p.part === proposal.part)?.label ?? proposal.part}</p>
              <p>{proposal.words}</p>
              {proposal.change.before && <p class="lcd-small">Was: {proposal.change.before}</p>}
              {proposal.saw.length > 0 && <p class="lcd-small">Checked against: {proposal.saw.map((s) => s.words).join(" · ")}</p>}
              <ul class="key-list">
                <li><button class="lcd-key lcd-key--primary" type="button" onClick={confirmLine} disabled={busy}>Confirm</button></li>
              </ul>
            </div>
          )}
          {changes.length > 0 && (
            <>
              <h2 class="lcd-kicker">Changes</h2>
              <ul class="lcd-menu">
                {changes.map((c) => (
                  <li class="lcd-block" key={c.id}>
                    <p class="lcd-small">
                      {c.kind === "remove" ? `Removed ${c.before}` : `${c.before} → ${c.after}`}
                      {c.undone ? " (undone)" : ""}
                    </p>
                  </li>
                ))}
              </ul>
            </>
          )}
          {undoable && (
            <ul class="key-list">
              <li><button class="lcd-key" type="button" onClick={undo}>Undo</button></li>
            </ul>
          )}
          <h2 class="lcd-kicker">Where it's used</h2>
          {DIRS.map((d) => <p class="lcd-small" key={d.label}>{d.used}</p>)}
          <p class="lcd-small">Never shown to anyone. Never used to match or rank people.</p>
          <ul class="key-list">
            <li><a class="lcd-key" href="/surprise">Redo it</a></li>
            <li><button class="lcd-key" type="button" onClick={removeAll}>Delete my compass</button></li>
          </ul>
        </>
      )}
      <p class="lcd-small">Only you see this.</p>
      <p class="lcd-small" role="status" aria-live="polite">{note}</p>
    </Screen>
  );
}
