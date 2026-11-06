# World, Agent Pass: research and requirement checklist

Prize: $5,000 across three places (ETHGlobal Mumbai). Researched 2026-10-28.

## Correction (2026-11-06): the prize product is World IdP

The earlier research below treated "Agent Pass" as AgentKit. That was wrong for the human gate: the prize's official docs are https://auth.world.org/docs, an OIDC issuer called **World IdP**. Clippo now uses it as the human gate on the agent's split. AgentKit remains in use only to attribute the proposal to a registered agent wallet.

**Current status: built and tested against a local fake issuer. Unproven against the real issuer until `WORLD_IDP_*` credentials are set and a real run is completed.** See "World IdP step-up" at the end.

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
| What the prize judges | **Not retrievable.** `ethglobal.com/events/mumbai2026/prizes` returned 404 and search found no Mumbai page. The closest published text is the Cannes 2026 World track "Best use of Agent Kit": apps that use AgentKit where World ID improves safety, fairness or trust; submissions must integrate AgentKit to meaningfully distinguish human-backed agents from bots; World ID or MiniKit alone do not qualify. The PRD adds: official integration, complete journey with a denied path, backend validation, short integration debrief. | https://ethglobal.com/events/cannes2026/prizes; PRD 6.2 |

## Requirement checklist

Status key: DONE (built and tested), PARTLY, TODO (needs your credentials or a real device), UNVERIFIED (could not confirm from public sources).

| # | Requirement | Source | Status |
| --- | --- | --- | --- |
| 1 | Use AgentKit, not only World ID, to distinguish a human-backed agent from a bot | Cannes track text (Mumbai page unreadable) | DONE in code: the proposer is an AgentKit agent wallet; the backend verifies its SIWE payload and an AgentBook lookup (`lib/agentpass/`). TODO: register the real wallet in AgentBook (needs World App + a verified human). |
| 2 | Agent registered or delegated by the campaigner | Task brief | PARTLY: `POST /api/campaigns/:id/agent` binds the AgentBook-registered wallet to one campaign (revocable with DELETE). AgentBook itself has no scoped delegation, and it cannot prove that the registering human is the campaigner (human ids are anonymous). |
| 3 | AI proposes the split; proposals signed and attributed | PRD 6.2 | DONE: signed AgentKit payload bound to the split hash; stored and audited. The proposer is Claude (`claude-sonnet-5-5` via `lib/ai/llm.ts`), advisory only; the old proportional planner remains as the explicit `mode: "deterministic"` option and as the checked fallback. See "Claude-backed proposer" below. |
| 4 | Approver(s) complete a fresh World ID check; backend validates before escrow releases | PRD 6.2 | Built, not proven live: for the agent's split, World IdP step-up bound to user, campaign, split hash and proposal, consumed once. Tested against a local fake issuer only; needs real `WORLD_IDP_*` credentials and a real run. A split the approver built themselves still uses the IDKit proof. |
| 5 | Guardrail: agents never release payouts alone; high-value needs a fresh unique-human confirmation | PRD 4.8 | DONE: no agent code path writes payouts, approvals, attestations or proofs (guardrail tests); payouts only come from the on-chain event indexer; high-value campaign approval already needs `/attest`. |
| 6 | Failure path: cancelled | PRD 6.2 | Tested with the fake issuer (`access_denied` at the callback: no token, audited). Real cancel screen not yet run. |
| 7 | Failure path: expired | PRD 6.2 | Tested with the fake issuer (expired attempt, ID token and step-up token; stale `auth_time`); the agent proposal's own 30 minute expiry is 410 `PROPOSAL_EXPIRED`. |
| 8 | Failure path: repeated or replayed proof | PRD 6.2 | Tested (409 `PROOF_REUSED`, token consumed in the approval's transaction; a concurrent double use approves once). The issuer's one-use code is exercised only against the fake. |
| 9 | Failure path: wrong approver | Task brief | DONE (403 `WRONG_APPROVER` / `FORBIDDEN`) |
| 10 | Failure path: split changed after the agent proposed (hash mismatch) | Task brief | DONE (409 `SPLIT_CHANGED`) |
| 11 | Failure path: already released | Task brief | DONE (409 `ALREADY_RELEASED`) |
| 12 | Each failure leaves the action undone and is logged, visible in the UI | Task brief | DONE: `AgentAudit` table, "Agent Pass activity" panel in the campaign desk and the bench |
| 13 | Agent Pass activity panel (what it proposed, who approved, proof status) | Task brief | DONE (`AgentPassPanel`, desk per campaign, bench across campaigns) |
| 14 | Short integration debrief | PRD 6.2 | DONE as a draft: `docs/tracks/agent-pass-debrief.md`. Fill in the setup time and clarity score after you register the agent. |
| 15 | Demo shows the failure paths | PRD 6.2 | DONE as a script: `docs/tracks/agent-pass-demo.md`. Needs a recorded run. |
| 16 | Agent Pass proofs use fake identities, demo only | PRD 6.2; prize page | UNVERIFIED for World IdP: the prize page says proofs are mocked and use fake identities and that no sandbox app is needed, while the public testing guide still describes a sandbox app and says nothing about mocks. Which issuer and which `acr` the mocked proofs produce is unknown until a real run. Separately, `AGENT_PASS_DEMO=1` uses a locally derived agent wallet and a fake human, labelled "demo". |
| 17 | Rate limits | Task brief | Documented only as the AgentKit free-trial counters; Clippo does not use x402 payment gating, so none apply. No Developer Portal rate limit is documented. |
| 18 | Mumbai prize page wording and judging criteria | Task brief | UNVERIFIED (page unreachable). Re-read it before submitting. |

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
| Not configured | Without `ANTHROPIC_API_KEY` the `llm` mode returns 503 `NOT_CONFIGURED`; there is no mock in production. `deterministic` mode works without a key and is labelled "Propose without AI" in the desk. |
| UI | `AgentPassPanel` (`ProposalReasons`) and the admin review in `AdminSplits` show source, model confidence, flags, any fallback reason and each creator's reason. |
| Guardrail | `lib/agentpass/llm-proposer.ts` is pure (LLM client injected, no db, chain, config, fetch, proofs, payout words); `guardrail.test.ts` covers it, and the existing check that agent code only writes `agentIdentity`, `agentProposal`, `agentAudit` still applies to the whole folder. Reasons are model-written text: approvers, not the model, decide. |
| Tests | `lib/agentpass/llm-proposer.test.ts` (LLM double: valid, over-pool, non-eligible, duplicates, negative/fractional, cap, malformed JSON, injection, error, timeout, dust) and DB tests in `agentpass.integration.test.ts` (stored reasons, audited fallback, 503 NOT_CONFIGURED). A live call to Claude was not run. |

## World IdP step-up

Sources: `https://auth.world.org/docs/guides/` `oidc`, `step-up`, `id-token`, `testing`, `app-registration` (read 2026-11-06).

**Flow.** Approve the agent's split, `POST /api/agentpass/stepup/start`, the issuer's authorize page (code flow, S256 PKCE, `max_age=0`, essential `acr`), `GET /api/agentpass/stepup/callback`, back to the desk or bench with a short-lived token, `POST /api/campaigns/:id/split`, then `approveSplit` on-chain from the approver's wallet. Code: `web/src/lib/agentpass/stepup.ts`.

| Check | Where | Behaviour |
| --- | --- | --- |
| Attempt bound to session, account, campaign, split, proposal | start, callback | Saved in an encrypted httpOnly cookie. The hash is computed by the server. |
| `state`, then response `iss` | callback | Exact match before the code is redeemed. Error redirects get the same checks. |
| ID token | callback | RS256 through the discovered JWKS, `iss`, `aud` (one value), `exp`, `nonce`. |
| Freshness | callback | `auth_time` must fall inside this attempt (start time minus 30 s, up to now plus 30 s). The token also expires at most 10 minutes after `auth_time`. |
| Assurance | callback | `acr` must be an accepted class and `amr` must contain `pop`. |
| Account | callback, split | Linked account: same `(iss, sub)`. Unlinked: first identity is linked in the approval's transaction, and only if no other account holds it. |
| One use | split | Consumed in the approval's transaction through `usedProof`. |
| Permissions | split | The route's existing checks run again at approval. |

**Agent path.** Without a token, `/split` refuses any split whose hash matches an open agent proposal, whether or not the client names it (403 `STEP_UP_REQUIRED`). Removing IDKit entirely would break "Build it myself", so that path keeps it.

**On-chain human.** `humanHash(sha256(iss|sub))`, not `humanHash(iss|sub)`: `humanHash` lowercases its input, and `sub` is case-sensitive.

**Known limits.**

- Unproven against the real issuer. The tests use a local fake issuer with real RS256 signing, which shows our validation and not that World IdP accepts our requests.
- A passkey on an Orb-class account passes (`amr` `pop user mfa`), as the docs define it; it is not a new Orb proof. To require a fresh proof with a face check, set `WORLD_IDP_ACR_VALUES=https://world.org/oidc/acr/orb-face`.
- The escrow's `SameHuman` check compares hashes only. If one person approves the same hash once by IDKit and once by step-up, the two hashes differ. The agent path requires step-up from both approvers, so this needs a split built by hand that later matches an agent proposal.
- Changing `WORLD_IDP_ISSUER` or moving to a new client sector changes the identity, so existing links stop matching.
- Campaign approval (`/attest`) is unchanged and still uses IDKit.

