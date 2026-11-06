import { requireUser } from "@/lib/auth";
import { chainEnabled } from "@/lib/chain/config";
import { syncChain } from "@/lib/chain/indexer";
import { getOverride } from "@/lib/config";
import { creatorEarnings } from "@/lib/earnings";
import { ok, route } from "@/lib/http";

export const GET = route(async (req: Request) => {
  const user = await requireUser(req, ["CREATOR"]);
  // Serverless has no long-running indexer: pick up new CRE credits when a creator looks. Never fail the page over it.
  if (chainEnabled() && !getOverride("escrowReader")) {
    await syncChain({ maxBlocks: 25_000 }).catch((e) => console.warn("[earnings] chain sync skipped", e));
  }
  return ok(await creatorEarnings(user.id));
});
