/**
 * World IdP step-up as the human gate on the agent's split. Runs the real routes and the real OIDC client against a local
 * fake issuer over HTTP with real RS256 signing. This shows our validation; it does not show the real issuer accepts us.
 */
import { generatePrivateKey } from "viem/accounts";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { setOverride } from "@/lib/config";
import type { ClippoWallet } from "@/lib/chain/clippo-wallet";
import { humanHash } from "@/lib/chain/clippo-wallet";
import { clearDoubles, installChainDouble, installDoubles } from "@/test/doubles";
import { resetDb } from "@/test/db";
import { startFakeIdp, type AuthorizeOptions } from "@/test/fake-idp";
import { createHash } from "node:crypto";

process.env.ADMIN_WALLETS = "0xad00000000000000000000000000000000000001";
process.env.SESSION_SECRET = "test-secret";
process.env.AGENT_PASS_PRIVATE_KEY = generatePrivateKey();

type Db = typeof import("@/lib/db").db;
let db: Db;
let idp: Awaited<ReturnType<typeof startFakeIdp>>;

const ADMIN = "0xad00000000000000000000000000000000000001";
const CAMPAIGNER = "0xca00000000000000000000000000000000000002";
const OTHER = "0xca00000000000000000000000000000000000009";
const CREATOR = "0xc100000000000000000000000000000000000003";
const CLIENT = { id: "client-abc", secret: "worldidp_client_secret_a+b/c&d e" };
const CALLBACK = "https://app.clippo.test/api/agentpass/stepup/callback";
const ENV_NAMES = ["WORLD_IDP_ISSUER", "WORLD_IDP_CLIENT_ID", "WORLD_IDP_CLIENT_SECRET", "WORLD_IDP_REDIRECT_URI"] as const;

/* eslint-disable @typescript-eslint/no-explicit-any */
const jsonReq = (url: string, wallet: string | null, body?: unknown) =>
  new Request(`http://localhost${url}`, { method: "POST", headers: { "content-type": "application/json", host: "localhost", ...(wallet ? { "x-wallet": wallet } : {}) }, body: JSON.stringify(body ?? {}) });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const asJson = async (res: Response) => ({ status: res.status, body: (await res.json()) as Record<string, any> });
const route = {
  start: () => import("@/app/api/agentpass/stepup/start/route").then((m) => m.POST as (r: Request) => Promise<Response>),
  callback: () => import("@/app/api/agentpass/stepup/callback/route").then((m) => m.GET as (r: Request) => Promise<Response>),
  split: () => import("@/app/api/campaigns/[id]/split/route").then((m) => m.POST as (r: Request, c: ReturnType<typeof ctx>) => Promise<Response>),
};

async function campaign(over: Record<string, unknown> = {}) {
  const campaigner = await db.user.findUniqueOrThrow({ where: { wallet: CAMPAIGNER } });
  const creator = await db.user.findUniqueOrThrow({ where: { wallet: CREATOR } });
  const channel = await db.channel.findFirstOrThrow({ where: { userId: creator.id } });
  const c = await db.campaign.create({
    data: { campaignerId: campaigner.id, title: "t", story: {}, contentSource: "LINK", platforms: ["YOUTUBE"], payoutMode: "HUMAN_SPLIT", approver: "CAMPAIGNER_ONLY", poolSize: 500, status: "APPROVED", onchainId: "1", ...over } as never,
  });
  const vid = `v-${Math.random().toString(36).slice(2)}`;
  await db.submission.create({ data: { campaignId: c.id, creatorId: creator.id, channelId: channel.id, link: `https://youtu.be/${vid}`, videoId: vid, metadata: {}, verdict: { create: { result: "APPROVE", confidence: 0.9, reason: "ok" } } } });
  return c;
}
type Proposal = { id: string; splitHash: string; splits: { creatorWallet: string; amount: number }[] };
async function propose(campaignId: string): Promise<Proposal> {
  const agent = await import("@/app/api/campaigns/[id]/agent/route");
  const prop = await import("@/app/api/campaigns/[id]/split/propose/route");
  await agent.POST(jsonReq(`/api/campaigns/${campaignId}/agent`, CAMPAIGNER), ctx(campaignId));
  return (await asJson(await prop.POST(jsonReq(`/api/campaigns/${campaignId}/split/propose`, CAMPAIGNER, { mode: "deterministic" }), ctx(campaignId)))).body.proposal;
}
const wire = (p: Proposal) => p.splits.map((s) => ({ creatorWallet: s.creatorWallet, amount: s.amount }));

async function start(wallet: string, campaignId: string, p: Proposal, returnTo: "desk" | "bench" = "desk") {
  const res = await (await route.start())(jsonReq("/api/agentpass/stepup/start", wallet, { campaignId, splits: wire(p), agentProposalId: p.id, returnTo }));
  const cookie = res.headers.getSetCookie().find((x) => x.startsWith("clippo_stepup="));
  const { status, body } = await asJson(res);
  return { status, body, authorizeUrl: body.authorizeUrl as string, cookie: cookie?.split(";")[0] ?? "", rawCookie: cookie ?? "" };
}
type Started = Awaited<ReturnType<typeof start>>;

/** The browser arriving at the callback. Returns where it is sent. */
async function callback(s: Started, wallet: string, query: Record<string, string>) {
  const url = new URL(CALLBACK);
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
  const res = await (await route.callback())(new Request(url, { headers: { cookie: s.cookie, "x-wallet": wallet } }));
  expect(res.status).toBe(303);
  const loc = new URL(res.headers.get("location")!);
  const frag = new URLSearchParams(loc.hash.slice(1));
  return { path: loc.pathname, origin: loc.origin, token: frag.get("stepup"), error: frag.get("stepup_error"), setCookie: res.headers.getSetCookie().join(";") };
}
const stateOf = (s: Started) => new URL(s.authorizeUrl).searchParams.get("state")!;

/** The human completes the issuer's step. `claims` shapes the ID token the issuer will return. */
async function complete(s: Started, wallet: string, opts: AuthorizeOptions = {}) {
  return callback(s, wallet, { code: idp.approve(s.authorizeUrl, opts), state: stateOf(s), iss: idp.issuer });
}
async function tokenFor(wallet: string, campaignId: string, p: Proposal, opts: AuthorizeOptions = {}) {
  const r = await complete(await start(wallet, campaignId, p), wallet, opts);
  expect(r.error).toBeNull();
  return r.token!;
}
const approve = async (wallet: string, campaignId: string, body: unknown) =>
  asJson(await (await route.split())(jsonReq(`/api/campaigns/${campaignId}/split`, wallet, body), ctx(campaignId)));
const agentBody = (p: Proposal, stepUpToken: string) => ({ splits: wire(p), agentProposalId: p.id, stepUpToken });
const audits = (campaignId: string) => db.agentAudit.findMany({ where: { campaignId }, orderBy: { createdAt: "asc" } });
const refusal = async (campaignId: string, code: string) => (await audits(campaignId)).find((a) => a.event === "REFUSED" && a.code === code);

async function expectUndone(campaignId: string, p: Proposal) {
  expect(await db.splitProposal.count({ where: { campaignId } })).toBe(0);
  expect(await db.payout.count({ where: { campaignId } })).toBe(0);
  expect(await db.humanAttestation.count({ where: { campaignId } })).toBe(0);
  expect((await db.agentProposal.findUniqueOrThrow({ where: { id: p.id } })).status).toBe("PROPOSED");
}

const signed: { human: string; approver: string }[] = [];
const wallet: ClippoWallet = {
  signApproval: async ({ human, approver }) => { signed.push({ human, approver }); return { human, expiresAt: "9999999999", signature: "0xsig" }; },
  ensureHuman: async () => null,
  claimFor: async () => "0xtx",
};

beforeAll(async () => {
  idp = await startFakeIdp(CLIENT);
  installDoubles();
  installChainDouble({ getCampaign: async () => ({ state: 2, campaignerFeeBps: 25, creatorFeeBps: 25, highValue: false }) as never });
  setOverride("agentBook", { lookupHuman: async () => "0xhuman-anon-id-0001" });
  setOverride("clippoWallet", wallet);
  db = (await import("@/lib/db")).db;
  await resetDb(db);
  await Promise.all([ADMIN, CAMPAIGNER, OTHER].map((w) => db.user.create({ data: { wallet: w, role: w === ADMIN ? "ADMIN" : "CAMPAIGNER" } })));
  const creator = await db.user.create({ data: { wallet: CREATOR, role: "CREATOR", verified: true, worldIdNullifier: "0xc0ffee" } });
  await db.channel.create({ data: { userId: creator.id, platform: "YOUTUBE", handle: "c", verificationCode: "x", verified: true } });
}, 120_000);

beforeEach(async () => {
  process.env.WORLD_IDP_ISSUER = idp.issuer;
  process.env.WORLD_IDP_CLIENT_ID = CLIENT.id;
  process.env.WORLD_IDP_CLIENT_SECRET = CLIENT.secret;
  process.env.WORLD_IDP_REDIRECT_URI = CALLBACK;
  idp.setTokenStatus(200);
  signed.length = 0;
  await db.user.updateMany({ data: { worldIdpIdentity: null } });
});
afterEach(() => vi.useRealTimers());
afterAll(async () => {
  clearDoubles();
  setOverride("agentBook", null);
  for (const n of ENV_NAMES) delete process.env[n];
  await idp?.stop();
  await db?.$disconnect();
});

describe("complete journey", () => {
  it("request, completion, validated result, then the split: blocked until the backend accepts", async () => {
    const c = await campaign();
    const p = await propose(c.id);
    const s = await start(CAMPAIGNER, c.id, p);
    expect(s.status).toBe(200);

    // The request follows the step-up guide.
    const q = new URL(s.authorizeUrl).searchParams;
    expect(new URL(s.authorizeUrl).origin + new URL(s.authorizeUrl).pathname).toBe(`${idp.issuer}/api/v1/authorize`);
    expect(Object.fromEntries(q)).toMatchObject({ client_id: CLIENT.id, redirect_uri: CALLBACK, response_type: "code", scope: "openid", code_challenge_method: "S256", max_age: "0" });
    expect(q.has("prompt")).toBe(false);
    expect(JSON.parse(q.get("claims")!).id_token.acr).toEqual({ essential: true, values: ["https://world.org/oidc/acr/orb", "https://world.org/oidc/acr/orb-face"] });
    expect(q.get("state")!.length).toBeGreaterThanOrEqual(43);
    expect(q.get("nonce")!.length).toBeGreaterThanOrEqual(43);
    expect(s.body.splitHash).toBe(p.splitHash);

    // The attempt cookie is httpOnly, Lax, scoped, and encrypted: nothing in it can be read in the browser.
    expect(s.rawCookie).toMatch(/HttpOnly/i);
    expect(s.rawCookie).toMatch(/SameSite=lax/i);
    expect(s.rawCookie).toMatch(/Path=\/api\/agentpass\/stepup/);
    expect(s.rawCookie).toMatch(/Secure/i);
    const sealed = s.cookie.split("=")[1]!.split(".").map((part) => Buffer.from(part, "base64url").toString("latin1")).join("");
    for (const secret of [q.get("state")!, q.get("nonce")!, p.splitHash]) expect(sealed).not.toContain(secret);
    await expectUndone(c.id, p);

    const back = await complete(s, CAMPAIGNER);
    expect(back).toMatchObject({ origin: "https://app.clippo.test", path: "/desk", error: null });
    expect(back.setCookie).toMatch(/clippo_stepup=;/);
    // Still nothing done: the validated result alone authorizes nothing.
    await expectUndone(c.id, p);

    const ok = await approve(CAMPAIGNER, c.id, agentBody(p, back.token!));
    expect(ok.status).toBe(201);
    expect(ok.body.proposal.status).toBe("AWAITING_CHAIN");
    expect(ok.body.onchain.functionName).toBe("approveSplit");
    expect((await db.agentProposal.findUniqueOrThrow({ where: { id: p.id } })).status).toBe("APPROVED");

    // The on-chain human is derived from the exact (iss, sub), and the account is now linked to it.
    const identity = `${idp.issuer}|Subject-A`;
    expect(signed).toEqual([{ human: humanHash(createHash("sha256").update(identity).digest("hex")), approver: CAMPAIGNER }]);
    expect((await db.user.findUniqueOrThrow({ where: { wallet: CAMPAIGNER } })).worldIdpIdentity).toBe(identity);
    expect((await audits(c.id)).find((a) => a.event === "APPROVED")).toMatchObject({ outcome: "OK", proofStatus: "VALID", actorRole: "CAMPAIGNER" });
  });

  it("returns the admin to the bench; a subject differing only in case is a different human", async () => {
    const c = await campaign({ approver: "CAMPAIGNER_AND_ADMIN" });
    const p = await propose(c.id);
    const a = await approve(CAMPAIGNER, c.id, agentBody(p, await tokenFor(CAMPAIGNER, c.id, p, { claims: (d) => ({ ...d, sub: "Same-Sub" }) })));
    expect(a.body.proposal).toMatchObject({ status: "PENDING", awaiting: ["admin"] });
    const s = await start(ADMIN, c.id, p, "bench");
    const back = await complete(s, ADMIN, { claims: (d) => ({ ...d, sub: "same-sub", acr: "https://world.org/oidc/acr/orb-face", amr: ["pop", "face", "user"] }) });
    expect(back.path).toBe("/bench");
    const b = await approve(ADMIN, c.id, agentBody(p, back.token!));
    expect(b.body.proposal.status).toBe("AWAITING_CHAIN");
    expect(signed[0]!.human).not.toBe(signed[1]!.human);
  });

  it("accepts a passkey on an Orb-class account, as the docs define it", async () => {
    const c = await campaign();
    const p = await propose(c.id);
    const t = await tokenFor(CAMPAIGNER, c.id, p, { claims: (d) => ({ ...d, amr: ["pop", "user", "mfa"] }) });
    expect((await approve(CAMPAIGNER, c.id, agentBody(p, t))).status).toBe(201);
  });
});

describe("denied, cancelled and expired: no token, the split stays undone, and it is audited", () => {
  const cases: [string, AuthorizeOptions, string, string, string][] = [
    ["expired ID token", { claims: (d) => ({ ...d, exp: Math.floor(Date.now() / 1000) - 3600, iat: Math.floor(Date.now() / 1000) - 7200 }) }, "expired", "EXPIRED_PROOF", "EXPIRED"],
    ["wrong nonce", { claims: (d) => ({ ...d, nonce: "someone-elses-nonce" }) }, "invalid", "PROOF_INVALID", "INVALID"],
    ["missing nonce", { claims: (d) => ({ ...d, nonce: undefined }) }, "invalid", "PROOF_INVALID", "INVALID"],
    ["wrong audience", { claims: (d) => ({ ...d, aud: "another-client" }) }, "invalid", "PROOF_INVALID", "INVALID"],
    ["several audiences", { claims: (d) => ({ ...d, aud: [CLIENT.id, "another-client"] }) }, "invalid", "PROOF_INVALID", "INVALID"],
    ["wrong token issuer", { claims: (d) => ({ ...d, iss: "https://evil.example" }) }, "invalid", "PROOF_INVALID", "INVALID"],
    ["signature from a key outside the JWKS", { foreignKey: true }, "invalid", "PROOF_INVALID", "INVALID"],
    ["stale auth_time (an old session reused)", { claims: (d) => ({ ...d, auth_time: Math.floor(Date.now() / 1000) - 3600 }) }, "stale", "EXPIRED_PROOF", "EXPIRED"],
    ["missing auth_time", { claims: (d) => ({ ...d, auth_time: undefined }) }, "invalid", "PROOF_INVALID", "INVALID"],
    ["implausibly future auth_time", { claims: (d) => ({ ...d, auth_time: Math.floor(Date.now() / 1000) + 3600 }) }, "invalid", "PROOF_INVALID", "INVALID"],
    ["unaccepted acr", { claims: (d) => ({ ...d, acr: "https://world.org/oidc/acr/selfie" }) }, "not_eligible", "PROOF_INVALID", "INVALID"],
    ["missing acr (unverified account)", { claims: (d) => ({ ...d, acr: undefined }) }, "not_eligible", "PROOF_INVALID", "INVALID"],
    ["missing amr", { claims: (d) => ({ ...d, amr: undefined }) }, "invalid", "PROOF_INVALID", "INVALID"],
  ];
  for (const [name, opts, reason, outcome, proofStatus] of cases) {
    it(name, async () => {
      const c = await campaign();
      const p = await propose(c.id);
      const r = await complete(await start(CAMPAIGNER, c.id, p), CAMPAIGNER, opts);
      expect(r.token).toBeNull();
      expect(r.error).toBe(reason);
      await expectUndone(c.id, p);
      expect(await refusal(c.id, `STEP_UP_${reason.toUpperCase()}`)).toMatchObject({ outcome, proofStatus, proposalId: p.id, splitHash: p.splitHash, actorRole: "CAMPAIGNER" });
      expect((await db.user.findUniqueOrThrow({ where: { wallet: CAMPAIGNER } })).worldIdpIdentity).toBeNull();
    });
  }

  it("cancelled at the issuer", async () => {
    const c = await campaign();
    const p = await propose(c.id);
    const s = await start(CAMPAIGNER, c.id, p);
    const r = await callback(s, CAMPAIGNER, { error: "access_denied", state: stateOf(s), iss: idp.issuer });
    expect(r).toMatchObject({ token: null, error: "cancelled", path: "/desk" });
    await expectUndone(c.id, p);
    expect(await refusal(c.id, "STEP_UP_CANCELLED")).toMatchObject({ outcome: "CANCELLED", proofStatus: "CANCELLED" });
  });

  it("the account cannot meet the essential class", async () => {
    const c = await campaign();
    const p = await propose(c.id);
    const s = await start(CAMPAIGNER, c.id, p);
    expect((await callback(s, CAMPAIGNER, { error: "unmet_authentication_requirements", state: stateOf(s), iss: idp.issuer })).error).toBe("not_eligible");
    await expectUndone(c.id, p);
  });

  it("an attempt past its lifetime is refused without redeeming the code", async () => {
    const c = await campaign();
    const p = await propose(c.id);
    const s = await start(CAMPAIGNER, c.id, p);
    const code = idp.approve(s.authorizeUrl);
    vi.useFakeTimers({ toFake: ["Date"], now: Date.now() + 11 * 60 * 1000 });
    const r = await callback(s, CAMPAIGNER, { code, state: stateOf(s), iss: idp.issuer });
    vi.useRealTimers();
    expect(r.error).toBe("expired");
    expect(await refusal(c.id, "STEP_UP_EXPIRED")).toMatchObject({ outcome: "EXPIRED_PROOF", proofStatus: "EXPIRED" });
    await expectUndone(c.id, p);
  });

  it("a response from another issuer (iss parameter) is refused before the code is redeemed", async () => {
    const c = await campaign();
    const p = await propose(c.id);
    const s = await start(CAMPAIGNER, c.id, p);
    const code = idp.approve(s.authorizeUrl);
    expect((await callback(s, CAMPAIGNER, { code, state: stateOf(s), iss: "https://evil.example" })).error).toBe("invalid");
    expect((await callback(s, CAMPAIGNER, { code, state: stateOf(s) })).error).toBe("invalid");
    await expectUndone(c.id, p);
  });

  it("a wrong state is refused and does not end the live attempt", async () => {
    const c = await campaign();
    const p = await propose(c.id);
    const s = await start(CAMPAIGNER, c.id, p);
    const bad = await callback(s, CAMPAIGNER, { code: idp.approve(s.authorizeUrl), state: "forged", iss: idp.issuer });
    expect(bad.error).toBe("invalid");
    expect(bad.setCookie).not.toMatch(/clippo_stepup=;/);
    expect((await complete(s, CAMPAIGNER)).token).toBeTruthy();
  });

  it("no attempt cookie: refused", async () => {
    const c = await campaign();
    const p = await propose(c.id);
    const s = await start(CAMPAIGNER, c.id, p);
    expect((await callback({ ...s, cookie: "" }, CAMPAIGNER, { code: "x", state: stateOf(s), iss: idp.issuer })).error).toBe("invalid");
    expect((await callback({ ...s, cookie: `${s.cookie}tampered` }, CAMPAIGNER, { code: "x", state: stateOf(s), iss: idp.issuer })).error).toBe("invalid");
    await expectUndone(c.id, p);
  });

  it("a redeemed code cannot be redeemed again", async () => {
    const c = await campaign();
    const p = await propose(c.id);
    const s = await start(CAMPAIGNER, c.id, p);
    const code = idp.approve(s.authorizeUrl);
    expect((await callback(s, CAMPAIGNER, { code, state: stateOf(s), iss: idp.issuer })).token).toBeTruthy();
    expect((await callback(s, CAMPAIGNER, { code, state: stateOf(s), iss: idp.issuer })).error).toBe("invalid");
  });

  it("issuer outage is reported as unavailable, not as a failed identity", async () => {
    const c = await campaign();
    const p = await propose(c.id);
    idp.setTokenStatus(503);
    expect((await complete(await start(CAMPAIGNER, c.id, p), CAMPAIGNER)).error).toBe("unavailable");
    expect(await refusal(c.id, "STEP_UP_UNAVAILABLE")).toMatchObject({ outcome: "REFUSED", proofStatus: "NONE" });
    await expectUndone(c.id, p);
  });
});

describe("the token authorizes one approval, by one user, of one split", () => {
  it("replay is refused once the approval no longer blocks it first", async () => {
    const c = await campaign({ approver: "CAMPAIGNER_AND_ADMIN" });
    const p = await propose(c.id);
    const t = await tokenFor(CAMPAIGNER, c.id, p);
    expect((await approve(CAMPAIGNER, c.id, agentBody(p, t))).status).toBe(201);
    // The admin builds a different split, which replaces the pending one, so "already approved" no longer stops the replay.
    expect((await approve(ADMIN, c.id, { splits: [{ creatorWallet: CREATOR, amount: 400 }], worldIdProof: { nullifier_hash: "n-other", proof: "proof-other" } })).status).toBe(201);
    const replay = await approve(CAMPAIGNER, c.id, agentBody(p, t));
    expect(replay.status).toBe(409);
    expect(replay.body.error.code).toBe("PROOF_REUSED");
    expect(await refusal(c.id, "PROOF_REUSED")).toMatchObject({ outcome: "REPLAYED", proofStatus: "REPLAYED" });
  });

  it("two concurrent uses approve once", async () => {
    const c = await campaign();
    const p = await propose(c.id);
    const t = await tokenFor(CAMPAIGNER, c.id, p);
    const rs = await Promise.all([approve(CAMPAIGNER, c.id, agentBody(p, t)), approve(CAMPAIGNER, c.id, agentBody(p, t))]);
    expect(rs.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(await db.humanAttestation.count({ where: { campaignId: c.id } })).toBe(1);
  });

  it("is refused for a different split", async () => {
    const c = await campaign();
    const p = await propose(c.id);
    const t = await tokenFor(CAMPAIGNER, c.id, p);
    const r = await approve(CAMPAIGNER, c.id, { splits: [{ creatorWallet: CREATOR, amount: 499 }], stepUpToken: t });
    expect(r.status).toBe(403);
    expect(r.body.error.code).toBe("STEP_UP_MISMATCH");
    await expectUndone(c.id, p);
    expect(await refusal(c.id, "STEP_UP_MISMATCH")).toMatchObject({ outcome: "PROOF_INVALID", proofStatus: "INVALID" });
    // A changed split under the proposal is caught by the proposal's own hash first.
    const changed = await approve(CAMPAIGNER, c.id, { ...agentBody(p, t), splits: [{ creatorWallet: CREATOR, amount: 499 }] });
    expect(changed.body.error.code).toBe("SPLIT_CHANGED");
  });

  it("is refused when only the split differs (no proposal involved)", async () => {
    const c = await campaign();
    const built = { id: "", splitHash: "", splits: [{ creatorWallet: CREATOR, amount: 300 }] };
    const res = await (await route.start())(jsonReq("/api/agentpass/stepup/start", CAMPAIGNER, { campaignId: c.id, splits: built.splits, returnTo: "desk" }));
    const cookie = res.headers.getSetCookie().find((x) => x.startsWith("clippo_stepup="))!.split(";")[0]!;
    const { body } = await asJson(res);
    const s = { status: 200, body, authorizeUrl: body.authorizeUrl as string, cookie, rawCookie: cookie };
    const t = (await complete(s, CAMPAIGNER)).token!;
    const other = await approve(CAMPAIGNER, c.id, { splits: [{ creatorWallet: CREATOR, amount: 301 }], stepUpToken: t });
    expect(other.body.error.code).toBe("STEP_UP_MISMATCH");
    expect(await db.splitProposal.count({ where: { campaignId: c.id } })).toBe(0);
    expect((await approve(CAMPAIGNER, c.id, { splits: built.splits, stepUpToken: t })).status).toBe(201);
  });

  it("is refused for another proposal of the same split, and for another campaign", async () => {
    const c = await campaign();
    const p = await propose(c.id);
    const t = await tokenFor(CAMPAIGNER, c.id, p);
    const p2 = await propose(c.id);
    expect(p2.splitHash).toBe(p.splitHash);
    expect((await approve(CAMPAIGNER, c.id, agentBody(p2, t))).body.error.code).toBe("STEP_UP_MISMATCH");
    const c2 = await campaign();
    const p3 = await propose(c2.id);
    expect((await approve(CAMPAIGNER, c2.id, agentBody(p3, t))).body.error.code).toBe("STEP_UP_MISMATCH");
    await expectUndone(c2.id, p3);
  });

  it("is refused for a different user", async () => {
    const c = await campaign({ approver: "CAMPAIGNER_AND_ADMIN" });
    const p = await propose(c.id);
    const t = await tokenFor(CAMPAIGNER, c.id, p);
    const r = await approve(ADMIN, c.id, agentBody(p, t));
    expect(r.status).toBe(403);
    expect(r.body.error.code).toBe("STEP_UP_MISMATCH");
    await expectUndone(c.id, p);
  });

  it("is refused once expired, and when tampered with", async () => {
    const c = await campaign();
    const p = await propose(c.id);
    const t = await tokenFor(CAMPAIGNER, c.id, p);
    expect((await approve(CAMPAIGNER, c.id, agentBody(p, `${t.slice(0, -2)}xx`))).body.error.code).toBe("STEP_UP_INVALID");
    const { createToken } = await import("@/lib/auth");
    expect((await approve(CAMPAIGNER, c.id, agentBody(p, createToken(CAMPAIGNER)))).body.error.code).toBe("STEP_UP_INVALID");
    vi.useFakeTimers({ toFake: ["Date"], now: Date.now() + 6 * 60 * 1000 });
    const r = await approve(CAMPAIGNER, c.id, agentBody(p, t));
    vi.useRealTimers();
    expect(r.body.error.code).toBe("STEP_UP_EXPIRED");
    await expectUndone(c.id, p);
    expect(await refusal(c.id, "STEP_UP_EXPIRED")).toMatchObject({ outcome: "EXPIRED_PROOF", proofStatus: "EXPIRED" });
  });
});

describe("the right person", () => {
  it("wrong user at the callback: the browser's session is not the one that started", async () => {
    const c = await campaign();
    const p = await propose(c.id);
    const r = await complete(await start(CAMPAIGNER, c.id, p), OTHER);
    expect(r).toMatchObject({ token: null, error: "wrong_account" });
    await expectUndone(c.id, p);
    expect(await refusal(c.id, "STEP_UP_WRONG_ACCOUNT")).toMatchObject({ outcome: "WRONG_APPROVER", proofStatus: "INVALID" });
  });

  it("a linked account must return its own World ID", async () => {
    const c = await campaign();
    const p = await propose(c.id);
    await db.user.update({ where: { wallet: CAMPAIGNER }, data: { worldIdpIdentity: `${idp.issuer}|Subject-A` } });
    const r = await complete(await start(CAMPAIGNER, c.id, p), CAMPAIGNER, { claims: (d) => ({ ...d, sub: "Subject-B" }) });
    expect(r.error).toBe("wrong_account");
    await expectUndone(c.id, p);
    expect((await complete(await start(CAMPAIGNER, c.id, p), CAMPAIGNER)).token).toBeTruthy();
  });

  it("one World ID cannot act as both approvers: the identity is already linked elsewhere", async () => {
    const c = await campaign({ approver: "CAMPAIGNER_AND_ADMIN" });
    const p = await propose(c.id);
    expect((await approve(CAMPAIGNER, c.id, agentBody(p, await tokenFor(CAMPAIGNER, c.id, p)))).status).toBe(201);
    const r = await complete(await start(ADMIN, c.id, p, "bench"), ADMIN);
    expect(r).toMatchObject({ error: "wrong_account", path: "/bench" });
    expect((await db.splitProposal.findFirstOrThrow({ where: { campaignId: c.id } })).adminApprovedAt).toBeNull();
  });

  it("a stranger and an admin on a campaigner-only split cannot start", async () => {
    const c = await campaign();
    const p = await propose(c.id);
    expect((await start(OTHER, c.id, p)).status).toBe(403);
    const admin = await start(ADMIN, c.id, p);
    expect(admin.status).toBe(403);
    expect(admin.body.error.code).toBe("WRONG_APPROVER");
    expect(admin.cookie).toBe("");
    expect(await refusal(c.id, "WRONG_APPROVER")).toBeTruthy();
    await db.agentProposal.update({ where: { id: p.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await start(CAMPAIGNER, c.id, p)).body.error.code).toBe("PROPOSAL_EXPIRED");
  });
});

describe("the agent's split cannot avoid step-up", () => {
  const idkit = (n: string) => ({ nullifier_hash: `n-${n}`, proof: `proof-${n}` });

  it("an IDKit proof is refused, with or without naming the proposal", async () => {
    const c = await campaign();
    const p = await propose(c.id);
    const named = await approve(CAMPAIGNER, c.id, { splits: wire(p), agentProposalId: p.id, worldIdProof: idkit("1") });
    expect(named.status).toBe(403);
    expect(named.body.error.code).toBe("STEP_UP_REQUIRED");
    const unnamed = await approve(CAMPAIGNER, c.id, { splits: wire(p), worldIdProof: idkit("2") });
    expect(unnamed.body.error.code).toBe("STEP_UP_REQUIRED");
    const nothing = await approve(CAMPAIGNER, c.id, { splits: wire(p), agentProposalId: p.id });
    expect(nothing.body.error.code).toBe("STEP_UP_REQUIRED");
    await expectUndone(c.id, p);
    expect((await audits(c.id)).filter((a) => a.code === "STEP_UP_REQUIRED")).toHaveLength(3);
  });

  it("a split the approver built themselves still takes an IDKit proof, and needs some check", async () => {
    const c = await campaign();
    const splits = [{ creatorWallet: CREATOR, amount: 300 }];
    expect((await approve(CAMPAIGNER, c.id, { splits })).body.error.code).toBe("HUMAN_CHECK_REQUIRED");
    expect((await approve(CAMPAIGNER, c.id, { splits, worldIdProof: idkit("3") })).status).toBe(201);
  });
});

describe("not configured: 503, never a fake success", () => {
  it.each(["WORLD_IDP_CLIENT_ID", "WORLD_IDP_CLIENT_SECRET", "WORLD_IDP_REDIRECT_URI"])("without %s", async (name) => {
    const c = await campaign();
    const p = await propose(c.id);
    const s = await start(CAMPAIGNER, c.id, p);
    const t = await tokenFor(CAMPAIGNER, c.id, p);
    delete process.env[name];

    const noStart = await start(CAMPAIGNER, c.id, p);
    expect(noStart.status).toBe(503);
    expect(noStart.body.error.code).toBe("NOT_CONFIGURED");
    expect(noStart.body.error.message).toContain(name);

    const url = new URL(CALLBACK);
    url.searchParams.set("state", stateOf(s));
    expect((await (await route.callback())(new Request(url, { headers: { cookie: s.cookie, "x-wallet": CAMPAIGNER } }))).status).toBe(503);

    const noSplit = await approve(CAMPAIGNER, c.id, agentBody(p, t));
    expect(noSplit.status).toBe(503);
    await expectUndone(c.id, p);
  });

  it("an issuer whose discovery names another issuer is not believed", async () => {
    const c = await campaign();
    const p = await propose(c.id);
    process.env.WORLD_IDP_ISSUER = `${idp.issuer}/`;
    const r = await start(CAMPAIGNER, c.id, p);
    expect(r.status).toBe(503);
    expect(r.body.error.code).toBe("STEP_UP_UNAVAILABLE");
  });

  it("/api/health reports the flag as a boolean", async () => {
    const { GET } = await import("@/app/api/health/route");
    const on = (await (await (GET as unknown as () => Promise<Response>)()).json()) as { config: { worldIdP: boolean } };
    expect(on.config.worldIdP).toBe(true);
    delete process.env.WORLD_IDP_CLIENT_SECRET;
    const off = (await (await (GET as unknown as () => Promise<Response>)()).json()) as { config: { worldIdP: boolean } };
    expect(off.config.worldIdP).toBe(false);
  });
});
