// The PM agent. Rule-based, runs as .github/workflows/pm.yml.
// Reads docs/BUILD-PLAN.md checkboxes, branch state and repo hygiene, then
// updates the pinned "Build status" issue. DRY_RUN=1 prints instead of posting.
// It reports and flags; it never merges, closes or assigns (human in control).

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const ROOT = new URL("..", import.meta.url).pathname;
const DRY_RUN = process.env.DRY_RUN === "1";
const REPO = process.env.GITHUB_REPOSITORY || "uwazzi/hoolala";
const STATUS_TITLE = "Build status (updated by the PM agent)";

function sh(cmd, args) {
  try {
    return execFileSync(cmd, args, {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

// --- 1. Work-package progress from BUILD-PLAN.md checkboxes ------------------
const plan = readFileSync(ROOT + "docs/BUILD-PLAN.md", "utf8");
const sections = plan.split(/^### /m).slice(1);
const packages = [];
for (const section of sections) {
  const title = section.split("\n")[0].trim();
  if (!/^WP\d/.test(title)) continue;
  const open = (section.match(/- \[ \]/g) || []).length;
  const done = (section.match(/- \[x\]/g) || []).length;
  const total = open + done;
  const status = total === 0 ? "no checklist" : done === 0 ? "not started" : open === 0 ? "done" : "in progress";
  packages.push({ title, done, total, status });
}

// --- 2. Branch state ----------------------------------------------------------
const stagingAhead = sh("git", ["rev-list", "--count", "origin/main..origin/staging"]);
const stagingDiff = sh("git", ["diff", "--stat", "origin/main...origin/staging"]);
const recentBranches = sh("git", ["branch", "-r", "--sort=-committerdate"])
  .split("\n").map((b) => b.trim()).filter((b) => b && !b.includes("->")).slice(0, 8);

// --- 3. Hygiene ---------------------------------------------------------------
const branchesKnown = sh("git", ["rev-parse", "--verify", "origin/staging"]) !== "";
const recentCommits = branchesKnown
  ? sh("git", ["log", "origin/main..origin/staging", "--format=%H %s"])
  : "";
const priorTouched = branchesKnown
  ? sh("git", ["diff", "--name-only", "origin/main...origin/staging"])
    .split("\n").filter((f) => f.startsWith("prior-work/"))
  : [];
const commits = recentCommits ? recentCommits.split("\n") : [];
const missingTrailer = [];
for (const line of commits) {
  const hash = line.split(" ")[0];
  const body = sh("git", ["log", "-1", "--format=%B", hash]);
  if (!/^Agent: /m.test(body)) missingTrailer.push(line);
}

// --- 4. Token consumption from D1 (needs Cloudflare secrets) --------------------
async function tokenReport() {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const account = process.env.CLOUDFLARE_ACCOUNT_ID;
  const database = process.env.D1_DATABASE_ID;
  if (!token || !account || !database) {
    return ["- not checked: add the CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID and D1_DATABASE_ID secrets."];
  }
  try {
    const query = async (sql, params = []) => {
      const res = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${account}/d1/database/${database}/query`,
        {
          method: "POST",
          headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
          body: JSON.stringify({ sql, params }),
        },
      );
      const body = await res.json();
      if (!body.success) throw new Error((body.errors || []).map((e) => e.message).join("; ") || "D1 query failed");
      return body.result[0].results;
    };
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const [totals] = await query(
      "SELECT COUNT(*) AS calls, COALESCE(SUM(prompt_tokens), 0) AS prompt, COALESCE(SUM(completion_tokens), 0) AS completion FROM llm_calls",
    );
    const [burn] = await query(
      "SELECT COUNT(*) AS calls, COALESCE(SUM(prompt_tokens), 0) + COALESCE(SUM(completion_tokens), 0) AS tokens FROM llm_calls WHERE created_at > ?",
      [dayAgo],
    );
    const byPurpose = await query(
      "SELECT purpose, COUNT(*) AS calls, COALESCE(SUM(prompt_tokens), 0) + COALESCE(SUM(completion_tokens), 0) AS tokens FROM llm_calls GROUP BY purpose ORDER BY tokens DESC",
    );
    const total = totals.prompt + totals.completion;
    const lines = [
      `- ${totals.calls} calls, ${total.toLocaleString("en-GB")} tokens in total; last 24 h: ${burn.calls} calls, ${burn.tokens.toLocaleString("en-GB")} tokens.`,
    ];
    for (const row of byPurpose.slice(0, 8)) {
      lines.push(`  - ${row.purpose}: ${row.calls} calls, ${row.tokens.toLocaleString("en-GB")} tokens.`);
    }
    const budget = Number(process.env.LLM_TOKEN_BUDGET || "0");
    if (budget > 0) {
      const pct = Math.round((total / budget) * 100);
      lines.push(`- budget: ${pct}% of ${budget.toLocaleString("en-GB")} tokens.${pct >= 80 ? " OVER 80%: slow down or raise the budget." : pct >= 50 ? " Over half spent." : ""}`);
    } else {
      lines.push("- no LLM_TOKEN_BUDGET set: reporting use only.");
    }
    return lines;
  } catch (err) {
    return [`- check failed (${String((err && err.message) || err).slice(0, 120)}).`];
  }
}

// --- 5. Report ----------------------------------------------------------------
const today = new Date().toISOString().slice(0, 10);
const lines = [];
lines.push(`# Build status, ${today}`);
lines.push("");
lines.push("| Package | Done | Status |");
lines.push("|---|---|---|");
for (const p of packages) {
  lines.push(`| ${p.title} | ${p.done}/${p.total} | ${p.status} |`);
}
lines.push("");
lines.push(`staging is ${stagingAhead || "?"} commits ahead of main.`);
lines.push("");
lines.push("<details><summary>staging diff stat</summary>");
lines.push("");
lines.push("```");
lines.push(stagingDiff || "(branches unavailable)");
lines.push("```");
lines.push("</details>");
lines.push("");
lines.push("Recent branches: " + (recentBranches.join(", ") || "(none listed)"));
lines.push("");
lines.push("## Hygiene");
if (!branchesKnown) {
  lines.push("- not checked: origin/staging not pushed yet.");
} else {
  lines.push(priorTouched.length === 0
    ? "- prior-work/ untouched since main. Good."
    : `- PRIOR-WORK TOUCHED: ${priorTouched.join(", ")}`);
  lines.push(missingTrailer.length === 0
    ? "- every staging commit carries an Agent: trailer."
    : `- missing Agent: trailer (${missingTrailer.length}):\n${missingTrailer.map((c) => `  - ${c}`).join("\n")}`);
}
lines.push("");
lines.push("## Token consumption");
for (const line of await tokenReport()) lines.push(line);
lines.push("");
lines.push("_Posted by the PM agent (`scripts/pm.mjs`). It reports; humans merge._");
const report = lines.join("\n");

// --- 6. Publish ---------------------------------------------------------------
if (DRY_RUN) {
  console.log(report);
} else {
  const existing = sh("gh", ["issue", "list", "--repo", REPO, "--search", `"${STATUS_TITLE}" in:title`, "--json", "number", "--jq", ".[0].number"]);
  if (existing) {
    sh("gh", ["issue", "edit", existing, "--repo", REPO, "--body", report]);
    console.log(`updated issue #${existing}`);
  } else {
    sh("gh", ["issue", "create", "--repo", REPO, "--title", STATUS_TITLE, "--body", report, "--label", "pm"]);
    console.log("created status issue");
  }
}

if (priorTouched.length > 0) {
  console.error("FAIL: prior-work/ changed since main; see report.");
  process.exit(1);
}
