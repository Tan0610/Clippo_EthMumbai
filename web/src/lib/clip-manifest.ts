import { createHash } from "node:crypto";
import { db } from "./db";
import { hasWalletBoundCode } from "./channel-code";
import { previousDay, today } from "./snapshots";

/** One clip the Chainlink CRE nodes must read from YouTube. No view counts: the nodes get those themselves. */
export interface ManifestClip {
  /** NUMERIC on-chain escrow id (uint256 as a decimal string), never the internal cuid */
  campaignId: string;
  creator: string;
  videoId: string;
  /** YouTube channel id the clip must belong to */
  channelId: string;
}

export interface ClipManifest {
  day: string;
  /** sha256 of the exact JSON of `clips`; also the ETag */
  hash: string;
  clips: ManifestClip[];
}

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Pure: sort clips into one canonical order and wrap them with the day and a hash over the exact JSON. */
export function buildClipManifest(day: string, clips: ManifestClip[]): ClipManifest {
  const sorted = [...clips].sort((a, b) => {
    const d = BigInt(a.campaignId) - BigInt(b.campaignId);
    if (d !== 0n) return d < 0n ? -1 : 1;
    return a.creator.localeCompare(b.creator) || a.videoId.localeCompare(b.videoId);
  });
  return { day, hash: createHash("sha256").update(JSON.stringify(sorted)).digest("hex"), clips: sorted };
}

/**
 * The clips CRE should read for a completed UTC `day` (default: yesterday): clips whose verdict is APPROVE and was made before
 * the end of that day, still LIVE, in an APPROVED PER_VIEW or POOL_SHARE campaign that has an on-chain id, on a verified YouTube
 * channel whose code is bound to the creator's wallet. A clip under an open or confirmed view-anomaly flag is left out until the
 * flag is dismissed (CRE reads live counts, so Clippo cannot cap them at an earlier day). Throws RangeError on a bad or unfinished day.
 */
export async function frozenClipManifest(day: string = previousDay()): Promise<ClipManifest> {
  if (!DAY_RE.test(day) || Number.isNaN(Date.parse(`${day}T00:00:00Z`))) throw new RangeError("day must be YYYY-MM-DD");
  if (day >= today()) throw new RangeError("day is not complete yet (UTC)");
  const dayEnd = new Date(Date.parse(`${day}T00:00:00Z`) + 86_400_000);
  const [subs, holds] = await Promise.all([
    db.submission.findMany({
      where: {
        clipStatus: "LIVE",
        verdict: { result: "APPROVE", createdAt: { lt: dayEnd } },
        campaign: { status: "APPROVED", payoutMode: { in: ["PER_VIEW", "POOL_SHARE"] }, onchainId: { not: null } },
        channel: { platform: "YOUTUBE", verified: true, externalId: { not: null } },
      },
      select: {
        id: true,
        videoId: true,
        campaign: { select: { onchainId: true } },
        creator: { select: { wallet: true } },
        channel: { select: { externalId: true, verificationCode: true } },
      },
    }),
    db.fraudFlag.findMany({ where: { kind: "VIEW_ANOMALY", status: { in: ["OPEN", "CONFIRMED"] } }, select: { submissionId: true } }),
  ]);
  const held = new Set(holds.map((h) => h.submissionId));
  const clips: ManifestClip[] = [];
  for (const s of subs) {
    const onchainId = s.campaign.onchainId;
    if (!onchainId || !/^\d+$/.test(onchainId) || !s.channel.externalId) continue;
    if (held.has(s.id) || !hasWalletBoundCode(s.channel.verificationCode, s.creator.wallet)) continue;
    clips.push({ campaignId: onchainId, creator: s.creator.wallet.toLowerCase(), videoId: s.videoId, channelId: s.channel.externalId });
  }
  return buildClipManifest(day, clips);
}
