// Seeds the local dev database for the Confirmed-views end-to-end check (scripts/e2e-confirmed-ui.mjs).
// Wallets and on-chain campaign ids (7, 12) match the fixture of cre/scripts/mock-backend.mjs. LOCAL DATABASE ONLY.
// Usage: DATABASE_URL=postgresql://... node scripts/e2e-confirmed-seed.mjs
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const W = {
  campaigner: "0xca00000000000000000000000000000000000002",
  a: "0x1111111111111111111111111111111111111111",
  b: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
};
const STORY = { summary: "Short clips that show the product in use.", topic: "Clippo demo brand", description: "Show the product in a real moment. Keep it honest.", requiredPoints: ["Say what the product does", "Show it working"], prohibitedClaims: ["No income promises"], disclosureLabel: "#ad" };
const day = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

const campaigner = await db.user.create({ data: { wallet: W.campaigner, role: "CAMPAIGNER", verified: true, worldIdNullifier: "n-camp" } });
const mkCreator = (wallet) => db.user.create({ data: { wallet, role: "CREATOR", verified: true, worldIdNullifier: `n-${wallet}` } });
const [a, b] = [await mkCreator(W.a), await mkCreator(W.b)];
const mkCampaign = (onchainId, title) =>
  db.campaign.create({ data: { campaignerId: campaigner.id, title, story: STORY, contentSource: "LINK", platforms: ["YOUTUBE"], payoutMode: "PER_VIEW", ratePer1k: 10, poolSize: 1000, status: "APPROVED", onchainId } });
const [c7, c12] = [await mkCampaign("7", "Spring launch clips"), await mkCampaign("12", "Podcast highlights")];

const channels = {};
for (const [k, u] of [["a", a], ["b", b]]) {
  channels[k] = await db.channel.create({ data: { userId: u.id, platform: "YOUTUBE", handle: `chan${k}`, verificationCode: `clippo:${W[k]}`, verified: true, externalId: `UC_${k}` } });
}
// An OLD-format verified channel (random code): the Account screen must offer a re-verify with the wallet-bound code.
await db.channel.create({ data: { userId: a.id, platform: "YOUTUBE", handle: "chanaold", verificationCode: "clippo-abcd1234", verified: true, externalId: "UC_aold" } });
// Clippo's own count (the "pending" side): higher than what CRE confirmed on the fork (1200 / 300 / 5000).
const clips = [
  { c: c7, u: a, ch: "a", video: "e2eA7", views: 1500 },
  { c: c7, u: b, ch: "b", video: "e2eB7", views: 450 },
  { c: c12, u: b, ch: "b", video: "e2eB12", views: 5600 },
];
const out = { campaigns: { c7: c7.id, c12: c12.id }, submissions: {} };
for (const x of clips) {
  const s = await db.submission.create({
    data: { campaignId: x.c.id, creatorId: x.u.id, channelId: channels[x.ch].id, link: `https://youtu.be/${x.video}`, videoId: x.video, metadata: { title: x.video, views: x.views }, verdict: { create: { result: "APPROVE", confidence: 0.9, reason: "ok" } } },
  });
  await db.viewSnapshot.create({ data: { campaignId: x.c.id, submissionId: s.id, creatorId: x.u.id, day, cumulativeViews: x.views } });
  out.submissions[x.video] = s.id;
}
console.log(JSON.stringify({ wallets: W, ...out }));
await db.$disconnect();
