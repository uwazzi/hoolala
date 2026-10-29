// WP30: friends. One small private crew: the shared try, the timeline of
// what happened, NICE ONE only, and INVITE A FRIEND by WhatsApp, Messenger
// or copied link. No counts per person, no leaves for posting. Copy and
// states from docs/design/v6/Friends.dc.html.
import { useEffect, useState } from "preact/hooks";
import { useLocation } from "preact-iso";
import type { MeResponse } from "../../../src/types";
import { api } from "../api";
import { Screen } from "../components/Screen";

const JOIN_KEY = "hoolala_join_token";

interface SharedTry {
  id: string;
  step: number;
  title: string;
  hint: string;
}
interface Member {
  id: string;
  name: string;
  you: boolean;
}
interface Post {
  id: string;
  name: string;
  you: boolean;
  at: string;
  outcome: string;
  text: string;
  nice: string[];
  nicedByMe: boolean;
}
interface CrewView {
  crew: { id: string; name: string; sharedTry: SharedTry };
  members: Member[];
  posts: Post[];
}

const TAGS: Record<string, string> = {
  went_well: "Went well",
  no_reply: "No reply / ghosted",
  awkward: "Awkward but done",
  didnt_happen: "Didn't happen",
};
const OUTCOMES = ["went_well", "no_reply", "awkward", "didnt_happen"];
const AVATARS = ["#304327", "#182513", "#2E8B3E"];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "")).toUpperCase();
}

function avatarBg(name: string): string {
  let h = 0;
  for (const c of name) h = (h * 31 + c.codePointAt(0)!) >>> 0;
  return AVATARS[h % AVATARS.length];
}

function when(at: string): string {
  const mins = Math.max(0, Math.floor((Date.now() - Date.parse(at)) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  if (mins < 24 * 60) return `${Math.floor(mins / 60)} hr ago`;
  if (mins < 48 * 60) return "yesterday";
  if (mins < 7 * 24 * 60) return new Date(at).toLocaleDateString("en-GB", { weekday: "short" });
  return new Date(at).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function Friends() {
  const { query } = useLocation();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [signedOut, setSignedOut] = useState(false);
  const [view, setView] = useState<CrewView | null>(null);
  const [none, setNone] = useState(false);
  const [note, setNote] = useState("");
  const [name, setName] = useState("");
  const [composing, setComposing] = useState(false);
  const [outcome, setOutcome] = useState(typeof query.outcome === "string" && OUTCOMES.includes(query.outcome) ? query.outcome : "went_well");
  const [draft, setDraft] = useState("");
  const [invite, setInvite] = useState<{ url: string } | null>(null);
  const [sent, setSent] = useState("");
  const [copied, setCopied] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);

  async function load() {
    const res = await api<CrewView>("GET", "/api/crew");
    if (res.status === 200) {
      setView(res.data);
      setNone(false);
    } else if (res.status === 404) {
      setView(null);
      setNone(true);
    }
  }

  useEffect(() => {
    api<MeResponse>("GET", "/api/me").then(async (res) => {
      if (res.status !== 200) return setSignedOut(true);
      setMe(res.data);
      const pending = localStorage.getItem(JOIN_KEY);
      if (pending) {
        localStorage.removeItem(JOIN_KEY);
        const joined = await api("POST", "/api/crew/join", { token: pending });
        if (joined.status === 200) setNote("You're in the crew. Say hello with a story.");
        else if (joined.data.error === "already_in_crew") setNote("You're already in a crew. Leave it first to join another.");
        else setNote("That invite has expired or was replaced. Ask your friend for a new link.");
      }
      load();
    });
  }, []);

  async function create() {
    setNote("");
    const res = await api("POST", "/api/crew", { name: name.trim() || "My crew" });
    if (res.status === 200) {
      setName("");
      load();
    } else if (res.status === 422) {
      setNote((res.data as { message?: string }).message ?? "That name doesn't fit. Try another?");
    } else {
      setNote("Give the crew a name, 2 to 24 letters.");
    }
  }

  async function post() {
    if (!draft.trim()) return;
    setNote("");
    const res = await api("POST", "/api/crew/posts", { text: draft.trim(), outcome });
    if (res.status !== 200) {
      setNote((res.data as { message?: string }).message ?? "That didn't post. Try again?");
      return;
    }
    setDraft("");
    setComposing(false);
    load();
  }

  async function nice(post: Post) {
    const res = await api<{ niced: boolean; nice: string[] }>("POST", `/api/crew/posts/${post.id}/nice`);
    if (res.status !== 200 || !view) return;
    setView({ ...view, posts: view.posts.map((p) => (p.id === post.id ? { ...p, nicedByMe: res.data.niced, nice: res.data.nice } : p)) });
  }

  async function openInvite() {
    setSent("");
    setCopied(false);
    const res = await api<{ invite: { path: string } }>("POST", "/api/crew/invite");
    if (res.status !== 200) {
      setNote("No link right now. Try again in a bit.");
      return;
    }
    setInvite({ url: `${location.origin}${res.data.invite.path}` });
  }

  function inviteText(): string {
    const tryTitle = (view?.crew.sharedTry.title ?? "a tiny try").toLowerCase().replace(/\.$/, "");
    return `${me?.firstName ?? "Someone"} invited you: ${tryTitle} this week. Hoolala! gives you one tiny try a day, then you swap what happened. You never know until you go.`;
  }

  if (signedOut) {
    return (
      <Screen title="Friends">
        <h1 class="screen-title">Friends</h1>
        <p class="lcd-block">Your crew is private. Sign in first.</p>
        <ul class="key-list">
          <li>
            <a class="lcd-key lcd-key--primary" href="/signin">Sign in</a>
          </li>
        </ul>
      </Screen>
    );
  }

  if (!view && !none) {
    return (
      <Screen title="Friends">
        <p class="lcd-kicker" role="status">Loading...</p>
      </Screen>
    );
  }

  return (
    <Screen title="Friends" back={false}>
      {none || !view ? (
        <>
          <h1 class="screen-title">Friends</h1>
          <p class="lcd-block">Invite a friend to try one tiny thing this week, then swap what happened. Small, private, no scores.</p>
          <label class="lcd-label" for="crew-name">Name your crew</label>
          <input class="lcd-field" id="crew-name" maxLength={24} value={name} onInput={(e) => setName(e.currentTarget.value)} placeholder="Morning crew" />
          <ul class="key-list">
            <li>
              <button class="lcd-key lcd-key--primary" type="button" onClick={create}>Start a crew</button>
            </li>
          </ul>
          <p class="lcd-small">Or tap a friend's invite link to join theirs.</p>
          {note && (
            <p class="lcd-small" role="status">
              {note}
            </p>
          )}
        </>
      ) : (
        <>
          <div class="crew-head">
            <div>
              <h1 class="crew-name">{view.crew.name}</h1>
              <button class="crew-count" type="button" onClick={() => setMembersOpen(!membersOpen)} aria-expanded={membersOpen ? "true" : "false"}>
                {view.members.length} {view.members.length === 1 ? "friend" : "friends"} · only you see this
              </button>
            </div>
            <button class="lcd-key crew-add" type="button" onClick={openInvite}>+ Add a friend</button>
          </div>
          {membersOpen && (
            <ul class="member-list">
              {view.members.map((m) => (
                <li key={m.id}>
                  <span>
                    {m.you ? "You" : m.name} {m.you ? "(you)" : ""}
                  </span>
                  {m.you ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm("Leave this crew? Your stories here go with you.")) {
                          api("POST", "/api/crew/leave").then(load);
                        }
                      }}
                    >
                      Leave
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Remove ${m.name}? Their stories here go too.`)) {
                          api("POST", "/api/crew/remove", { userId: m.id }).then(load);
                        }
                      }}
                    >
                      Remove
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          <div class="shared-try">
            <div class="shared-try-kicker">This week's shared try</div>
            <div class="shared-try-title">{view.crew.sharedTry.title}</div>
            <div class="shared-try-sub">Same try, each at your own pace. No scores, no race.</div>
          </div>
          {!composing ? (
            <ul class="key-list">
              <li>
                <button class="lcd-key lcd-key--primary" type="button" onClick={() => setComposing(true)}>
                  Tell the crew what happened
                </button>
              </li>
            </ul>
          ) : (
            <div class="compose keys-rise">
              <div class="lcd-kicker">How did it go?</div>
              <div class="key-grid" role="radiogroup" aria-label="How did it go?">
                {OUTCOMES.map((o) => (
                  <label class="chip" key={o}>
                    <input type="radio" name="outcome" checked={outcome === o} onChange={() => setOutcome(o)} />
                    <span>{TAGS[o]}</span>
                  </label>
                ))}
              </div>
              <textarea
                class="lcd-field"
                rows={2}
                maxLength={140}
                value={draft}
                onInput={(e) => setDraft(e.currentTarget.value)}
                placeholder="What happened? One or two lines is plenty."
                aria-label="What happened?"
              />
              <div class="lcd-small">No names, faces or photos of strangers. They didn't sign up.</div>
              <div class="key-row">
                <button class="lcd-key" type="button" onClick={() => { setComposing(false); setDraft(""); }}>
                  Cancel
                </button>
                <button class="lcd-key lcd-key--primary" type="button" onClick={post} disabled={!draft.trim()}>
                  Post to crew
                </button>
              </div>
            </div>
          )}
          <div class="lcd-kicker timeline-head">What happened this week</div>
          {view.posts.length === 0 && <p class="lcd-small">Nothing yet. Yours could be first.</p>}
          <ul class="timeline">
            {view.posts.map((p) => (
              <li key={p.id} class="post">
                <div class="avatar" style={{ background: avatarBg(p.name) }} aria-hidden="true">
                  {initials(p.name)}
                </div>
                <div class="post-body">
                  <div class="post-head">
                    <span class="post-name">{p.you ? "You" : p.name}</span>
                    <span class="lcd-small">{when(p.at)}</span>
                    <span class="post-tag">{TAGS[p.outcome] ?? p.outcome}</span>
                  </div>
                  <div class="post-text">{p.text}</div>
                  <div class="post-nice">
                    <button type="button" class={`nice${p.nicedByMe ? " is-on" : ""}`} onClick={() => nice(p)} aria-pressed={p.nicedByMe ? "true" : "false"}>
                      {p.nicedByMe ? "Nice one ✓" : "Nice one"}
                    </button>
                    {(p.nicedByMe || p.nice.length > 0) && (
                      <span class="lcd-small">{[...(p.nicedByMe ? ["You"] : []), ...p.nice].join(", ")} said nice one</span>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
          {note && (
            <p class="lcd-small" role="status">
              {note}
            </p>
          )}
        </>
      )}
      {invite && view && (
        <div class="sheet-backdrop" onClick={() => setInvite(null)}>
          <div class="sheet keys-rise" role="dialog" aria-label="Invite a friend" onClick={(e) => e.stopPropagation()}>
            <h1 class="screen-title">Invite a friend</h1>
            <p class="lcd-block">
              {inviteText()} {invite.url}
            </p>
            <p class="lcd-small">
              The link adds them to {view.crew.name} only. It expires in 7 days. You can remove anyone, any time.
            </p>
            <ul class="key-list">
              <li>
                <button
                  class="lcd-key lcd-key--primary"
                  type="button"
                  onClick={() => {
                    window.open(`https://wa.me/?text=${encodeURIComponent(`${inviteText()} ${invite.url}`)}`, "_blank", "noopener");
                    setSent("Opening WhatsApp with your invite. They join when they tap the link.");
                  }}
                >
                  Send on WhatsApp
                </button>
              </li>
            </ul>
            <div class="key-row">
              <button
                class="lcd-key"
                type="button"
                onClick={() => {
                  location.href = `fb-messenger://share/?link=${encodeURIComponent(invite.url)}`;
                  setSent("Opening Messenger with your invite. They join when they tap the link.");
                }}
              >
                Messenger
              </button>
              <button
                class="lcd-key"
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(`${inviteText()} ${invite.url}`);
                    setCopied(true);
                    setSent("Link copied. Paste it anywhere you like.");
                  } catch {
                    setSent("Copy didn't work. Long-press the link above.");
                  }
                }}
              >
                {copied ? "Copied ✓" : "Copy link"}
              </button>
            </div>
            {sent && <p class="lcd-small">{sent}</p>}
            <button class="lcd-key" type="button" onClick={() => setInvite(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </Screen>
  );
}
