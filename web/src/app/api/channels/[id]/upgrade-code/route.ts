import { requireUser } from "@/lib/auth";
import { channelCodeFor, hasWalletBoundCode } from "@/lib/channel-code";
import { db } from "@/lib/db";
import type { Ctx } from "@/lib/domain";
import { ApiError, ok, route } from "@/lib/http";
import { assertVerifiedHuman } from "@/lib/worldid/signup";

/**
 * Move a channel to the wallet-bound code (clippo:<wallet>). The channel becomes unverified until the new code is found in the
 * bio (POST /api/channels/:id/verify), so Chainlink CRE can bind the channel to the wallet without trusting Clippo.
 */
export const POST = route(async (req: Request, { params }: Ctx) => {
  const user = await requireUser(req, ["CREATOR"]);
  assertVerifiedHuman(user, "channel proof");
  const ch = await db.channel.findUnique({ where: { id: (await params).id } });
  if (!ch || ch.userId !== user.id) throw new ApiError(404, "NOT_FOUND", "Channel not found");
  if (ch.platform !== "YOUTUBE") throw new ApiError(400, "NOT_SUPPORTED", "Only YouTube channels use the wallet-bound code");
  if (hasWalletBoundCode(ch.verificationCode, user.wallet)) return ok({ channel: { ...ch, needsReverify: false } });
  const channel = await db.channel.update({ where: { id: ch.id }, data: { verificationCode: channelCodeFor(user.wallet), verified: false } });
  return ok({ channel: { ...channel, needsReverify: false } });
});
