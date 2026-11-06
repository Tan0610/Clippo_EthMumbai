import { requireUser } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";
import { ok, readJson, route } from "@/lib/http";
import { proofSchema } from "@/lib/domain";
import { getWorldId } from "@/lib/worldid";
import { completeSignup } from "@/lib/worldid/signup";
import { chainEnabled } from "@/lib/chain/config";
import { clippoWallet } from "@/lib/chain/clippo-wallet";

/** Validate an IDKit proof server-side; on success mark the account verified (one human, one account: 409 ALREADY_USED). */
export const POST = route(async (req: Request) => {
  await rateLimit(req, "worldid/verify", 30, 3600);
  const user = await requireUser(req);
  const proof = proofSchema.parse(await readJson(req));
  const wid = getWorldId();
  const updated = await completeSignup(user, proof, wid);
  // One human, one wallet is also enforced by the escrow: only a linked wallet can ever be credited.
  let onchain: { linked: boolean; txHash?: string | null; reason?: string } = { linked: false, reason: "chain not configured" };
  if (chainEnabled() && updated.worldIdNullifier) {
    try {
      onchain = { linked: true, txHash: await clippoWallet().ensureHuman(updated.wallet, updated.worldIdNullifier) };
    } catch (e) {
      console.error("[worldid/verify] on-chain link failed", e);
      onchain = { linked: false, reason: (e as Error).message };
    }
  }
  return ok({ user: updated, mode: wid.mode, onchain });
});
