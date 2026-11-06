# World Agent Pass: integration debrief (draft)

```
Project: Clippo
Product used: World IdP (auth.world.org) step-up for the human check on the agent's split; World AgentKit to attribute the proposal to an agent wallet; World ID (IDKit 4.x + Developer Portal v4 verify) for splits a human builds and for campaign approval
Integration type: standard OIDC against the official issuer (authorization code, S256 PKCE, jose 5.10 for JWT work), plus official SDKs @worldcoin/agentkit 0.2.1 and @worldcoin/idkit 4.6 / idkit-core 4.6
Status: tested against a local fake issuer only. Not yet run against the real issuer.

1. What the agent does
   For a human-verified split campaign the agent proposes how to share the pool across creators with approved clips. It signs a
   SIWE (CAIP-122) AgentKit payload whose requestId is the keccak hash of the split and whose resource is the proposal endpoint.
   The proposal is written by Claude (advisory): it returns per-creator amounts and reasons as JSON; code re-checks every number
   (integers in micro-USDC, eligible creators, no duplicates, sum <= net pool, per-creator cap) and falls back to the deterministic
   planner, with an audit row, on any violation, timeout or malformed answer. Clip text is passed as delimited untrusted data.
   The agent has no code path that creates a payout, an approval, an attestation or a used proof (guardrail tests enforce it).

2. How the agent is tied to a human
   The agent wallet is registered in AgentBook (World Chain) with `npx @worldcoin/agentkit-cli register <address>`. The campaigner
   then delegates it to one campaign (POST /api/campaigns/:id/agent); the backend refuses unless AgentBook.lookupHuman(address)
   returns a human id. Each proposal is re-checked: schema, domain/uri, age, expiry, nonce replay, signature recovery, split binding.

3. Where the human check sits
   Before the escrow can be told to release: approving the agent's split redirects the approver through World IdP step-up
   (max_age=0, essential acr). The backend issues a token bound to the user, campaign, split hash, proposal and (iss, sub), good for one
   use and at most 5 minutes. POST /api/campaigns/:id/split consumes it in the approval's transaction and signs the proof the escrow
   checks. For two-party campaigns the admin does the same with their own World ID, on the identical hash. Payouts are created only by
   the on-chain event indexer. A split the approver builds by hand uses an IDKit proof bound to `split:<campaignId>:<splitHash>`.

4. Backend validation
   Agent side: validateAgentkitMessage + EIP-191 recovery + AgentBook lookup + DB-unique nonce.
   Human side (agent's split): state and response iss, code redeemed once with PKCE from the backend, ID token signature through JWKS,
   iss, aud, exp, nonce, auth_time inside this attempt, acr, amr, session and account match, then a recheck of permissions at approval.
   The client secret stays on the server, and nothing the browser reports is trusted.
   Human side (split built by hand): action `clippo-approve-split`, signal hash match, environment pinned server-side, proof hash and nullifier recorded.

5. Journeys tested (automated, against a local fake issuer with real RS256 signing: src/lib/agentpass/stepup.integration.test.ts and agentpass.integration.test.ts; each refusal leaves the action undone, and refusals tied to an attempt write an audit row)
   step-up: success [x]  cancelled [x]  expired attempt, ID token and step-up token [x]  wrong nonce [x]  wrong audience [x]  stale auth_time [x]  token replay [x]
   token for a different split or proposal or campaign [x]  wrong user [x]  wrong World ID for the account [x]  one World ID as both approvers [x]  issuer outage [x]  missing env -> 503 [x]
   success [x]  cancelled [x]  expired proof [x]  expired proposal [x]  AI proposal rejected by code, fallback audited [x]  missing ANTHROPIC_API_KEY -> 503 [x]  repeated/replayed proof [x]
   wrong approver [x]  split changed after proposal (hash mismatch) [x]  already released [x]  revoked agent [x]  unregistered agent [x]
   Run against the real issuer: ____ (fill in after the live run)
   Real issuer used (production or sandbox): ____ ; acr and amr returned: ____
   Not yet run with a real World App: ____ (fill in after the live run)

6. Setup time: ____ ; Docs clarity (1-5): ____   (fill in after registering the agent for real)

7. What worked well
   - AgentBook plus a signed SIWE payload is a clean way to attribute a proposal to a human-backed agent.
   - The typed SDK (zod payload schema, validateAgentkitMessage, formatSIWEMessage) let us verify without writing crypto code.
   - World IdP is standard OIDC, and the step-up guide states the freshness rule for max_age=0 precisely: check that authentication belongs to this attempt, not that its age stays zero.
   - The testing guide's "local signed fixtures" advice let us test validation failures without a person in the loop.

8. Friction / gaps (from reading the docs and SDK; confirm against the live run)
   - "Agent Pass" is not a name in the docs at docs.world.org, and those docs do not point to auth.world.org. We first built against AgentKit and IDKit and had to correct course.
   - Only the coding-agent guide has a working .md URL. The other /docs/guides/<id>.md URLs return the web app's HTML shell; we read those guides through the developer MCP's public get_idp_guide tool.
   - Callbacks must be HTTPS and HTTP localhost is not supported, so a local run needs a tunnel.
   - The prize page says proofs are mocked and no sandbox app is needed; the public testing guide still describes the sandbox app and does not mention mocks.
   - Production discovery lists only the orb and orb-face classes, while the guides also describe selfie classes.
   - AgentKit is built around x402 resource servers. Using it for an approval flow (not payment gating) meant calling the
     low-level helpers ourselves; the docs show no Next.js example.
   - Delegation is just registration: no scope (campaign, amount), expiry or revocation. We added per-campaign binding and revoke on our side.
   - AgentBook human ids are anonymous, so we cannot prove the registering human is the campaigner. The campaigner's World ID check is a separate step.
   - No documented fake or test identities for AgentBook; lookups resolve against World Chain mainnet only. We added an explicit demo mode (AGENT_PASS_DEMO) that is labelled everywhere.
   - `lookupHuman` returns null both for unregistered wallets and for RPC failures, so a flaky RPC looks like "not registered".
   - IDKit needs the signal passed into the preset to bind a proof to an approval; the backend rejects proofs that are not bound.

9. Fake-identity limitation
   The prize page says proofs use fake identities, so a passing run would not show that a real person is verified. AGENT_PASS_DEMO records (the agent wallet, not the human check) carry mode "demo" in the database and the panel says so.

10. What we would do next
   Persist AgentKit nonces and usage in the shared storage interface, scope delegation by amount cap and expiry, run the Claude proposer against a live key and a few real campaigns (not done yet), cover the reasons
   with the signature, and move the two-party state into the escrow event flow.
```
