import {
  ConsensusAggregationByFields,
  cre,
  bytesToHex,
  decodeJson,
  getNetwork,
  hexToBase64,
  identical,
  json,
  median,
  ok,
  Runner,
  TxStatus,
  type HTTPPayload,
  type HTTPSendRequester,
  type NodeRuntime,
  type Runtime,
  type ConsensusAggregationFields,
} from "@chainlink/cre-sdk";
import { EVM_PB } from "@chainlink/cre-sdk/pb";
import { keccak256, stringToHex } from "viem";
import { configSchema, httpTriggerConfig, type Config } from "./config";
import { assertFresh, assertReceiverConfigured, chunkRows, encodeReport, summarizeReceiverLogs, type ReportOutcome, type SnapshotRow } from "./snapshot";
import {
  batches,
  buildObservation,
  channelsUrl,
  evaluateClips,
  manifestHash,
  normalizeManifest,
  observationFields,
  parseChannels,
  parseVideos,
  sumByCreator,
  videosUrl,
  type ManifestClip,
  type Observation,
} from "./youtube";

// Name of the CRE secret (cre/secrets.yaml maps it to the env var YOUTUBE_API_KEY_CRE for simulation).
const YOUTUBE_SECRET_ID = "YOUTUBE_API_KEY";



/** What every node returns for the manifest; each field must be IDENTICAL across nodes. */
type NodeManifest = { day: string; sourceHash: string; hash: string; clips: string };

/**
 * Runs on EACH node: fetch the clip manifest, validate + canonicalise it, and return it as strings. The DON requires every
 * field to be identical, so a node that sees different bytes breaks consensus instead of being signed.
 */
const fetchManifest = (sendRequester: HTTPSendRequester, config: Config, day: string): NodeManifest => {
  const qs = day ? `?day=${encodeURIComponent(day)}` : "";
  const res = sendRequester.sendRequest({ url: `${config.backendUrl}${config.manifestPath}${qs}`, method: "GET" }).result();
  if (!ok(res)) throw new Error(`manifest request failed: HTTP ${res.statusCode}`);
  const m = normalizeManifest(json(res));
  return { day: m.day, sourceHash: m.sourceHash, hash: manifestHash(m.clips), clips: JSON.stringify(m.clips) };
};

/** One YouTube GET with the API key in a header (never in the URL, never logged). Errors carry only the status code. */
const youtubeGet = (nodeRuntime: NodeRuntime<Config>, url: string, apiKey: string, what: string): unknown => {
  const res = new cre.capabilities.HTTPClient()
    .sendRequest(nodeRuntime, { url, method: "GET", multiHeaders: { "x-goog-api-key": { values: [apiKey] } } })
    .result();
  if (!ok(res)) throw new Error(`youtube ${what} failed: HTTP ${res.statusCode}`);
  return json(res);
};

/**
 * Runs on EACH node: read every manifest clip's live view count and channel from the YouTube Data API, keep a clip only
 * if its channel matches the manifest and the channel bio holds clippo:<creator wallet>, and return the fixed-shape
 * record { kept, v0..vN }. Dropped clips are logged with the reason (no secrets).
 */
const readYoutube = (nodeRuntime: NodeRuntime<Config>, clips: ManifestClip[], apiKey: string): Observation => {
  const base = nodeRuntime.config.youtubeApiBase;
  const videos = new Map<string, { channelId: string; views: number | null }>();
  for (const ids of batches([...new Set(clips.map((c) => c.videoId))])) {
    parseVideos(youtubeGet(nodeRuntime, videosUrl(base, ids), apiKey, "videos.list")).forEach((v, id) => videos.set(id, v));
  }
  // Only channels of videos that really sit on the channel the manifest names are worth a bio lookup.
  const channelIds = [...new Set(clips.filter((c) => videos.get(c.videoId)?.channelId === c.channelId).map((c) => c.channelId))];
  const bios = new Map<string, string>();
  for (const ids of batches(channelIds)) {
    parseChannels(youtubeGet(nodeRuntime, channelsUrl(base, ids), apiKey, "channels.list")).forEach((b, id) => bios.set(id, b));
  }
  const checks = evaluateClips(clips, videos, bios);
  checks.forEach((c, i) => {
    if (!c.kept) nodeRuntime.log(`clip dropped: campaign=${clips[i].campaignId} creator=${clips[i].creator} video=${clips[i].videoId}: ${c.reason}`);
  });
  return buildObservation(checks);
};

/**
 * Consensus map for a manifest of n clips: `kept` must be IDENTICAL, every view count takes the MEDIAN across nodes.
 * The field set depends on n, so it is built at runtime (n is only known after the manifest is agreed); the SDK reads
 * the map with Object.keys, so a dynamic map is fine, only the static type needs a cast.
 */
const observationAggregation = (n: number) => {
  const fields: Record<string, () => unknown> = {};
  for (const name of observationFields(n)) fields[name] = name === "kept" ? identical : median;
  return ConsensusAggregationByFields<Observation>(fields as unknown as ConsensusAggregationFields<Observation>);
};

/**
 * The receiver swallows per-row reverts (ItemFailed), so a SUCCESS status does not mean every row landed: read the receipt.
 * Returns null when the receipt cannot be read (e.g. a dry run sent no transaction). Never throws: the report is already delivered.
 */
const readReportOutcome = (
  runtime: Runtime<Config>,
  evm: InstanceType<typeof cre.capabilities.EVMClient>,
  txHash: Uint8Array,
): ReportOutcome | null => {
  try {
    const { receipt } = evm.getTransactionReceipt(runtime, { hash: txHash }).result();
    if (!receipt) return null;
    const logs = receipt.logs.map((l) => ({
      address: bytesToHex(l.address),
      topics: l.topics.map((t) => bytesToHex(t)),
      data: bytesToHex(l.data),
    }));
    return summarizeReceiverLogs(logs, runtime.config.evm.receiverAddress);
  } catch (e) {
    runtime.log(`could not read receipt: ${e instanceof Error ? e.message : String(e)}`);
    return null;
  }
};

const settle = (runtime: Runtime<Config>, requestedDay: string): string => {
  const cfg = runtime.config;

  // 1. Read + reach consensus on the clip manifest (which clips to check; no view counts in it)
  const http = new cre.capabilities.HTTPClient();
  const manifest = http
    .sendRequest(
      runtime,
      fetchManifest,
      ConsensusAggregationByFields<NodeManifest>({ day: identical, sourceHash: identical, hash: identical, clips: identical }),
    )(cfg, requestedDay)
    .result();
  runtime.log(`manifest agreed: day=${manifest.day} hash=${manifest.hash}`);

  // 2. Staleness guard (DON time) + empty manifest
  assertFresh(manifest.day, runtime.now(), cfg.maxStalenessDays);
  const clips = JSON.parse(manifest.clips) as ManifestClip[];
  runtime.log(`manifest clips: ${clips.length}`);
  if (clips.length === 0) return `no-op: empty manifest for ${manifest.day}`;

  // 3. Every node reads YouTube itself; views take the median, the set of kept clips must be identical.
  const apiKey = runtime.getSecret({ id: YOUTUBE_SECRET_ID }).result().value;
  const observed = runtime.runInNodeMode(readYoutube, observationAggregation(clips.length))(clips, apiKey).result();
  const rows: SnapshotRow[] = sumByCreator(clips, observed);
  runtime.log(`youtube agreed: kept ${observed.kept === "" ? 0 : observed.kept.split(",").length}/${clips.length} clips, ${rows.length} creator rows`);
  if (rows.length === 0) return `no-op: no clip passed the YouTube checks for ${manifest.day}`;

  // Checked here, not in configSchema, so a config without a receiver can still simulate the read path of an empty feed.
  assertReceiverConfigured(cfg.evm.receiverAddress);

  // 4. Sign + deliver in batches: report -> forwarder -> ClippoReportReceiver.onReport -> ClippoEscrow.reportViews
  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName: cfg.evm.chainSelectorName,
    isTestnet: cfg.evm.isTestnet,
  });
  if (!network) throw new Error(`unknown network ${cfg.evm.chainSelectorName}`);
  const evm = new cre.capabilities.EVMClient(network.chainSelector.selector);

  const batches = chunkRows(rows, cfg.maxRowsPerReport);
  const txs: string[] = [];
  let failedRows = 0;
  let unconfirmedBatches = 0;
  batches.forEach((batch, i) => {
    const report = runtime
      .report({
        encodedPayload: hexToBase64(encodeReport(batch)),
        encoderName: "evm",
        signingAlgo: "ecdsa",
        hashingAlgo: "keccak256",
      })
      .result();

    const resp = evm
      .writeReport(runtime, {
        receiver: cfg.evm.receiverAddress,
        report,
        gasConfig: { gasLimit: cfg.evm.gasLimit },
      })
      .result();

    // TODO(ItemFailed): ClippoReportReceiver swallows per-item reverts and emits ItemFailed, so a SUCCESS write may
    // still have credited nothing for some/all rows. WriteReportReply (cre-sdk) exposes no receipt logs, so this cannot
    // be detected here; a read-back of ClippoEscrow state (or an off-workflow ItemFailed log scan) is needed.
    if (resp.txStatus !== TxStatus.SUCCESS) {
      throw new Error(`writeReport batch ${i + 1}/${batches.length} failed: ${resp.errorMessage ?? resp.txStatus}`);
    }
    if (resp.receiverContractExecutionStatus === EVM_PB.ReceiverContractExecutionStatus.REVERTED) {
      throw new Error(`onReport reverted for batch ${i + 1}/${batches.length}`);
    }
    const txHash = resp.txHash?.length ? bytesToHex(resp.txHash) : "n/a";
    runtime.log(`batch ${i + 1}/${batches.length}: ${batch.length} rows, tx ${txHash}`);
    txs.push(txHash);

    if (txHash === "n/a") return; // simulate without --broadcast sends nothing
    const outcome = readReportOutcome(runtime, evm, resp.txHash!);
    if (!outcome) {
      unconfirmedBatches++;
      runtime.log(`WARNING batch ${i + 1}/${batches.length}: receipt unavailable, row results unconfirmed`);
      return;
    }
    // The forwarder swallows an onReport revert, so the tx succeeds and the status checks above stay green.
    if (outcome.failed === null) {
      throw new Error(`batch ${i + 1}/${batches.length}: tx ${txHash} has no ReportProcessed event, the receiver rejected the report (for a simulation receiver, tx.origin must be expectedWorkflowOwner)`);
    }
    failedRows += outcome.failed;
    runtime.log(`batch ${i + 1}/${batches.length}: receiver processed ${outcome.items} rows, ${outcome.failed} failed`);
    for (const f of outcome.failures) {
      runtime.log(`WARNING row NOT credited: campaign=${f.campaignId} creator=${f.creator} reason=${f.reason}`);
    }
  });
  if (txs.every((tx) => tx === "n/a")) return `dry run, nothing sent: day=${manifest.day} rows=${rows.length} reports=${txs.length}`;
  return `delivered day=${manifest.day} rows=${rows.length} reports=${txs.length} failedRows=${failedRows} unconfirmedBatches=${unconfirmedBatches} txs=${txs.join(",")}`;
};

// Trigger 0: daily cron (default day: the backend's choice, yesterday).
const onCron = (runtime: Runtime<Config>): string => settle(runtime, "");

// Trigger 1: HTTP, for on-demand/manual settlement. Optional body {"day":"YYYY-MM-DD"} selects an older day.
const onHttp = (runtime: Runtime<Config>, payload: HTTPPayload): string => {
  let day = "";
  if (payload.input && payload.input.length > 0) {
    const body = decodeJson(payload.input) as { day?: unknown };
    if (body.day !== undefined) {
      if (typeof body.day !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.day)) throw new Error("input.day must be YYYY-MM-DD");
      day = body.day;
    }
  }
  return settle(runtime, day);
};

const initWorkflow = (config: Config) => {
  const cron = new cre.capabilities.CronCapability();
  const httpTrigger = new cre.capabilities.HTTPCapability();
  return [
    cre.handler(cron.trigger({ schedule: config.schedule }), onCron),
    // authorizedKeys come from config.httpAuthorizedKeys; production sets requireHttpAuthorizedKeys so startup fails if empty.
    cre.handler(httpTrigger.trigger(httpTriggerConfig(config)), onHttp),
  ];
};

export async function main() {
  const runner = await Runner.newRunner<Config>({ configSchema });
  await runner.run(initWorkflow);
}

main();
