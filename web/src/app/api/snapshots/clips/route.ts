import { NextResponse } from "next/server";
import { ApiError, route } from "@/lib/http";
import { frozenClipManifest } from "@/lib/clip-manifest";

/**
 * Clip manifest for the Chainlink CRE workflow: { day, hash, clips } for a COMPLETED UTC day (default: yesterday).
 * It says WHICH clips to read, never how many views: the CRE nodes read the views from YouTube themselves.
 * Every node must receive identical bytes, so it only serves completed days. `hash` is also the ETag.
 */
export const GET = route(async (req: Request) => {
  const day = new URL(req.url).searchParams.get("day") ?? undefined;
  try {
    const manifest = await frozenClipManifest(day);
    return NextResponse.json(manifest, { headers: { etag: `"${manifest.hash}"`, "cache-control": "public, max-age=300" } });
  } catch (e) {
    if (e instanceof RangeError) throw new ApiError(400, "BAD_REQUEST", e.message);
    throw e;
  }
});
