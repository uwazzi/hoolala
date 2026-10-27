// Smoke test for a deployed Hoolala! URL. Usage: node scripts/smoke.mjs <base-url>
// Checks health, the home page, and that every response carries the CSP.
// Exit 1 on any failure.

const base = (process.argv[2] || "").replace(/\/+$/, "");
if (!/^https?:\/\//.test(base)) {
  console.error("usage: node scripts/smoke.mjs <base-url>");
  process.exit(2);
}

const failures = [];
function check(name, cond, detail = "") {
  console.log((cond ? "PASS " : "FAIL ") + name + (cond || !detail ? "" : ` (${detail})`));
  if (!cond) failures.push(name);
}

const healthRes = await fetch(base + "/api/health");
check("GET /api/health is 200", healthRes.status === 200, `got ${healthRes.status}`);
const health = await healthRes.json().catch(() => ({}));
check("health body is {ok:true}", health.ok === true);
for (const [name, url] of [["home", "/"], ["signin", "/signin.html"], ["live", "/live.html"]]) {
  const res = await fetch(base + url);
  const text = await res.text();
  check(`GET ${url} is 200 and mentions Hoolala!`, res.status === 200 && text.includes("Hoolala!"), `got ${res.status}`);
  const csp = res.headers.get("content-security-policy") || "";
  check(`${name} carries the Telegram CSP`, csp.includes("script-src 'self' https://telegram.org"), "CSP missing");
}
const apiCsp = healthRes.headers.get("content-security-policy") || "";
check("API carries the Telegram CSP", apiCsp.includes("script-src 'self' https://telegram.org"), "CSP missing");

if (failures.length > 0) {
  console.error(`smoke: ${failures.length} failing on ${base}`);
  process.exit(1);
}
console.log(`smoke: all passing on ${base}`);
