// WP24 Get started: FIND ME with consent, or three questions without any AI.
// IS THIS YOU? > a few questions (optional) > YOUR WORLD, ACCORDING TO YOU. >
// LOOKS RIGHT. Nothing is saved before LOOKS RIGHT; the search itself never is.
import { useEffect, useState } from "preact/hooks";
import type { MeResponse } from "../../../src/types";
import { api } from "../api";
import { Screen } from "../components/Screen";
import { Workings } from "../components/Workings";

type Step = "ask" | "who" | "looking" | "pick" | "questions" | "drafting" | "draft" | "saved";
interface Finding { text: string; url: string; source: string }
interface Line { part: string; text: string; sourceUrl: string | null; source: string }

const PART_LABEL: Record<string, string> = { interest: "Into", talk_about: "Happy to talk about", more_of: "Would like more of", filter: "Rather not talk about" };

const ERRORS: Record<string, string> = {
  not_you: "Hoolala! only looks you up. Use the name you use online, with your first name in it.",
  first_name_required: "Add your first name first.",
  bad_links: "Up to three https links, please.",
  too_many: "That's enough looking for today. Tell us instead?",
  ai_off: "Looking things up isn't available right now. Tell us instead?",
  ai_failed: "The search didn't work this time. Tell us instead?",
};

export function Start() {
  const [step, setStep] = useState<Step>("ask");
  const [note, setNote] = useState("");
  const [me, setMe] = useState<MeResponse | null>(null);
  const [name, setName] = useState("");
  const [town, setTown] = useState("");
  const [links, setLinks] = useState(["", "", ""]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [findWorkings, setFindWorkings] = useState<string | null>(null);
  const [mine, setMine] = useState<Record<string, boolean | undefined>>({});
  const [answers, setAnswers] = useState({ talk: "", more: "", avoid: "" });
  const [lines, setLines] = useState<Line[]>([]);
  const [origin, setOrigin] = useState<"find_me" | "questions">("find_me");

  useEffect(() => {
    api<MeResponse>("GET", "/api/me").then((res) => {
      if (res.status !== 200) return (location.href = "/signin");
      setMe(res.data);
      setName(res.data.firstName ?? "");
    });
  }, []);

  function go(next: Step, message = "") {
    setStep(next);
    setNote(message);
  }

  async function lookMeUp(event: Event) {
    event.preventDefault();
    go("looking");
    const res = await api<{ findings: Finding[]; workingsId: string | null }>("POST", "/api/me/find", {
      consent: true,
      name,
      town: town.trim() || undefined,
      links: links.map((l) => l.trim()).filter(Boolean),
    });
    if (res.status !== 200) {
      setOrigin("questions");
      return go(res.data.error === "not_you" || res.data.error === "bad_links" ? "who" : "questions", ERRORS[res.data.error ?? ""] ?? "Something went wrong. Tell us instead?");
    }
    if (!res.data.findings.length) {
      setOrigin("questions");
      return go("questions", "Nothing public turned up. That's fine: tell us instead.");
    }
    setFindings(res.data.findings);
    setFindWorkings(res.data.workingsId);
    setMine({});
    go("pick");
  }

  async function makeDraft() {
    go("drafting");
    const kept = findings.filter((f) => mine[f.url + f.text]).map(({ text, url }) => ({ text, url }));
    const res = await api<{ lines: Line[] }>("POST", "/api/me/compass/draft", { kept, answers });
    if (res.status !== 200) return go("questions", "Something went wrong. Try again?");
    if (!res.data.lines.length) return go("questions", "Nothing to draft yet. Tick something that's you, or answer a question.");
    setLines(res.data.lines);
    go("draft");
  }

  async function looksRight() {
    const res = await api("POST", "/api/me/compass/confirm", { lines, origin });
    if (res.status !== 200) return setNote("Keep at least one line.");
    go("saved");
  }

  const several = new Set(findings.map((f) => f.source)).size < findings.length || findings.some((f) => /namesake|another|different/i.test(f.text));

  return (
    <Screen title="Get started">
      {step === "ask" && (
        <>
          <h1 class="screen-title">Want a head start?</h1>
          <p class="lcd-block">Hoolala! can look at what's public about you online to guess what you like talking about. OK?</p>
          <ul class="key-list">
            <li><button class="lcd-key lcd-key--primary" type="button" onClick={() => { setOrigin("find_me"); go("who"); }}>Yes, have a look</button></li>
            <li><button class="lcd-key" type="button" onClick={() => { setOrigin("questions"); go("questions"); }}>No, I'll tell you</button></li>
          </ul>
          <p class="lcd-small">Only you see this. We keep the compass, not the search. We only look you up, at most three times, and never log in anywhere.</p>
        </>
      )}

      {step === "who" && (
        <form onSubmit={lookMeUp} noValidate>
          <h1 class="screen-title">Who are you online?</h1>
          <label class="lcd-label" for="fm-name">The name you use online</label>
          <input class="lcd-field" id="fm-name" maxLength={80} required value={name} onInput={(e) => setName(e.currentTarget.value)} />
          <label class="lcd-label" for="fm-town">Town (optional)</label>
          <input class="lcd-field" id="fm-town" maxLength={60} value={town} onInput={(e) => setTown(e.currentTarget.value)} placeholder="Lausanne" />
          <label class="lcd-label" for="fm-link-0">Your links (optional, up to 3)</label>
          <div class="field-stack">
          {links.map((l, i) => (
            <input class="lcd-field" id={`fm-link-${i}`} key={i} type="url" inputMode="url" value={l} placeholder="https://..."
              onInput={(e) => setLinks(links.map((x, j) => (j === i ? e.currentTarget.value : x)))} />
          ))}
          </div>
          <ul class="key-list">
            <li><button class="lcd-key lcd-key--primary" type="submit">Look me up</button></li>
            <li><button class="lcd-key" type="button" onClick={() => go("ask")}>Back</button></li>
          </ul>
          <p class="lcd-small">Your own site, Substack, GitHub or a public profile page. We read what's public; we never log in to any network.</p>
        </form>
      )}

      {(step === "looking" || step === "drafting") && (
        <p class="lcd-kicker" role="status">{step === "looking" ? "Looking you up. Politely..." : "Drafting your compass..."}</p>
      )}

      {step === "pick" && (
        <>
          <h1 class="screen-title">Is this you?</h1>
          {several && <p class="lcd-small">Apparently there's more than one of you. Tick only what's really you.</p>}
          <ul class="lcd-menu">
            {findings.map((f) => {
              const key = f.url + f.text;
              return (
                <li class="lcd-block idea" key={key}>
                  <p>{f.text}</p>
                  <p class="lcd-small"><a href={f.url} target="_blank" rel="noopener noreferrer">&gt; {f.source}</a></p>
                  <div class="chips" role="group" aria-label="Is this you?">
                    <button class={`lcd-key${mine[key] === true ? " lcd-key--primary" : ""}`} type="button" aria-pressed={mine[key] === true} onClick={() => setMine({ ...mine, [key]: true })}>That's me</button>
                    <button class={`lcd-key${mine[key] === false ? " lcd-key--primary" : ""}`} type="button" aria-pressed={mine[key] === false} onClick={() => setMine({ ...mine, [key]: false })}>Not me</button>
                  </div>
                </li>
              );
            })}
          </ul>
          <Workings id={findWorkings} />
          <ul class="key-list">
            <li><button class="lcd-key lcd-key--primary" type="button" onClick={() => go("questions")}>Next</button></li>
          </ul>
        </>
      )}

      {step === "questions" && (
        <form onSubmit={(e) => { e.preventDefault(); makeDraft(); }} noValidate>
          <h1 class="screen-title">{origin === "questions" ? "Three quick questions" : "Anything to add?"}</h1>
          <label class="lcd-label" for="q-talk">What could you talk about for an hour?</label>
          <input class="lcd-field" id="q-talk" maxLength={200} value={answers.talk} onInput={(e) => setAnswers({ ...answers, talk: e.currentTarget.value })} placeholder="chess, cycling, sourdough" />
          <label class="lcd-label" for="q-more">What would you like more of?</label>
          <input class="lcd-field" id="q-more" maxLength={200} value={answers.more} onInput={(e) => setAnswers({ ...answers, more: e.currentTarget.value })} placeholder="board game evenings" />
          <label class="lcd-label" for="q-avoid">Anything you'd rather not talk about?</label>
          <input class="lcd-field" id="q-avoid" maxLength={200} value={answers.avoid} onInput={(e) => setAnswers({ ...answers, avoid: e.currentTarget.value })} placeholder="work talk" />
          <ul class="key-list">
            <li><button class="lcd-key lcd-key--primary" type="submit">Draft my compass</button></li>
          </ul>
          <p class="lcd-small">Separate things with commas. Skip any you like.</p>
        </form>
      )}

      {step === "draft" && (
        <>
          <h1 class="screen-title">Your world, according to you.</h1>
          <ul class="lcd-menu">
            {lines.map((l, i) => (
              <li class="lcd-block idea" key={l.part + l.text}>
                <p class="lcd-kicker">{PART_LABEL[l.part] ?? l.part}</p>
                <p>{l.text}</p>
                <div class="tiny-actions">
                  <span class="lcd-small">{l.sourceUrl ? <a href={l.sourceUrl} target="_blank" rel="noopener noreferrer">from: {l.source}</a> : "you said"}</span>
                  <button type="button" onClick={() => setLines(lines.filter((_, j) => j !== i))}>Remove</button>
                </div>
              </li>
            ))}
          </ul>
          <ul class="key-list">
            <li><button class="lcd-key lcd-key--primary" type="button" onClick={looksRight} disabled={!lines.length}>Looks right</button></li>
            <li><button class="lcd-key" type="button" onClick={() => { setLines([]); setFindings([]); go("ask"); }}>Start again</button></li>
          </ul>
          <p class="lcd-small">Only you see this. It shapes your own topic ideas and puts signals that fit you first, for you. Never shown to anyone, never used to match people.</p>
        </>
      )}

      {step === "saved" && (
        <>
          <h1 class="screen-title">Saved</h1>
          <p class="lcd-block">That's your compass{me?.firstName ? `, ${me.firstName}` : ""}. Change it any time in My compass.</p>
          <ul class="key-list">
            <li><a class="lcd-key lcd-key--primary" href="/arrive">Where are you?</a></li>
            <li><a class="lcd-key" href="/compass">My compass</a></li>
          </ul>
        </>
      )}

      <p class="lcd-small" role="status" aria-live="polite">{note}</p>
    </Screen>
  );
}
