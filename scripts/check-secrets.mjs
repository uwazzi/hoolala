// Fails if any tracked file looks like it contains an API key or private key.
// Usage: npm run check:secrets. Runs in CI. See docs/SECRETS.md.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const PATTERNS = [
  ["Resend key", /\bre_[A-Za-z0-9_]{20,}/],
  ["GitHub token", /\b(gh[opsu]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})/],
  ["Google API key", /\bAIza[0-9A-Za-z_-]{30,}/],
  ["Telegram bot token", /\b[0-9]{8,10}:AA[0-9A-Za-z_-]{30,}/],
  ["sk- style API key", /\bsk-[A-Za-z0-9_-]{20,}/],
  ["Private key", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ["Key assigned in a file", /\b[A-Z0-9_]*(API_KEY|_TOKEN|_SECRET|PASSWORD)\s*[=:]\s*["']?[A-Za-z0-9_\-./+]{16,}/],
];

const ASSIGNED = /\b[A-Z0-9_]*(?:API_KEY|_TOKEN|_SECRET|PASSWORD)\s*[=:]\s*["']?([A-Za-z0-9_\-./+]{16,})/g;

/** True when every key-like assignment on the line reads from the environment. */
function onlyReadsEnv(line) {
  const values = [...line.matchAll(ASSIGNED)].map((m) => m[1]);
  return values.length > 0 && values.every((v) => /^(process\.env|import\.meta\.env|env)\./.test(v));
}

// Lock files hold integrity hashes; this script holds the patterns themselves.
const SKIP = new Set(["package-lock.json", "scripts/check-secrets.mjs"]);

const files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter((f) => f && !SKIP.has(f) && !f.startsWith("prior-work/"));

const findings = [];
for (const file of files) {
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  if (text.includes("\0")) continue; // binary
  text.split("\n").forEach((line, i) => {
    for (const [name, re] of PATTERNS) {
      if (!re.test(line)) continue;
      // Reading a key from the environment is how it should be done, not a leak.
      if (name === "Key assigned in a file" && onlyReadsEnv(line)) continue;
      findings.push(`${file}:${i + 1}  ${name}`);
    }
  });
}

if (findings.length > 0) {
  console.error("check:secrets found what looks like a key (value not shown):");
  for (const f of findings) console.error(`  ${f}`);
  console.error("Remove it, then revoke and rotate the key: docs/SECRETS.md, 'If a key leaks'.");
  process.exit(1);
}
console.log(`check:secrets: ${files.length} tracked files, no keys found`);
