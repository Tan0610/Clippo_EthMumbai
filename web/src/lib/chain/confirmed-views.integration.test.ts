/**
 * Confirmed views: ViewsReported events (the Chainlink CRE report landing on-chain) are indexed into ViewsReport,
 * and the creator earnings, campaigner dashboard and campaign route show them next to Clippo's own count.
 * Runs against the throwaway test Postgres; the chain reader is a test double.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { clearDoubles, installChainDouble, installDoubles } from "@/test/doubles";
import { resetDb } from "@/test/db";

process.env.SESSION_SECRET = "test-secret";
process.env.EXPLORER_BASE_URL = "https://explorer.example/";

type Db = typeof import("@/lib/db").db;
let db: Db;

const CAMPAIGNER = "0xca00000000000000000000000000000000000002";
const CREATOR = "0xc100000000000000000000000000000000000003";
const OTHER = "0xc200000000000000000000000000000000000004";
const TX1 = "0x" + "a1".repeat(32);
const TX2 = "0x" + "a2".repeat(32);
const TX3 = "0x" + "a3".repeat(32);

beforeAll(async () => {
  installDoubles();
  installChainDouble({ getCampaign: async () => ({ state: 2, campaignerFeeBps: 25, creatorFeeBps: 25, highValue: false }) as never });
  db = (await import("@/lib/db")).db;
  await resetDb(db);
}, 120_000);

afterAll(async () => {
  clearDoubles();
  await db?.$disconnect();
});

const deps = () => ({ reader: {} as never, blockTime: async (n: bigint) => new Date(Date.UTC(2026, 0, 1, 0, 0, Number(n))) });
let idx = 0;
const viewsReported = (tx: string, args: { campaignId: bigint; creator: string; cumulativeViews: bigint; deltaViews: bigint; credited: bigint }, block = 10n) => ({
  eventName: "ViewsReported",
  args,
  transactionHash: tx,
  logIndex: idx++,
  blockNumber: block,
});

async function setup(payoutMode: "PER_VIEW" | "HUMAN_SPLIT", onchainId: string) {
  const campaigner = await db.user.create({ data: { wallet: CAMPAIGNER, role: "CAMPAIGNER" } });
  const creator = await db.user.create({ data: { wallet: CREATOR, role: "CREATOR", verified: true, worldIdNullifier: "0xc0ffee" } });
  const channel = await db.channel.create({ data: { userId: creator.id, platform: "YOUTUBE", handle: "c", verificationCode: "x", verified: true } });
  const campaign = await db.campaign.create({
    data: { campaignerId: campaigner.id, title: "t", story: {}, contentSource: "LINK", platforms: ["YOUTUBE"], payoutMode, ratePer1k: 2, poolSize: 1000, status: "APPROVED", onchainId } as never,
  });
  const sub = await db.submission.create({
    data: { campaignId: campaign.id, creatorId: creator.id, channelId: channel.id, link: "https://youtu.be/v1", videoId: "v1", metadata: {}, verdict: { create: { result: "APPROVE", confidence: 0.9, reason: "ok" } } },
  });
  await db.viewSnapshot.create({ data: { campaignId: campaign.id, submissionId: sub.id, creatorId: creator.id, day: "2026-01-01", cumulativeViews: 1500 } });
  return { campaigner, creator, campaign };
}

describe("confirmed views: pure helpers", () => {
  it("folds reports to the highest cumulative, with the proof of the latest report that added views", async () => {
    const { foldReports, sumConfirmed, pendingViews } = await import("@/lib/confirmed");
    const row = (over: Record<string, unknown>) => ({ campaignId: "c1", creatorId: "u1", cumulativeViews: 0, deltaViews: 0, txHash: "0x1", logIndex: 0, blockNumber: 1, reportedAt: new Date(0), ...over });
    const m = foldReports(
      [row({ cumulativeViews: 100, deltaViews: 100, txHash: "0xa", blockNumber: 5 }), row({ cumulativeViews: 100, deltaViews: 0, txHash: "0xb", blockNumber: 9 }), row({ creatorId: "u2", cumulativeViews: 40, deltaViews: 40, txHash: "0xc", blockNumber: 7 })],
      "https://x",
    );
    expect(m.get("c1:u1")).toMatchObject({ confirmedViews: 100, proof: { txHash: "0xa", explorerUrl: "https://x/tx/0xa" } });
    expect(sumConfirmed([...m.values()])).toMatchObject({ confirmedViews: 140, proof: { txHash: "0xc", blockNumber: 7 } });
    expect(pendingViews(1500, 1000)).toBe(500);
    expect(pendingViews(900, 1000)).toBe(0);
  });
});

describe("confirmed views: indexer and API", () => {
  it("indexes ViewsReported idempotently, skips unknown campaigns and wallets", async () => {
    const { processLogs } = await import("@/lib/chain/indexer");
    const { toUnits } = await import("@/lib/chain/units");
    const { campaign, creator } = await setup("PER_VIEW", "7");
    const first = viewsReported(TX1, { campaignId: 7n, creator: CREATOR, cumulativeViews: 1000n, deltaViews: 1000n, credited: toUnits(2) });
    expect((await processLogs([first], deps()))[0].applied).toBe(true);
    expect((await processLogs([first], deps()))[0].reason).toBe("already processed");
    // growth, then a stale/no-op report (the escrow emits delta 0)
    await processLogs([viewsReported(TX2, { campaignId: 7n, creator: CREATOR, cumulativeViews: 1200n, deltaViews: 200n, credited: toUnits(0.4) }, 12n)], deps());
    await processLogs([viewsReported(TX3, { campaignId: 7n, creator: CREATOR, cumulativeViews: 1200n, deltaViews: 0n, credited: 0n }, 14n)], deps());
    expect((await processLogs([viewsReported(TX3, { campaignId: 99n, creator: CREATOR, cumulativeViews: 5n, deltaViews: 5n, credited: 0n })], deps()))[0].reason).toBe("unknown campaign");
    expect((await processLogs([viewsReported("0x" + "a4".repeat(32), { campaignId: 7n, creator: OTHER, cumulativeViews: 5n, deltaViews: 5n, credited: 0n })], deps()))[0].reason).toBe("creator wallet has no account");
    const rows = await db.viewsReport.findMany({ where: { campaignId: campaign.id, creatorId: creator.id }, orderBy: { blockNumber: "asc" } });
    expect(rows.map((r) => [r.cumulativeViews, r.deltaViews, r.credited])).toEqual([[1000, 1000, 2], [1200, 200, 0.4], [1200, 0, 0]]);
  });

  it("creator earnings, campaigner dashboard and the campaign route show Confirmed next to Pending", async () => {
    const { creatorEarnings } = await import("@/lib/earnings");
    const { campaignerDashboard } = await import("@/lib/workspace/marketplace");
    const { GET } = await import("@/app/api/campaigns/[id]/route");
    const creator = await db.user.findUniqueOrThrow({ where: { wallet: CREATOR } });
    const campaigner = await db.user.findUniqueOrThrow({ where: { wallet: CAMPAIGNER } });
    const campaign = await db.campaign.findFirstOrThrow({ where: { onchainId: "7" } });

    const earn = await creatorEarnings(creator.id);
    const row = earn.campaigns.find((c) => c.campaignId === campaign.id)!;
    expect(row).toMatchObject({ views: 1500, confirmedViews: 1200, pendingViews: 300 });
    expect(row.proof).toMatchObject({ txHash: TX2, blockNumber: 12, explorerUrl: `https://explorer.example/tx/${TX2}` });
    expect(earn.totals).toMatchObject({ confirmedViews: 1200, pendingViews: 300 });

    const dash = await campaignerDashboard(campaigner.id);
    const dc = dash.campaigns.find((c) => c.campaignId === campaign.id)!;
    expect(dc).toMatchObject({ views: 1500, confirmedViews: 1200, pendingViews: 300 });
    expect(dc.creators[0]).toMatchObject({ confirmedViews: 1200, pendingViews: 300 });
    expect(dash.totals).toMatchObject({ confirmedViews: 1200, pendingViews: 300 });

    const res = await GET(new Request("http://localhost/api/campaigns/x", { headers: { host: "localhost" } }), { params: Promise.resolve({ id: campaign.id }) });
    const body = (await res.json()) as { performance: Record<string, unknown> };
    expect(body.performance).toMatchObject({ totalViews: 1500, confirmedViews: 1200, pendingViews: 300 });
  });

  it("HUMAN_SPLIT campaigns have nothing to confirm and nothing pending", async () => {
    const { creatorEarnings } = await import("@/lib/earnings");
    const creator = await db.user.findUniqueOrThrow({ where: { wallet: CREATOR } });
    const channel = await db.channel.findFirstOrThrow({ where: { userId: creator.id } });
    const campaigner = await db.user.findUniqueOrThrow({ where: { wallet: CAMPAIGNER } });
    const hs = await db.campaign.create({
      data: { campaignerId: campaigner.id, title: "split", story: {}, contentSource: "LINK", platforms: ["YOUTUBE"], payoutMode: "HUMAN_SPLIT", approver: "CAMPAIGNER_ONLY", poolSize: 100, status: "APPROVED", onchainId: "8" } as never,
    });
    const sub = await db.submission.create({
      data: { campaignId: hs.id, creatorId: creator.id, channelId: channel.id, link: "https://youtu.be/v2", videoId: "v2", metadata: {}, verdict: { create: { result: "APPROVE", confidence: 0.9, reason: "ok" } } },
    });
    await db.viewSnapshot.create({ data: { campaignId: hs.id, submissionId: sub.id, creatorId: creator.id, day: "2026-01-01", cumulativeViews: 700 } });
    const row = (await creatorEarnings(creator.id)).campaigns.find((c) => c.campaignId === hs.id)!;
    expect(row).toMatchObject({ confirmedViews: 0, pendingViews: 0, proof: null });
  });
});
