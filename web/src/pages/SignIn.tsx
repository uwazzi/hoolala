// WP2 sign-in, moved to Preact in WP27. Steps: email > sent, then on the
// way back from the link: first name > signed in (sign out, delete).
import { useLocation } from "preact-iso";
import { useEffect, useState } from "preact/hooks";
import { api, type MeResponse } from "../api";
import { Screen } from "../components/Screen";

type Step = "loading" | "email" | "sent" | "name" | "signed-in" | "delete";

const TITLES: Record<Step, string> = {
  loading: "Sign in",
  email: "Sign in",
  sent: "Link sent",
  name: "Your name",
  "signed-in": "Signed in",
  delete: "Delete account",
};

const ERRORS: Record<string, string> = {
  bad_email: "That doesn't look like an email. Check it and try again.",
  adult_required: "Hoolala! is for people 18 and over.",
  too_many: "That's a lot of links. Wait a few minutes, then try again.",
  email_failed: "We couldn't send the email. Try again in a minute.",
  bad_name: "First name only, letters only, up to 30.",
  signed_out: "You've been signed out. Sign in again.",
};

const LINK_ERROR = "That link has expired or was already used. Send yourself a new one.";

export function SignIn() {
  const { query } = useLocation();
  const [step, setStep] = useState<Step>("loading");
  const [note, setNote] = useState("");
  const [me, setMe] = useState<MeResponse | null>(null);
  const [email, setEmail] = useState("");
  const [adult, setAdult] = useState(false);
  const [firstName, setFirstName] = useState("");

  function go(next: Step, message = "") {
    setStep(next);
    setNote(message);
  }

  function failed(error?: string) {
    setNote((error && ERRORS[error]) || "Something went wrong. Try again.");
  }

  function signedIn(person: MeResponse) {
    setMe(person);
    go(person.firstName ? "signed-in" : "name");
  }

  useEffect(() => {
    api<MeResponse>("GET", "/api/me").then((res) => {
      if (res.status === 200) return signedIn(res.data);
      go("email", query.error === "link" ? LINK_ERROR : "");
    });
  }, []);

  async function sendLink(event: Event) {
    event.preventDefault();
    if (!adult) return failed("adult_required");
    const res = await api("POST", "/api/auth/start", { email, adult: true });
    if (res.status === 200) return go("sent");
    failed(res.data.error);
  }

  async function saveName(event: Event) {
    event.preventDefault();
    const res = await api<MeResponse>("PATCH", "/api/me", { firstName });
    if (res.status === 200) return signedIn(res.data);
    failed(res.data.error);
  }

  async function signOut() {
    await api("POST", "/api/auth/logout");
    setMe(null);
    go("email");
  }

  async function deleteAccount() {
    const res = await api("DELETE", "/api/me");
    if (res.status !== 200) return failed(res.data.error);
    setMe(null);
    go("email", "Your account is gone. Thanks for trying Hoolala!");
  }

  return (
    <Screen title={TITLES[step]}>
      <h1 class="screen-title">{TITLES[step]}</h1>

      {step === "email" && (
        <>
          <form onSubmit={sendLink} noValidate>
            <label class="lcd-label" for="email">Email</label>
            <input class="lcd-field" type="email" id="email" name="email" autocomplete="email"
              placeholder="you@example.com" required value={email}
              onInput={(e) => setEmail(e.currentTarget.value)} />
            <div class="check-row">
              <input type="checkbox" id="adult" name="adult" required checked={adult}
                onChange={(e) => setAdult(e.currentTarget.checked)} />
              <label for="adult">I am 18 or older.</label>
            </div>
            <ul class="key-list">
              <li><button class="lcd-key lcd-key--primary" type="submit">Send my link</button></li>
            </ul>
          </form>
          <p class="lcd-small">We email you a link. No password, and we never show your email to anyone.</p>
        </>
      )}

      {step === "sent" && (
        <>
          <p class="lcd-block">Check your email. The link works once, for 15 minutes.</p>
          <ul class="key-list">
            <li><button class="lcd-key" type="button" onClick={() => go("email")}>Use another email</button></li>
          </ul>
        </>
      )}

      {step === "name" && (
        <>
          <form onSubmit={saveName} noValidate>
            <label class="lcd-label" for="first-name">First name</label>
            <input class="lcd-field" type="text" id="first-name" name="firstName" autocomplete="given-name"
              maxLength={30} required value={firstName}
              onInput={(e) => setFirstName(e.currentTarget.value)} />
            <ul class="key-list">
              <li><button class="lcd-key lcd-key--primary" type="submit">That's me</button></li>
            </ul>
          </form>
          <p class="lcd-small">Only your first name. People see it only after you both say yes.</p>
        </>
      )}

      {step === "signed-in" && me && (
        <>
          <p class="lcd-block">Hello, {me.firstName}. You're signed in.</p>
          <ul class="key-list">
            <li><a class="lcd-key lcd-key--primary" href="/arrive">Where are you?</a></li>
            <li><button class="lcd-key" type="button" onClick={signOut}>Sign out</button></li>
            <li><button class="lcd-key" type="button" onClick={() => go("delete")}>Delete my account</button></li>
          </ul>
        </>
      )}

      {step === "delete" && (
        <>
          <p class="lcd-block">This removes your check-ins, signals, replies, moments and friends. Anonymous counts stay. It can't be undone.</p>
          <ul class="key-list">
            <li><button class="lcd-key lcd-key--primary" type="button" onClick={deleteAccount}>Delete it</button></li>
            <li><button class="lcd-key" type="button" onClick={() => go("signed-in")}>Keep it</button></li>
          </ul>
        </>
      )}

      <p class="lcd-small" role="status" aria-live="polite">{note}</p>
    </Screen>
  );
}
