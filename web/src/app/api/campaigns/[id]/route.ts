import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { confirmedForCampaign, NO_CONFIRMED, withPending } from "@/lib/confirmed";
import { campaignView, canManageCampaign, type Ctx } from "@/lib/domain";
import { ApiError, ok, route } from "@/lib/http";
import { latestPerSubmission } from "@/lib/snapshots";

export const GET = route(async (req: Request, { params }: Ctx) => {
  const { id } = await params;
  const user = await getUser(req);
  const c = await db.campaign.findUnique({
    where: { id },
    include: { _count: { select: { submissions: true } }, campaigner: { select: { id: true, wallet: true, verified: true } } },
  });
  if (!c) throw new ApiError(404, "NOT_FOUND", "Campaign not found");
  const visible = c.status === "APPROVED" || c.status === "CLOSED" || (user && canManageCampaign(user, c));
  if (!visible) throw new ApiError(404, "NOT_FOUND", "Campaign not found");

  const snaps = (await latestPerSubmission()).filter((s) => s.campaignId === c.id);
  const totalViews = snaps.reduce((n, s) => n + s.cumulativeViews, 0);
  // CRE-confirmed views (on-chain) vs Clippo's own count; HUMAN_SPLIT has no CRE views
  const confirmed = withPending(c.payoutMode === "HUMAN_SPLIT" ? NO_CONFIRMED : await confirmedForCampaign(c.id), c.payoutMode === "HUMAN_SPLIT" ? 0 : totalViews);
  const approvedClips = await db.verdict.count({ where: { result: "APPROVE", submission: { campaignId: c.id } } });
  const { campaigner, ...rest } = c;
  return ok({
    campaign: campaignView(rest),
    campaigner,
    performance: { totalViews, ...confirmed, approvedClips, viewTarget: c.viewTarget },
  });
});
