import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { clippoWallet, humanHash, KIND_CAMPAIGN } from "@/lib/chain/clippo-wallet";
import { attestationHash } from "@/lib/chain/split";
import { db } from "@/lib/db";
import { getCampaign, proofSchema, type Ctx } from "@/lib/domain";
import { ApiError, ok, readJson, route } from "@/lib/http";
import { checkFreshProof, consumeProof } from "@/lib/worldid/fresh";

const body = z.object({ worldIdProof: proofSchema });
const APPROVE_ACTION = "clippo-approve-campaign";

/**
 * Admin human confirmation for approving a FUNDED campaign (mandatory when `campaign.highValue`).
 * Verifies a fresh World ID proof (one use only), stores it, and returns the signed `proof` the contract checks in
 * `approveCampaign(onchainId, proof)`. Denied / cancelled / expired -> 403 WORLD_ID_DENIED, repeated -> 409 PROOF_REUSED;
 * in all failure cases nothing is recorded.
 */
export const POST = route(async (req: Request, { params }: Ctx) => {
  const user = await requireUser(req, ["ADMIN"]);
  const c = await getCampaign((await params).id);
  if (c.status !== "FUNDED") throw new ApiError(409, "BAD_STATE", `Campaign is ${c.status}, expected FUNDED`);
  const { worldIdProof } = body.parse(await readJson(req));
  const { proofHash, nullifier } = await checkFreshProof(worldIdProof, APPROVE_ACTION, `approve:${c.id}`);
  const attestation = attestationHash({
    kind: "APPROVE",
    campaignKey: c.onchainId ?? c.id,
    wallet: user.wallet,
    nullifier,
    proofHash,
  });
  const proof = c.onchainId
    ? await clippoWallet().signApproval({
        campaignId: BigInt(c.onchainId),
        kind: KIND_CAMPAIGN,
        subject: `0x${"0".repeat(64)}`,
        approver: user.wallet,
        human: humanHash(nullifier),
      })
    : null;
  await db.$transaction(async (tx) => {
    await consumeProof(tx, user, proofHash, APPROVE_ACTION);
    await tx.humanAttestation.create({
      data: { campaignId: c.id, userId: user.id, kind: "APPROVE", attestation, proofHash },
    });
  });
  return ok(
    {
      attestation,
      proof,
      highValue: c.highValue,
      onchain: c.onchainId && proof ? { functionName: "approveCampaign", args: [c.onchainId, proof] } : null,
    },
    201,
  );
});
