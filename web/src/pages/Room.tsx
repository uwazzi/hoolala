// v6.4 room view (WP-A3): the starter's room or a member's, with first names,
// statuses, quick replies, remove and take down. Refreshes every few seconds.
import { useEffect, useState } from "preact/hooks";
import { useLocation } from "preact-iso";
import { api } from "../api";
import { hhmm, locate } from "../around";
import { Screen } from "../components/Screen";

interface Member {
  name: string;
  you: boolean;
  starter: boolean;
  status: string;
  line: string | null;
  removeToken: string | null;
}

interface RoomDetail {
  id: string;
  topic: string;
  placeText: string;
  endsAt: string;
  status: string;
  size: string;
  count?: number;
  mine?: boolean;
  member?: boolean;
  members?: Member[];
  translation: string | null;
  lang: string | null;
  closed?: boolean;
  closedForYou?: boolean;
  note?: string;
}

type Phase = "loading" | "signed-out" | "missing" | "down" | "closedForYou" | "room" | "card";

const QUICK: { code: string; label: string }[] = [
  { code: "AT_THE_SPOT", label: "AT THE SPOT" },
  { code: "FIVE_LATE", label: "5 MIN LATE" },
  { code: "CALL_IT_OFF", label: "CALL IT OFF" },
];

export function Room() {
  const { query, route } = useLocation();
  const id = typeof query.id === "string" ? query.id : "";
  const [phase, setPhase] = useState<Phase>("loading");
  const [detail, setDetail] = useState<RoomDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  async function load() {
    if (!id) return setPhase("missing");
    let res;
    try {
      res = await api<RoomDetail>("GET", `/api/rooms/${id}`);
    } catch {
      return setNote("No connection. Try again when you're back online.");
    }
    if (res.status === 401) return setPhase("signed-out");
    if (res.status === 404) return setPhase("missing");
    const body = res.data;
    setDetail(body);
    if (body.closedForYou) return setPhase("closedForYou");
    if (body.closed) return setPhase("down");
    setPhase(body.member ? "room" : "card");
  }

  useEffect(() => {
    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function reply(code: string) {
    if (busy) return;
    setBusy(true);
    try {
      await api("POST", `/api/rooms/${id}/reply`, { code });
    } catch {
      setNote("No connection. Try again when you're back online.");
    }
    setBusy(false);
    load();
  }

  async function leave() {
    if (busy) return;
    setBusy(true);
    try {
      await api("POST", `/api/rooms/${id}/leave`);
    } catch {
      // Leaving always works; a dropped connection still leaves locally.
    }
    route("/around");
  }

  async function takeDown() {
    if (busy) return;
    setBusy(true);
    try {
      await api("POST", `/api/rooms/${id}/takedown`);
    } catch {
      setBusy(false);
      return setNote("No connection. Try again when you're back online.");
    }
    setBusy(false);
    setPhase("down");
  }

  async function join() {
    if (busy) return;
    setBusy(true);
    setNote("");
    let spot;
    try {
      spot = await locate();
    } catch {
      setBusy(false);
      return setNote("Joining needs one look at where you are. Try again?");
    }
    let res;
    try {
      res = await api("POST", `/api/rooms/${id}/join`, spot);
    } catch {
      setBusy(false);
      return setNote("No connection. Try again when you're back online.");
    }
    setBusy(false);
    if (res.status === 409) return setNote("That room just filled up. Try another, or post your own.");
    if (res.status !== 200) return setNote("That room just closed. Look again?");
    load();
  }

  const statusNote = note ? <p class="lcd-small" role="status">{note}</p> : null;

  return (
    <Screen title="Room">
      {phase === "loading" && (
        <div class="around-body">
          <p class="around-status">OPENING THE ROOM...</p>
        </div>
      )}

      {phase === "signed-out" && (
        <div class="around-body">
          <p class="lcd-block">Sign in first, then open the room.</p>
          <ul class="key-list"><li><a class="lcd-key lcd-key--primary" href="/signin">Sign in</a></li></ul>
        </div>
      )}

      {phase === "missing" && (
        <div class="around-body">
          <h1 class="around-head">NOTHING HERE.</h1>
          <p class="around-promise">That room ended or never existed.</p>
          <ul class="key-list"><li><a class="lcd-key lcd-key--primary" href="/around">Back to around</a></li></ul>
        </div>
      )}

      {phase === "closedForYou" && (
        <div class="around-body">
          <p class="closed-note">{detail?.note ?? "That room is closed for you now."}</p>
          <ul class="key-list"><li><a class="lcd-key lcd-key--primary" href="/around">Back to around</a></li></ul>
        </div>
      )}

      {phase === "down" && (
        <>
          <div class="around-body">
            <h1 class="around-head">TAKEN DOWN.</h1>
            <p class="around-promise">Gone for everyone. Nobody ever saw who posted it.</p>
          </div>
          <div class="thumb-zone">
            <a class="thumb-key thumb-key--ghost" href="/around"><span>BACK TO AROUND</span><span aria-hidden="true">&gt;</span></a>
          </div>
        </>
      )}

      {phase === "card" && detail && (
        <>
          <div class="around-body">
            <div class="room-card">
              <span class="room-meta">{detail.size}</span>
              <p class="room-topic">{detail.topic}</p>
              <span class="room-sub">{detail.placeText} · until {hhmm(detail.endsAt)}</span>
              <button type="button" class="room-join" disabled={busy} onClick={join}>
                <span>JOIN · {detail.size}</span><span aria-hidden="true">&gt;</span>
              </button>
              <span class="room-join-note">Joining shows your first name to the room, and theirs to you.</span>
            </div>
            {statusNote}
          </div>
          <div class="thumb-zone">
            <a class="thumb-link" href="/around">BACK TO AROUND</a>
          </div>
        </>
      )}

      {phase === "room" && detail && (
        <>
          <div class="around-body">
            <h1 class="around-head">{detail.mine ? "ICEBREAKER UP." : "YOU'RE IN."}</h1>
            <div class="room-card">
              <span class="room-meta">{detail.mine ? `YOURS · 500 M AROUND YOU · UNTIL ${hhmm(detail.endsAt)}` : `${detail.size}`}</span>
              <p class="room-topic">{detail.topic}</p>
              <span class="room-sub">{detail.placeText}</span>
            </div>
            {detail.mine ? (
              <p class="around-privacy">Anyone within 500 m can join your room until {hhmm(detail.endsAt)}, up to 6 people. Before joining they see the topic only. Inside, everyone sees first names only.</p>
            ) : (
              <p class="around-privacy">{detail.placeText}. Look for a phone lying on a table, showing this room and a code.</p>
            )}

            {(detail.count ?? 0) <= 1 && detail.mine ? (
              <div class="waiting-box">
                <span class="waiting-head">NOBODY IN YET...</span>
                <span class="around-privacy">Stay where you said. People who join walk over to you.</span>
              </div>
            ) : (
              <div class="members-box">
                <div class="members-head-row">
                  <span class="members-head">{detail.mine ? "YOUR ROOM" : "IN THE ROOM"}</span>
                  <span class="room-meta">{detail.size}</span>
                </div>
                {(detail.members ?? []).map((m, i) => (
                  <div key={m.removeToken ?? `${m.name}-${i}`} class="member-row">
                    <span class="member-names">
                      <span class="member-name">{m.name}{m.you ? (m.starter ? " (you, started it)" : " (you)") : m.starter ? " (started it)" : ""}</span>
                      <span class="member-status">{m.status}{m.line ? ` · "${m.line}"` : ""}</span>
                    </span>
                    {detail.mine && !m.you && m.removeToken && (
                      <RemoveMember roomId={detail.id} token={m.removeToken} onDone={load} />
                    )}
                  </div>
                ))}
                <div class="quick-row">
                  {QUICK.map((q) => (
                    <button key={q.code} type="button" class="quick-key" disabled={busy} onClick={() => reply(q.code)}>
                      {q.label}
                    </button>
                  ))}
                </div>
                <span class="around-privacy">Quick replies only, seen by the room. Everyone meets you at {detail.placeText}. At the table, put your phone down with the room's QR up; people scan it to join you.</span>
                {!detail.mine && (
                  <a
                    class="lcd-key"
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(detail.placeText)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Take me there
                  </a>
                )}
              </div>
            )}
            {statusNote}
          </div>
          <div class="thumb-zone">
            {detail.mine ? (
              <button class="thumb-link" type="button" disabled={busy} onClick={takeDown}>TAKE IT DOWN</button>
            ) : (
              <button class="thumb-link" type="button" disabled={busy} onClick={leave}>LEAVE ROOM</button>
            )}
          </div>
        </>
      )}
    </Screen>
  );
}

function RemoveMember({ roomId, token, onDone }: { roomId: string; token: string; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      class="member-remove"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await api("POST", `/api/rooms/${roomId}/remove`, { token });
        } finally {
          setBusy(false);
        }
        onDone();
      }}
    >
      REMOVE
    </button>
  );
}
