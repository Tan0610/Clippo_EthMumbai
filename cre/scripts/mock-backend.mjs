#!/usr/bin/env node
// Local mock of the Clippo backend AND of the YouTube Data API v3, for `cre workflow simulate`.
//   GET /api/snapshots/clips?day=   clip manifest (what workflow v2 reads): { day, hash, clips: [{ campaignId, creator, videoId, channelId }] }
//   GET /youtube/v3/videos          fake videos.list   (needs header x-goog-api-key == MOCK_YOUTUBE_KEY, default FAKE_YOUTUBE_KEY)
//   GET /youtube/v3/channels        fake channels.list (same header rule)
//   GET /api/snapshots/daily        legacy frozen feed, still used by scripts/emulate-delivery.mts
// The manifest world (fixture mode): 5 clips for the fixture creators. Three are good and add up to exactly the fixture rows
// (7/0x1111 = 1200, 7/0xabcd = 300, 12/0xabcd = 5000). Two must be DROPPED: a clip whose channel bio carries somebody else's code
// (99999 views), and a clip whose video really sits on another channel (8888 views).
// The old feed below it:
// Serves the shared fixture (workflows/clippo-settlement/fixtures/snapshot-feed.json) in the same envelope as
// web/src/lib/snapshots.ts: { day, hash, rows }.  `day` defaults to yesterday (UTC), like the real backend.
// Usage: node scripts/mock-backend.mjs [--port 8787] [--mode fixture|empty|stale|large|bump|unlinked] [--large-rows 60]
// Modes apply to both the manifest world and the legacy feed.
//   fixture  the shared fixture (default)
//   empty    rows: []            (workflow must no-op)
//   stale    day = 5 days ago    (workflow must reject)
//   large    --large-rows N synthetic rows on campaigns 7 and 12 (workflow must batch)
//   bump     fixture with views +100 on the first row (simulates the next day's snapshot)
//   unlinked fixture plus a row whose creator has no World ID link (escrow reverts NotHuman, receiver emits ItemFailed)
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";

const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };
const port = Number(flag("port", process.env.PORT ?? 8787));
const mode = flag("mode", process.env.MOCK_MODE ?? "fixture");
const fixture = JSON.parse(readFileSync(new URL("../workflows/clippo-settlement/fixtures/snapshot-feed.json", import.meta.url), "utf8"));
const YT_KEY = process.env.MOCK_YOUTUBE_KEY ?? "FAKE_YOUTUBE_KEY";
const dayOffset = (n) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);

function build() {
  let rows = fixture.backendFeed;
  let day = dayOffset(1);
  if (mode === "empty") rows = [];
  if (mode === "stale") day = dayOffset(5);
  if (mode === "bump") rows = rows.map((r, i) => (i === 0 ? { ...r, cumulativeViews: r.cumulativeViews + 100 } : r));
  if (mode === "unlinked") rows = [...rows, { campaignId: "7", creator: "0x2222222222222222222222222222222222222222", cumulativeViews: 777 }];
  if (mode === "large") {
    const n = Number(flag("large-rows", 60));
    rows = Array.from({ length: n }, (_, i) => ({
      campaignId: i % 2 ? "12" : "7",
      creator: "0x" + (0x1000 + i).toString(16).padStart(40, "0"),
      cumulativeViews: 100 + i,
    }));
  }
  return { day, hash: createHash("sha256").update(JSON.stringify(rows)).digest("hex"), rows };
}

// ---- manifest world: every clip has a real (true) channel and views; the manifest claims a channel. ----
const A = "0x1111111111111111111111111111111111111111";
const B = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd";
const C = "0x2222222222222222222222222222222222222222";
const ch = (c) => "UC" + c.repeat(22);
const vid = (n) => "video" + String(n).padStart(6, "0");
const code = (w) => `clippo:${w.toLowerCase()}`;
const CH_A = ch("a"), CH_B = ch("b"), CH_C = ch("c"), CH_X = ch("x"), CH_Y = ch("y");

function world() {
  const channels = new Map([ // channelId -> bio
    [CH_A, `Clippo creator A. ${code(A)}`],
    [CH_B, `clips and more\n${code(B)}\n`],
    [CH_C, `${code(C)}`],
    [CH_X, `this bio carries somebody else's code: ${code("0x9999999999999999999999999999999999999999")}`], // wrong bio
    [CH_Y, "no code here"],
  ]);
  // { campaignId, creator, videoId, channelId (manifest claim), trueChannel, views }
  let clips = [
    { campaignId: "7", creator: A, videoId: vid(1), channelId: CH_A, trueChannel: CH_A, views: 1200 },
    { campaignId: "7", creator: B, videoId: vid(2), channelId: CH_B, trueChannel: CH_B, views: 300 },
    { campaignId: "12", creator: B, videoId: vid(3), channelId: CH_B, trueChannel: CH_B, views: 5000 },
    { campaignId: "7", creator: A, videoId: vid(4), channelId: CH_X, trueChannel: CH_X, views: 99999 }, // DROP: bio has another wallet's code
    { campaignId: "12", creator: B, videoId: vid(5), channelId: CH_B, trueChannel: CH_Y, views: 8888 }, // DROP: video is on another channel
  ];
  if (mode === "empty") clips = [];
  if (mode === "bump") clips = clips.map((c, i) => (i === 0 ? { ...c, views: c.views + 100 } : c));
  if (mode === "unlinked") clips = [...clips, { campaignId: "7", creator: C, videoId: vid(6), channelId: CH_C, trueChannel: CH_C, views: 777 }];
  if (mode === "large") {
    const n = Number(flag("large-rows", 60));
    clips = Array.from({ length: n }, (_, i) => {
      const w = "0x" + (0x1000 + i).toString(16).padStart(40, "0");
      const channelId = "UC" + String(i).padStart(22, "0");
      channels.set(channelId, code(w));
      return { campaignId: i % 2 ? "12" : "7", creator: w, videoId: vid(100 + i), channelId, trueChannel: channelId, views: 100 + i };
    });
  }
  return { clips, channels };
}

function manifest(day) {
  const { clips } = world();
  const out = clips.map(({ campaignId, creator, videoId, channelId }) => ({ campaignId, creator, videoId, channelId }));
  return { day: day ?? (mode === "stale" ? dayOffset(5) : dayOffset(1)), hash: createHash("sha256").update(JSON.stringify(out)).digest("hex"), clips: out };
}

function youtube(url, res, reqKey) {
  const send = (code, body) => res.writeHead(code, { "content-type": "application/json" }).end(JSON.stringify(body));
  const key = url.searchParams.get("key"); // the workflow must send the key in a header, never in the URL
  if (key !== null || url.search.toLowerCase().includes("key=")) return send(400, { error: { message: "API key must not be in the URL" } });
  if (url.searchParams.get("x-goog-api-key") !== null) return send(400, { error: { message: "API key must not be in the URL" } });
  if (reqKey !== YT_KEY) return send(403, { error: { message: "bad or missing x-goog-api-key" } });
  const ids = (url.searchParams.get("id") ?? "").split(",").filter(Boolean);
  if (ids.length === 0 || ids.length > 50) return send(400, { error: { message: "id needs 1..50 ids" } });
  const { clips, channels } = world();
  if (url.pathname.endsWith("/videos")) {
    const items = ids.flatMap((id) => {
      const c = clips.find((x) => x.videoId === id);
      return c ? [{ id, snippet: { channelId: c.trueChannel }, statistics: { viewCount: String(c.views) } }] : [];
    });
    return send(200, { items });
  }
  if (url.pathname.endsWith("/channels")) {
    return send(200, { items: ids.filter((id) => channels.has(id)).map((id) => ({ id, snippet: { description: channels.get(id) } })) });
  }
  return send(404, { error: { message: "not found" } });
}

createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
  if (url.pathname.startsWith("/youtube/v3/")) {
    const reqKey = String(req.headers["x-goog-api-key"] ?? "");
    console.log(`[mock-youtube] ${req.method} ${url.pathname} params=${[...url.searchParams.keys()].join(",")} key-header=${reqKey === YT_KEY ? "ok" : "BAD"}`);
    youtube(url, res, reqKey);
    return;
  }
  if (url.pathname === "/api/snapshots/clips") {
    const m = manifest(url.searchParams.get("day"));
    console.log(`[mock-backend] ${req.method} ${req.url} -> manifest day=${m.day} clips=${m.clips.length} mode=${mode}`);
    res.writeHead(200, { "content-type": "application/json", etag: `"${m.hash}"` }).end(JSON.stringify(m));
    return;
  }
  if (url.pathname !== "/api/snapshots/daily") { res.writeHead(404).end("not found"); return; }
  const body = build();
  console.log(`[mock-backend] ${req.method} ${req.url} -> day=${body.day} rows=${body.rows.length} mode=${mode}`);
  res.writeHead(200, { "content-type": "application/json", etag: `"${body.hash}"` }).end(JSON.stringify(body));
}).listen(port, "127.0.0.1", () => console.log(`[mock-backend] listening on http://127.0.0.1:${port} mode=${mode}`));
