# World, Agent Pass: research and requirement checklist

Prize: "World ID Agent Pass", $5,000 (1st $2,500, 2nd $1,500, 3rd $1,000). A Continuity-only version pays $2,500 (1st $1,500, 2nd $1,000). Verified on the live Mumbai prize page https://ethglobal.com/events/mumbai/prizes on 2026-11-06 (the old `mumbai2026` paths return 404). Research below was first done 2026-10-28.

**Mumbai requirements** (qualification list on that page, lines 102-133 of the saved copy):

1. Integrate with the official World ID Agent Pass (auth.world.org, not AgentKit).
2. Demonstrate the complete journey: identity or verification request, user completion, validated result, and the protected application or agent action.
3. Demonstrate a denied, expired, cancelled, or otherwise unsuccessful path where the protected action does not occur.
4. Validate identity results in a secure backend. Do not expose client secrets or treat an unvalidated client response as authorization.
5. Include a short integration debrief: time to first success, friction encountered, missing capability or documentation, and the one improvement with the greatest impact.

The page also says proofs use fake identities (mocked, no sandbox app needed) and must not be relied on for production.

## Correction (2026-11-06): the prize product is World IdP

The earlier research below treated "Agent Pass" as AgentKit. That was wrong for the human gate: the prize's official docs are https://auth.world.org/docs, an OIDC issuer called **World IdP**. Clippo now uses it as the human gate on the agent's split. AgentKit remains in use only to attribute the proposal to a registered agent wallet.

**Current status: built, with automated tests written against a local fake issuer (`web/src/test/fake-idp.ts`). Never run against the real issuer and never run in a browser. Not proven until `WORLD_IDP_*` credentials are set and a real run is completed.** The test results were not re-run when this file was last edited, so no pass counts are quoted. The live site (clippo-six.vercel.app) still runs the old build, so step-up is not live there. The escrow contract that enforces the approval on-chain is not deployed (see "Known limits"). See "World IdP step-up" at the end.

## What "Agent Pass" was first taken to be (researched 2026-10-28)

World's docs.world.org does not use the name "Agent Pass". The closest products there are **World AgentKit** (beta, built on x402) and a sibling **Human-in-the-loop** kit.

| Topic | Finding | Source |
| --- | --- | --- |
| Purpose | AgentKit lets a service tell human-backed agents apart from bots and scripts. | https://docs.world.org/agents/agent-kit |
| Agent to human link | A human registers the agent's wallet address in **AgentBook**, an on-chain registry on World Chain (`eip155:480`, contract `0xA23aB2712eA7BBa896930544C7d6636a96b944dA`). Registration is `npx @worldcoin/agentkit-cli register <agent-address>`; the World App verification flow prompts the person and the CLI submits the transaction through a hosted relay. `status <address>` checks it. | agent-kit docs; https://docs.world.org/agents/agent-kit/sdk-reference.md |
| Delegation | Not a separate feature. Registration in AgentBook is the delegation. There is no scoped or revocable delegation API in the docs. | agent-kit docs |
| Agent proves itself | The agent signs a SIWE (EIP-4361 / CAIP-122) payload; the server checks it and calls `lookupHuman(address)`, which returns an anonymous human id or `null`. Header name `agentkit` (base64 JSON). | sdk-reference |
| SDK | `@worldcoin/agentkit` (client `createAgentkitClient`, server `createAgentkitHooks`, `declareAgentkitExtension`, `InMemoryAgentKitStorage`) re-exporting `@worldcoin/agentkit-core` (`createAgentBookVerifier`, `parseAgentkitHeader`, `validateAgentkitMessage`, `verifyAgentkitSignature`, `formatSIWEMessage`, `AgentkitPayloadSchema`). CLI: `@worldcoin/agentkit-cli`. Installed here: `@worldcoin/agentkit@0.2.1` (read from node_modules typings). | npm; sdk-reference |
| Access modes and limits | `free`, `free-trial` (default 3 uses, per human per endpoint), `discount`. Usage counters are per endpoint and per human id, so several agents of one human share the allowance. No other rate limits are documented. | agent-kit docs |
| Replay protection | Optional storage hooks `hasUsedNonce` / `recordNonce`; production needs durable storage. | agent-kit docs |
| Human-in-the-loop | Separate kit: an agent pauses and a verified human approves via a World ID proof bound to an action string. Packages `@worldcoin/human-in-the-loop` (server, Workflow SDK + AI SDK v6) and `@worldcoin/human-in-the-loop-react`. Server must re-verify the proof at `POST https://developer.world.org/api/v4/verify/{rp_id}` with `environment: production`, bind the action to the operation, and consume the nullifier once in durable storage. | https://docs.world.org/agents/human-in-the-loop/integrate.md |
| auth.world.org / OIDC step-up | Not linked from docs.world.org, which is why this search missed it. It is documented at auth.world.org and is now the human gate (see the correction above). | https://auth.world.org/llms.txt |
| Fake or mock identities | The docs describe no fake-identity fixture. They note that staging and sandbox environments accept test proofs, which is why production must be pinned on the server. The PRD says Agent Pass proofs use fake identities (demo only); that statement is **not confirmed by the public docs**. | human-in-the-loop docs; PRD 6.2 |
| What the prize judges | See "Mumbai requirements" at the top: the official World ID Agent Pass (auth.world.org), a complete journey, a denied path, backend validation and a short debrief. **Old Cannes context, NOT the Mumbai requirement:** the Cannes 2026 World track "Best use of Agent Kit" asked for AgentKit to tell human-backed agents from bots, and said World ID or MiniKit alone did not qualify. That text was used before the Mumbai page was readable and does not apply here. | https://ethglobal.com/events/mumbai/prizes; old: https://ethglobal.com/events/cannes2026/prizes |

## Requirement checklist

Status key: DONE (built, with tests written; results not re-run, not seen in a browser), PARTLY, TODO (needs your credentials or a real device), UNVERIFIED (could not confirm from public sources).

| # | Requirement | Source | Status |
| --- | --- | --- | --- |
| 1 | OLD CANNES CONTEXT, not the Mumbai requirement: "Use AgentKit, not only World ID, to distinguish a human-backed agent from a bot" | Cannes 2026 track text | Optional extra. AgentKit is not the official Agent Pass product (see the correction); it only attributes the proposal. The proposer is an AgentKit agent wallet; the backend verifies its SIWE payload and an AgentBook lookup (`lib/agentpass/`). TODO: register the real wallet in AgentBook (needs World App + a verified human). |
| 2 | OLD CANNES CONTEXT (AgentKit framing), not the Mumbai requirement: agent registered or delegated by the campaigner | Task brief | PARTLY: `POST /api/campaigns/:id/agent` binds the AgentBook-registered wallet to one campaign (revocable with DELETE). AgentBook itself has no scoped delegation, and it cannot prove that the registering human is the campaigner (human ids are anonymous). |
| 3 | OLD CANNES CONTEXT (AgentKit framing), not the Mumbai requirement: AI proposes the split, proposals signed and attributed | PRD 6.2 | DONE: signed AgentKit payload bound to the split hash; stored and audited. The proposer is an LLM (default `claude-sonnet-5-5` via `lib/ai/llm.ts` when `ANTHROPIC_API_KEY` is set; with only `GEMINI_API_KEY` it is `gemini-3.5-flash-lite`), advisory only; the old proportional planner remains as the explicit `mode: "deterministic"` option and as the checked fallback. See "Claude-backed proposer" below. |
| 4 | Approver(s) complete a fresh World ID check; backend validates before escrow releases | PRD 6.2 | Built, not proven live: for the agent's split, World IdP step-up bound to user, campaign, split hash and proposal, consumed once. Tests exist against a local fake issuer only; needs real `WORLD_IDP_*` credentials and a real run. The escrow that would enforce the approval on-chain is not deployed. A split the approver built themselves still uses the IDKit proof. |
| 5 | Guardrail: agents never release payouts alone; high-value needs a fresh unique-human confirmation | PRD 4.8 | DONE: no agent code path writes payouts, approvals, attestations or proofs (guardrail tests); payouts only come from the on-chain event indexer; high-value campaign approval already needs `/attest`. |
| 6 | Failure path: denied or cancelled | PRD 6.2 | Test exists for the fake issuer (`access_denied` at the callback maps to `cancelled`: no token, audited, no state change). `unmet_authentication_requirements` maps to `not_eligible`. The real issuer's cancel and deny screens have not been seen. |
| 7 | Failure path: expired | PRD 6.2 | Tested with the fake issuer (expired attempt, ID token and step-up token; stale `auth_time`); the agent proposal's own 30 minute expiry is 410 `PROPOSAL_EXPIRED`. |
| 8 | Failure path: repeated or replayed proof | PRD 6.2 | Tested (409 `PROOF_REUSED`, token consumed in the approval's transaction; a concurrent double use approves once). The issuer's one-use code is exercised only against the fake. |
| 9 | Failure path: wrong approver, wrong human | Task brief | Wrong approver: 403 `WRONG_APPROVER` / `FORBIDDEN` (test exists). Wrong human: 403 `STEP_UP_WRONG_ACCOUNT` when the World ID is not the one linked to the account (test exists, fake issuer only); a token minted for another user, campaign, split or proposal gives 403 `STEP_UP_MISMATCH`. |
| 10 | Failure path: split changed after the agent proposed (hash mismatch) | Task brief | 409 `SPLIT_CHANGED`, refused both at `stepup/start` and at `/split` (test exists for `/split`). |
| 11 | Failure path: already released | Task brief | 409 `ALREADY_RELEASED` (test exists). |
| 12 | Each failure leaves the action undone and is logged, visible in the UI | Task brief | DONE: `AgentAudit` table, "Agent Pass activity" panel in the campaign desk and the bench |
| 13 | Agent Pass activity panel (what it proposed, who approved, proof status) | Task brief | DONE (`AgentPassPanel`, desk per campaign, bench across campaigns) |
| 14 | Short integration debrief | PRD 6.2 | Draft only: `docs/tracks/agent-pass-debrief.md`. Setup time, clarity score and run results are blank until a real run. |
| 15 | Demo shows the failure paths | PRD 6.2 | Script only: `docs/tracks/agent-pass-demo.md` is the full test list. The video uses the 30 s cut-down in `docs/DEMO_SCRIPT.md`. Not recorded. The video rule (2 to 4 minutes, hard cap 4:00) is owned by `docs/DEMO_SCRIPT.md`. |
| 16 | Agent Pass proofs use fake identities, demo only | PRD 6.2; prize page | UNVERIFIED for World IdP: the prize page says proofs are mocked and use fake identities and that no sandbox app is needed, while the public testing guide still describes a sandbox app and says nothing about mocks. Which issuer and which `acr` the mocked proofs produce is unknown until a real run. Separately, `AGENT_PASS_DEMO=1` uses a locally derived agent wallet and a fake human, labelled "demo". |
| 17 | Rate limits | Task brief | Documented only as the AgentKit free-trial counters; Clippo does not use x402 payment gating, so none apply. No Developer Portal rate limit is documented. |
| 18 | Mumbai prize page wording and judging criteria | https://ethglobal.com/events/mumbai/prizes | Read 2026-11-06 (see "Mumbai requirements" at the top). Re-read it before submitting in case it changed. |

## Claude-backed proposer (PRD 4.4, 4.8, 6)

`POST /api/campaigns/:id/split/propose` takes an optional body `{ "mode": "llm" | "deterministic" }` (default `llm`).

| Topic | Behaviour |
| --- | --- |
| Inputs to the model | Campaign story, pool rules (net pool in micro-USDC, share basis VIEWS or APPROVED_CLIPS, optional `perCreatorCapUsdc` from the story), and per eligible creator: approved clip count, views (max snapshot), verdict confidence and flags, clips with the disclosure present, message points hit, appeals (overturned, upheld, pending), human-decided clips. |
| Untrusted text | Titles, verdict notes and transcript excerpts sit between `<<<UNTRUSTED_CLIP_DATA_<nonce>` ... `UNTRUSTED_CLIP_DATA_<nonce>>>>` lines, sanitized with the verifier's `sanitizeUntrusted`; the system prompt carries the anti-injection rules (same pattern as `lib/ai/verifier.ts`). `detectInjection` also adds an `injection_suspected` flag. |
| Output | Strict JSON `{splits:[{creator,amountMicroUsdc,reason}], rationale, confidence, flags}`, parsed with zod. |
| Enforced in code (`enforceConstraints`, never trusting the model) | integer micro-USDC; creators must be eligible (approved, live clip); no negatives, no duplicates (case-insensitive); total <= net pool; each amount <= per-creator cap when configured; confidence in 0..1; amounts must round-trip exactly to units. Zero amounts are dropped (flag). |
| Rounding dust | If the model leaves fewer micro-USDC than there are creators unallocated, the dust goes to the largest share (ties: lowest wallet) unless the cap forbids it. Larger gaps stay unallocated and are flagged `pool_partly_unallocated`. |
| Fallback | Any violation, malformed JSON, provider error or timeout (45 s) returns the deterministic split (also cap-clamped) and writes an audit row `REFUSED / AI_REJECTED` with the code (`CONSTRAINT_VIOLATION`, `MALFORMED_JSON`, `LLM_ERROR`, `LLM_TIMEOUT`) and the violations; the proposal is stored with `meta.fallback`. |
| Stored | Per-creator `reason` inside `AgentProposal.splits[]`, plus `rationale` and new `meta` (source, model, confidence, flags, fallback). Signing and attribution are unchanged: the AgentKit payload is bound to the split hash. Reasons and rationale are NOT covered by the signature (the hash binds the amounts only). |
| Not configured | With neither `ANTHROPIC_API_KEY` nor `GEMINI_API_KEY` the `llm` mode returns 503 `NOT_CONFIGURED` (`resolveProvider` in `lib/ai/llm.ts`; Anthropic wins if both are set); there is no mock in production. `deterministic` mode works without a key and is labelled "Propose without AI" in the desk. |
| UI | `AgentPassPanel` (`ProposalReasons`) and the admin review in `AdminSplits` show source, model confidence, flags, any fallback reason and each creator's reason. |
| Guardrail | `lib/agentpass/llm-proposer.ts` is pure (LLM client injected, no db, chain, config, fetch, proofs, payout words); `guardrail.test.ts` covers it, and the existing check that agent code only writes `agentIdentity`, `agentProposal`, `agentAudit` still applies to the whole folder. Reasons are model-written text: approvers, not the model, decide. |
| Tests | `lib/agentpass/llm-proposer.test.ts` (LLM double: valid, over-pool, non-eligible, duplicates, negative/fractional, cap, malformed JSON, injection, error, timeout, dust) and DB tests in `agentpass.integration.test.ts` (stored reasons, audited fallback, 503 NOT_CONFIGURED). A live call to the model was not run. |

## World IdP step-up

Sources: `https://auth.world.org/docs/guides/` `oidc`, `step-up`, `id-token`, `testing`, `app-registration` (read 2026-11-06).

**Flow.** Approve the agent's split, `POST /api/agentpass/stepup/start`, the issuer's authorize page (code flow, S256 PKCE, `max_age=0`, essential `acr`), `GET /api/agentpass/stepup/callback`, back to the desk or bench with a short-lived token, `POST /api/campaigns/:id/split`, then `approveSplit` on-chain from the approver's wallet. The demo build (`NEXT_PUBLIC_DEMO=1`) never calls the issuer: it shows a fake outcome sheet instead. Never record failure paths (or anything) with it. Code: `web/src/lib/agentpass/stepup.ts`.

| Check | Where | Behaviour |
| --- | --- | --- |
| Attempt bound to session, account, campaign, split, proposal | start, callback | Saved in an encrypted httpOnly cookie. The hash is computed by the server. |
| `state`, then response `iss` | callback | Exact match before the code is redeemed. Error redirects get the same checks. |
| ID token | callback | RS256 through the discovered JWKS, `iss`, `aud` (one value), `exp`, `nonce`. |
| Freshness | callback | `auth_time` must fall inside this attempt (start time minus 30 s, up to now plus 30 s). The step-up token lives 5 minutes and never past 10 minutes after `auth_time`. An attempt itself lasts 10 minutes. |
| Assurance | callback | `acr` must be an accepted class and `amr` must contain `pop`. |
| Account | callback, split | Linked account: same `(iss, sub)`. Unlinked: first identity is linked in the approval's transaction, and only if no other account holds it. |
| One use | split | Consumed in the approval's transaction through `usedProof`. A second use gives 409 `PROOF_REUSED`. |
| Permissions | split | The route's existing checks run again at approval. |

**Agent path.** Without a token, `/split` refuses any split whose hash matches an open agent proposal, whether or not the client names it (403 `STEP_UP_REQUIRED`). Removing IDKit entirely would break "Build it myself", so that path keeps it.

**On-chain human.** `humanHash(sha256(iss|sub))`, not `humanHash(iss|sub)`: `humanHash` lowercases its input, and `sub` is case-sensitive.

**Known limits.**

- Unproven against the real issuer. Only the issuer's public discovery document was fetched (2026-11-06): it lists S256, `claims_parameter_supported`, `authorization_response_iss_parameter_supported` and the `orb` and `orb-face` classes, which matches what `stepup.ts` expects. No authorize, token or JWKS exchange has been done. The tests use a local fake issuer with real RS256 signing, which shows our validation and not that World IdP accepts our requests.
- A passkey on an Orb-class account passes (`amr` `pop user mfa`), as the docs define it; it is not a new Orb proof. To require a fresh proof with a face check, set `WORLD_IDP_ACR_VALUES=https://world.org/oidc/acr/orb-face`.
- The escrow's `SameHuman` check compares hashes only. If one person approves the same hash once by IDKit and once by step-up, the two hashes differ. The agent path requires step-up from both approvers, so this needs a split built by hand that later matches an agent proposal.
- Changing `WORLD_IDP_ISSUER` or moving to a new client sector changes the identity, so existing links stop matching.
- Campaign approval (`/attest`) is unchanged and still uses IDKit.
- On-chain enforcement is not deployed. In the repo, `ClippoEscrow.approveSplit` takes a one-time EIP-712 approval signed by `humanAttestor` (Clippo's backend wallet) over the campaign, the split hash, the approver and the human hash, and refuses the same human as both approvers (`SameHuman`). It does not read the IdP token: the contract trusts the backend's signature, so the backend validation above is the real gate. This is commit 498f649 and it is not deployed anywhere. The live site's `/api/chain/config` points at the older escrow `0xd8453c22996bea11598a3dbf05112675b945c39c` on Arc testnet; `docs/SUBMISSION_ARC.md` cites a different older one, `0xc7b9588ee0a4bff31e17ece1141ea404ad05e310`. Neither enforces this check.
- Nothing from this step-up has run on real Arc. The live site runs the old build, which does not contain the step-up routes (a request to `/api/agentpass/stepup/callback` there returned 404 on 2026-11-06). In a build that has them, missing `WORLD_IDP_*` values make `stepup/start` answer 503 `NOT_CONFIGURED`.
- World ID proofs for the prize are mocked fake identities, not for production (see row 16).
