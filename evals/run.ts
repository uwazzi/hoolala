// npm run eval        Offline cases (our rules). Runs in CI before every deploy; any failure exits 1.
// npm run eval:live   Also calls Muse Spark (needs META_API_KEY in the environment) and writes
//                     evals/results/latest.json for the README: pass rate, latency, fallback rate.
// No personal data is printed or written.

import { mkdirSync, writeFileSync } from "node:fs";
import { planMeeting } from "../src/llm/agent";
import { placeIt } from "../src/llm/place";
import { validateReadIt } from "../src/llm/readit";
import { screenWithModel } from "../src/llm/screen";
import { suggestFor } from "../src/llm/suggest";
import { validateWhyGo } from "../src/llm/whygo";
import { cleanRole, validateDraft } from "../src/rules/compass";
import { ground, resolveCitation } from "../src/rules/grounding";
import { checkDraft, claimsAction } from "../src/rules/plan";
import { confirmProblem, underCap } from "../src/rules/places";
import { screenText } from "../src/rules/screening";
import { validateTry } from "../src/rules/tries";
import type { Env } from "../src/types";
import { READIT_CASES, SCREEN_MODEL, SCREEN_RULES, SUGGEST_PLACES, TRY_CASES, WHYGO_CASES, WHYGO_PLACE } from "./cases";

interface Result {
  suite: string;
  name: string;
  pass: boolean;
  live: boolean;
  ms?: number;
  fallback?: boolean;
  detail?: string;
}

const results: Result[] = [];
const record = (r: Result) => {
  results.push(r);
  console.log(`${r.pass ? "PASS" : "FAIL"}  ${r.suite.padEnd(10)} ${r.name}${r.ms !== undefined ? `  (${r.ms} ms)` : ""}${r.pass || !r.detail ? "" : `  -> ${r.detail}`}`);
};

// --- Offline: our own rules ---------------------------------------------------

for (const c of SCREEN_RULES) {
  const r = screenText(c.text, 60);
  record({ suite: "screen", name: c.why, live: false, pass: !r.ok && r.category === c.category, detail: `got ${r.category ?? "approved"}` });
}

const pages = [
  { url: "https://en.wikipedia.org/wiki/Git", title: "Git - Wikipedia", snippet: "distributed version control system created in 2005" },
  { url: "https://www.lausanne-tourisme.ch/agenda/jazz", title: "Jazz Onze+", snippet: "Jazz festival in Lausanne" },
];
record({
  suite: "grounding",
  name: "An event without a returned citation is dropped",
  live: false,
  pass: ground([{ topic: "Big gala tonight?", why: "", kind: "event", citation_url: null }], pages).ideas.length === 0,
});
record({
  suite: "grounding",
  name: "An event citing a site the search never returned is dropped",
  live: false,
  pass: ground([{ topic: "Concert tonight?", why: "", kind: "event", citation_url: "https://made-up.example/c" }], pages).ideas.length === 0,
});
record({
  suite: "grounding",
  name: "A site-only citation is resolved to the page that matches",
  live: false,
  pass: resolveCitation("https://en.wikipedia.org", "Created the version control system Git", pages) === pages[0].url,
});
record({
  suite: "grounding",
  name: "A citation on an idea that names nothing is stripped if not returned",
  live: false,
  pass: ground([{ topic: "Board games?", why: "", kind: "general", citation_url: "https://x.example" }], pages).ideas[0]?.citationUrl === null,
});
record({
  suite: "grounding",
  name: "A grounded event keeps its exact page",
  live: false,
  pass: ground([{ topic: "Jazz Onze+ tonight?", why: "Jazz festival", kind: "event", citation_url: "https://www.lausanne-tourisme.ch/agenda/jazz" }], pages).ideas[0]?.citationUrl === pages[1].url,
});

record({ suite: "compassdraft", name: "Roles only: brother Tom becomes brother", live: false, pass: cleanRole("brother Tom") === "brother" });
record({ suite: "compassdraft", name: "Roles only: a bare name is dropped", live: false, pass: cleanRole("Tom") === null });
record({
  suite: "compassdraft",
  name: "The part matches the question",
  live: false,
  pass: validateDraft("interest", { part: "delivery", line: "Slow evenings" }) === null,
});
record({
  suite: "compassdraft",
  name: "What happened, never who the person is",
  live: false,
  pass: validateDraft("interest", { part: "interest", line: "You are an extrovert" }) === null,
});
for (const [label, text] of [
  ["personality", "Introvert at heart"],
  ["health", "Living with ADHD"],
  ["political", "Conservative values"],
  ["religious", "Catholique pratiquante"],
] as const) {
  record({ suite: "compassdraft", name: `Never keeps a ${label} label`, live: false, pass: validateDraft("interest", { part: "interest", line: text }) === null });
}

const planCtx = { spots: ["Terrace", "The big table"], now: new Date("2026-10-28T14:00:00.000Z"), expiresAt: "2026-10-28T15:00:00.000Z" };
record({ suite: "plan", name: "Never returns 'sent' or 'confirmed'", live: false, pass: claimsAction("Sent to Ben, confirmed for 15:10") && !claimsAction("Quieter and near the counter") });
record({ suite: "plan", name: "Only real spots", live: false, pass: checkDraft("Rooftop", "2026-10-28T14:10:00.000Z", planCtx) === null });
record({ suite: "plan", name: "Never after the signal ends", live: false, pass: checkDraft("Terrace", "2026-10-28T15:30:00.000Z", planCtx) === null });

record({
  suite: "place",
  name: "Never keeps a menu item without a page the search returned",
  live: false,
  pass: resolveCitation("https://made-up.example/menu", "Truffle croissant CHF 9", pages, [], { sameSiteFallback: true }) === null,
});
record({ suite: "place", name: "No points for confirming your own detail", live: false, pass: confirmProblem({ added_by: "ana", state: "found" }, "ana", true, false) === "own" });
record({ suite: "place", name: "Points stop at 30 a day", live: false, pass: underCap(28, 5) === 2 && underCap(30, 2) === 0 });

for (const c of TRY_CASES) {
  const got = validateTry(c.draft, c.ask);
  record({ suite: "tryit", name: c.name, live: false, pass: got === c.expect, detail: `got ${got}` });
}

for (const c of WHYGO_CASES) {
  const kept = validateWhyGo(c.value, [WHYGO_PLACE]);
  const got = kept === null ? -1 : kept.length;
  record({ suite: "whygo", name: c.name, live: false, pass: got === c.keep, detail: `kept ${got}` });
}

for (const c of READIT_CASES) {
  const got = validateReadIt(c.value, c.page);
  const pass =
    c.expect === null ? got === null : got !== null && JSON.stringify(got.items) === JSON.stringify(c.expect.items) && got.hours === c.expect.hours;
  record({ suite: "readit", name: c.name, live: false, pass, detail: `got ${JSON.stringify(got)}` });
}

// --- Live: Muse Spark ---------------------------------------------------------

const live = process.argv.includes("--live");
if (live) {
  if (!process.env.META_API_KEY) {
    console.error("eval:live needs META_API_KEY in the environment.");
    process.exit(2);
  }
  const kv = new Map<string, string>();
  const env = {
    LLM_ENABLED: "true",
    META_API_KEY: process.env.META_API_KEY,
    META_API_BASE: process.env.META_API_BASE ?? "https://api.meta.ai/v1",
    MUSE_SPARK_MODEL: process.env.MUSE_SPARK_MODEL ?? "muse-spark-1.3",
    // Accounting rows aren't needed here.
    DB: { prepare: () => ({ bind: () => ({ run: async () => ({ success: true }) }) }) },
    SESSIONS: { get: async (k: string) => kv.get(k) ?? null, put: async (k: string, v: string) => void kv.set(k, v), delete: async (k: string) => void kv.delete(k) },
  } as unknown as Env;

  // SCREEN IT runs the way production does: code rules first, then the model.
  for (const c of [...SCREEN_RULES.slice(0, 2), ...SCREEN_MODEL]) {
    const started = Date.now();
    const rules = screenText(c.text, 60);
    let verdict: "approve" | "reject";
    let category: string | null;
    let fallback = false;
    if (!rules.ok) {
      verdict = "reject";
      category = rules.category;
    } else {
      const ai = await screenWithModel(env, c.text);
      fallback = ai === null;
      verdict = ai?.verdict ?? "approve";
      category = ai?.verdict === "reject" ? ai.category : null;
      if (c.expect === "approve" && ai && !(ai.en && ai.fr)) category = "missing translation";
    }
    // Pass = the right verdict (approvals also need their translations). A refusal
    // under another category still protects people; it is shown, not hidden.
    const pass = verdict === c.expect && (c.expect === "reject" || category === null);
    const note = c.expect === "reject" && pass && c.category && category !== c.category ? ` (category ${category}, expected ${c.category})` : "";
    record({ suite: "screen", name: `${c.why}${note}`, live: true, ms: Date.now() - started, fallback, pass, detail: `got ${verdict}${category ? `/${category}` : ""}` });
  }

  for (const p of SUGGEST_PLACES) {
    const started = Date.now();
    const s = await suggestFor(env, p, p.spots, new Date());
    const ok = s.source === "ai" && s.ideas.length >= 2 && s.ideas.every((i) => i.topic.length <= 60);
    record({ suite: "suggest", name: `Grounded ideas for ${p.name}`, live: true, ms: Date.now() - started, fallback: s.source !== "ai", pass: ok, detail: `${s.source}, ${s.ideas.length} ideas, ${s.grounded}/${s.total} grounded` });
  }

  {
    const started = Date.now();
    const now = new Date();
    const expires = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
    const spots = ["Terrace", "The big table", "By the window"];
    const d = await planMeeting(env, {
      signal: { topic: "Chess at the big table?", when_at: new Date(now.getTime() + 20 * 60 * 1000).toISOString(), spot: "The big table", capacity: 2, expires_at: expires },
      accepted: 1,
      spots,
      hours: null,
      replies: [{ from: "responder", kind: "five_late", at: now.toISOString() }],
      now,
    });
    const ok =
      d !== null && d.source === "ai" && spots.includes(d.spot) && Date.parse(d.time) <= Date.parse(expires) && d.toolOrder.at(-1) === "draft_meeting_point" && d.toolOrder.length > 1 && !(d.why && claimsAction(d.why));
    record({
      suite: "plan",
      name: "Reads through its tools, then drafts a real spot and time",
      live: true,
      ms: Date.now() - started,
      fallback: d?.source !== "ai",
      pass: ok,
      detail: d ? `${d.source}: ${d.toolOrder.join(" > ")}` : "no draft",
    });
  }

  {
    const started = Date.now();
    const p = await placeIt(env, { name: "Café Le Barbare", kind: "cafe", city: "Lausanne" });
    const ok = p !== null && p.facts.length > 0 && p.facts.every((x) => x.url.startsWith("https://")) && p.searches <= 2;
    record({
      suite: "place",
      name: "A real café: sourced details, at most 2 searches",
      live: true,
      ms: Date.now() - started,
      fallback: p === null,
      pass: ok,
      detail: p ? `${p.facts.length} kept of ${p.total}, ${p.searches} searches` : "no answer",
    });
  }

}

// --- Summary --------------------------------------------------------------------

const offline = results.filter((r) => !r.live);
const liveResults = results.filter((r) => r.live);
const rate = (rs: Result[]) => (rs.length ? Math.round((rs.filter((r) => r.pass).length / rs.length) * 100) : null);
const median = (xs: number[]) => (xs.length ? xs.sort((a, b) => a - b)[Math.floor(xs.length / 2)] : null);
const bySuite = (rs: Result[]) =>
  Object.fromEntries(
    [...new Set(rs.map((r) => r.suite))].map((s) => {
      const xs = rs.filter((r) => r.suite === s);
      return [s, { pass: xs.filter((r) => r.pass).length, of: xs.length, medianMs: median(xs.map((r) => r.ms).filter((m): m is number => m !== undefined)) }];
    }),
  );

console.log("");
console.log(`evals: offline ${offline.filter((r) => r.pass).length}/${offline.length} passing (${rate(offline)}%)`);
if (live) {
  const fallbacks = liveResults.filter((r) => r.fallback).length;
  console.log(`evals: live ${liveResults.filter((r) => r.pass).length}/${liveResults.length} passing (${rate(liveResults)}%), fallback ${fallbacks}/${liveResults.length}`);
  mkdirSync("evals/results", { recursive: true });
  writeFileSync(
    "evals/results/latest.json",
    JSON.stringify(
      {
        ranAt: new Date().toISOString(),
        model: process.env.MUSE_SPARK_MODEL ?? "muse-spark-1.3",
        total: { pass: results.filter((r) => r.pass).length, of: results.length, percent: rate(results) },
        offline: { pass: offline.filter((r) => r.pass).length, of: offline.length },
        live: { pass: liveResults.filter((r) => r.pass).length, of: liveResults.length, fallbackRate: liveResults.length ? fallbacks / liveResults.length : null },
        suites: bySuite(results),
        cases: results.map(({ suite, name, pass, live: l, ms }) => ({ suite, name, pass, live: l, ms })),
      },
      null,
      2,
    ) + "\n",
  );
  console.log("evals: wrote evals/results/latest.json");
}

if (offline.some((r) => !r.pass)) process.exit(1);
