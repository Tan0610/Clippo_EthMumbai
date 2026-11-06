import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { channelCodeFor, hasWalletBoundCode, needsReverify } from "@/lib/channel-code";
import { ApiError, ok, readJson, route } from "@/lib/http";
import { assertVerifiedHuman } from "@/lib/worldid/signup";
import { getPlatform } from "@/lib/platforms";

type ChannelRow = NonNullable<Awaited<ReturnType<typeof db.channel.findFirst>>>;

/**
 * Channel codes are bound to the creator's wallet (clippo:<wallet>) so the CRE nodes can check ownership from the public bio.
 * A channel that is not verified yet still holds an old random code: swap it silently, nothing was proven with it.
 * A VERIFIED YouTube channel with an old code is flagged `needsReverify` and rotated by POST /api/channels/:id/upgrade-code.
 */
async function withCurrentCode(ch: ChannelRow, wallet: string) {
  if (!ch.verified && ch.platform === "YOUTUBE" && !hasWalletBoundCode(ch.verificationCode, wallet)) {
    ch = await db.channel.update({ where: { id: ch.id }, data: { verificationCode: channelCodeFor(wallet) } });
  }
  return { ...ch, needsReverify: needsReverify(ch, wallet) };
}

const body = z.object({ platform: z.enum(["YOUTUBE", "X", "INSTAGRAM"]), handle: z.string().min(2).max(100) });

/** Start channel ownership proof: returns a code the creator must paste in their channel bio. */
export const POST = route(async (req: Request) => {
  const user = await requireUser(req, ["CREATOR"]);
  assertVerifiedHuman(user, "channel proof");
  const v = body.parse(await readJson(req));
  const adapter = getPlatform(v.platform);
  const handle = adapter.normalizeHandle(v.handle);
  if (!adapter.isValidHandle(handle)) throw new ApiError(400, "BAD_HANDLE", `Not a valid ${v.platform} handle`);
  const existing = await db.channel.findUnique({ where: { platform_handle: { platform: v.platform, handle } } });
  if (existing && existing.userId !== user.id) throw new ApiError(409, "CHANNEL_TAKEN", "Channel already linked to another account");
  if (existing) return ok({ channel: await withCurrentCode(existing, user.wallet) });
  const channel = await db.channel.create({
    data: { userId: user.id, platform: v.platform, handle, verificationCode: channelCodeFor(user.wallet) },
  });
  return ok({ channel: { ...channel, needsReverify: false } }, 201);
});

export const GET = route(async (req: Request) => {
  const user = await requireUser(req, ["CREATOR"]);
  const channels = await db.channel.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
  return ok({ channels: await Promise.all(channels.map((c) => withCurrentCode(c, user.wallet))) });
});
