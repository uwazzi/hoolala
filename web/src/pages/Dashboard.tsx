// Owner dashboard: aggregate product counts behind the owner token. The
// token lives in memory only; bookmark /dashboard?token=... to skip typing.
// Aggregate numbers only, never per person.
import { useLocation } from "preact-iso";
import { useEffect, useState } from "preact/hooks";
import { Screen } from "../components/Screen";

interface DashboardView {
  users: number;
  interactions: number;
  leaves: number;
  sentiment: { went_well: number; no_reply: number; awkward: number; didnt_happen: number };
  updatedAt: string;
}

const SENTIMENT: { key: keyof DashboardView["sentiment"]; label: string }[] = [
  { key: "went_well", label: "Went well" },
  { key: "no_reply", label: "No reply / ghosted" },
  { key: "awkward", label: "Awkward but done" },
  { key: "didnt_happen", label: "Didn't happen" },
];

export function Dashboard() {
  const { query } = useLocation();
  const [token, setToken] = useState(typeof query.token === "string" ? query.token : "");
  const [input, setInput] = useState("");
  const [view, setView] = useState<DashboardView | null>(null);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (!token) return;
    setDenied(false);
    setView(null);
    fetch("/api/dashboard", { headers: { authorization: `Bearer ${token}` } })
      .then(async (res) => {
        if (res.status !== 200) return setDenied(true);
        setView((await res.json()) as DashboardView);
      })
      .catch(() => setDenied(true));
  }, [token]);

  return (
    <Screen title="Dashboard">
      <h1 class="screen-title">Dashboard</h1>
      {!token ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setToken(input.trim());
          }}
          noValidate
        >
          <label class="lcd-label" for="owner-token">Owner token</label>
          <input
            class="lcd-field"
            type="password"
            id="owner-token"
            name="token"
            autocomplete="off"
            required
            value={input}
            onInput={(e) => setInput(e.currentTarget.value)}
          />
          <ul class="key-list">
            <li>
              <button class="lcd-key lcd-key--primary" type="submit">Show counts</button>
            </li>
          </ul>
        </form>
      ) : !view && !denied ? (
        <p class="lcd-kicker" role="status">Counting...</p>
      ) : denied ? (
        <>
          <p class="lcd-block">Wrong token. Check it and try again.</p>
          <ul class="key-list">
            <li>
              <button
                class="lcd-key"
                type="button"
                onClick={() => {
                  setToken("");
                  setInput("");
                }}
              >
                Try again
              </button>
            </li>
          </ul>
        </>
      ) : (
        view && (
          <>
            <div class="lcd-block live-big">
              <p class="lcd-kicker">Users</p>
              <p class="live-number">{view.users}</p>
              <p class="lcd-small">Accounts, without deleted or sample ones.</p>
            </div>
            <div class="lcd-block">
              <p class="lcd-kicker">Interactions logged</p>
              <p class="live-number">{view.interactions}</p>
            </div>
            <div class="lcd-block">
              <p class="lcd-kicker">Leaves in total</p>
              <p class="live-number">{view.leaves}</p>
              <p class="lcd-small">One per try, except didn&apos;t happen.</p>
            </div>
            <div class="lcd-block">
              <p class="lcd-kicker">How did it go</p>
              <ul class="reply-list">
                {SENTIMENT.map((s) => (
                  <li key={s.key}>
                    {s.label}: {view.sentiment[s.key]}
                  </li>
                ))}
              </ul>
            </div>
            <p class="lcd-small">Updated {new Date(view.updatedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}.</p>
          </>
        )
      )}
    </Screen>
  );
}
