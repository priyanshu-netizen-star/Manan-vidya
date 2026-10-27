/**
 * Visual check: screenshots of key pages at phone and desktop widths against a running server.
 *   node scripts/screens.mjs [http://localhost:3210]
 * Writes PNGs to test-results/screens/visual-*.png and reports any horizontal overflow.
 */
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

const ORIGIN = process.argv[2] || "http://localhost:3210";
const B = `${ORIGIN}/mananvidyademo`;
const exe = ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "/usr/bin/google-chrome", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"].find((p) => existsSync(p));
const out = path.join("test-results", "screens");
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: exe, headless: true });
const pages = [["proposal", "", null], ["login", "/login", null], ["admissions", "/admissions", null], ["dashboard", "/app", "student"], ["study", "/app/study?topic=4", "student"]];
let problems = 0;
for (const [w, h, label] of [[1440, 900, "desktop"], [390, 844, "mobile"]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  let signedIn = false;
  for (const [name, p, account] of pages) {
    if (account && !signedIn) {
      signedIn = true;
      await page.goto(`${B}/login`);
      await page.click(`[data-account="${account}"]`);
      await page.waitForURL(/\/app$/);
    }
    await page.goto(`${B}${p}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(400);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (overflow > 1) { problems++; console.log(`OVERFLOW ${name} ${label}: ${overflow}px`); }
    await page.screenshot({ path: path.join(out, `visual-${name}-${label}.png`), fullPage: name === "proposal" });
    console.log(`shot ${name} ${label}`);
  }
  await ctx.close();
}
await browser.close();
console.log(problems ? `${problems} overflow problem(s)` : "No horizontal overflow");
