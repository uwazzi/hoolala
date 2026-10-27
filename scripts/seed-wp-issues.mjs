// Seeds one GitHub issue per work package from docs/BUILD-PLAN.md.
// Run on a machine with gh authenticated:  node scripts/seed-wp-issues.mjs
// DRY_RUN=1 prints what it would create. Safe to re-run: skips titles that exist.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const ROOT = new URL("..", import.meta.url).pathname;
const DRY_RUN = process.env.DRY_RUN === "1";

function sh(cmd, args) {
  return execFileSync(cmd, args, { cwd: ROOT, encoding: "utf8" }).trim();
}

const plan = readFileSync(ROOT + "docs/BUILD-PLAN.md", "utf8");
const sections = plan.split(/^### /m).slice(1);
let existingTitles = [];
try {
  existingTitles = sh("gh", ["issue", "list", "--limit", "100", "--json", "title", "--jq", ".[].title"])
    .split("\n").map((t) => t.trim());
} catch {
  if (!DRY_RUN) throw new Error("gh issue list failed; is gh authenticated?");
}
const existing = new Set(existingTitles);

for (const section of sections) {
  const [heading, ...rest] = section.split("\n");
  const title = heading.trim();
  if (!/^WP\d/.test(title)) continue;
  const day = (title.match(/\(([^)]+)\)/) || [])[1] || "";
  const issueTitle = `${title}`;
  if (existing.has(issueTitle)) {
    console.log(`skip (exists): ${issueTitle}`);
    continue;
  }
  const checklist = rest.filter((l) => /^- \[[ x]\]/.test(l)).join("\n");
  const body = [
    `Work package from docs/BUILD-PLAN.md${day ? ` (${day})` : ""}.`,
    "",
    "Rules: one package at a time (`AGENTS.md`); test first for `src/rules/` and permission checks;",
    "`npm test` and `npm run typecheck` pass before merging; works with `LLM_ENABLED=false`;",
    "nothing in `prior-work/`; commits end with an `Agent:` trailer.",
    "",
    checklist,
  ].join("\n");
  if (DRY_RUN) {
    console.log(`--- would create: ${issueTitle} ---`);
  } else {
    sh("gh", ["issue", "create", "--title", issueTitle, "--body", body, "--label", "work-package"]);
    console.log(`created: ${issueTitle}`);
  }
}
