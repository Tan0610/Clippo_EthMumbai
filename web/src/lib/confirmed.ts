import type { Prisma } from "@prisma/client";
import { chainConfig } from "./chain/config";
import { db } from "./db";

/**
 * "Confirmed" views = views the Chainlink CRE workflow reported on-chain (ViewsReported events, indexed into ViewsReport).
 * "Pending" views = Clippo's own YouTube count minus the confirmed part. Only confirmed views are credited by the escrow.
 * Granularity is (campaign, creator): the chain does not know single clips.
 */
export interface Proof {
  txHash: string;
  blockNumber: number;
  reportedAt: string;
  explorerUrl: string;
}
export interface Confirmed {
  confirmedViews: number;
  proof: Proof | null;
}
export interface ConfirmedFields extends Confirmed {
  pendingViews: number;
}

export interface ReportRow {
  campaignId: string;
  creatorId: string;
  cumulativeViews: number;
  deltaViews: number;
  txHash: string;
  logIndex: number;
  blockNumber: number;
  reportedAt: Date;
}

export const pairKey = (campaignId: string, creatorId: string) => `${campaignId}:${creatorId}`;

export const NO_CONFIRMED: Confirmed = { confirmedViews: 0, proof: null };

/** Views Clippo counted that the chain has not confirmed yet. */
export const pendingViews = (polled: number, confirmed: number) => Math.max(0, Math.round(polled) - confirmed);

export const withPending = (c: Confirmed, polled: number): ConfirmedFields => ({ ...c, pendingViews: pendingViews(polled, c.confirmedViews) });

export function proofOf(r: ReportRow, explorerBase: string = chainConfig().explorerBase): Proof {
  return { txHash: r.txHash, blockNumber: r.blockNumber, reportedAt: r.reportedAt.toISOString(), explorerUrl: `${explorerBase}/tx/${r.txHash}` };
}

/**
 * Pure: fold reports into confirmed views per `campaignId:creatorId`.
 * confirmedViews = highest cumulative reported. proof = the latest report that added views (else the latest report).
 */
export function foldReports(rows: ReportRow[], explorerBase?: string): Map<string, Confirmed> {
  const sorted = [...rows].sort((a, b) => a.blockNumber - b.blockNumber || a.logIndex - b.logIndex);
  const best = new Map<string, { views: number; moved: ReportRow | null; last: ReportRow }>();
  for (const r of sorted) {
    const k = pairKey(r.campaignId, r.creatorId);
    const cur = best.get(k) ?? { views: 0, moved: null, last: r };
    cur.views = Math.max(cur.views, r.cumulativeViews);
    if (r.deltaViews > 0) cur.moved = r;
    cur.last = r;
    best.set(k, cur);
  }
  const out = new Map<string, Confirmed>();
  for (const [k, v] of best) out.set(k, { confirmedViews: v.views, proof: proofOf(v.moved ?? v.last, explorerBase) });
  return out;
}

/** Pure: add up several (campaign, creator) results; the proof is the one in the latest block. */
export function sumConfirmed(items: Confirmed[]): Confirmed {
  let proof: Proof | null = null;
  let views = 0;
  for (const c of items) {
    views += c.confirmedViews;
    if (c.proof && (!proof || c.proof.blockNumber > proof.blockNumber)) proof = c.proof;
  }
  return { confirmedViews: views, proof };
}

/** Confirmed views per `campaignId:creatorId` for any filter on ViewsReport. */
export async function confirmedByPair(where: Prisma.ViewsReportWhereInput = {}): Promise<Map<string, Confirmed>> {
  const rows = await db.viewsReport.findMany({
    where,
    select: { campaignId: true, creatorId: true, cumulativeViews: true, deltaViews: true, txHash: true, logIndex: true, blockNumber: true, reportedAt: true },
  });
  return foldReports(rows);
}

/** Confirmed views for one campaign, summed over its creators. */
export async function confirmedForCampaign(campaignId: string): Promise<Confirmed> {
  return sumConfirmed([...(await confirmedByPair({ campaignId })).values()]);
}
