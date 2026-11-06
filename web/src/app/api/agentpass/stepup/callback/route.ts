import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { ApiError, route } from "@/lib/http";
import { classifyRefusal, recordAudit } from "@/lib/agentpass/audit";
import {
  ATTEMPT_COOKIE,
  ATTEMPT_COOKIE_PATH,
  assertIdentityAllowed,
  completeAttempt,
  identityOf,
  issueStepUpToken,
  readAttempt,
  reasonOf,
  refuse,
  stepUpConfig,
  type StepUpAttempt,
  type StepUpReason,
} from "@/lib/agentpass/stepup";

const RETURN_PATH: Record<StepUpAttempt["returnTo"], string> = { desk: "/desk", bench: "/bench" };

function readCookie(req: Request): string | undefined {
  const m = (req.headers.get("cookie") ?? "").match(new RegExp(`(?:^|;\\s*)${ATTEMPT_COOKIE}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : undefined;
}

/** OAuth error codes the issuer can send to this callback. Only the code is used: free text from a URL is never stored. */
function reasonForError(error: string): StepUpReason {
  if (error === "access_denied") return "cancelled";
  if (error === "unmet_authentication_requirements") return "not_eligible";
  if (error === "temporarily_unavailable" || error === "server_error") return "unavailable";
  return "invalid";
}

/**
 * The issuer's redirect back. Every path ends in a redirect to the app: `#stepup=<token>` on success, `#stepup_error=<reason>`
 * otherwise. A fragment stays out of server logs and Referer headers. The token only authorizes a later POST to the split route.
 */
export const GET = route(async (req: Request) => {
  const cfg = stepUpConfig();
  const origin = new URL(cfg.redirectUri).origin;
  const params = new URL(req.url).searchParams;
  const back = (attempt: StepUpAttempt | null, fragment: string, clear = true) => {
    const res = NextResponse.redirect(`${origin}${RETURN_PATH[attempt?.returnTo ?? "desk"]}#${fragment}`, 303);
    if (clear) res.cookies.set(ATTEMPT_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: cfg.redirectUri.startsWith("https://"), path: ATTEMPT_COOKIE_PATH, maxAge: 0 });
    return res;
  };

  const attempt = await readAttempt(readCookie(req));
  // No readable attempt means no campaign to attribute this to, so there is nothing to audit against.
  if (!attempt) return back(null, "stepup_error=invalid");

  const fail = async (e: ApiError, clear = true) => {
    const { outcome, proofStatus } = classifyRefusal(e);
    await recordAudit({ campaignId: attempt.campaignId, proposalId: attempt.proposalId, actorId: attempt.userId, actorRole: attempt.role, event: "REFUSED", outcome, code: e.code, detail: `${e.message} Nothing was approved.`, splitHash: attempt.splitHash, proofStatus });
    return back(attempt, `stepup_error=${reasonOf(e) ?? "invalid"}`, clear);
  };

  // A wrong state is not this attempt's response (a forged link, or an older tab): refuse it and leave the live attempt alone.
  if (params.get("state") !== attempt.state) return fail(refuse("invalid"), false);
  try {
    // Mix-up defence: success and error redirects both carry iss, and it must match exactly before anything else is believed.
    if (params.get("iss") !== cfg.issuer) throw refuse("invalid");
    const user = await getUser(req);
    if (!user || user.id !== attempt.userId) throw refuse("wrong_account");
    const error = params.get("error");
    if (error) throw refuse(reasonForError(error));
    if (Math.floor(Date.now() / 1000) > attempt.expAt) throw refuse("expired");
    const code = params.get("code");
    if (!code) throw refuse("invalid");
    const id = await completeAttempt(cfg, attempt, code);
    await assertIdentityAllowed(user, identityOf(id), attempt.mayEnroll);
    const token = await issueStepUpToken(
      { userId: attempt.userId, campaignId: attempt.campaignId, splitHash: attempt.splitHash, proposalId: attempt.proposalId, attemptId: attempt.id, mayEnroll: attempt.mayEnroll },
      id,
    );
    return back(attempt, `stepup=${token}`);
  } catch (e) {
    if (e instanceof ApiError) return fail(e);
    throw e;
  }
});
