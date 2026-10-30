// WP6 Live: collective numbers only. No names, no map, no leaderboard.
import { useEffect, useState } from "preact/hooks";
import { api } from "../api";
import { Screen } from "../components/Screen";

interface LiveView {
  hellos: number;
  connection: { met: number; of: number; percent: number | null };
  checkins: { ok: number; of: number; percent: number | null };
  factsConfirmedThisWeek: number;
  places: { name: string; hellos: number }[];
  users: number;
  interactions: number;
  leaves: number;
  sentiment: { went_well: number; no_reply: number; awkward: number; didnt_happen: number };
  updatedAt: string;
}

const SENTIMENT: { key: keyof LiveView["sentiment"]; label: string }[] = [
  { key: "went_well", label: "Went well" },
  { key: "no_reply", label: "No reply / ghosted" },
  { key: "awkward", label: "Awkward but done" },
  { key: "didnt_happen", label: "Didn't happen" },
];

export function Live() {
  const [live, setLive] = useState<LiveView | null>(null);

  useEffect(() => {
    const load = () => api<LiveView>("GET", "/api/live").then((res) => res.status === 200 && setLive(res.data));
    load();
    const timer = setInterval(() => document.visibilityState === "visible" && load(), 4 * 60 * 60_000);
    return () => clearInterval(timer);
  }, []);

  return (
    <Screen title="Live">
      <h1 class="screen-title">Live</h1>
      {!live ? (
        <p class="lcd-kicker" role="status">Counting...</p>
      ) : (
        <>
          <div class="lcd-block live-big">
            <p class="lcd-kicker">Real-life hellos</p>
            <p class="live-number">{live.hellos}</p>
            <p class="lcd-small">Both people confirmed, since 27 October.</p>
          </div>
          <div class="lcd-block">
            <p class="lcd-kicker">Signals that became a conversation</p>
            <p>
              {live.connection.of
                ? `${live.connection.met} of ${live.connection.of} accepted signals became a conversation.`
                : "No accepted signals yet. Be the first?"}
            </p>
          </div>
          <div class="lcd-block">
            <p class="lcd-kicker">Check-ins that worked</p>
            <p>{live.checkins.percent === null ? "None yet." : `${live.checkins.percent}% of ${live.checkins.of}.`}</p>
          </div>
          <div class="lcd-block">
            <p class="lcd-kicker">Users</p>
            <p class="live-number">{live.users}</p>
          </div>
          <div class="lcd-block">
            <p class="lcd-kicker">Interactions logged</p>
            <p class="live-number">{live.interactions}</p>
          </div>
          <div class="lcd-block">
            <p class="lcd-kicker">Leaves in total</p>
            <p class="live-number">{live.leaves}</p>
            <p class="lcd-small">One per try, except didn&apos;t happen. Anonymous altogether.</p>
          </div>
          <div class="lcd-block">
            <p class="lcd-kicker">How did it go</p>
            <ul class="reply-list">
              {SENTIMENT.map((s) => (
                <li key={s.key}>
                  {s.label}: {live.sentiment[s.key]}
                </li>
              ))}
            </ul>
          </div>
          {live.places.length > 0 && (
            <div class="lcd-block">
              <p class="lcd-kicker">Where</p>
              <ul class="reply-list">
                {live.places.map((p) => <li key={p.name}>{p.name}: {p.hellos}</li>)}
              </ul>
            </div>
          )}
          <p class="lcd-small">Collective numbers only, never per person. Updated {new Date(live.updatedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}.</p>
        </>
      )}
    </Screen>
  );
}
