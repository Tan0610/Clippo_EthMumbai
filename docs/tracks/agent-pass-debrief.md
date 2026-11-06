# World Agent Pass: integration debrief (draft)

This is the full debrief text for the prize form. It is much longer than the 30 s Agent Pass slot in the video, which uses the cut-down version in `docs/DEMO_SCRIPT.md`. The full test list is `docs/tracks/agent-pass-demo.md`.

```
Project: Clippo
Product used: World IdP (auth.world.org) step-up for the human check on the agent's split; World AgentKit to attribute the proposal to an agent wallet; World ID (IDKit 4.x + Developer Portal v4 verify) for splits a human builds and for campaign approval
Integration type: standard OIDC against the official issuer (authorization code, S256 PKCE, jose 5.10 for JWT work), plus official SDKs @worldcoin/agentkit 0.2.1 and @worldcoin/idkit 4.6 / idkit-core 4.6
Status: automated tests written against a local fake issuer (results not re-run when this was edited). Not run against the real issuer, in a browser, or on real Arc. AgentKit/AgentBook is not the official Agent Pass; the official product is the OIDC service at auth.world.org.

1. What the agent does
   For a human-verified split campaign the agent proposes how to share the pool across creators with approved clips. It signs a
   SIWE (CAIP-122) AgentKit payload whose requestId is the keccak hash of the split and whose resource is the proposal endpoint.
   The proposal is written by an LLM (advisory; Claude when ANTHROPIC_API_KEY is set, Gemini if only GEMINI_API_KEY is set): it returns per-creator amounts and reasons as JSON; code re-checks every number
   (integers in micro-USDC, eligible creators, no duplicates, sum <= net pool, per-creator cap) and falls back to the deterministic
   planner, with an audit row, on any violation, timeout or malformed answer. Clip text is passed as delimited untrusted data.
   The agent has no code path that creates a payout, an approval, an attestation or a used proof (guardrail tests enforce it).

2. How the agent is tied to a human
   The agent wallet is registered in AgentBook (World Chain) with `npx @worldcoin/agentkit-cli register <address>`. The campaigner
   then delegates it to one campaign (POST /api/campaigns/:id/agent); the backend refuses unless AgentBook.lookupHuman(address)
   returns a human id. Each proposal is re-checked: schema, domain/uri, age, expiry, nonce replay, signature recovery, split binding.
   No real wallet has been registered in AgentBook yet. Tests use an injected AgentBook double; AGENT_PASS_DEMO=1 uses a fake human.

3. Where the human check sits
   Before the escrow can be told to release: approving the agent's split redirects the approver through World IdP step-up
   (max_age=0, essential acr). The backend issues a token bound to the user, campaign, split hash, proposal and (iss, sub), good for one
   use and at most 5 minutes. POST /api/campaigns/:id/split consumes it in the approval's transaction and signs the proof the escrow
   checks. The escrow that enforces this proof (commit 498f649: approveSplit needs a one-time approval signed by humanAttestor, the backend
   wallet, and refuses one human as both approvers) is NOT deployed. The live site's escrow is an older design without it. For two-party campaigns the admin does the same with their own World ID, on the identical hash. Payouts are created only by
   the on-chain event indexer. A split the approver builds by hand uses an IDKit proof bound to `split:<campaignId>:<splitHash>`.

4. Backend validation
   Agent side: validateAgentkitMessage + EIP-191 recovery + AgentBook lookup + DB-unique nonce.
   Human side (agent's split): state and response iss, code redeemed once with PKCE from the backend, ID token signature through JWKS,
   iss, aud, exp, nonce, auth_time inside this attempt, acr, amr, session and account match, then a recheck of permissions at approval.
   The client secret stays on the server, and nothing the browser reports is trusted.
   Refusals: access_denied -> 403 STEP_UP_CANCELLED; expired attempt or ID token -> STEP_UP_EXPIRED; auth_time before this attempt -> STEP_UP_STALE;
   another account's World ID -> STEP_UP_WRONG_ACCOUNT; token for another user/campaign/split/proposal -> STEP_UP_MISMATCH;
   acr not accepted -> STEP_UP_NOT_ELIGIBLE; issuer down -> 503 STEP_UP_UNAVAILABLE; token reused -> 409 PROOF_REUSED; changed split -> 409 SPLIT_CHANGED.
   Human side (split built by hand): action `clippo-approve-split`, signal hash match, environment pinned server-side, proof hash and nullifier recorded.

5. Journeys with an automated test ([x] = a test exists in the repo; results were not re-run when this was written; fake issuer with real RS256 signing: src/lib/agentpass/stepup.integration.test.ts and agentpass.integration.test.ts; each refusal leaves the action undone, and refusals tied to an attempt write an audit row)
   step-up: success [x]  denied/cancelled at the issuer [x]  expired attempt, ID token and step-up token [x]  wrong nonce [x]  wrong audience [x]  stale auth_time [x]  token replay [x]
   token for a different split or proposal or campaign [x]  wrong user [x]  wrong World ID for the account [x]  one World ID as both approvers [x]  unaccepted acr [x]  issuer outage [x]  missing env -> 503 [x]
   agent proposal and approval: success [x]  expired proposal [x]  AI proposal rejected by code, fallback audited [x]  no ANTHROPIC_API_KEY (assumes GEMINI_API_KEY is also unset in the test environment) -> 503 [x]
   wrong approver [x]  split changed after proposal (hash mismatch) [x]  already released [x]  revoked agent [x]  unregistered agent [x]
   split built by hand (IDKit proof, not step-up): cancelled [x]  expired proof [x]  repeated/replayed proof [x]
   Run against the real issuer: ____ (to fill after a real run)
   Real issuer used (production or sandbox): ____ ; acr and amr returned: ____ (to fill after a real run)
   Run with a real World App: ____ (to fill after a real run)

6. Setup time: ____ ; Docs clarity (1-5): ____   (to fill after a real run; not measured yet)

7. What worked well (to fill after a real run; the notes below come from reading the docs and building against fixtures)
   - The typed SDK (zod payload schema, validateAgentkitMessage, formatSIWEMessage) let us verify the agent's payload without writing crypto code.
   - World IdP is standard OIDC, and the step-up guide states the freshness rule for max_age=0: check that authentication belongs to this attempt, not that its age stays zero.
   - The testing guide's "local signed fixtures" advice is what the fake issuer in src/test/fake-idp.ts follows.

8. Friction / gaps (to fill after a real run; the notes below come from reading the docs and SDK, not from a run)
   - "Agent Pass" is not a name in the docs at docs.world.org, and those docs do not point to auth.world.org (earlier research session, not re-checked). We first built against AgentKit and IDKit and had to correct course.
   - Callbacks must be HTTPS; HTTP localhost is not supported (per the client setup docs, as recorded in web/.env.example), so a local run needs a tunnel.
   - The prize page says proofs are mocked and no sandbox app is needed; the public testing guide still describes the sandbox app and does not mention mocks (earlier research session, not re-checked).
   - Production discovery (https://auth.world.org/.well-known/openid-configuration, fetched 2026-11-06) lists only the orb and orb-face classes in acr_values_supported. Selfie classes in the guides are not listed there.
   - AgentKit is built around x402 resource servers. Using it for an approval flow (not payment gating) meant calling the
     low-level helpers ourselves. Whether the docs have a Next.js example was not checked (earlier research session, not re-checked).
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
