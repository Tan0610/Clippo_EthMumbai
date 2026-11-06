/**
 * TEST DOUBLE ONLY: a local OIDC issuer over real HTTP with real RS256 signing, so production code runs unchanged against it
 * (discovery, JWKS, token exchange, jose verification). It is reached only by pointing WORLD_IDP_ISSUER at it in a test.
 */
import { createHash, randomUUID } from "node:crypto";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { exportJWK, generateKeyPair, SignJWT, type JWTPayload } from "jose";

type Claims = JWTPayload & Record<string, unknown>;
export interface AuthorizeOptions {
  /** Change the ID token's claims. Set a claim to undefined to omit it. */
  claims?: (defaults: Claims) => Claims;
  /** Sign with a key that is not in the JWKS. */
  foreignKey?: boolean;
}
interface PendingCode extends AuthorizeOptions {
  redirectUri: string;
  challenge: string;
  nonce: string;
}

const formDecode = (s: string) => decodeURIComponent(s.replace(/\+/g, " "));

export async function startFakeIdp(client: { id: string; secret: string }) {
  const keys = await generateKeyPair("RS256");
  const foreign = await generateKeyPair("RS256");
  const kid = "fake-key-1";
  const jwk = { ...(await exportJWK(keys.publicKey)), kid, alg: "RS256", use: "sig" };
  const codes = new Map<string, PendingCode>();
  const state = { tokenStatus: 200, issuer: "" };

  const server: Server = createServer((req, res) => {
    const json = (status: number, body: unknown) => {
      res.writeHead(status, { "content-type": "application/json" });
      res.end(JSON.stringify(body));
    };
    const path = new URL(req.url!, state.issuer).pathname;
    if (path === "/.well-known/openid-configuration") {
      return json(200, {
        issuer: state.issuer,
        authorization_endpoint: `${state.issuer}/api/v1/authorize`,
        token_endpoint: `${state.issuer}/api/v1/token`,
        jwks_uri: `${state.issuer}/.well-known/jwks.json`,
        code_challenge_methods_supported: ["S256"],
        id_token_signing_alg_values_supported: ["RS256"],
      });
    }
    if (path === "/.well-known/jwks.json") return json(200, { keys: [jwk] });
    if (path !== "/api/v1/token" || req.method !== "POST") return json(404, { error: "not_found" });
    let raw = "";
    req.on("data", (d) => (raw += d));
    req.on("end", async () => {
      if (state.tokenStatus !== 200) return json(state.tokenStatus, { error: "temporarily_unavailable" });
      const [user, pass] = Buffer.from((req.headers.authorization ?? "").replace(/^Basic /, ""), "base64").toString().split(":");
      if (formDecode(user ?? "") !== client.id || formDecode(pass ?? "") !== client.secret) return json(401, { error: "invalid_client" });
      const form = new URLSearchParams(raw);
      const pending = codes.get(form.get("code") ?? "");
      codes.delete(form.get("code") ?? "");
      const challenge = createHash("sha256").update(form.get("code_verifier") ?? "").digest("base64url");
      if (!pending || form.get("grant_type") !== "authorization_code" || pending.redirectUri !== form.get("redirect_uri") || pending.challenge !== challenge) return json(400, { error: "invalid_grant" });
      const now = Math.floor(Date.now() / 1000);
      const defaults: Claims = { iss: state.issuer, sub: "Subject-A", aud: client.id, exp: now + 300, iat: now, jti: randomUUID(), auth_time: now, acr: "https://world.org/oidc/acr/orb", amr: ["pop"], nonce: pending.nonce };
      const claims = pending.claims ? pending.claims(defaults) : defaults;
      const id_token = await new SignJWT(claims).setProtectedHeader({ alg: "RS256", kid }).sign(pending.foreignKey ? foreign.privateKey : keys.privateKey);
      return json(200, { id_token, access_token: "opaque", token_type: "Bearer", expires_in: 300 });
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  state.issuer = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  return {
    issuer: state.issuer,
    setTokenStatus: (s: number) => void (state.tokenStatus = s),
    /** What the issuer does when the human completes the browser step: remembers the request and returns a one-use code. */
    approve(authorizeUrl: string, opts: AuthorizeOptions = {}): string {
      const q = new URL(authorizeUrl).searchParams;
      const code = randomUUID();
      codes.set(code, { ...opts, redirectUri: q.get("redirect_uri")!, challenge: q.get("code_challenge")!, nonce: q.get("nonce")! });
      return code;
    },
    stop: () => new Promise<void>((r) => { server.closeAllConnections(); server.close(() => r()); }),
  };
}
