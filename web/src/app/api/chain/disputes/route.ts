import { requireUser } from "@/lib/auth";
import { chainConfig } from "@/lib/chain/config";
import { publicClient } from "@/lib/chain/clients";
import { escrowAbi } from "@/lib/chain/escrow-abi";
import { chainMode } from "@/lib/chain/guards";
import { db } from "@/lib/db";
import { ok, route } from "@/lib/http";

/**
 * PER_VIEW credits that can be disputed, or are under dispute, `[campaigner: own | admin: all]`. Whether a dispute is open
 * comes from the escrow, never from the database.
 */
export const GET = route(async (req: Request) => {
  const user = await requireUser(req, ["CAMPAIGNER", "ADMIN"]);
  chainMode();
  const escrow = chainConfig().escrow!;
  const rows = await db.payout.findMany({
    where: {
      status: "PENDING",
      releaseAt: { not: null },
      campaign: { payoutMode: "PER_VIEW", onchainId: { not: null }, ...(user.role === "ADMIN" ? {} : { campaignerId: user.id }) },
    },
    include: { campaign: { select: { id: true, title: true, onchainId: true } }, creator: { select: { wallet: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const pc = publicClient();
  const now = Math.floor(Date.now() / 1000);
  const disputes = await Promise.all(
    rows.map(async (p) => {
      const [resolveBy] = await pc.readContract({
        address: escrow,
        abi: escrowAbi,
        functionName: "disputes",
        args: [BigInt(p.campaign.onchainId!), p.creator.wallet as `0x${string}`],
      });
      const open = resolveBy !== 0n && Number(resolveBy) >= now;
      return {
        payoutId: p.id,
        campaignId: p.campaign.id,
        title: p.campaign.title,
        onchainId: p.campaign.onchainId!,
        creatorWallet: p.creator.wallet as `0x${string}`,
        amount: p.amount,
        releaseAt: p.releaseAt,
        open,
        resolveBy: open ? new Date(Number(resolveBy) * 1000) : null,
      };
    }),
  );
  return ok({ disputes });
});
