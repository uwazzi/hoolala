// WP65-1 print check: /posters/print prints as exactly one A4 page, the QR
// fully inside it, no app chrome, colours forced. Needs a Chrome install
// (local run, like smoke.mjs): node scripts/poster-pdf.mjs [base-url].
// Chrome cannot launch inside restricted sandboxes; run it on your machine.
import { chromium } from "playwright-core";

const base = process.argv[2] ?? "https://staging.hoolala.hg-labs.io";
let failed = 0;

function check(ok, label) {
  console.log(`${ok ? "PASS" : "FAIL"} ${label}`);
  if (!ok) failed += 1;
}

function pageCount(pdf) {
  return (pdf.toString("latin1").match(/\/Type\s*\/Page([^s]|$)/g) || []).length;
}

async function checkVariant(browser, query, label, { saver, hookLine }) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1600 } });
  await page.goto(`${base}/posters/print${query}`, { waitUntil: "networkidle" });
  await page.waitForSelector(".poster", { timeout: 15000 });
  if (hookLine) check((await page.textContent(".poster-hook"))?.includes(hookLine), `${label}: hook prints`);
  await page.emulateMedia({ media: "print" });
  check((await page.locator(".brand-bar, .lcd-softkeys, .brand-footer").count()) === 0, `${label}: no app chrome`);
  const poster = await page.locator(".poster").boundingBox();
  const qr = await page.locator(".poster-qr-paper svg").boundingBox();
  check(
    !!poster && !!qr && qr.x >= poster.x && qr.y >= poster.y && qr.x + qr.width <= poster.x + poster.width && qr.y + qr.height <= poster.y + poster.height,
    `${label}: QR fully inside the poster`,
  );
  const bg = await page.evaluate(() => getComputedStyle(document.querySelector(".poster")).backgroundColor);
  check(bg === (saver ? "rgb(255, 255, 255)" : "rgb(190, 211, 156)"), `${label}: paper ${saver ? "white" : "LCD green"}`);
  const fills = await page.evaluate(() => {
    const svg = document.querySelector(".poster-qr-paper svg");
    return { paper: getComputedStyle(svg.querySelector("rect")).fill, ink: getComputedStyle(svg.querySelector("path")).fill };
  });
  check(fills.ink === "rgb(24, 37, 19)" && fills.paper !== fills.ink, `${label}: QR dark on light`);
  const pdf = await page.pdf({ format: "A4", printBackground: true });
  check(pageCount(pdf) === 1, `${label}: exactly one A4 page (got ${pageCount(pdf)})`);
  await page.close();
}

const browser = await chromium.launch({ channel: "chrome", args: ["--no-sandbox", "--disable-dev-shm-usage"] });
try {
  await checkVariant(browser, "?hook=0", "green", { saver: false, hookLine: "SAME PLACE." });
  await checkVariant(browser, "?hook=own&text=Same%20coffee%2C%20every%20morning.%20Hi%3F&place=Caf%C3%A9%20du%20Coin", "own-hook", {
    saver: false,
    hookLine: "SAME COFFEE,",
  });
  await checkVariant(browser, "?hook=1&paper=saver", "saver", { saver: true, hookLine: "SOMEONE HERE" });
} finally {
  await browser.close();
}
if (failed) {
  console.log(`poster-pdf: ${failed} check(s) failing on ${base}`);
  process.exit(1);
}
console.log(`poster-pdf: all passing on ${base}`);
