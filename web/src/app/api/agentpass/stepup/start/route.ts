import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { isValidSplitWallets, normalizeSplit, splitHash } from "@/lib/chain/split";
import { chainMode } from "@/lib/chain/guards";
import { db } from "@/lib/db";
import { canManageCampaign, getCampaign } from "@/lib/domain";
import { ApiError, readJson, route } from "@/lib/http";
import { classifyRefusal, recordAudit } from "@/lib/agentpass/audit";
import { ATTEMPT_COOKIE, ATTEMPT_COOKIE_MAX_AGE_S, ATTEMPT_COOKIE_PATH, createAttempt, stepUpConfig } from "@/lib/agentpass/stepup";

const body = z.object({
  campaignId: z.string().min(1),
  splits: z.array(z.object({ creatorWallet: z.string().min(1), amount: z.number().positive() })).min(1),
  agentProposalId: z.string().optional(),
  returnTo: z.enum(["desk", "bench"]),
});

/**
 * Starts World IdP step-up for one approver, one campaign and one exact split. The hash is computed here, never taken from the
 * client. Returns the authorize URL and saves the attempt in an encrypted httpOnly cookie. Nothing is approved here.
 */
export const POST = route(async (req: Request) => {
  const cfg = stepUpConfig();
  const user = await requireUser(req, ["CAMPAIGNER", "ADMIN"]);
  const v = body.parse(await readJson(req));
  const c = await getCampaign(v.campaignId);
  const role = user.id === c.campaignerId ? ("CAMPAIGNER" as const) : ("ADMIN" as const);
  const split = normalizeSplit(v.splits);
  const hash = splitHash(split);
  try {
    if (!canManageCampaign(user, c)) throw new ApiError(403, "FORBIDDEN", "Not your campaign");
    if (c.payoutMode !== "HUMAN_SPLIT") throw new ApiError(409, "BAD_STATE", "Campaign is not HUMAN_SPLIT");
    if (c.status !== "APPROVED") throw new ApiError(409, "BAD_STATE", `Campaign is ${c.status}, expected APPROVED`);
    if (chainMode() === "chain" && !isValidSplitWallets(split)) throw new ApiError(400, "BAD_RECIPIENT", "Recipients must be valid 0x wallet addresses");
    if (c.approver !== "CAMPAIGNER_AND_ADMIN" && role !== "CAMPAIGNER") throw new ApiError(403, "WRONG_APPROVER", "This campaign is approved by the campaigner only");
    if (v.agentProposalId) {
      const p = await db.agentProposal.findUnique({ where: { id: v.agentProposalId } });
      if (!p || p.campaignId !== c.id) throw new ApiError(404, "PROPOSAL_NOT_FOUND", "No such agent proposal for this campaign");
      if (p.status !== "PROPOSED" || p.expiresAt.getTime() < Date.now()) throw new ApiError(410, "PROPOSAL_EXPIRED", "The agent's proposal expired. Ask the agent for a fresh proposal.");
      if (p.splitHash !== hash) throw new ApiError(409, "SPLIT_CHANGED", "This split is not what the agent proposed (hash mismatch). Approve the agent's exact proposal.");
    }
    const { authorizeUrl, cookie } = await createAttempt(cfg, {
      userId: user.id,
      campaignId: c.id,
      role,
      splitHash: hash,
      proposalId: v.agentProposalId ?? null,
      mayEnroll: !user.worldIdpIdentity,
      returnTo: v.returnTo,
    });
    const res = NextResponse.json({ authorizeUrl, splitHash: hash });
    // Lax: the callback is a cross-site top-level redirect from the issuer.
    res.cookies.set(ATTEMPT_COOKIE, cookie, { httpOnly: true, sameSite: "lax", secure: cfg.redirectUri.startsWith("https://"), path: ATTEMPT_COOKIE_PATH, maxAge: ATTEMPT_COOKIE_MAX_AGE_S });
    return res;
  } catch (e) {
    if (e instanceof ApiError) {
      const { outcome, proofStatus } = classifyRefusal(e);
      await recordAudit({ campaignId: c.id, proposalId: v.agentProposalId, actorId: user.id, actorRole: role, event: "REFUSED", outcome, code: e.code, detail: `${e.message} Nothing was approved.`, splitHash: hash, proofStatus });
    }
    throw e;
  }
});
