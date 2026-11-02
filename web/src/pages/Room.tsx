// v6.4 room view (WP-A3/A4): the starter's room or a member's, with first
// names, statuses, quick replies, remove and take down, then phones on the
// table: the starter's phone becomes the room's sign, arrivals scan it, and
// their phones become signs too. Refreshes every few seconds.
import { useEffect, useRef, useState } from "preact/hooks";
import { useLocation } from "preact-iso";
import { api } from "../api";
import { hhmm, locate } from "../around";
import { Qr } from "../components/Qr";
import { Screen } from "../components/Screen";
import { detectTableQr, parseTableTokenText } from "../scan";

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
  tableOpen?: boolean;
  youAtTable?: boolean;
  atTable?: string[];
  recorded?: number;
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
  const wantTable = query.table === "1";
  const [phase, setPhase] = useState<Phase>("loading");
  const [detail, setDetail] = useState<RoomDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [scanning, setScanning] = useState(false);
  const [tableUrl, setTableUrl] = useState<string | null>(null);
  const [scanned, setScanned] = useState<string[] | null>(null);

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

  const atTable = phase === "room" && detail?.youAtTable === true;

  // The phone on the table shows a new code every 30 seconds.
  useEffect(() => {
    if (!atTable || !id) return;
    let stop = false;
    async function fetchToken() {
      try {
        const res = await api<{ url: string }>("GET", `/api/rooms/${id}/table`);
        if (!stop && res.status === 200) setTableUrl(res.data.url);
      } catch {
        // The old code stays until the next refresh.
      }
    }
    fetchToken();
    const timer = setInterval(fetchToken, 30_000);
    return () => {
      stop = true;
      clearInterval(timer);
    };
  }, [atTable, id]);

  // The screen stays on while the phone lies on the table. Silent when unavailable.
  useEffect(() => {
    if (!atTable) return;
    let lock: { release(): void } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request(kind: string): Promise<{ release(): void }> } };
    nav.wakeLock?.request("screen").then(
      (l) => {
        lock = l;
      },
      () => {},
    );
    return () => lock?.release();
  }, [atTable]);

  // Newcomers from the table QR land straight in table mode.
  useEffect(() => {
    if (wantTable && phase === "room" && detail && !detail.youAtTable && !busy) {
      phoneDown();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantTable, phase]);

  async function phoneDown() {
    if (busy || !id) return;
    setBusy(true);
    setNote("");
    try {
      const res = await api<{ url: string }>("GET", `/api/rooms/${id}/table`);
      if (res.status === 200) {
        setTableUrl(res.data.url);
        setDetail((d) => (d ? { ...d, youAtTable: true, tableOpen: true } : d));
      } else {
        setNote("Couldn't put the phone down. Try again?");
      }
    } catch {
      setNote("No connection. Try again when you're back online.");
    } finally {
      setBusy(false);
    }
    load();
  }

  async function tableLeave() {
    if (busy) return;
    setBusy(true);
    let debriefRoom: string | null = null;
    try {
      const res = await api<{ debrief: string | null }>("POST", `/api/rooms/${id}/table/leave`);
      if (res.status === 200) debriefRoom = res.data.debrief;
    } finally {
      setBusy(false);
    }
    setTableUrl(null);
    route(debriefRoom ? `/debrief?room=${debriefRoom}` : "/around");
  }

  async function onScannedText(text: string) {
    const token = parseTableTokenText(text);
    if (!token) return;
    setScanning(false);
    setBusy(true);
    let res;
    try {
      res = await api<{ atTable: string[]; recorded: number }>("POST", "/api/rooms/scan-table", { token });
    } catch {
      setBusy(false);
      return setNote("No connection. Try again when you're back online.");
    }
    setBusy(false);
    if (res.status !== 200) return setNote("That code didn't work. New codes every 30 seconds: try again?");
    const others = res.data.atTable.filter((n) => n !== myName);
    setScanned(others);
    setDetail((d) => (d ? { ...d, youAtTable: true, tableOpen: true, atTable: res.data.atTable } : d));
    load();
  }

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
  const myName = detail?.members?.find((m) => m.you)?.name ?? null;
  const starterName = detail?.members?.find((m) => m.starter)?.name ?? "They";

  if (scanning) {
    return (
      <Screen title="Scan the table">
        <ScanView onText={onScannedText} onBack={() => setScanning(false)} />
      </Screen>
    );
  }

  if (atTable && detail) {
    const names = detail.atTable ?? [];
    const recorded = detail.recorded ?? 0;
    const recordedLine =
      recorded === 0 ? "Nobody has scanned yet." : recorded === 1 ? "Meetings recorded by user ID only: 1 so far." : `Meetings recorded by user ID only: ${recorded} between the ${names.length} of you.`;
    return (
      <Screen title="Room" bare>
        <div class="table-screen">
          {scanned && (
            <p class="table-scanned">
              Scanned. Meeting{scanned.length === 1 ? "" : "s"} with {scanned.join(", ") || "the table"} recorded, by user ID only. Now put yours down too: your phone joins the table as another sign.
            </p>
          )}
          <span class="table-brand">HOOLALA! ROOM</span>
          <span class="table-topic">{detail.topic}</span>
          {tableUrl ? (
            <div class="table-qr">
              <Qr text={tableUrl} label="Room code for people at the table to scan" />
            </div>
          ) : (
            <p class="table-note">GETTING THE CODE...</p>
          )}
          <span class="table-scan-line">SCAN TO JOIN THE TABLE</span>
          <span class="table-note">{scanned ? "Phones down. Faces up." : "New code every 30 seconds · screen stays on"}</span>
          <div class="table-list">
            <span class="table-list-head">AT THE TABLE</span>
            <span class="table-names">{names.join(", ")}</span>
            <span class="table-note">{recordedLine}</span>
          </div>
          <div class="table-spacer" />
          <button class="table-done" type="button" disabled={busy} onClick={tableLeave}>
            {detail.mine ? "WE'RE DONE. CLOSE THE TABLE" : "I'M LEAVING"}
          </button>
        </div>
      </Screen>
    );
  }

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
                {detail.mine ? (
                  <button type="button" class="room-join" disabled={busy} onClick={phoneDown}>
                    <span>I'M AT THE TABLE. PHONE DOWN, QR UP</span><span aria-hidden="true">&gt;</span>
                  </button>
                ) : (
                  <>
                    <button type="button" class="room-join" disabled={busy || !detail.tableOpen} onClick={() => setScanning(true)}>
                      <span>I SEE IT. SCAN THE TABLE</span><span aria-hidden="true">&gt;</span>
                    </button>
                    {!detail.tableOpen && <span class="around-privacy">{starterName} hasn't put their phone down yet...</span>}
                  </>
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

function ScanView({ onText, onBack }: { onText: (text: string) => void; onBack: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [note, setNote] = useState("");
  const doneRef = useRef(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    let stop = false;
    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      } catch {
        if (!stop) setNote("No camera. Check the permission and try again?");
        return;
      }
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      try {
        await video.play();
      } catch {
        if (!stop) setNote("The camera didn't start. Try again?");
        return;
      }
      const canvas = canvasRef.current;
      if (!canvas) return;
      timer = setInterval(async () => {
        if (stop || doneRef.current || document.hidden) return;
        const text = await detectTableQr(video, canvas);
        if (text && !stop && !doneRef.current) {
          doneRef.current = true;
          onText(text);
        }
      }, 300);
    }
    start();
    return () => {
      stop = true;
      if (timer) clearInterval(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div class="around-body">
      <div class="scan-box">
        <span class="scan-head">SCAN THE TABLE'S CODE</span>
        <video ref={videoRef} class="scan-video" playsInline muted aria-label="Camera view of the table code" />
        <canvas ref={canvasRef} hidden aria-hidden="true" />
        {note ? <span class="scan-note">{note}</span> : <span class="scan-note">Point at the phone lying on the table.</span>}
        <button type="button" class="scan-back" onClick={onBack}>BACK</button>
      </div>
    </div>
  );
}
