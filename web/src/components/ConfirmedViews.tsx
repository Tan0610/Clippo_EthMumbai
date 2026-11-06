"use client";
import { whole, compact } from "./format";
import { Check } from "./Icons";
import type { Proof } from "@/ui-mocks/data";
import "./confirmed.css";

/** The one-line explainer (shown once per screen, or inline with `explain`). */
export const CONFIRMED_EXPLAINER = "Confirmed = read from YouTube by Chainlink CRE nodes and written on Arc. Pending = Clippo's own count. Only Confirmed is paid.";

/** Campaign modes where CRE reports views. HUMAN_SPLIT pays by a human-approved split, so it has no Confirmed number. */
export const hasConfirmed = (mode?: string) => mode?.toLowerCase() !== "human_split";

export function ConfirmedNote() {
  return <p className="note cv-explain"><span className="micro">Confirmed and pending</span>{CONFIRMED_EXPLAINER}</p>;
}

const shortHash = (h: string) => (/^0x[0-9a-fA-F]{20,}$/.test(h) ? `${h.slice(0, 8)}…${h.slice(-4)}` : h);

/** Link to the on-chain report. Only http(s) links render. */
function ProofLink({ proof }: { proof: NonNullable<Proof> }) {
  if (!/^https?:\/\//i.test(proof.explorerUrl)) return null;
  const when = proof.reportedAt ? new Date(proof.reportedAt) : null;
  const title = `Block ${proof.blockNumber}${when && !Number.isNaN(when.getTime()) ? `, reported ${when.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` : ""}`;
  return (
    <span className="micro cv-proof">
      <a href={proof.explorerUrl} target="_blank" rel="noreferrer noopener" title={title}>Proof {shortHash(proof.txHash)}</a>
    </span>
  );
}

type Props = {
  variant: "cell" | "stat" | "line";
  /** Views read by CRE and written on Arc. Absent counts as 0. */
  confirmed?: number;
  /** Clippo's own count not yet confirmed. If absent it is `clippo - confirmed`. */
  pending?: number;
  /** Clippo's own total count, used only to work out `pending` when the server sent none. */
  clippo?: number;
  proof?: Proof;
  /** HUMAN_SPLIT renders nothing; show the Clippo count yourself. */
  mode?: string;
  label?: string;
  /** Add the one-line explainer. */
  explain?: boolean;
  /** Short numbers (12.4K) for tight table cells. */
  short?: boolean;
};

/** Confirmed views, with Pending beneath, a Chainlink badge, and a link to the on-chain report. */
export function ConfirmedViews({ variant, confirmed, pending, clippo, proof, mode, label = "Confirmed views", explain, short }: Props) {
  if (!hasConfirmed(mode)) return null;
  if (confirmed === undefined && pending === undefined && clippo === undefined) return null;
  const c = confirmed ?? 0;
  const p = pending ?? Math.max(0, (clippo ?? 0) - c);
  const n = (v: number) => (short ? compact(v) : whole(v));
  const live = c > 0 || !!proof;
  const badge = live ? <span className="tag cv-badge" title="Confirmed by Chainlink CRE nodes"><Check size={12} />{variant === "cell" ? "Chainlink" : "Chainlink confirmed"}</span> : null;
  const sub = <span className="micro cv-sub">Pending {n(p)}{c === 0 && p > 0 ? ", not paid yet" : ""}</span>;
  const link = proof ? <ProofLink proof={proof} /> : null;

  if (variant === "cell") {
    return (
      <span className="cv cv-cell">
        <span className="fig cv-main">{n(c)}</span>
        {sub}
        {badge}
        {link}
      </span>
    );
  }
  if (variant === "stat") {
    return (
      <div className="cv cv-stat">
        <dt className="micro">{label}</dt>
        <dd className="fig">{n(c)}</dd>
        <dd>{sub}</dd>
        {badge && <dd>{badge}</dd>}
        {link && <dd>{link}</dd>}
        {explain && <dd className="note">{CONFIRMED_EXPLAINER}</dd>}
      </div>
    );
  }
  return (
    <div className="cv cv-line">
      <span className="micro">{label}</span>
      <span className="cv-row">
        <b className="fig cv-num">{n(c)}</b>
        {badge}
        {sub}
        {link}
      </span>
      {explain && <p className="note cv-explain">{CONFIRMED_EXPLAINER}</p>}
    </div>
  );
}

/** Plain Clippo count for places where there is no Confirmed number (HUMAN_SPLIT, or nothing sent). */
export function ClippoCount({ views, short }: { views: number; short?: boolean }) {
  return (
    <span className="cv-plain">
      <span className="fig">{short ? compact(views) : whole(views)}</span>
      <span className="micro cv-sub">Clippo count</span>
    </span>
  );
}
