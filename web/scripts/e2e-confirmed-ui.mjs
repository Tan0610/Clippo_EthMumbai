// Browser end-to-end check of Confirmed vs Pending views against a REAL local backend (not demo data).
// Prereqs (see docs/CRE_SCOPE.md S3): local fork + `cre workflow simulate --broadcast`, a local database seeded with
// scripts/e2e-confirmed-seed.mjs, a dev server with ESCROW_ADDRESS pointing at the fork, and `POST /api/chain/sync` run once.
// Usage: node scripts/e2e-confirmed-ui.mjs [--base http://localhost:3100] [--out ./shots] [--campaign7 <id>]
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const arg = (k, d) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : d);
const BASE = arg("--base", "http://localhost:3100").replace(/\/$/, "");
const OUT = resolve(arg("--out", "./e2e-shots"));
const C7 = arg("--campaign7", "");
mkdirSync(OUT, { recursive: true });

const WALLET = { campaigner: "0xca00000000000000000000000000000000000002", a: "0x1111111111111111111111111111111111111111", b: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd" };
const results = [];
const check = (name, ok, detail = "") => { results.push({ name, ok }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  ${detail}` : ""}`); };

const browser = await chromium.launch();
async function session(wallet, role) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const r = await ctx.request.post(`${BASE}/api/auth/session`, { data: { wallet, role } });
  if (!r.ok()) throw new Error(`sign-in failed for ${wallet}: ${r.status()}`);
  return ctx;
}
const getJson = async (ctx, path) => (await ctx.request.get(`${BASE}${path}`)).json();
const text = async (page) => (await page.locator("body").innerText()).replace(/\s+/g, " ");

// ---- creator b: API numbers, then the ledger screen
const cb = await session(WALLET.b, "CREATOR");
const dash = await getJson(cb, "/api/dashboard/creator");
check("creator b API: confirmed 5300 / pending 750", dash.totals?.confirmedViews === 5300 && dash.totals?.pendingViews === 750, JSON.stringify({ c: dash.totals?.confirmedViews, p: dash.totals?.pendingViews }));
const proofUrl = dash.campaigns?.find((c) => c.proof)?.proof?.explorerUrl ?? "";
check("creator b API: proof link points at a tx", /\/tx\/0x[0-9a-f]{64}$/.test(proofUrl), proofUrl);

let page = await cb.newPage();
await page.goto(`${BASE}/ledger`, { waitUntil: "networkidle" });
let t = await text(page);
check("ledger shows Confirmed and Pending", /Confirmed/.test(t) && /Pending/.test(t));
check("ledger shows the Chainlink badge", /Chainlink/.test(t));
check("ledger has a proof link to a tx", (await page.locator('a[href*="/tx/0x"]').count()) > 0);
check("ledger shows the explainer once", /Only Confirmed is paid/.test(t));
await page.screenshot({ path: `${OUT}/ledger-creator-b.png`, fullPage: true });

// ---- creator a: an old-format verified channel must offer a re-verify, and the upgrade shows the wallet-bound code
// (the /join channel step sits behind a World ID check, which this local run does not configure)
const ca = await session(WALLET.a, "CREATOR");
const chans = await getJson(ca, "/api/channels");
check("channels API flags the old-code channel needsReverify", chans.channels?.some((c) => c.handle === "chanaold" && c.needsReverify === true) && chans.channels?.some((c) => c.handle === "chana" && c.needsReverify === false));
page = await ca.newPage();
await page.goto(`${BASE}/account`, { waitUntil: "networkidle" });
t = await text(page);
check("account screen offers a re-verify for the old channel", /Get my new code/i.test(t) || /re-?verify/i.test(t), t.match(/.{40}(re-?verify|Get my new code).{40}/i)?.[0] ?? "no prompt on screen");
await page.screenshot({ path: `${OUT}/account-creator-a-before.png`, fullPage: true });
const btn = page.getByRole("button", { name: /Get my new code/i }).first();
if (await btn.count()) {
  await btn.click();
  await page.waitForTimeout(1500);
  t = await text(page);
  check("after the upgrade the wallet-bound code is on screen", t.includes(`clippo:${WALLET.a}`), t.match(/clippo:0x[0-9a-f]{6,}/)?.[0] ?? "no code on screen");
  const after = await getJson(ca, "/api/channels");
  check("API: the channel now holds the new code and is unverified until the bio check", after.channels?.some((c) => c.handle === "chanaold" && c.verificationCode === `clippo:${WALLET.a}` && c.verified === false));
  await page.screenshot({ path: `${OUT}/account-creator-a-after.png`, fullPage: true });
}

// ---- brand: desk and a campaign slip
const cc = await session(WALLET.campaigner, "CAMPAIGNER");
const bd = await getJson(cc, "/api/dashboard/campaigner");
check("brand API: confirmed 6500 / pending 1050", bd.totals?.confirmedViews === 6500 && bd.totals?.pendingViews === 1050, JSON.stringify({ c: bd.totals?.confirmedViews, p: bd.totals?.pendingViews }));
page = await cc.newPage();
await page.goto(`${BASE}/desk`, { waitUntil: "networkidle" });
t = await text(page);
check("desk shows Confirmed and Pending", /Confirmed/.test(t) && /Pending/.test(t));
check("desk has a proof link to a tx", (await page.locator('a[href*="/tx/0x"]').count()) > 0);
await page.screenshot({ path: `${OUT}/desk-brand.png`, fullPage: true });

if (C7) {
  page = await cb.newPage();
  await page.goto(`${BASE}/slips/${C7}`, { waitUntil: "networkidle" });
  t = await text(page);
  check("slip shows Confirmed and a proof link", /Confirmed/.test(t) && (await page.locator('a[href*="/tx/0x"]').count()) > 0);
  await page.screenshot({ path: `${OUT}/slip-creator-b.png`, fullPage: true });
}

await browser.close();
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed. Screenshots: ${OUT}`);
process.exit(failed ? 1 : 0);
