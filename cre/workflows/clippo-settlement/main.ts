import {
  ConsensusAggregationByFields,
  cre,
  bytesToHex,
  decodeJson,
  getNetwork,
  hexToBase64,
  identical,
  json,
  ok,
  Runner,
  TxStatus,
  type HTTPPayload,
  type HTTPSendRequester,
  type Runtime,
} from "@chainlink/cre-sdk";
import { EVM_PB } from "@chainlink/cre-sdk/pb";
import { keccak256, stringToHex } from "viem";
import { z } from "zod";
import {
  assertFresh,
  assertReceiverConfigured,
  chunkRows,
  encodeReport,
  normalizeSnapshot,
  parseFrozenFeed,
  summarizeReceiverLogs,
  type ReportOutcome,
  type SnapshotRow,
} from "./snapshot";

const configSchema = z.object({
  // 6-field cron (seconds first). Daily at 00:30 UTC by default (after the backend freeze job).
  schedule: z.string(),
  // Clippo backend base URL; the workflow calls GET {backendUrl}{feedPath}[?day=YYYY-MM-DD]
  // Regex, not z.string().url(): that relies on the URL global, which throws "Invalid url" in the CRE wasm runtime.
  backendUrl: z.string().regex(/^https?:\/\/[^\s/?#]+(\/\S*)?$/, "backendUrl must be an http(s) URL"),
  // Frozen daily feed: { day, hash, rows }. Default /api/snapshots/daily.
  feedPath: z.string(),
  // Reject a snapshot whose day is older than this many UTC days (staleness / replay of an old feed).
  maxStalenessDays: z.number().int().min(0),
  // Rows per signed report (keeps each onReport under the gas budget).
  maxRowsPerReport: z.number().int().min(1),
  evm: z.object({
    chainSelectorName: z.string(), // e.g. "arc-testnet"
    isTestnet: z.boolean(),
    // ClippoReportReceiver (the reporting adapter registered as ClippoEscrow.reportAdapter)
    receiverAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
    gasLimit: z.string(), // per report
  }),
});

type Config = z.infer<typeof configSchema>;

/** What every node returns; each field must be IDENTICAL across nodes (frozen backend snapshot). */
type NodeView = { day: string; hash: string; rows: string };

/**
 * Runs on EACH node: fetch the frozen snapshot, validate + canonicalise rows, and return {day, hash, rows}
 * where hash = keccak256(canonical rows). The DON requires all three fields to be identical, so a node that sees
 * different bytes (e.g. a snapshot that changed mid-day) breaks consensus instead of being signed.
 */
const fetchSnapshot = (sendRequester: HTTPSendRequester, config: Config, day: string): NodeView => {
  const qs = day ? `?day=${encodeURIComponent(day)}` : "";
  const res = sendRequester.sendRequest({ url: `${config.backendUrl}${config.feedPath}${qs}`, method: "GET" }).result();
  if (!ok(res)) throw new Error(`snapshot request failed: HTTP ${res.statusCode}`);
  const feed = parseFrozenFeed(json(res));
  const rows = normalizeSnapshot(feed.rows);
  return { day: feed.day, hash: keccak256(stringToHex(rows)), rows };
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

  // 1. Read + reach consensus on the frozen snapshot
  const http = new cre.capabilities.HTTPClient();
  const agreed = http
    .sendRequest(
      runtime,
      fetchSnapshot,
      ConsensusAggregationByFields<NodeView>({ day: identical, hash: identical, rows: identical }),
    )(cfg, requestedDay)
    .result();
  runtime.log(`snapshot agreed: day=${agreed.day} hash=${agreed.hash}`);

  // 2. Staleness guard (DON time) + empty feed
  assertFresh(agreed.day, runtime.now(), cfg.maxStalenessDays);
  const rows = JSON.parse(agreed.rows) as SnapshotRow[];
  runtime.log(`snapshot rows: ${rows.length}`);
  if (rows.length === 0) return `no-op: empty snapshot for ${agreed.day}`;

  // Checked here, not in configSchema, so a config without a receiver can still simulate the read path of an empty feed.
  assertReceiverConfigured(cfg.evm.receiverAddress);

  // 3. Sign + deliver in batches: report -> forwarder -> ClippoReportReceiver.onReport -> ClippoEscrow.reportViews
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
  if (txs.every((tx) => tx === "n/a")) return `dry run, nothing sent: day=${agreed.day} rows=${rows.length} reports=${txs.length}`;
  return `delivered day=${agreed.day} rows=${rows.length} reports=${txs.length} failedRows=${failedRows} unconfirmedBatches=${unconfirmedBatches} txs=${txs.join(",")}`;
};

// Trigger 0: daily cron (default: yesterday's frozen snapshot).
const onCron = (runtime: Runtime<Config>): string => settle(runtime, "");

// Trigger 1: HTTP, for on-demand/manual settlement. Optional body {"day":"YYYY-MM-DD"} selects an older frozen day.
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
    // authorizedKeys: add the EVM address(es) allowed to trigger a DEPLOYED workflow; simulation needs none.
    cre.handler(httpTrigger.trigger({}), onHttp),
  ];
};

export async function main() {
  const runner = await Runner.newRunner<Config>({ configSchema });
  await runner.run(initWorkflow);
}

main();
