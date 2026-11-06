import { getAddress, keccak256, stringToHex } from "viem";
import type { SnapshotRow } from "./snapshot";

// Pure helpers for workflow v2: the manifest Clippo serves, the YouTube Data API v3 responses, the per-clip checks
// and the fixed-shape record the nodes reach consensus on. No SDK or network access here, so everything is unit tested.

/** One clip Clippo says qualifies. Carries no view count: the nodes read that from YouTube themselves. */
export type ManifestClip = {
  campaignId: string; // decimal string (uint256)
  creator: string; // lowercase 0x address
  videoId: string; // YouTube video id (11 chars)
  channelId: string; // YouTube channel id (UC + 22 chars)
};

export type Manifest = { day: string; sourceHash: string; clips: ManifestClip[] };

/** YouTube accepts at most 50 ids per videos.list / channels.list call. */
export const YT_BATCH = 50;
/**
 * Hard cap on clips per run. HTTP calls per run = 1 manifest + ceil(n/50) videos + ceil(channels/50) channels, and the CRE
 * limit is 15 per run, so 350 clips is the worst case (350 channels) that still fits: 1 + 7 + 7 = 15. We cap lower for headroom.
 */
export const MAX_CLIPS = 300;

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;
const CHANNEL_ID_RE = /^UC[A-Za-z0-9_-]{22}$/;
const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const UINT_RE = /^\d+$/;

/**
 * Validate the manifest envelope and canonicalise it so every node produces byte-identical output: invalid clips are
 * dropped, creators are lowercased, duplicates removed, and clips sorted by (campaignId, creator, videoId).
 * Throws on a malformed envelope or when there are more than MAX_CLIPS clips.
 */
export function normalizeManifest(raw: unknown): Manifest & { skipped: number } {
  if (!raw || typeof raw !== "object") throw new Error("manifest is not an object");
  const { day, hash, clips } = raw as Record<string, unknown>;
  if (typeof day !== "string" || !DAY_RE.test(day)) throw new Error("manifest.day missing or not YYYY-MM-DD");
  if (!Array.isArray(clips)) throw new Error("manifest.clips is not an array");
  const seen = new Map<string, ManifestClip>();
  let skipped = 0;
  for (const c of clips) {
    const r = (c && typeof c === "object" ? c : {}) as Record<string, unknown>;
    const campaignId = typeof r.campaignId === "number" ? String(r.campaignId) : r.campaignId;
    if (
      typeof campaignId !== "string" || !UINT_RE.test(campaignId) ||
      typeof r.creator !== "string" || !ADDRESS_RE.test(r.creator) ||
      typeof r.videoId !== "string" || !VIDEO_ID_RE.test(r.videoId) ||
      typeof r.channelId !== "string" || !CHANNEL_ID_RE.test(r.channelId)
    ) {
      skipped++;
      continue;
    }
    const clip: ManifestClip = {
      campaignId: BigInt(campaignId).toString(),
      creator: r.creator.toLowerCase(),
      videoId: r.videoId,
      channelId: r.channelId,
    };
    seen.set(`${clip.campaignId}:${clip.creator}:${clip.videoId}`, clip);
  }
  const sorted = [...seen.values()].sort((a, b) => {
    const d = BigInt(a.campaignId) - BigInt(b.campaignId);
    if (d !== 0n) return d < 0n ? -1 : 1;
    if (a.creator !== b.creator) return a.creator < b.creator ? -1 : 1;
    return a.videoId < b.videoId ? -1 : a.videoId > b.videoId ? 1 : 0;
  });
  if (sorted.length > MAX_CLIPS) throw new Error(`manifest has ${sorted.length} clips, more than the ${MAX_CLIPS} one run can read`);
  return { day, sourceHash: typeof hash === "string" ? hash : "", clips: sorted, skipped };
}

/** keccak256 of the canonical clip list: nodes agree on this, so they agree on the manifest bytes. */
export const manifestHash = (clips: ManifestClip[]): string => keccak256(stringToHex(JSON.stringify(clips)));

/** Split into groups of at most `size` (YouTube's 50 ids per call). */
export function batches<T>(items: T[], size: number = YT_BATCH): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

const trimSlash = (s: string): string => s.replace(/\/+$/, "");

/** videos.list URL. `fields=` keeps the response tiny. The API key is NOT here: it travels in the x-goog-api-key header. */
export function videosUrl(base: string, ids: string[]): string {
  const q = [
    "part=" + encodeURIComponent("snippet,statistics"),
    "id=" + encodeURIComponent(ids.join(",")),
    "fields=" + encodeURIComponent("items(id,snippet/channelId,statistics/viewCount)"),
  ].join("&");
  return `${trimSlash(base)}/videos?${q}`;
}

/** channels.list URL (bio = snippet.description). No key in the URL. */
export function channelsUrl(base: string, ids: string[]): string {
  const q = [
    "part=" + encodeURIComponent("snippet"),
    "id=" + encodeURIComponent(ids.join(",")),
    "fields=" + encodeURIComponent("items(id,snippet/description)"),
  ].join("&");
  return `${trimSlash(base)}/channels?${q}`;
}

export type VideoInfo = { channelId: string; views: number | null };

/** Parse a videos.list body. viewCount arrives as a decimal string; anything else becomes null (unknown). */
export function parseVideos(raw: unknown): Map<string, VideoInfo> {
  const out = new Map<string, VideoInfo>();
  const items = (raw as { items?: unknown } | null)?.items;
  if (!Array.isArray(items)) return out;
  for (const it of items) {
    const o = it as { id?: unknown; snippet?: { channelId?: unknown }; statistics?: { viewCount?: unknown } } | null;
    if (!o || typeof o.id !== "string" || typeof o.snippet?.channelId !== "string") continue;
    const vc = o.statistics?.viewCount;
    const views = typeof vc === "string" && UINT_RE.test(vc) && Number.isSafeInteger(Number(vc)) ? Number(vc) : null;
    out.set(o.id, { channelId: o.snippet.channelId, views });
  }
  return out;
}

/** Parse a channels.list body into channelId -> bio text. */
export function parseChannels(raw: unknown): Map<string, string> {
  const out = new Map<string, string>();
  const items = (raw as { items?: unknown } | null)?.items;
  if (!Array.isArray(items)) return out;
  for (const it of items) {
    const o = it as { id?: unknown; snippet?: { description?: unknown } } | null;
    if (!o || typeof o.id !== "string") continue;
    out.set(o.id, typeof o.snippet?.description === "string" ? o.snippet.description : "");
  }
  return out;
}

/** The wallet-bound code a creator puts in the channel bio. */
export const channelCode = (creator: string): string => `clippo:${creator.toLowerCase()}`;

/**
 * True when the bio holds `clippo:<creator, lowercase>` exactly. The code must not run on into more hex digits,
 * so `clippo:0xabc...12` does not match a bio that says `clippo:0xabc...12ff`.
 */
export function bioHasCode(bio: string, creator: string): boolean {
  const code = channelCode(creator);
  let from = 0;
  for (;;) {
    const i = bio.indexOf(code, from);
    if (i < 0) return false;
    const next = bio.charAt(i + code.length);
    if (!/[0-9a-zA-Z]/.test(next)) return true;
    from = i + 1;
  }
}

/** Per-clip outcome on one node: kept with a view count, or dropped with a reason (safe to log: no secrets). */
export type ClipCheck = { kept: true; views: number } | { kept: false; reason: string };

/** Decide keep/drop for every manifest clip from the (already fetched) YouTube data. Order matches `clips`. */
export function evaluateClips(clips: ManifestClip[], videos: Map<string, VideoInfo>, bios: Map<string, string>): ClipCheck[] {
  return clips.map((c) => {
    const v = videos.get(c.videoId);
    if (!v) return { kept: false, reason: "video not found or not public" };
    if (v.channelId !== c.channelId) return { kept: false, reason: "video belongs to another channel than the manifest says" };
    if (v.views === null) return { kept: false, reason: "view count not available" };
    const bio = bios.get(c.channelId);
    if (bio === undefined) return { kept: false, reason: "channel not found" };
    if (!bioHasCode(bio, c.creator)) return { kept: false, reason: `channel bio does not contain ${channelCode(c.creator)}` };
    return { kept: true, views: v.views };
  });
}

/**
 * The fixed-shape record a node returns. Field `kept` is a comma list of manifest indexes this node kept ("0,2,5"); it is
 * compared with `identical`, so nodes must agree on WHICH clips count. Fields `v0`, `v1`, ... hold each clip's view count
 * (0 when dropped), aggregated with `median`, so small live differences between nodes do not break consensus.
 * Indexes (not clip keys) keep the record small: the manifest is already agreed, so an index names a clip unambiguously.
 */
export type Observation = { kept: string } & { [K in `v${number}`]: number };

export const viewField = (i: number): `v${number}` => `v${i}`;

export function buildObservation(checks: ClipCheck[]): Observation {
  const obs: Record<string, string | number> = {};
  const kept: number[] = [];
  checks.forEach((c, i) => {
    obs[viewField(i)] = c.kept ? c.views : 0;
    if (c.kept) kept.push(i);
  });
  obs.kept = kept.join(",");
  return obs as Observation;
}

/** Field names a manifest of `n` clips needs: used to build the ConsensusAggregationByFields map (kept + v0..v{n-1}). */
export const observationFields = (n: number): string[] => ["kept", ...Array.from({ length: n }, (_, i) => viewField(i))];

/** Read the agreed indexes back; rejects anything out of range or not ascending (a corrupted record). */
export function parseKept(kept: string, n: number): number[] {
  if (kept === "") return [];
  const idx = kept.split(",").map((s) => (UINT_RE.test(s) ? Number(s) : NaN));
  idx.forEach((v, k) => {
    if (!Number.isInteger(v) || v < 0 || v >= n || (k > 0 && v <= idx[k - 1])) throw new Error(`bad kept index list: ${kept}`);
  });
  return idx;
}

/**
 * Sum the agreed per-clip view counts per (campaignId, creator) over the kept clips. Creators that end up at 0 views are
 * left out (nothing to report). Rows are sorted by (campaignId, creator) and addresses are checksummed, like snapshot.ts.
 */
export function sumByCreator(clips: ManifestClip[], agreed: Record<string, unknown>): SnapshotRow[] {
  const kept = parseKept(String(agreed.kept ?? ""), clips.length);
  const sums = new Map<string, SnapshotRow>();
  for (const i of kept) {
    const views = agreed[viewField(i)];
    if (typeof views !== "number" || !Number.isSafeInteger(views) || views < 0) throw new Error(`agreed view count for clip ${i} is not a safe integer`);
    const c = clips[i];
    const key = `${c.campaignId}:${c.creator}`;
    const prev = sums.get(key);
    const total = (prev ? BigInt(prev.cumulativeViews) : 0n) + BigInt(views);
    sums.set(key, { campaignId: c.campaignId, creator: getAddress(c.creator), cumulativeViews: total.toString() });
  }
  return [...sums.values()]
    .filter((r) => BigInt(r.cumulativeViews) > 0n)
    .sort((a, b) => {
      const d = BigInt(a.campaignId) - BigInt(b.campaignId);
      if (d !== 0n) return d < 0n ? -1 : 1;
      return a.creator.localeCompare(b.creator);
    });
}
