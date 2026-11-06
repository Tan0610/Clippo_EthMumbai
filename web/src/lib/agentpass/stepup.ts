import { createHash, randomBytes, randomUUID } from "node:crypto";
import { createRemoteJWKSet, EncryptJWT, errors as joseErrors, jwtDecrypt, jwtVerify } from "jose";
import { purposeKey } from "../auth";
import { env, notConfigured, requireEnv } from "../config";
import { db } from "../db";
import { ApiError } from "../http";

/**
 * World IdP (auth.world.org) step-up: the human gate on an agent's split. Server-side OIDC authorization code flow with S256
 * PKCE and max_age=0, per https://auth.world.org/docs/guides/step-up.
 *
 * This module authenticates and binds. It does not approve anything: the split route verifies the token this module issues,
 * consumes it once in the approval's own transaction, and rechecks permissions.
 */

const DEFAULT_ISSUER = "https://auth.world.org";
/** Essential classes. The docs say to list every class accepted, including -face variants: each is a distinct value. */
const DEFAULT_ACR = ["https://world.org/oidc/acr/orb", "https://world.org/oidc/acr/orb-face"];
const ATTEMPT_TTL_S = 10 * 60;
const TOKEN_TTL_S = 5 * 60;
/** How long after the authentication the approval may still run. */
const FRESHNESS_S = 10 * 60;
const CLOCK_TOLERANCE_S = 30;
const DISCOVERY_TTL_MS = 5 * 60 * 1000;
const HTTP_TIMEOUT_MS = 10_000;

export const ATTEMPT_COOKIE = "clippo_stepup";
export const ATTEMPT_COOKIE_PATH = "/api/agentpass/stepup";
/** Outlives the attempt so an expired attempt can still be attributed in the audit log; `expAt` decides validity. */
export const ATTEMPT_COOKIE_MAX_AGE_S = 60 * 60;

export type StepUpReason = "cancelled" | "expired" | "stale" | "invalid" | "wrong_account" | "not_eligible" | "unavailable";

const REFUSALS: Record<StepUpReason, { status: number; message: string }> = {
  cancelled: { status: 403, message: "The World ID check was cancelled." },
  expired: { status: 403, message: "The World ID check expired before it finished." },
  stale: { status: 403, message: "The World ID authentication was not fresh for this approval." },
  invalid: { status: 403, message: "The World ID result could not be validated." },
  wrong_account: { status: 403, message: "That World ID does not match this Clippo account." },
  not_eligible: { status: 403, message: "That World ID does not have the verification this approval requires." },
  unavailable: { status: 503, message: "World ID is temporarily unavailable. This is not a verdict on the check." },
};

export const refuse = (reason: StepUpReason) => new ApiError(REFUSALS[reason].status, `STEP_UP_${reason.toUpperCase()}`, REFUSALS[reason].message);

/** The reason to send back to the browser for a refusal raised by `refuse`, else null. */
export function reasonOf(e: ApiError): StepUpReason | null {
  const r = e.code.replace(/^STEP_UP_/, "").toLowerCase() as StepUpReason;
  return e.code.startsWith("STEP_UP_") && r in REFUSALS ? r : null;
}

export interface StepUpConfig {
  issuer: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authMethod: "client_secret_basic" | "client_secret_post";
  acceptedAcr: string[];
}

/** Throws 503 NOT_CONFIGURED naming what is missing. There is no fallback. */
export function stepUpConfig(): StepUpConfig {
  requireEnv("World IdP step-up", "WORLD_IDP_CLIENT_ID", "WORLD_IDP_CLIENT_SECRET", "WORLD_IDP_REDIRECT_URI");
  const issuer = env("WORLD_IDP_ISSUER") ?? DEFAULT_ISSUER;
  const redirectUri = env("WORLD_IDP_REDIRECT_URI")!;
  const authMethod = env("WORLD_IDP_TOKEN_AUTH_METHOD") ?? "client_secret_basic";
  if (authMethod !== "client_secret_basic" && authMethod !== "client_secret_post") throw notConfigured("World IdP step-up", "WORLD_IDP_TOKEN_AUTH_METHOD to client_secret_basic or client_secret_post");
  if (process.env.NODE_ENV === "production") {
    if ((process.env.SESSION_SECRET?.length ?? 0) < 32) throw notConfigured("World IdP step-up", "SESSION_SECRET (at least 32 characters)");
    if (!issuer.startsWith("https://")) throw notConfigured("World IdP step-up", "WORLD_IDP_ISSUER to an https URL");
    if (!redirectUri.startsWith("https://")) throw notConfigured("World IdP step-up", "WORLD_IDP_REDIRECT_URI to an https URL");
  }
  return {
    issuer,
    clientId: env("WORLD_IDP_CLIENT_ID")!,
    clientSecret: env("WORLD_IDP_CLIENT_SECRET")!,
    redirectUri,
    authMethod,
    acceptedAcr: env("WORLD_IDP_ACR_VALUES")?.split(",").map((s) => s.trim()).filter(Boolean) ?? DEFAULT_ACR,
  };
}

interface Discovery {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri: string;
}

const discoveries = new Map<string, { doc: Discovery; at: number }>();
const jwksByUri = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

export async function discover(issuer: string): Promise<Discovery> {
  const hit = discoveries.get(issuer);
  if (hit && Date.now() - hit.at < DISCOVERY_TTL_MS) return hit.doc;
  let doc: Partial<Discovery> & { code_challenge_methods_supported?: string[] };
  try {
    const res = await fetch(`${issuer.replace(/\/$/, "")}/.well-known/openid-configuration`, { signal: AbortSignal.timeout(HTTP_TIMEOUT_MS) });
    if (!res.ok) throw refuse("unavailable");
    doc = await res.json();
  } catch {
    throw refuse("unavailable");
  }
  if (doc.issuer !== issuer || !doc.authorization_endpoint || !doc.token_endpoint || !doc.jwks_uri || !doc.code_challenge_methods_supported?.includes("S256")) throw refuse("unavailable");
  discoveries.set(issuer, { doc: doc as Discovery, at: Date.now() });
  return doc as Discovery;
}

const seal = (claims: Record<string, unknown>) => new EncryptJWT(claims).setProtectedHeader({ alg: "dir", enc: "A256GCM" }).setIssuedAt();
const nowS = () => Math.floor(Date.now() / 1000);
const b64url = (b: Buffer) => b.toString("base64url");

/** The saved pending operation. Encrypted (the PKCE verifier and nonce stay private) and authenticated, keyed from SESSION_SECRET. */
export interface StepUpAttempt {
  id: string;
  userId: string;
  campaignId: string;
  role: "CAMPAIGNER" | "ADMIN";
  splitHash: string;
  proposalId: string | null;
  /** True when the account had no linked World ID at the start, so this attempt may enroll the first one. */
  mayEnroll: boolean;
  returnTo: "desk" | "bench";
  state: string;
  nonce: string;
  verifier: string;
  startedAt: number;
  expAt: number;
}

const ATTEMPT_KEY = "stepup-attempt-v1";
const TOKEN_KEY = "stepup-token-v1";
const TOKEN_AUDIENCE = "clippo-split-stepup";

export async function createAttempt(cfg: StepUpConfig, p: Pick<StepUpAttempt, "userId" | "campaignId" | "role" | "splitHash" | "proposalId" | "mayEnroll" | "returnTo">) {
  const { authorization_endpoint } = await discover(cfg.issuer);
  const startedAt = nowS();
  const attempt: StepUpAttempt = {
    ...p,
    id: randomUUID(),
    state: b64url(randomBytes(32)),
    nonce: b64url(randomBytes(32)),
    verifier: b64url(randomBytes(32)),
    startedAt,
    expAt: startedAt + ATTEMPT_TTL_S,
  };
  const url = new URL(authorization_endpoint);
  url.search = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    response_type: "code",
    scope: "openid",
    state: attempt.state,
    nonce: attempt.nonce,
    code_challenge: b64url(createHash("sha256").update(attempt.verifier).digest()),
    code_challenge_method: "S256",
    max_age: "0",
    claims: JSON.stringify({ id_token: { acr: { essential: true, values: cfg.acceptedAcr } } }),
  }).toString();
  const cookie = await seal({ ...attempt }).encrypt(purposeKey(ATTEMPT_KEY));
  return { authorizeUrl: url.toString(), cookie };
}

/** Null when absent, tampered with or sealed under another key. Expiry is left to the caller, which audits it. */
export async function readAttempt(cookie: string | undefined): Promise<StepUpAttempt | null> {
  if (!cookie) return null;
  try {
    return (await jwtDecrypt(cookie, purposeKey(ATTEMPT_KEY))).payload as unknown as StepUpAttempt;
  } catch {
    return null;
  }
}

/** Basic credentials are form-encoded first (RFC 6749 2.3.1, and the World IdP client setup guide). */
const formEncode = (s: string) => new URLSearchParams({ v: s }).toString().slice(2);

async function redeemCode(cfg: StepUpConfig, tokenEndpoint: string, code: string, verifier: string): Promise<string> {
  const form = new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: cfg.redirectUri, code_verifier: verifier });
  const headers: Record<string, string> = { "content-type": "application/x-www-form-urlencoded", accept: "application/json" };
  if (cfg.authMethod === "client_secret_basic") {
    headers.authorization = `Basic ${Buffer.from(`${formEncode(cfg.clientId)}:${formEncode(cfg.clientSecret)}`).toString("base64")}`;
  } else {
    form.set("client_id", cfg.clientId);
    form.set("client_secret", cfg.clientSecret);
  }
  let res: Response;
  try {
    res = await fetch(tokenEndpoint, { method: "POST", headers, body: form.toString(), signal: AbortSignal.timeout(HTTP_TIMEOUT_MS) });
  } catch {
    throw refuse("unavailable");
  }
  if (res.status >= 500 || res.status === 429) throw refuse("unavailable");
  const body = (await res.json().catch(() => null)) as { id_token?: unknown } | null;
  if (!res.ok || typeof body?.id_token !== "string") throw refuse("invalid");
  return body.id_token;
}

export interface StepUpIdentity {
  iss: string;
  sub: string;
  authTime: number;
  acr: string;
  amr: string[];
}

/** Standard ID token validation plus the step-up policy: signature, iss, aud, exp, nonce, acr, amr and auth_time for this attempt. */
export async function verifyIdToken(cfg: StepUpConfig, jwksUri: string, idToken: string, attempt: Pick<StepUpAttempt, "nonce" | "startedAt">): Promise<StepUpIdentity> {
  let jwks = jwksByUri.get(jwksUri);
  if (!jwks) jwksByUri.set(jwksUri, (jwks = createRemoteJWKSet(new URL(jwksUri), { timeoutDuration: HTTP_TIMEOUT_MS })));
  let c;
  try {
    ({ payload: c } = await jwtVerify(idToken, jwks, {
      issuer: cfg.issuer,
      audience: cfg.clientId,
      algorithms: ["RS256"],
      clockTolerance: CLOCK_TOLERANCE_S,
      requiredClaims: ["sub", "exp", "iat", "auth_time", "nonce"],
    }));
  } catch (e) {
    if (e instanceof joseErrors.JWTExpired) throw refuse("expired");
    if (e instanceof joseErrors.JWKSTimeout || !(e instanceof joseErrors.JOSEError)) throw refuse("unavailable");
    throw refuse("invalid");
  }
  if (Array.isArray(c.aud) && c.aud.length !== 1) throw refuse("invalid");
  if (c.nonce !== attempt.nonce) throw refuse("invalid");
  const authTime = c.auth_time;
  if (typeof authTime !== "number" || authTime > nowS() + CLOCK_TOLERANCE_S) throw refuse("invalid");
  // max_age=0: the authentication must belong to this attempt. Its age is not required to stay zero over the browser round trip.
  if (authTime < attempt.startedAt - CLOCK_TOLERANCE_S) throw refuse("stale");
  if (typeof c.acr !== "string" || !cfg.acceptedAcr.includes(c.acr)) throw refuse("not_eligible");
  const amr = c.amr;
  if (!Array.isArray(amr) || !amr.includes("pop")) throw refuse("invalid");
  return { iss: c.iss!, sub: c.sub!, authTime, acr: c.acr, amr: amr as string[] };
}

/** Redeems the code once and validates the result. Callers have already checked state, response iss, session and expiry. */
export async function completeAttempt(cfg: StepUpConfig, attempt: StepUpAttempt, code: string): Promise<StepUpIdentity> {
  const { token_endpoint, jwks_uri } = await discover(cfg.issuer);
  const idToken = await redeemCode(cfg, token_endpoint, code, attempt.verifier);
  return verifyIdToken(cfg, jwks_uri, idToken, attempt);
}

export const identityOf = (id: Pick<StepUpIdentity, "iss" | "sub">) => `${id.iss}|${id.sub}`;

/**
 * Existing-owner policy: a linked account must return its own (iss, sub). An unlinked account may enroll only an identity no
 * other account holds, and only when the attempt allowed it. The link itself is written in the approval's transaction.
 */
export async function assertIdentityAllowed(user: { id: string; worldIdpIdentity: string | null }, identity: string, mayEnroll: boolean) {
  if (user.worldIdpIdentity) {
    if (user.worldIdpIdentity !== identity) throw refuse("wrong_account");
    return;
  }
  if (!mayEnroll) throw refuse("wrong_account");
  const other = await db.user.findUnique({ where: { worldIdpIdentity: identity }, select: { id: true } });
  if (other && other.id !== user.id) throw refuse("wrong_account");
}

interface TokenBinding {
  userId: string;
  campaignId: string;
  splitHash: string;
  proposalId: string | null;
}

/** Short-lived token for one approval, valid for one user, campaign, split and proposal. Encrypted because it carries the subject. */
export function issueStepUpToken(a: TokenBinding & { attemptId: string; mayEnroll: boolean }, id: StepUpIdentity): Promise<string> {
  const exp = Math.min(nowS() + TOKEN_TTL_S, id.authTime + FRESHNESS_S);
  const { iss: idpIss, ...rest } = id;
  return seal({ ...a, ...rest, idpIss })
    .setAudience(TOKEN_AUDIENCE)
    .setJti(a.attemptId)
    .setExpirationTime(exp)
    .encrypt(purposeKey(TOKEN_KEY));
}

/** Verifies a step-up token against what is being approved right now. Read-only: the caller consumes `proofHash` once. */
export async function verifyStepUpToken(cfg: StepUpConfig, token: string, expected: TokenBinding) {
  let p;
  try {
    ({ payload: p } = await jwtDecrypt(token, purposeKey(TOKEN_KEY), { audience: TOKEN_AUDIENCE }));
  } catch (e) {
    throw e instanceof joseErrors.JWTExpired ? refuse("expired") : refuse("invalid");
  }
  const mismatch = () => new ApiError(403, "STEP_UP_MISMATCH", "This World ID check was for a different user, campaign or split. Nothing was changed.");
  if (p.userId !== expected.userId || p.campaignId !== expected.campaignId || p.splitHash !== expected.splitHash || p.proposalId !== expected.proposalId) throw mismatch();
  if (p.idpIss !== cfg.issuer || typeof p.sub !== "string" || !p.jti) throw refuse("invalid");
  const identity = identityOf({ iss: p.idpIss as string, sub: p.sub });
  return {
    identity,
    /**
     * One-way id for the on-chain human. Hex, so humanHash (which lowercases its input) keeps subjects that differ only in
     * case distinct: `sub` is case-sensitive.
     */
    humanId: createHash("sha256").update(identity).digest("hex"),
    proofHash: createHash("sha256").update(`stepup|${p.jti}`).digest("hex"),
    mayEnroll: p.mayEnroll === true,
    acr: p.acr as string,
    amr: p.amr as string[],
  };
}
