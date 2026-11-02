// v6.4 compose (WP-A3): one line, or ask for ideas; say where you are; pick
// how long. Everything typed or suggested is checked before anyone sees it.
import { useEffect, useRef, useState } from "preact/hooks";
import { useLocation } from "preact-iso";
import { api } from "../api";
import { locate } from "../around";
import { Screen } from "../components/Screen";
import { Typed } from "../components/Typed";

interface CompassLine {
  id: string;
  text: string;
}

interface Ideas {
  ideas: { text: string }[];
  label: string;
}

type Phase = "compose" | "checking" | "signed-out";

const DURS = [
  { min: 30, label: "30 MIN" },
  { min: 60, label: "1 HOUR" },
  { min: 120, label: "2 HOURS" },
];

const Q1 = "WHAT'S THE TOPIC?";
const Q2 = "WHERE ARE YOU?";
const Q3 = "FOR HOW LONG?";

function IdeasBlock({
  ideas,
  label,
  suggesting,
  onPick,
  onMore,
}: {
  ideas: { text: string }[];
  label: string;
  suggesting: boolean;
  onPick: (text: string) => void;
  onMore: () => void;
}) {
  const [turn, setTurn] = useState(0);
  return (
    <div class="ideas">
      <span class="ideas-label">{label}</span>
      {ideas.map((idea, i) => (
        <button key={idea.text} class="idea" type="button" onClick={() => onPick(idea.text)}>
          {turn > i ? idea.text : turn === i ? <Typed text={idea.text} msPerChar={30} onDone={() => setTurn(i + 1)} /> : ""}
        </button>
      ))}
      <button class="need-one" type="button" disabled={suggesting} onClick={onMore}>
        <span>{suggesting ? "GETTING NEW IDEAS..." : "NONE FIT? GET 3 NEW ONES"}</span><span aria-hidden="true">&gt;</span>
      </button>
    </div>
  );
}

export function Compose() {
  const { query, route } = useLocation();
  const [phase, setPhase] = useState<Phase>("compose");
  const [topic, setTopic] = useState("");
  const [place, setPlace] = useState(() => (typeof query.place === "string" ? query.place.slice(0, 40) : ""));
  const [dur, setDur] = useState(60);
  const [refusal, setRefusal] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [compass, setCompass] = useState<CompassLine[] | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [ideas, setIdeas] = useState<Ideas | null>(null);
  const [turn, setTurn] = useState(0);
  const seenRef = useRef<string[]>([]);

  useEffect(() => {
    api<{ compass: CompassLine[] }>("GET", "/api/me/compass")
      .then((res) => {
        if (res.status === 401) return setPhase("signed-out");
        if (res.status === 200) setCompass(res.data.compass);
      })
      .catch(() => setCompass([]));
  }, []);

  const hasCompass = (compass?.length ?? 0) > 0;
  const compassHint = (compass ?? []).slice(0, 3).map((l) => l.text).join(" · ");
  const canPost = topic.trim() !== "" && place.trim() !== "";

  async function suggest(fresh: boolean) {
    if (suggesting) return;
    setSuggesting(true);
    setNote("");
    if (!fresh) setIdeas(null);
    let res;
    try {
      res = await api<Ideas>("POST", "/api/rooms/suggest", {
        lang: navigator.language.startsWith("fr") ? "fr" : "en",
        ...(fresh ? { fresh: true, avoid: seenRef.current.slice(-12) } : {}),
      });
    } catch {
      setSuggesting(false);
      return setNote("No connection. Try again when you're back online.");
    }
    setSuggesting(false);
    if (res.status === 401) return setPhase("signed-out");
    if (res.status === 429) return setNote("That's enough ideas for one hour. Try again later.");
    if (res.status !== 200) return setNote("No ideas right now. Your own line works best anyway.");
    setIdeas({ ideas: res.data.ideas, label: res.data.label });
    seenRef.current = [...seenRef.current, ...res.data.ideas.map((i) => i.text)].slice(-12);
  }

  async function post() {
    if (!canPost) return;
    setPhase("checking");
    setRefusal(null);
    setNote("");
    let spot;
    try {
      spot = await locate();
    } catch {
      setPhase("compose");
      return setNote("Around needs one look at where you are to open the room. Try again?");
    }
    let res;
    try {
      res = await api<{ id: string }>("POST", "/api/rooms", { topic: topic.trim(), placeText: place.trim(), durationMin: dur, ...spot });
    } catch {
      setPhase("compose");
      return setNote("No connection. Try again when you're back online.");
    }
    if (res.status === 401) return setPhase("signed-out");
    if (res.status === 422) {
      setPhase("compose");
      return setRefusal(String((res.data as { message?: string }).message ?? "That one doesn't fit. Try again?"));
    }
    if (res.status === 409) {
      setPhase("compose");
      return setNote("You already have a room open. Take it down first?");
    }
    if (res.status !== 200) {
      setPhase("compose");
      return setNote("Something went wrong. Try again.");
    }
    route(`/room?id=${res.data.id}`);
  }

  if (phase === "signed-out") {
    return (
      <Screen title="Your icebreaker">
        <div class="around-body">
          <p class="lcd-block">Sign in first, then post your icebreaker.</p>
          <ul class="key-list"><li><a class="lcd-key lcd-key--primary" href="/signin">Sign in</a></li></ul>
        </div>
      </Screen>
    );
  }

  if (phase === "checking") {
    return (
      <Screen title="Checking">
        <div class="around-body">
          <p class="around-status">CHECKING...</p>
          <p class="around-privacy">Topic and place are checked before anyone sees them: nothing insulting, racist, sexual or offensive.</p>
        </div>
      </Screen>
    );
  }

  return (
    <Screen title="Your icebreaker">
      <div class="around-body">
        <h1 class="around-head">YOUR ICEBREAKER</h1>

        <label class="chat-bot" for="ib-topic">{turn > 0 ? Q1 : <Typed text={Q1} msPerChar={35} onDone={() => setTurn(1)} />}</label>
        <div class="chat-answer">
          <input
            id="ib-topic"
            class="lcd-field"
            type="text"
            maxLength={60}
            placeholder="One line. A question works best."
            value={topic}
            onInput={(e) => {
              setTopic((e.target as HTMLInputElement).value.slice(0, 60));
              setRefusal(null);
            }}
          />
          <span class="field-count">{topic.length} / 60</span>
        </div>

        {refusal && (
          <p class="refusal-note" role="alert" aria-live="polite">{refusal}</p>
        )}

        <p class="around-privacy">Everything typed or suggested is checked: nothing insulting, racist, sexual or offensive gets through.</p>

        {!ideas && !suggesting && (
          <>
            <button class="need-one" type="button" onClick={() => suggest(false)}>
              <span>NEED ONE? GET TOPIC IDEAS</span><span aria-hidden="true">&gt;</span>
            </button>
            <p class="around-privacy">{hasCompass ? `Ideas from your compass: ${compassHint}.` : "No compass yet, so I'll get creative."}</p>
          </>
        )}
        {suggesting && !ideas && (
          <div class="chat-bot" aria-live="polite">
            {hasCompass ? "READING YOUR COMPASS" : "GETTING CREATIVE"}
            <span class="typing-dots" aria-hidden="true"><i /><i /><i /></span>
          </div>
        )}
        {ideas && (
          <IdeasBlock
            key={ideas.ideas.map((i) => i.text).join("\n")}
            ideas={ideas.ideas}
            label={ideas.label}
            suggesting={suggesting}
            onPick={(text) => {
              setTopic(text);
              setRefusal(null);
            }}
            onMore={() => suggest(true)}
          />
        )}

        {turn >= 1 && (
          <label class="chat-bot" for="ib-place">{turn > 1 ? Q2 : <Typed text={Q2} msPerChar={35} onDone={() => setTurn(2)} />}</label>
        )}
        <div class="chat-answer">
          <input
            id="ib-place"
            class="lcd-field"
            type="text"
            maxLength={40}
            placeholder="Café du Coin, window table"
            value={place}
            onInput={(e) => {
              setPlace((e.target as HTMLInputElement).value.slice(0, 40));
              setRefusal(null);
            }}
          />
          <span class="field-count">{place.length} / 40</span>
        </div>
        <p class="around-privacy">A public place, and where inside it. This creates a 500 m area people nearby can find. We keep a rough area, never your exact spot, and it goes when your icebreaker does.</p>

        {turn >= 2 && (
          <div class="chat-bot" id="ib-dur-label">{turn > 2 ? Q3 : <Typed text={Q3} msPerChar={35} onDone={() => setTurn(3)} />}</div>
        )}
        <div class="dur-row" role="group" aria-labelledby="ib-dur-label">
          {DURS.map((d) => (
            <button
              key={d.min}
              type="button"
              class={`chip${dur === d.min ? " on" : ""}`}
              aria-pressed={dur === d.min}
              onClick={() => setDur(d.min)}
            >
              {d.label}
            </button>
          ))}
        </div>
        {note && <p class="lcd-small" role="status">{note}</p>}
      </div>
      <div class="thumb-zone">
        <button class="thumb-key" type="button" disabled={!canPost} onClick={post}>
          <span>POST IT</span><span aria-hidden="true">&gt;</span>
        </button>
        <a class="thumb-link" href="/around">BACK</a>
      </div>
    </Screen>
  );
}
