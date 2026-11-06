import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { processReceipt } from "@/lib/chain/indexer";
import { ok, readJson, route } from "@/lib/http";
import { rateLimit } from "@/lib/ratelimit";

const body = z.object({ txHash: z.string().max(100) });

/** A signed-in user reports a transaction they just sent, so its escrow events show at once. The receipt is read from the chain, never trusted. */
export const POST = route(async (req: Request) => {
  await rateLimit(req, "chain/report", 60, 3600);
  await requireUser(req);
  const { txHash } = body.parse(await readJson(req));
  const { outcomes } = await processReceipt(txHash);
  return ok({ outcomes });
});
