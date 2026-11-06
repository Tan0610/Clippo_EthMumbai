/**
 * The clip manifest Chainlink CRE reads, and wallet-bound channel codes. Runs against the throwaway test Postgres.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { clearDoubles, installDoubles } from "@/test/doubles";
import { resetDb } from "@/test/db";

process.env.SESSION_SECRET = "test-secret";
process.env.ALLOW_WALLET_HEADER = "1";

type Db = typeof import("@/lib/db").db;
let db: Db;

const A = "0xaaaa000000000000000000000000000000000001";
const B = "0xbbbb000000000000000000000000000000000002";
const CAMPAIGNER = "0xca00000000000000000000000000000000000009";
const jsonReq = (url: string, wallet: string, method = "GET", body?: unknown) =>
  new Request(`http://localhost${url}`, { method, headers: { "content-type": "application/json", "x-wallet": wallet, host: "localhost" }, body: body === undefined ? undefined : JSON.stringify(body) });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

beforeAll(async () => {
  installDoubles();
  db = (await import("@/lib/db")).db;
  await resetDb(db);
}, 120_000);
afterAll(async () => {
  clearDoubles();
  await db?.$disconnect();
});

async function clip(opts: { creatorWallet: string; code: string; verified?: boolean; externalId?: string | null; videoId: string; campaignId: string; clipStatus?: string }) {
  const creator = (await db.user.findUnique({ where: { wallet: opts.creatorWallet } })) ?? (await db.user.create({ data: { wallet: opts.creatorWallet, role: "CREATOR", verified: true, worldIdNullifier: `n-${opts.creatorWallet}` } }));
  const channel = await db.channel.create({
    data: { userId: creator.id, platform: "YOUTUBE", handle: `h-${opts.videoId}`, verificationCode: opts.code, verified: opts.verified ?? true, externalId: opts.externalId === undefined ? `UC_${opts.videoId}` : opts.externalId },
  });
  return db.submission.create({
    data: {
      campaignId: opts.campaignId, creatorId: creator.id, channelId: channel.id, link: `https://youtu.be/${opts.videoId}`, videoId: opts.videoId, metadata: {}, clipStatus: opts.clipStatus ?? "LIVE",
      verdict: { create: { result: "APPROVE", confidence: 0.9, reason: "ok", createdAt: new Date("2026-01-01T10:00:00Z") } },
    },
  });
}

describe("clip manifest", () => {
  it("lists only clips CRE can bind to a wallet, sorted, with a stable hash", async () => {
    const { frozenClipManifest } = await import("@/lib/clip-manifest");
    const { channelCodeFor } = await import("@/lib/channel-code");
    const campaigner = await db.user.create({ data: { wallet: CAMPAIGNER, role: "CAMPAIGNER" } });
    const mk = (payoutMode: string, onchainId: string | null, status = "APPROVED") =>
      db.campaign.create({ data: { campaignerId: campaigner.id, title: payoutMode, story: {}, contentSource: "LINK", platforms: ["YOUTUBE"], payoutMode, ratePer1k: 2, poolSize: 100, status, onchainId } as never });
    const perView = await mk("PER_VIEW", "12");
    const pool = await mk("POOL_SHARE", "3");
    const split = await mk("HUMAN_SPLIT", "4");
    const draft = await mk("PER_VIEW", null);

    await clip({ creatorWallet: A, code: channelCodeFor(A), videoId: "good1", campaignId: perView.id });
    await clip({ creatorWallet: B, code: channelCodeFor(B), videoId: "good2", campaignId: pool.id });
    // excluded: old random code, wrong wallet in code, unverified, no channel id, deleted, human split, no on-chain id, anomaly hold
    await clip({ creatorWallet: A, code: "clippo-deadbeef", videoId: "oldcode", campaignId: perView.id });
    await clip({ creatorWallet: A, code: channelCodeFor(B), videoId: "wrongwallet", campaignId: perView.id });
    await clip({ creatorWallet: A, code: channelCodeFor(A), verified: false, videoId: "unverified", campaignId: perView.id });
    await clip({ creatorWallet: A, code: channelCodeFor(A), externalId: null, videoId: "noextid", campaignId: perView.id });
    await clip({ creatorWallet: A, code: channelCodeFor(A), videoId: "deleted", campaignId: perView.id, clipStatus: "DELETED" });
    await clip({ creatorWallet: A, code: channelCodeFor(A), videoId: "split", campaignId: split.id });
    await clip({ creatorWallet: A, code: channelCodeFor(A), videoId: "draft", campaignId: draft.id });
    const held = await clip({ creatorWallet: A, code: channelCodeFor(A), videoId: "held", campaignId: perView.id });
    await db.fraudFlag.create({ data: { kind: "VIEW_ANOMALY", campaignId: perView.id, submissionId: held.id, day: "2026-01-01", details: {} } });

    const m = await frozenClipManifest("2026-01-02");
    expect(m.clips.map((c) => [c.campaignId, c.videoId, c.creator, c.channelId])).toEqual([
      ["3", "good2", B.toLowerCase(), "UC_good2"],
      ["12", "good1", A.toLowerCase(), "UC_good1"],
    ]);
    expect((await frozenClipManifest("2026-01-02")).hash).toBe(m.hash);
    // a verdict made after the end of the requested day is not in that day's manifest
    expect((await frozenClipManifest("2025-12-31")).clips).toEqual([]);
  });

  it("refuses an unfinished or malformed day, and the route answers 400", async () => {
    const { frozenClipManifest } = await import("@/lib/clip-manifest");
    const { today } = await import("@/lib/snapshots");
    await expect(frozenClipManifest(today())).rejects.toBeInstanceOf(RangeError);
    await expect(frozenClipManifest("nope")).rejects.toBeInstanceOf(RangeError);
    const { GET } = await import("@/app/api/snapshots/clips/route");
    const bad = await GET(new Request("http://localhost/api/snapshots/clips?day=bad", { headers: { host: "localhost" } }));
    expect(bad.status).toBe(400);
    const ok = await GET(new Request("http://localhost/api/snapshots/clips?day=2026-01-02", { headers: { host: "localhost" } }));
    expect(ok.status).toBe(200);
    expect(ok.headers.get("etag")).toMatch(/^"[0-9a-f]{64}"$/);
  });
});

describe("wallet-bound channel codes", () => {
  it("new channels get clippo:<wallet>; old verified channels need a re-verify and the upgrade rotates the code", async () => {
    const channels = await import("@/app/api/channels/route");
    const upgrade = await import("@/app/api/channels/[id]/upgrade-code/route");
    const C = "0xcccc000000000000000000000000000000000003";
    await db.user.create({ data: { wallet: C, role: "CREATOR", verified: true, worldIdNullifier: "n-c" } });

    const created = await channels.POST(jsonReq("/api/channels", C, "POST", { platform: "YOUTUBE", handle: "newchan" }));
    const c1 = ((await created.json()) as { channel: { id: string; verificationCode: string; needsReverify: boolean } }).channel;
    expect(created.status).toBe(201);
    expect(c1).toMatchObject({ verificationCode: `clippo:${C.toLowerCase()}`, needsReverify: false });

    // an old verified channel (random code) is flagged; an old UNVERIFIED one is swapped silently
    const user = await db.user.findUniqueOrThrow({ where: { wallet: C } });
    const oldVerified = await db.channel.create({ data: { userId: user.id, platform: "YOUTUBE", handle: "oldv", verificationCode: "clippo-abcd1234", verified: true, externalId: "UC_old" } });
    const oldUnverified = await db.channel.create({ data: { userId: user.id, platform: "YOUTUBE", handle: "oldu", verificationCode: "clippo-ffff0000", verified: false } });
    const list = (await (await channels.GET(jsonReq("/api/channels", C))).json()) as { channels: { id: string; verificationCode: string; needsReverify: boolean }[] };
    expect(list.channels.find((c) => c.id === oldVerified.id)).toMatchObject({ verificationCode: "clippo-abcd1234", needsReverify: true });
    expect(list.channels.find((c) => c.id === oldUnverified.id)).toMatchObject({ verificationCode: `clippo:${C.toLowerCase()}`, needsReverify: false });

    const res = await upgrade.POST(jsonReq(`/api/channels/${oldVerified.id}/upgrade-code`, C, "POST"), ctx(oldVerified.id));
    expect(res.status).toBe(200);
    const after = await db.channel.findUniqueOrThrow({ where: { id: oldVerified.id } });
    expect(after).toMatchObject({ verificationCode: `clippo:${C.toLowerCase()}`, verified: false });

    // someone else's channel is not found
    const other = await upgrade.POST(jsonReq(`/api/channels/${oldVerified.id}/upgrade-code`, A, "POST"), ctx(oldVerified.id));
    expect([401, 403, 404]).toContain(other.status);
  });
});
