import type { Verdict } from "@/ui-mocks/data";

const LABEL: Record<Verdict, string> = {
  approved: "Approved",
  rejected: "Rejected",
  needs_human: "Needs your review",
  pending: "In the queue",
};
const CLS: Record<Verdict, string> = { approved: "ok", rejected: "no", needs_human: "hold", pending: "pending" };

/** The verdict on one clip, shown as a pill with an icon (the icon is drawn in CSS from the class). */
export function Stamp({ verdict, conf, xl }: { verdict: Verdict; conf?: number; xl?: boolean }) {
  return (
    <span className={`stamp ${CLS[verdict]}${xl ? " xl" : ""}`} role="status" aria-label={`Verdict: ${LABEL[verdict]}${conf ? `, confidence ${conf}` : ""}`}>
      {LABEL[verdict]}
      {conf ? <small>{Math.round(conf * 100)}% sure</small> : null}
    </span>
  );
}
