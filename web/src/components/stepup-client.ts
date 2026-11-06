"use client";
import { useEffect, useRef } from "react";
import { agentPass } from "./api";

/* Browser side of World IdP step-up. The pending split survives the redirect in sessionStorage. It is not trusted: the backend
   compares it with what the token was bound to. */

export interface PendingStepUp {
  campaignId: string;
  splits: { creatorWallet: string; amount: number }[];
  proposalId?: string;
}
export interface StepUpReturn {
  pending: PendingStepUp | null;
  token?: string;
  error?: string;
}

const KEY = "clippo.stepup.pending";

export async function beginStepUp(p: PendingStepUp, returnTo: "desk" | "bench") {
  const splits = p.splits.map((s) => ({ creatorWallet: s.creatorWallet, amount: s.amount }));
  const { authorizeUrl } = await agentPass.stepUpStart({ campaignId: p.campaignId, splits, agentProposalId: p.proposalId, returnTo });
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ campaignId: p.campaignId, splits, proposalId: p.proposalId }));
  } catch {
    throw new Error("This browser blocks session storage, so the approval could not resume after the World ID check. Nothing was changed.");
  }
  window.location.assign(authorizeUrl);
}

/** Reads and clears the result from the URL fragment and the saved split. Null when this page load is not a return. */
function takeReturn(): StepUpReturn | null {
  const h = new URLSearchParams(window.location.hash.slice(1));
  const token = h.get("stepup") ?? undefined;
  const error = h.get("stepup_error") ?? undefined;
  if (!token && !error) return null;
  window.history.replaceState(null, "", window.location.pathname + window.location.search);
  let pending: PendingStepUp | null = null;
  try {
    pending = JSON.parse(sessionStorage.getItem(KEY) ?? "null");
    sessionStorage.removeItem(KEY);
  } catch {
    /* handled below: no pending split means nothing to resume */
  }
  return { pending, token, error: error ?? (pending ? undefined : "lost") };
}

/** Runs `onReturn` once when the page loads on the way back from the issuer. */
export function useStepUpReturn(onReturn: (r: StepUpReturn) => void | Promise<void>) {
  const latest = useRef(onReturn);
  useEffect(() => {
    latest.current = onReturn;
  });
  useEffect(() => {
    const r = takeReturn();
    if (r) void latest.current(r);
  }, []);
}

const FAIL: Record<string, string> = {
  cancelled: "You cancelled the World ID check.",
  expired: "The World ID check expired before it finished. Start again.",
  stale: "The World ID authentication was not fresh for this approval. Start again.",
  invalid: "The World ID result could not be validated.",
  wrong_account: "That World ID does not match this Clippo account, or another account already uses it. Check that you are signed in to the right wallet.",
  not_eligible: "That World ID does not have the verification this approval requires.",
  unavailable: "World ID is temporarily unavailable. Try again shortly.",
  lost: "The approval could not resume in this tab. Start again from the same tab.",
};

export const stepUpFailText = (reason?: string) => `${FAIL[reason ?? ""] ?? FAIL.invalid} Nothing was changed.`;
