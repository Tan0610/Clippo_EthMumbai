/**
 * END-TO-END on a local anvil fork (skipped unless E2E_CRE_FORK=1): the REAL ViewsReported events written by
 * `cre workflow simulate --broadcast` are read by the REAL indexer (syncChain) and show up as Confirmed views.
 *
 * How to run (see docs/CRE_SCOPE.md S3): start anvil, `bash cre/scripts/local-chain.sh`, serve the fixture with
 * `node cre/scripts/mock-backend.mjs --mode fixture`, run `cre workflow simulate ... --broadcast`, then
 *   E2E_CRE_FORK=1 ESCROW_ADDRESS=<escrow> ARC_RPC_URL=http://127.0.0.1:8545 ESCROW_DEPLOY_BLOCK=<block before deploy> npx vitest run src/lib/chain/confirmed-views.e2e.test.ts
 * The wallets and campaign ids below are the shared fixture used by cre/scripts/mock-backend.mjs.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { resetDb } from "@/test/db";

const on = process.env.E2E_CRE_FORK === "1";
process.env.SESSION_SECRET = "test-secret";

const WALLETS = {
  a: "0x1111111111111111111111111111111111111111",
  b: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
};

type Db = typeof import("@/lib/db").db;
let db: Db;

beforeAll(async () => {
  if (!on) return;
  db = (await import("@/lib/db")).db;
  await resetDb(db);
}, 120_000);
afterAll(async () => {
  await db?.$disconnect();
});

describe.skipIf(!on)("CRE report on the fork -> indexer -> Confirmed views", () => {
  it("indexes the real ViewsReported events and the API fields show them", async () => {
    const campaigner = await db.user.create({ data: { wallet: "0xca00000000000000000000000000000000000002", role: "CAMPAIGNER" } });
    const mkCreator = (wallet: string) => db.user.create({ data: { wallet, role: "CREATOR", verified: true, worldIdNullifier: `n-${wallet}` } });
    const [a, b] = [await mkCreator(WALLETS.a), await mkCreator(WALLETS.b)];
    const mkCampaign = (onchainId: string) =>
      db.campaign.create({ data: { campaignerId: campaigner.id, title: `c${onchainId}`, story: {}, contentSource: "LINK", platforms: ["YOUTUBE"], payoutMode: "PER_VIEW", ratePer1k: 10, poolSize: 1000, status: "APPROVED", onchainId } as never });
    const [c7, c12] = [await mkCampaign("7"), await mkCampaign("12")];
    // creator earnings only list campaigns where the creator has an approved, live clip
    const chan = await db.channel.create({ data: { userId: b.id, platform: "YOUTUBE", handle: "b", verificationCode: `clippo:${WALLETS.b}`, verified: true, externalId: "UC_b" } });
    for (const [i, c] of [c7, c12].entries()) {
      await db.submission.create({
        data: { campaignId: c.id, creatorId: b.id, channelId: chan.id, link: `https://youtu.be/e2e${i}`, videoId: `e2e${i}`, metadata: {}, verdict: { create: { result: "APPROVE", confidence: 0.9, reason: "ok" } } },
      });
    }

    const { syncChain } = await import("@/lib/chain/indexer");
    const res = await syncChain({ maxBlocks: 200_000 });
    expect(res.processed).toBeGreaterThan(0);

    const rows = await db.viewsReport.findMany({ orderBy: [{ blockNumber: "asc" }, { logIndex: "asc" }] });
    expect(rows.length).toBeGreaterThan(0);

    const { confirmedByPair, pairKey } = await import("@/lib/confirmed");
    const m = await confirmedByPair();
    // numbers from cre/scripts/mock-backend.mjs fixture after the first delivery (checked with cast call in the build log)
    expect(m.get(pairKey(c7.id, a.id))?.confirmedViews).toBe(1200);
    expect(m.get(pairKey(c7.id, b.id))?.confirmedViews).toBe(300);
    expect(m.get(pairKey(c12.id, b.id))?.confirmedViews).toBe(5000);
    const proof = m.get(pairKey(c7.id, a.id))?.proof;
    expect(proof?.txHash).toMatch(/^0x[0-9a-f]{64}$/);
    expect(proof?.explorerUrl).toContain(`/tx/${proof?.txHash}`);

    const { creatorEarnings } = await import("@/lib/earnings");
    // no ViewSnapshot rows: Clippo's own count is 0, so nothing is pending; the confirmed totals come from the chain events only
    expect((await creatorEarnings(b.id)).totals.confirmedViews).toBe(5300);
  });
});
