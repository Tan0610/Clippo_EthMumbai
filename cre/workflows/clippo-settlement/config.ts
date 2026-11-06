import { z } from "zod";

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const HTTP_URL_RE = /^https?:\/\/[^\s/?#]+(\/\S*)?$/;

// Regex, not z.string().url(): that relies on the URL global, which throws "Invalid url" in the CRE wasm runtime.
export const configSchema = z.object({
  // 6-field cron (seconds first). Daily at 00:30 UTC by default (after the backend freeze job).
  schedule: z.string(),
  // Clippo backend base URL; the workflow calls GET {backendUrl}{manifestPath}?day=YYYY-MM-DD
  backendUrl: z.string().regex(HTTP_URL_RE, "backendUrl must be an http(s) URL"),
  // Clip manifest: { day, hash, clips: [{ campaignId, creator, videoId, channelId }] }. Default /api/snapshots/clips.
  manifestPath: z.string(),
  // YouTube Data API v3 base URL (the staging config points at the local mock). The API key is a CRE secret, sent in a header.
  youtubeApiBase: z.string().regex(HTTP_URL_RE, "youtubeApiBase must be an http(s) URL"),
  // Legacy frozen feed path: only scripts/emulate-delivery.mts reads it; the workflow itself no longer does.
  feedPath: z.string().optional(),
  // Reject a manifest whose day is older than this many UTC days (staleness / replay of an old day).
  maxStalenessDays: z.number().int().min(0),
  // Rows per signed report (keeps each onReport under the gas budget).
  maxRowsPerReport: z.number().int().min(1),
  // EVM addresses allowed to trigger the DEPLOYED HTTP handler (cre-sdk http v1alpha AuthorizedKey).
  httpAuthorizedKeys: z
    .array(
      z.object({
        type: z.literal("KEY_TYPE_ECDSA_EVM"),
        publicKey: z.string().regex(ADDRESS_RE, "publicKey must be a 0x-prefixed EVM address"),
      }),
    )
    .optional(),
  // When true (production), startup fails unless httpAuthorizedKeys is non-empty, so the trigger is never left open.
  requireHttpAuthorizedKeys: z.boolean().optional(),
  evm: z.object({
    chainSelectorName: z.string(), // e.g. "arc-testnet"
    isTestnet: z.boolean(),
    // ClippoReportReceiver (the reporting adapter registered as ClippoEscrow.reportAdapter). The zero address is refused
    // later, only when there is something to deliver (assertReceiverConfigured), so an empty feed can still simulate.
    receiverAddress: z.string().regex(ADDRESS_RE, "receiverAddress must be a 0x-prefixed 20-byte address"),
    gasLimit: z.string(), // per report
  }),
});

export type Config = z.infer<typeof configSchema>;

/** HTTP trigger config. Throws when keys are required but absent (never leave the deployed trigger open). */
export function httpTriggerConfig(config: Config): { authorizedKeys?: { type: "KEY_TYPE_ECDSA_EVM"; publicKey: string }[] } {
  const keys = config.httpAuthorizedKeys ?? [];
  if (config.requireHttpAuthorizedKeys && keys.length === 0) {
    throw new Error("httpAuthorizedKeys is required (requireHttpAuthorizedKeys=true) but none are configured; refusing to leave the HTTP trigger open");
  }
  return keys.length > 0 ? { authorizedKeys: keys } : {};
}
