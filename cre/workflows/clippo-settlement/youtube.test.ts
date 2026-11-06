// Run: node --experimental-strip-types --test workflows/clippo-settlement/youtube.test.ts   (from cre/)
import assert from "node:assert/strict";
import { test } from "node:test";
import { chunkRows } from "./snapshot.ts";
import {
  MAX_CLIPS,
  batches,
  bioHasCode,
  buildObservation,
  channelsUrl,
  evaluateClips,
  manifestHash,
  normalizeManifest,
  observationFields,
  parseChannels,
  parseKept,
  parseVideos,
  sumByCreator,
  videosUrl,
  type ManifestClip,
} from "./youtube.ts";

const A = "0x1111111111111111111111111111111111111111";
const B = "0xABcdEFABcdEFabcdEfAbCdefabcdeFABcDEFabCD";
const CH1 = "UC" + "a".repeat(22);
const CH2 = "UC" + "b".repeat(22);
const CH3 = "UC" + "c".repeat(22);
const vid = (n: number) => `video${String(n).padStart(6, "0")}`; // 11 chars

const clip = (campaignId: string, creator: string, n: number, channelId: string) => ({ campaignId, creator, videoId: vid(n), channelId });

test("normalizeManifest validates, lowercases, dedupes and sorts into one canonical order", () => {
  const raw = {
    day: "2026-11-05",
    hash: "abc",
    clips: [
      clip("12", B, 3, CH2),
      clip("7", B, 2, CH2),
      clip("7", A, 1, CH1),
      clip("7", A, 1, CH1), // duplicate
      { ...clip("7", A, 9, CH1), videoId: "short" }, // bad video id
      { ...clip("7", "0x12", 8, CH1) }, // bad address
      { ...clip("cuid123", A, 7, CH1) }, // internal id, not a uint
      { ...clip("7", A, 6, "UCshort") }, // bad channel id
      null,
    ],
  };
  const m = normalizeManifest(raw);
  assert.equal(m.day, "2026-11-05");
  assert.equal(m.sourceHash, "abc");
  assert.equal(m.skipped, 5);
  assert.deepEqual(m.clips.map((c) => [c.campaignId, c.creator, c.videoId]), [
    ["7", A, vid(1)],
    ["7", B.toLowerCase(), vid(2)],
    ["12", B.toLowerCase(), vid(3)],
  ]);
  // order of the input does not change the bytes the nodes agree on
  const reversed = normalizeManifest({ ...raw, clips: [...raw.clips].reverse() });
  assert.equal(manifestHash(reversed.clips), manifestHash(m.clips));
});

test("normalizeManifest rejects a bad envelope and an oversized manifest", () => {
  assert.throws(() => normalizeManifest([]));
  assert.throws(() => normalizeManifest({ day: "yesterday", clips: [] }));
  assert.throws(() => normalizeManifest({ day: "2026-11-05", clips: {} }));
  const many = Array.from({ length: MAX_CLIPS + 1 }, (_, i) => clip("7", A, i, CH1));
  assert.throws(() => normalizeManifest({ day: "2026-11-05", clips: many }), /more than/);
  assert.equal(normalizeManifest({ day: "2026-11-05", clips: [] }).clips.length, 0);
});

test("YouTube URLs carry fields= and never the API key", () => {
  const v = videosUrl("https://www.googleapis.com/youtube/v3/", [vid(1), vid(2)]);
  assert.ok(v.startsWith("https://www.googleapis.com/youtube/v3/videos?part=snippet%2Cstatistics&id="));
  assert.ok(v.includes("fields=items") && !/key=/i.test(v));
  const c = channelsUrl("http://127.0.0.1:8787/youtube/v3", [CH1]);
  assert.ok(c.includes("/channels?part=snippet&id=" + CH1) && c.includes("snippet%2Fdescription") && !/key=/i.test(c));
  assert.deepEqual(batches(Array.from({ length: 120 }, (_, i) => i)).map((b) => b.length), [50, 50, 20]);
});

test("parseVideos reads channelId and the string viewCount, and tolerates junk", () => {
  const m = parseVideos({
    items: [
      { id: vid(1), snippet: { channelId: CH1 }, statistics: { viewCount: "1200" } },
      { id: vid(2), snippet: { channelId: CH2 }, statistics: {} }, // hidden count
      { id: vid(3), snippet: { channelId: CH2 }, statistics: { viewCount: "12abc" } },
      { id: vid(4), snippet: { channelId: CH2 }, statistics: { viewCount: "99999999999999999999" } }, // not a safe integer
      { snippet: { channelId: CH1 } }, // no id
      "junk",
    ],
  });
  assert.deepEqual(m.get(vid(1)), { channelId: CH1, views: 1200 });
  assert.equal(m.get(vid(2))?.views, null);
  assert.equal(m.get(vid(3))?.views, null);
  assert.equal(m.get(vid(4))?.views, null);
  assert.equal(m.size, 4);
  assert.equal(parseVideos({}).size, 0);
  assert.equal(parseVideos(null).size, 0);
});

test("parseChannels reads the bio", () => {
  const m = parseChannels({ items: [{ id: CH1, snippet: { description: "hi clippo:0xabc" } }, { id: CH2, snippet: {} }, { nope: 1 }] });
  assert.equal(m.get(CH1), "hi clippo:0xabc");
  assert.equal(m.get(CH2), "");
  assert.equal(m.size, 2);
});

test("bioHasCode needs the exact lowercase wallet code", () => {
  assert.ok(bioHasCode(`my bio\nclippo:${A}\nmore`, A));
  assert.ok(bioHasCode(`clippo:${A}`, A));
  assert.ok(bioHasCode(`clippo:${B.toLowerCase()}.`, B)); // creator may be passed checksummed
  assert.ok(!bioHasCode(`clippo:${B}`, B), "a checksummed (mixed case) code in the bio is not the exact lowercase string");
  assert.ok(!bioHasCode(`clippo:${A}ff`, A), "code must not run on into more hex");
  assert.ok(bioHasCode(`clippo:${A}ff and clippo:${A}`, A), "a later exact match still counts");
  assert.ok(!bioHasCode(`clippo: ${A}`, A));
  assert.ok(!bioHasCode(A, A), "the address alone is not the code");
  assert.ok(!bioHasCode(`clippo:${B.toLowerCase()}`, A), "somebody else's code");
  assert.ok(!bioHasCode("", A));
});

const clips: ManifestClip[] = [
  { campaignId: "7", creator: A, videoId: vid(1), channelId: CH1 }, // good
  { campaignId: "7", creator: A, videoId: vid(2), channelId: CH1 }, // good, same creator
  { campaignId: "7", creator: B.toLowerCase(), videoId: vid(3), channelId: CH2 }, // wrong bio
  { campaignId: "12", creator: B.toLowerCase(), videoId: vid(4), channelId: CH3 }, // video is on another channel
  { campaignId: "12", creator: A, videoId: vid(5), channelId: CH1 }, // video missing
];
const videos = parseVideos({
  items: [
    { id: vid(1), snippet: { channelId: CH1 }, statistics: { viewCount: "1000" } },
    { id: vid(2), snippet: { channelId: CH1 }, statistics: { viewCount: "200" } },
    { id: vid(3), snippet: { channelId: CH2 }, statistics: { viewCount: "300" } },
    { id: vid(4), snippet: { channelId: CH1 }, statistics: { viewCount: "400" } },
  ],
});
const bios = new Map([
  [CH1, `clippo:${A}`],
  [CH2, "clippo:0x9999999999999999999999999999999999999999"],
]);

test("evaluateClips keeps only matching channel + bio and says why it dropped the rest", () => {
  const r = evaluateClips(clips, videos, bios);
  assert.deepEqual(r[0], { kept: true, views: 1000 });
  assert.deepEqual(r[1], { kept: true, views: 200 });
  assert.ok(!r[2].kept && /bio does not contain clippo:0xabcdef/.test((r[2] as { reason: string }).reason));
  assert.ok(!r[3].kept && /another channel/.test((r[3] as { reason: string }).reason));
  assert.ok(!r[4].kept && /not found/.test((r[4] as { reason: string }).reason));
  const noBio = evaluateClips([clips[0]], videos, new Map());
  assert.ok(!noBio[0].kept && /channel not found/.test((noBio[0] as { reason: string }).reason));
});

test("buildObservation: fixed shape, dropped clips are 0, kept is an index list", () => {
  const obs = buildObservation(evaluateClips(clips, videos, bios));
  assert.deepEqual({ ...obs }, { kept: "0,1", v0: 1000, v1: 200, v2: 0, v3: 0, v4: 0 });
  assert.deepEqual(Object.keys(obs).sort(), observationFields(clips.length).sort());
  assert.deepEqual(observationFields(2), ["kept", "v0", "v1"]);
  assert.equal(buildObservation([]).kept, "");
});

test("median record: nodes with slightly different counts still map onto one set of fields", () => {
  const node = (views: number[]) => buildObservation(views.map((v) => ({ kept: true as const, views: v })));
  const [n1, n2, n3] = [node([100, 50]), node([102, 50]), node([99, 51])];
  assert.deepEqual(Object.keys(n1), Object.keys(n2));
  const med = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
  const agreed: Record<string, unknown> = { kept: n1.kept };
  for (const f of observationFields(2).slice(1)) agreed[f] = med([n1, n2, n3].map((o) => (o as Record<string, number>)[f]));
  assert.equal(n1.kept, n2.kept);
  assert.deepEqual(agreed, { kept: "0,1", v0: 100, v1: 50 });
});

test("sumByCreator adds each creator's kept clips per campaign and skips dropped ones", () => {
  const agreed = { ...buildObservation(evaluateClips(clips, videos, bios)) } as Record<string, unknown>;
  assert.deepEqual(sumByCreator(clips, agreed), [{ campaignId: "7", creator: A, cumulativeViews: "1200" }]);
});

test("sumByCreator: several campaigns, checksummed output, zero totals omitted, bad records rejected", () => {
  const cs: ManifestClip[] = [
    { campaignId: "12", creator: B.toLowerCase(), videoId: vid(1), channelId: CH2 },
    { campaignId: "7", creator: B.toLowerCase(), videoId: vid(2), channelId: CH2 },
    { campaignId: "7", creator: B.toLowerCase(), videoId: vid(3), channelId: CH2 },
    { campaignId: "7", creator: A, videoId: vid(4), channelId: CH1 },
  ];
  const rows = sumByCreator(cs, { kept: "0,1,2,3", v0: 5000, v1: 100, v2: 200, v3: 0 });
  assert.deepEqual(rows, [
    { campaignId: "7", creator: B, cumulativeViews: "300" },
    { campaignId: "12", creator: B, cumulativeViews: "5000" },
  ]);
  assert.deepEqual(sumByCreator(cs, { kept: "" }), []);
  assert.throws(() => sumByCreator(cs, { kept: "0", v0: 1.5 }));
  assert.throws(() => sumByCreator(cs, { kept: "0" }));
});

test("parseKept rejects out-of-range, repeated or unsorted indexes", () => {
  assert.deepEqual(parseKept("0,2,3", 4), [0, 2, 3]);
  assert.deepEqual(parseKept("", 4), []);
  assert.throws(() => parseKept("4", 4));
  assert.throws(() => parseKept("2,1", 4));
  assert.throws(() => parseKept("1,1", 4));
  assert.throws(() => parseKept("a", 4));
});

test("rows from sumByCreator still chunk by maxRowsPerReport (unchanged chunking)", () => {
  const cs: ManifestClip[] = Array.from({ length: 60 }, (_, i) => ({
    campaignId: i % 2 ? "12" : "7",
    creator: "0x" + (0x1000 + i).toString(16).padStart(40, "0"),
    videoId: vid(i),
    channelId: CH1,
  }));
  const agreed: Record<string, unknown> = { kept: cs.map((_, i) => i).join(",") };
  cs.forEach((_, i) => (agreed[`v${i}`] = 100 + i));
  const rows = sumByCreator(cs, agreed);
  assert.equal(rows.length, 60);
  assert.deepEqual(chunkRows(rows, 25).map((c) => c.length), [25, 25, 10]);
});
