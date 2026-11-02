// v6.4 Around: one 500 m sweep for icebreaker rooms, never people. The start
// page stays; results are open rooms to join, or an invitation to start one.
// The borrowed point lives in memory only and is dropped after the scan.
import { useEffect, useState } from "preact/hooks";
import { useLocation } from "preact-iso";
import { api } from "../api";
import { hhmm, locate, type Point } from "../around";
import { Radar } from "../components/Radar";
import { Screen } from "../components/Screen";

interface Room {
  id: string;
  topic: string;
  placeText: string;
  endsAt: string;
  distance: string;
  size: string;
  fitsYou: boolean;
  translation: string | null;
  lang: string | null;
  member: boolean;
  names: string[] | null;
}

interface CompassLine {
  id: string;
  text: string;
}

type Phase = "ask" | "signed-out" | "refused" | "scanning" | "found" | "none" | "partner";

const PARTNER_MAIL = "mailto:info@hg-labs.io?subject=Hoolala!%20I%20have%20something%20for%20you%20to%20share";

export function Around() {
  const { route } = useLocation();
  const [phase, setPhase] = useState<Phase>("ask");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [spot, setSpot] = useState<Point | null>(null);
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [compass, setCompass] = useState<CompassLine[] | null>(null);
  const [note, setNote] = useState("");
  const [pendingDebrief, setPendingDebrief] = useState<{ id: string; topic: string } | null>(null);

  useEffect(() => {
    api<{ compass: CompassLine[] }>("GET", "/api/me/compass")
      .then((res) => {
        if (res.status === 401) return setPhase("signed-out");
        if (res.status === 200) setCompass(res.data.compass);
      })
      .catch(() => {
        // Offline: the compass box stays hidden, the scan still works.
      });
    api<{ room: { id: string; topic: string } | null }>("GET", "/api/rooms/debrief-pending")
      .then((res) => {
        if (res.status === 200 && res.data.room) setPendingDebrief(res.data.room);
      })
      .catch(() => {
        // Offline: the debrief waits for next time.
      });
  }, []);

  async function scan() {
    setPhase("scanning");
    setNote("");
    let p: Point;
    try {
      p = await locate();
    } catch {
      return setPhase("refused");
    }
    setSpot(p);
    let res;
    try {
      res = await api<{ rooms: Room[] }>("POST", "/api/rooms/scan", p);
    } catch {
      setPhase("ask");
      return setNote("No connection. Try again when you're back online.");
    }
    if (res.status === 401) return setPhase("signed-out");
    if (res.status !== 200) {
      setPhase("ask");
      setSpot(null);
      return setNote(res.data.error === "rate_limited" ? "That's enough looking for one hour. Try again later." : "Something went wrong. Try again.");
    }
    setRooms(res.data.rooms);
    setPhase(res.data.rooms.length ? "found" : "none");
  }

  async function join(room: Room) {
    if (!spot || busy) return;
    setBusy(room.id);
    setNote("");
    let res;
    try {
      res = await api("POST", `/api/rooms/${room.id}/join`, spot);
    } catch {
      setBusy(null);
      return setNote("No connection. Try again when you're back online.");
    }
    setBusy(null);
    if (res.status === 401) return setPhase("signed-out");
    if (res.status === 409) return setNote("That room just filled up. Try another, or post your own.");
    if (res.status === 429) return setNote("That's enough joining for now. Leave a room, or try again later.");
    if (res.status !== 200) return setNote("That room just closed. Look again?");
    route(`/room?id=${room.id}`);
  }

  async function leave(room: Room) {
    if (busy) return;
    setBusy(room.id);
    try {
      await api("POST", `/api/rooms/${room.id}/leave`);
    } catch {
      // Leaving always works; a dropped connection still leaves locally.
    }
    setBusy(null);
    setRooms(rooms.map((r) => (r.id === room.id ? { ...r, member: false } : r)));
  }

  const compassTop = (compass ?? []).slice(0, 4).map((l) => l.text).join(" · ");
  const showRadar = phase === "ask" || phase === "scanning" || phase === "found" || phase === "none";
  const statusNote = note ? <p class="lcd-small" role="status">{note}</p> : null;
  const foundTitle = `${rooms.length} ICEBREAKER${rooms.length === 1 ? "" : "S"} WITHIN 500 M.`;

  return (
    <Screen title="Around">
      <div class="around">
        {showRadar && <Radar scanning={phase === "scanning"} compact={phase === "found"} note={phase === "found" ? "ICEBREAKERS ONLY" : ""} />}

        {phase === "signed-out" && (
          <div class="around-body">
            <p class="lcd-block">Sign in first, then take a look around.</p>
            <ul class="key-list"><li><a class="lcd-key lcd-key--primary" href="/signin">Sign in</a></li></ul>
          </div>
        )}

        {phase === "ask" && (
          <>
            <div class="around-body">
              {pendingDebrief && (
                <button type="button" class="debrief-nudge" onClick={() => route(`/debrief?room=${pendingDebrief.id}`)}>
                  <span class="debrief-nudge-head">HOW DID IT GO?</span>
                  <span class="debrief-nudge-topic">{pendingDebrief.topic}</span>
                </button>
              )}
              <h1 class="around-head">AROUND YOU</h1>
              <p class="around-promise">Who's up for a chat within a short walk. Nobody yet? Then you go first.</p>
              {compass !== null &&
                (compass.length === 0 ? (
                  <a class="compass-box" href="/surprise">
                    <span class="compass-box-text"><span class="compass-box-label">YOUR COMPASS IS EMPTY</span><span>Results are general for now. Set it up in a minute.</span></span>
                    <span class="compass-box-go">SET IT UP</span>
                  </a>
                ) : (
                  <a class="compass-box" href="/compass?review=delivery">
                    <span class="compass-box-text"><span class="compass-box-label">MATCHED TO YOUR COMPASS</span><span>{compassTop}</span></span>
                    <span class="compass-box-go">EDIT</span>
                  </a>
                ))}
              <p class="around-privacy">Borrow your location for one look around. Used once, never stored, never on any map.</p>
              {statusNote}
            </div>
            <div class="thumb-zone">
              <button class="thumb-key" type="button" onClick={scan}><span>ONE LOOK AROUND</span><span aria-hidden="true">&gt;</span></button>
              <button class="thumb-link" type="button" onClick={() => setPhase("partner")}>OWN A CAFÉ, BAR OR SPACE? BECOME A PARTNER</button>
            </div>
          </>
        )}

        {phase === "partner" && (
          <>
            <div class="around-body">
              <h1 class="around-head">ARE YOU THE PLACE'S OWNER?</h1>
              <p class="around-promise">Your regulars have sat at the same tables for months. Never spoken. Let's change that, together.</p>
              <ul class="partner-list">
                <li>Your place on Hoolala!, named right, at the right spot.</li>
                <li>A poster with a QR at the door: icebreakers from people in the room.</li>
                <li>A table or a corner that says: talking welcome here.</li>
                <li>Collective numbers only. Never data about your guests.</li>
              </ul>
              <p class="around-privacy">Bring human connection to your place. Write to Huguinho at HG-Labs, a real person answers.</p>
            </div>
            <div class="thumb-zone">
              <a class="thumb-key" href={PARTNER_MAIL}><span>CONTACT ME</span><span aria-hidden="true">&gt;</span></a>
              <button class="thumb-link" type="button" onClick={() => setPhase(rooms.length ? "found" : "ask")}>BACK</button>
            </div>
          </>
        )}

        {phase === "refused" && (
          <>
            <div class="around-body">
              <h1 class="around-head">NO LOCATION, NO PROBLEM.</h1>
              <p class="around-promise">Around only works with one look at where you are: that's how people within 500 m find each other. Used once, never stored as your spot. Tapped no by accident? Try again.</p>
              {statusNote}
            </div>
            <div class="thumb-zone">
              <button class="thumb-key" type="button" onClick={scan}><span>TRY AGAIN</span><span aria-hidden="true">&gt;</span></button>
              <a class="thumb-link" href="/">NOT NOW, BACK TO TODAY'S TRY</a>
            </div>
          </>
        )}

        {phase === "scanning" && (
          <div class="around-body">
            <p class="around-status">LOOKING NEARBY...</p>
            <p class="around-privacy">Within 500 m. Icebreakers only, never people.</p>
          </div>
        )}

        {phase === "found" && (
          <>
            <div class="around-body">
              <h1 class="around-head around-head--small">{foundTitle}</h1>
              <p class="around-privacy">Topics only. Each one is an open room: join and you'll see first names, theirs and yours.</p>
              <div class="room-cards">
                {rooms.map((r) => {
                  const isIn = r.member;
                  const showTranslation = flipped[r.id] && r.translation;
                  return (
                    <article key={r.id} class="room-card">
                      <div class="room-meta-row">
                        <span class="room-meta">{r.distance}</span>
                        {r.fitsYou && <span class="room-fits">FITS YOU</span>}
                      </div>
                      <p class="room-topic">{showTranslation ? r.translation : r.topic}</p>
                      <div class="room-sub-row">
                        <span class="room-sub">{r.placeText} · until {hhmm(r.endsAt)}</span>
                        {r.translation && (
                          <button
                            type="button"
                            class="room-flip"
                            onClick={() => setFlipped({ ...flipped, [r.id]: !flipped[r.id] })}
                          >
                            {showTranslation ? `ORIGINAL (${(r.lang ?? "en").toUpperCase()})` : "TRANSLATION"}
                          </button>
                        )}
                      </div>
                      {!isIn ? (
                        <button type="button" class="room-join" disabled={busy !== null} onClick={() => join(r)}>
                          <span>JOIN · {r.size}</span><span aria-hidden="true">&gt;</span>
                        </button>
                      ) : (
                        <div class="room-in" aria-live="polite">
                          <span class="room-in-head">YOU'RE IN.</span>
                          <span class="room-in-line">Head to {r.placeText}.</span>
                          <a class="room-open" href={`/room?id=${r.id}`}>OPEN ROOM ›</a>
                          <button type="button" class="room-leave" onClick={() => leave(r)}>LEAVE ROOM</button>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
              <p class="around-closing">THAT'S EVERYTHING WITHIN 500 M RIGHT NOW.</p>
              {statusNote}
            </div>
            <div class="thumb-zone">
              <button class="thumb-key thumb-key--ghost" type="button" onClick={() => route("/around/new")}><span>POST YOUR OWN</span><span aria-hidden="true">&gt;</span></button>
              <button class="thumb-link" type="button" onClick={scan}>LOOK AGAIN</button>
            </div>
          </>
        )}

        {phase === "none" && (
          <>
            <div class="around-body">
              <h1 class="around-head">QUIET WITHIN 500 M.</h1>
              <p class="around-promise">No icebreakers round here yet. Somebody has to go first. Why not you?</p>
              <ol class="quiet-list">
                <li>Write one line, or ask for ideas.</li>
                <li>Say where you are: a café, a library, a park.</li>
                <li>It opens a room anyone within 500 m can join, up to 6. First names only, once they're in.</li>
              </ol>
              <button class="thumb-link" type="button" onClick={() => setPhase("partner")}>OWN A PLACE ROUND HERE? BECOME A PARTNER</button>
            </div>
            <div class="thumb-zone">
              <button class="thumb-key" type="button" onClick={() => route("/around/new")}><span>POST AN ICEBREAKER</span><span aria-hidden="true">&gt;</span></button>
              <a class="thumb-link" href="/">NOT NOW, BACK TO TODAY'S TRY</a>
            </div>
          </>
        )}
      </div>
    </Screen>
  );
}
