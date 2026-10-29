// WP30: joining a crew from an invite link. The preview is public (the token
// is the key); joining needs a sign-in. Signed-out visitors keep the token
// on their phone; the Friends page completes the join after sign-in.
import { useEffect, useState } from "preact/hooks";
import { useLocation } from "preact-iso";
import type { MeResponse } from "../../../src/types";
import { api } from "../api";
import { Screen } from "../components/Screen";

const JOIN_KEY = "hoolala_join_token";

interface Preview {
  crewName: string;
  sharedTry: { title: string; hint: string };
  inviter: string;
}

export function Join() {
  const { query, route } = useLocation();
  const token = typeof query.token === "string" ? query.token : "";
  const [preview, setPreview] = useState<Preview | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!token) return setInvalid(true);
    api<Preview>("GET", `/api/crew/join/${encodeURIComponent(token)}`).then((res) => {
      if (res.status !== 200) return setInvalid(true);
      setPreview(res.data);
    });
    api<MeResponse>("GET", "/api/me").then((res) => setSignedIn(res.status === 200));
  }, []);

  async function join() {
    const res = await api("POST", "/api/crew/join", { token });
    if (res.status === 200) return route("/friends");
    if (res.data.error === "already_in_crew") {
      setNote("You're already in a crew. Leave it first to join another.");
    } else {
      setNote("That invite has expired or was replaced. Ask your friend for a new link.");
    }
  }

  function keepForLater() {
    localStorage.setItem(JOIN_KEY, token);
  }

  return (
    <Screen title="Join a crew">
      <div class="brand">
        <p class="brand-name">Hoolala!</p>
        <p class="brand-tagline">You never know until you go.</p>
      </div>
      {invalid ? (
        <>
          <h1 class="screen-title">No invite here</h1>
          <p class="lcd-block">That invite has expired or was replaced. Ask your friend for a new link.</p>
          <ul class="key-list">
            <li>
              <a class="lcd-key lcd-key--primary" href="/">Today</a>
            </li>
          </ul>
        </>
      ) : !preview || signedIn === null ? (
        <p class="lcd-kicker" role="status">Loading...</p>
      ) : (
        <>
          <h1 class="screen-title">You've been invited</h1>
          <p class="lcd-block">
            {preview.inviter} invited you: {preview.sharedTry.title.toLowerCase().replace(/\.$/, "")} this week. Hoolala! gives you one tiny try a day, then you swap what
            happened with {preview.crewName}. You never know until you go.
          </p>
          {signedIn ? (
            <ul class="key-list">
              <li>
                <button class="lcd-key lcd-key--primary" type="button" onClick={join}>
                  Join {preview.crewName}
                </button>
              </li>
            </ul>
          ) : (
            <>
              <p class="lcd-small">Sign in first. Your invite is saved on this phone and joins automatically.</p>
              <ul class="key-list">
                <li>
                  <a class="lcd-key lcd-key--primary" href="/signin" onClick={keepForLater}>
                    Sign in
                  </a>
                </li>
              </ul>
            </>
          )}
          {note && (
            <p class="lcd-small" role="status">
              {note}
            </p>
          )}
        </>
      )}
    </Screen>
  );
}
