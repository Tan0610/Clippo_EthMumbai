import { requireUser } from "@/lib/auth";
import { ok, route } from "@/lib/http";
import { assertOwner, fundAll, getHire, type IdCtx } from "@/lib/workspace/hires";

/** "Fund all": one DRAFT HUMAN_SPLIT campaign covering every approved creator. It only becomes FUNDED from a verified on-chain event. */
export const POST = route(async (req: Request, { params }: IdCtx) => {
  const user = await requireUser(req, ["CAMPAIGNER"]);
  const hire = await getHire((await params).id);
  assertOwner(user, hire);
  const { campaign, hire: updated, fundingIntent } = await fundAll(hire);
  return ok({ campaign, hire: { id: updated.id, status: updated.status, campaignId: updated.campaignId }, fundingIntent }, 201);
});
