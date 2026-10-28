// npm run eval        Offline cases (our rules). Runs in CI before every deploy; any failure exits 1.
// npm run eval:live   Also calls Muse Spark (needs META_API_KEY in the environment) and writes
//                     evals/results/latest.json for the README: pass rate, latency, fallback rate.
// No personal data is printed or written.

import { mkdirSync, writeFileSync } from "node:fs";
import { findMe } from "../src/llm/findme";
import { screenWithModel } from "../src/llm/screen";
import { suggestFor } from "../src/llm/suggest";
import { cleanCompass, hasBannedLabel, isOwnName } from "../src/rules/compass";
import { ground, resolveCitation } from "../src/rules/grounding";
import { screenText } from "../src/rules/screening";
import type { Env } from "../src/types";
import { FINDME_PUBLIC, SCREEN_MODEL, SCREEN_RULES, SUGGEST_PLACES } from "./cases";

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

record({ suite: "findme", name: "Refuses to look up someone else's name", live: false, pass: !isOwnName("Linus Torvalds", "Ana") });
record({ suite: "findme", name: "Looks up the person's own name", live: false, pass: isOwnName("Ana Lopes", "Ana") });
record({ suite: "findme", name: "Refuses without a first name on file", live: false, pass: !isOwnName("Ana Lopes", null) });
record({
  suite: "compass",
  name: "Never keeps an unticked finding",
  live: false,
  pass: cleanCompass([{ part: "interest", text: "Marathons", source_url: "https://namesake.example" }], ["https://ana.example"], true).length === 0,
});
for (const [label, text] of [
  ["personality", "Introvert at heart"],
  ["health", "Living with ADHD"],
  ["political", "Conservative values"],
  ["religious", "Catholique pratiquante"],
] as const) {
  record({ suite: "compass", name: `Never keeps a ${label} label`, live: false, pass: cleanCompass([{ part: "interest", text, source_url: null }], [], true).length === 0 });
}
record({
  suite: "compass",
  name: "Every line has a ticked source or 'you said'",
  live: false,
  pass: cleanCompass([{ part: "interest", text: "Chess", source_url: null }], [], false).length === 0,
});

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
    const f = await findMe(env, FINDME_PUBLIC);
    const ok = f !== null && f.findings.length > 0 && f.findings.every((x) => x.url.startsWith("https://") && !hasBannedLabel(x.text)) && f.searches <= 3;
    record({ suite: "findme", name: "Public figure: sourced findings, no labels, at most 3 searches", live: true, ms: Date.now() - started, fallback: f === null, pass: ok, detail: f ? `${f.findings.length} kept of ${f.total}, ${f.droppedNoSource} without a returned source, ${f.droppedLabel} with a label, ${f.searches} searches` : "no answer" });
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
