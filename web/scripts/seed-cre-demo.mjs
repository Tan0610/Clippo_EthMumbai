// Seeds the records the app needs to show the REAL on-chain CRE result for the demo creator (campaign 1 on the new escrow).
// What is seeded: a user, a channel, a campaign row linked to on-chain campaign id 1, one clip and an approval. Everything is labelled
// "[SEED]". What is NOT seeded: views, credits and the proof link. Those come from the chain (ViewsReported / CreatorCredited events,
// read by the indexer) and from the YouTube API (POST /api/snapshots/refresh). The channel really carries the wallet code in its bio.
// Safe by default: without --confirm it only prints what it would do. Re-running is idempotent.
// Usage (from web/):  DATABASE_URL='postgresql://...' node scripts/seed-cre-demo.mjs [--confirm] [--retire-old] [--campaigner 0x..]
import { PrismaClient } from "@prisma/client";

const arg = (k) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : undefined);
const has = (k) => process.argv.includes(k);
const CONFIRM = has("--confirm");
const RETIRE = has("--retire-old");

const CREATOR = "0x8cf9113b19aa9d169365ca7b1bb9d7b957b460e5";
const CAMPAIGNER = (arg("--campaigner") ?? `0x5eed${"0".repeat(32)}c0de`).toLowerCase(); // default: a seed wallet nobody can sign in with
const ONCHAIN_ID = "1";
const HANDLE = "visualsbyanii";
const CHANNEL_ID = "UCIZw3qclbEDMa4TCFMAatww";
const VIDEO_ID = "vWk4YV_dbsE";
const TITLE = "[SEED] CRE demo: FLOW FORTE clip";
const STORY = {
  summary: "A short clip that shows the project in use. Seeded for the Chainlink CRE demo.",
  topic: "Clippo CRE demo",
  description: "Seeded campaign linked to on-chain campaign 1. The views and credits shown for it come from the chain.",
  requiredPoints: ["Show the project working"],
  prohibitedClaims: ["No income promises"],
  disclosureLabel: "#ad",
};

if (!process.env.DATABASE_URL) { console.error("DATABASE_URL is not set"); process.exit(1); }
if (!/^0x[0-9a-f]{40}$/.test(CAMPAIGNER)) { console.error("--campaigner must be a 0x address (40 hex characters)"); process.exit(1); }
const host = (() => { try { return new URL(process.env.DATABASE_URL).host; } catch { return "(unparsable)"; } })();
console.log(`database host: ${host}`);
console.log(`mode: ${CONFIRM ? "WRITE (--confirm)" : "DRY RUN (nothing is written; add --confirm to write)"}`);

const db = new PrismaClient();
async function run() {
  const plan = [];
  const stop = (msg) => { console.error(`\nSTOP: ${msg}`); process.exitCode = 1; };

  // 1. users
  const creatorU = await db.user.findUnique({ where: { wallet: CREATOR } });
  if (creatorU && creatorU.role !== "CREATOR") return stop(`wallet ${CREATOR} already exists with role ${creatorU.role}; it must be a CREATOR (do NOT put it in ADMIN_WALLETS)`);
  const campaignerU = await db.user.findUnique({ where: { wallet: CAMPAIGNER } });
  if (campaignerU && campaignerU.role !== "CAMPAIGNER") return stop(`wallet ${CAMPAIGNER} already exists with role ${campaignerU.role}; pass another --campaigner`);
  plan.push(creatorU ? `creator user exists (${CREATOR})` : `create creator user ${CREATOR} (CREATOR, verified: a stand-in for the World check)`);
  plan.push(campaignerU ? `campaigner user exists (${CAMPAIGNER})` : `create campaigner user ${CAMPAIGNER} (CAMPAIGNER)`);

  // 2. stale campaigns that point at on-chain id 1 of the OLD escrow
  const withId = await db.campaign.findMany({ where: { onchainId: ONCHAIN_ID }, select: { id: true, title: true, status: true } });
  const stale = withId.filter((c) => c.title !== TITLE);
  if (stale.length) {
    console.log(`\nfound ${stale.length} campaign(s) already linked to on-chain id ${ONCHAIN_ID} (from the OLD escrow):`);
    for (const c of stale) console.log(`  - ${c.id} "${c.title}" ${c.status}`);
    if (!RETIRE) return stop("they would be mixed up with the new escrow's campaign 1. Re-run with --retire-old to clear their on-chain link (title, status and everything else stay as they are).");
    plan.push(`clear the on-chain id of ${stale.length} stale campaign(s)`);
  }

  // 3. channel
  const ch = await db.channel.findUnique({ where: { platform_handle: { platform: "YOUTUBE", handle: HANDLE } } });
  if (ch && creatorU && ch.userId !== creatorU.id) return stop(`channel @${HANDLE} is linked to another account`);
  if (ch && !creatorU) return stop(`channel @${HANDLE} exists but the creator user does not`);
  plan.push(ch ? `channel @${HANDLE} exists (set to verified, wallet-bound code)` : `create channel @${HANDLE} (${CHANNEL_ID}), verified, code clippo:${CREATOR}`);
  plan.push(withId.some((c) => c.title === TITLE) ? "seed campaign exists" : `create campaign "${TITLE}" (PER_VIEW, $10 per 1,000 views, 5 USDC pool, APPROVED, on-chain id ${ONCHAIN_ID})`);
  plan.push(`create or keep clip ${VIDEO_ID} with an APPROVE verdict marked as seeded`);
  console.log("\nplan:"); for (const p of plan) console.log(`  * ${p}`);
  if (!CONFIRM) { console.log("\nDry run only. Nothing changed."); return; }

  await db.$transaction(async (tx) => {
    const creator = creatorU ?? (await tx.user.create({ data: { wallet: CREATOR, role: "CREATOR", verified: true, worldIdNullifier: `seed-cre-demo-${CREATOR}` } }));
    const campaigner = campaignerU ?? (await tx.user.create({ data: { wallet: CAMPAIGNER, role: "CAMPAIGNER", verified: true, worldIdNullifier: `seed-cre-demo-${CAMPAIGNER}` } }));
    if (stale.length) await tx.campaign.updateMany({ where: { id: { in: stale.map((c) => c.id) } }, data: { onchainId: null } });
    const code = `clippo:${CREATOR}`;
    const channel = ch
      ? await tx.channel.update({ where: { id: ch.id }, data: { verified: true, externalId: CHANNEL_ID, verificationCode: code } })
      : await tx.channel.create({ data: { userId: creator.id, platform: "YOUTUBE", handle: HANDLE, externalId: CHANNEL_ID, verificationCode: code, verified: true } });
    const campaign =
      (await tx.campaign.findFirst({ where: { onchainId: ONCHAIN_ID, title: TITLE } })) ??
      (await tx.campaign.create({
        data: {
          campaignerId: campaigner.id, title: TITLE, story: STORY, contentSource: "LINK", platforms: ["YOUTUBE"], payoutMode: "PER_VIEW", ratePer1k: 10, poolSize: 5,
          status: "APPROVED", onchainId: ONCHAIN_ID, grossFunded: 5, campaignerFee: 0.0125, campaignerFeeBps: 25, creatorFeeBps: 25,
        },
      }));
    const existing = await tx.submission.findUnique({ where: { campaignId_videoId: { campaignId: campaign.id, videoId: VIDEO_ID } } });
    if (!existing) {
      await tx.submission.create({
        data: {
          campaignId: campaign.id, creatorId: creator.id, channelId: channel.id, link: `https://youtu.be/${VIDEO_ID}`, videoId: VIDEO_ID,
          metadata: { title: "[SEED] FLOW FORTE HACK SUBMISSION", seed: true },
          verdict: { create: { result: "APPROVE", confidence: 0.9, reason: "[SEED] Approved for the CRE demo. This is not an AI verdict.", decidedBy: "HUMAN" } },
        },
      });
    }
  });
  console.log("\nDone. Next, so the numbers come from the real sources:");
  console.log('  curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://<host>/api/snapshots/refresh   # real YouTube view count');
  console.log('  curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://<host>/api/chain/sync          # index the real ViewsReported / CreatorCredited events');
  console.log(`  then sign in with ${CREATOR} (as creator) and open /ledger`);
}
try {
  await run();
} finally {
  await db.$disconnect();
}
