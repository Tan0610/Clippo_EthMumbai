// Run: node --experimental-strip-types --test workflows/clippo-settlement/snapshot.test.ts   (from cre/)
// Shared fixture with the backend contract test (web/src/lib/snapshots.contract.test.ts).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { normalizeSnapshot } from "./snapshot.ts";

const fx = JSON.parse(readFileSync(new URL("./fixtures/snapshot-feed.json", import.meta.url), "utf8"));

test("normalizeSnapshot turns the backend feed into the canonical string every node agrees on", () => {
  assert.equal(normalizeSnapshot(fx.backendFeed), fx.normalized);
});

test("rows with non-numeric (internal cuid) campaign ids are dropped", () => {
  const out = JSON.parse(normalizeSnapshot([...fx.backendFeed, { campaignId: "cmabc123", creator: fx.backendFeed[0].creator, cumulativeViews: 9 }]));
  assert.equal(out.length, 3);
});

import { assertFresh, chunkRows, parseFrozenFeed } from "./snapshot.ts";

test("empty feed normalises to []", () => {
  assert.equal(normalizeSnapshot([]), "[]");
});

test("normalisation is order-independent and keeps the highest duplicate", () => {
  const shuffled = [...fx.backendFeed].reverse();
  shuffled.push({ ...fx.backendFeed[0], cumulativeViews: 10 });
  assert.equal(normalizeSnapshot(shuffled), fx.normalized);
});

test("parseFrozenFeed accepts the envelope and rejects malformed ones", () => {
  assert.deepEqual(parseFrozenFeed({ day: "2026-10-27", hash: "ab", rows: [] }).rows, []);
  assert.throws(() => parseFrozenFeed([]));
  assert.throws(() => parseFrozenFeed({ day: "yesterday", rows: [] }));
  assert.throws(() => parseFrozenFeed({ day: "2026-10-27", rows: {} }));
});

test("assertFresh: yesterday ok, too old and future rejected", () => {
  const now = new Date("2026-10-28T00:30:00Z");
  assertFresh("2026-10-27", now, 2);
  assertFresh("2026-10-26", now, 2);
  assert.throws(() => assertFresh("2026-10-25", now, 2), /stale/);
  assert.throws(() => assertFresh("2026-10-29", now, 2), /future/);
});

test("chunkRows splits large batches", () => {
  const rows = Array.from({ length: 120 }, (_, i) => i);
  const c = chunkRows(rows, 50);
  assert.deepEqual(c.map((x) => x.length), [50, 50, 20]);
  assert.deepEqual(chunkRows([], 50), []);
  assert.throws(() => chunkRows(rows, 0));
});

import { encodeAbiParameters, keccak256, pad, stringToHex, type Hex } from "viem";
import { assertReceiverConfigured, summarizeReceiverLogs } from "./snapshot.ts";

test("assertReceiverConfigured refuses only the zero address", () => {
  assert.throws(() => assertReceiverConfigured("0x" + "0".repeat(40)), /zero address/);
  assertReceiverConfigured("0xd7842e13512a45cd6a36def823b316befa75f033");
});

test("summarizeReceiverLogs reports swallowed rows, names known errors and ignores other contracts", () => {
  const receiver: Hex = "0xd7842e13512a45cd6a36def823b316befa75f033";
  const creator: Hex = "0x2222222222222222222222222222222222222222";
  const notHuman = keccak256(stringToHex("NotHuman()")).slice(0, 10) as Hex;
  const itemFailed = (reason: Hex, address: Hex = receiver) => ({
    address,
    topics: [keccak256(stringToHex("ItemFailed(uint256,address,bytes)")), pad("0x07"), pad(creator)] as Hex[],
    data: encodeAbiParameters([{ type: "bytes" }], [reason]),
  });
  const processed = {
    address: receiver,
    topics: [keccak256(stringToHex("ReportProcessed(uint256,uint256)"))] as Hex[],
    data: encodeAbiParameters([{ type: "uint256" }, { type: "uint256" }], [4n, 2n]),
  };
  const out = summarizeReceiverLogs(
    [itemFailed(notHuman), itemFailed("0xdeadbeef"), itemFailed(notHuman, creator), processed],
    receiver.toUpperCase().replace("0X", "0x"),
  );
  assert.equal(out.items, 4);
  assert.equal(out.failed, 2);
  assert.deepEqual(out.failures.map((f) => [f.campaignId, f.creator, f.reason]), [
    ["7", creator, "NotHuman()"],
    ["7", creator, "0xdeadbeef"],
  ]);
  assert.deepEqual(summarizeReceiverLogs([], receiver), { items: null, failed: null, failures: [] });
});

import { configSchema, httpTriggerConfig } from "./config.ts";
import { normalizeSnapshotWithStats } from "./snapshot.ts";

const baseCfg = () => ({
  schedule: "0 30 0 * * *",
  backendUrl: "http://127.0.0.1:8787",
  manifestPath: "/api/snapshots/clips",
  youtubeApiBase: "http://127.0.0.1:8787/youtube/v3",
  maxStalenessDays: 2,
  maxRowsPerReport: 25,
  evm: { chainSelectorName: "arc-testnet", isTestnet: true, receiverAddress: "0xd7842e13512a45cd6a36def823b316befa75f033", gasLimit: "3000000" },
});

test("config: the checked-in staging and production configs parse", () => {
  const load = (f: string) => JSON.parse(readFileSync(new URL(`./${f}`, import.meta.url), "utf8"));
  assert.ok(configSchema.safeParse(load("config.staging.json")).success);
  assert.ok(configSchema.safeParse(load("config.production.json")).success);
});

test("config: requireHttpAuthorizedKeys fails fast without keys", () => {
  assert.deepEqual(httpTriggerConfig(configSchema.parse(baseCfg())), {});
  assert.throws(() => httpTriggerConfig(configSchema.parse({ ...baseCfg(), requireHttpAuthorizedKeys: true })), /httpAuthorizedKeys is required/);
  const keyed = configSchema.parse({
    ...baseCfg(),
    requireHttpAuthorizedKeys: true,
    httpAuthorizedKeys: [{ type: "KEY_TYPE_ECDSA_EVM", publicKey: "0xd7842e13512a45cd6a36def823b316befa75f033" }],
  });
  assert.equal(httpTriggerConfig(keyed).authorizedKeys?.length, 1);
});

test("normalizeSnapshotWithStats counts dropped rows", () => {
  const good = fx.backendFeed[0];
  const { json, dropped } = normalizeSnapshotWithStats([good, null, "x", { campaignId: "cmabc", creator: good.creator, cumulativeViews: 1 }, { campaignId: "1", creator: "nope", cumulativeViews: 1 }]);
  assert.equal(JSON.parse(json).length, 1);
  assert.equal(dropped, 4);
});

test("ordering is deterministic: campaignId numeric, then ordinal lowercase creator", () => {
  const a = "0xBBbbBBbbBBbbBBbbBBbbBBbbBBbbBBbbBBbbBBbb";
  const b = "0xaaaaAAAAaaaaAAAAaaaaAAAAaaaaAAAAaaaaAAAA";
  const rows = [
    { campaignId: "10", creator: a, cumulativeViews: 1 },
    { campaignId: "9", creator: a, cumulativeViews: 1 },
    { campaignId: "9", creator: b, cumulativeViews: 1 },
  ];
  const out = JSON.parse(normalizeSnapshot(rows)).map((r: { campaignId: string; creator: string }) => r.campaignId + ":" + r.creator.toLowerCase().slice(2, 4));
  assert.deepEqual(out, ["9:aa", "9:bb", "10:bb"]);
  assert.equal(normalizeSnapshot([...rows].reverse()), normalizeSnapshot(rows));
});
