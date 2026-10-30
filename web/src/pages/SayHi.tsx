// Say hi: one message to the makers, with the screen, recent activity and
// first name attached automatically. Never audio, transcripts or location.
import { useLocation } from "preact-iso";
import { useEffect, useState } from "preact/hooks";
import { api, type MeResponse } from "../api";
import { Screen } from "../components/Screen";
import { takeLog } from "../log";

export function SayHi() {
  const { query } = useLocation();
  const from = typeof query.from === "string" && query.from ? query.from : "unknown";
  const [me, setMe] = useState<MeResponse | null>(null);
  const [checked, setChecked] = useState(false);
  const [message, setMessage] = useState("");
  const [note, setNote] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<MeResponse>("GET", "/api/me").then((res) => {
      if (res.status === 200) setMe(res.data);
      setChecked(true);
    });
  }, []);

  async function send(event: Event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setNote("");
    let res;
    try {
      res = await api("POST", "/api/feedback", { screen: from, message: message.trim(), log: takeLog() });
    } catch {
      setBusy(false);
      return setNote("That didn't send. Try again?");
    }
    setBusy(false);
    if (res.status === 401) return void (location.href = "/signin");
    if (res.status !== 200) return setNote("That didn't send. Try again?");
    setSent(true);
  }

  return (
    <Screen title="Say hi">
      <h1 class="screen-title">Say hi</h1>
      {!checked ? (
        <p class="lcd-kicker" role="status">Loading...</p>
      ) : !me ? (
        <>
          <p class="lcd-block">Sign in first, so we know whose hi it is.</p>
          <ul class="key-list">
            <li>
              <a class="lcd-key lcd-key--primary" href="/signin">Sign in</a>
            </li>
          </ul>
        </>
      ) : sent ? (
        <p class="lcd-block">Got it, {me.firstName ?? "friend"}. Thanks for telling us.</p>
      ) : (
        <>
          <p class="lcd-block">Something stuck? Tell us in your own words. Your screen ({from}), recent activity and first name go along automatically.</p>
          <form onSubmit={send} noValidate>
            <label class="lcd-label" for="hi-message">What happened</label>
            <textarea
              class="lcd-field"
              id="hi-message"
              name="message"
              rows={4}
              maxLength={500}
              value={message}
              onInput={(e) => setMessage(e.currentTarget.value)}
            />
            <ul class="key-list">
              <li>
                <button class="lcd-key lcd-key--primary" type="submit" disabled={busy}>
                  Send it
                </button>
              </li>
            </ul>
          </form>
        </>
      )}
      <p class="lcd-small" role="status" aria-live="polite">
        {note}
      </p>
    </Screen>
  );
}
