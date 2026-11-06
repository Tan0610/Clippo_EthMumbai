# World Agent Pass: demo clicks

Status: a script only. It has not been recorded. The step-up path (auth.world.org) has never been run in a browser, and the checks below
describe what the code does, not what a run showed.

This file is the full test list, far longer than the video. The submission video gives Agent Pass 30 s and uses the cut-down version in `docs/DEMO_SCRIPT.md`
(which also owns the video rule: 2 to 4 minutes, hard cap 4:00). Pick the few rows to film from there, not from here.

## Setup

Two builds behave differently:

- **Real step-up build** (no `NEXT_PUBLIC_DEMO`): needs `WORLD_IDP_CLIENT_ID`, `WORLD_IDP_CLIENT_SECRET`, `WORLD_IDP_REDIRECT_URI` (HTTPS, exactly the callback
  registered in the auth.world.org portal, `<site>/api/agentpass/stepup/callback`), and `SESSION_SECRET` of at least 32 characters in production. Optional:
  `WORLD_IDP_ISSUER`, `WORLD_IDP_TOKEN_AUTH_METHOD`, `WORLD_IDP_ACR_VALUES`. Without them `POST /api/agentpass/stepup/start` answers 503 NOT_CONFIGURED and nothing changes.
  Open the app on the same origin as the redirect URI. A local run needs an HTTPS tunnel.
- **Demo build** (`NEXT_PUBLIC_DEMO=1`): approving shows a local sheet with fake outcomes ("Verify as a unique human", Cancel, "Let it expire",
  "Reuse an old proof"). It never calls the issuer, so it does not show the Agent Pass step-up. Do not present it as one. Never record with `NEXT_PUBLIC_DEMO=1` (rule in `docs/DEMO_SCRIPT.md`).

The agent: set `AGENT_PASS_PRIVATE_KEY` and register its address (`npx @worldcoin/agentkit-cli register <address>`, not done yet), or for a
screen-only run set `AGENT_PASS_DEMO=1` (fake human, labelled "demo"). The AI proposer needs `ANTHROPIC_API_KEY` or `GEMINI_API_KEY`.

On-chain: the desk then asks the approver's wallet to send `approveSplit`. The contract that enforces the approval (commit 498f649) is not deployed. The live site's
escrow (`0xd8453c22996bea11598a3dbf05112675b945c39c`, per `/api/chain/config`) is an older design. The on-chain step is not proven on real Arc.

Prepare: an APPROVED human-split campaign (payout mode HUMAN_SPLIT) with the approver set to "me and admin" and at least one approved, live clip whose creator
has verified with World ID. Open the campaign desk as the campaigner (and the bench as an admin in a second window).

## Happy path

1. Desk, campaign row: click **Ask the AI to propose** (needs an AI key; without one you get 503 NOT_CONFIGURED, and **Propose without AI (pro rata by clips)** is the non-AI option). The agent is delegated (AgentBook check) and proposes. A message says nothing is payable yet.
2. Scroll to **Agent Pass activity**: the agent, the proposal (hash, creators, total), the AI's rationale, confidence, flags and a one-line reason per creator, and audit rows "Agent delegated", "Agent proposed".
3. Click **Approve agent's split (1 of 2)**. The browser leaves for auth.world.org (code flow, S256 PKCE, `max_age=0`, essential `acr`). Complete the check there. You return to the desk with "World ID check passed. Confirm the approval in your wallet." Log row "Human approved", proof valid. Status: awaiting admin.
4. Bench, tab **Splits to approve**: click **Review the agent's split (admin)**, then **Approve this split with World ID**, and complete your own check as the admin. Status: both approved, awaiting chain. The panel shows both approvals.

The first approval links the approver's World ID subject to their Clippo account. Later approvals must return the same one.

## Failure paths (each one leaves the split undone; show the audit log after each)

Use a fresh proposal for each (click **Ask the AI again**). Messages are from `stepup-client.ts` and the routes; each ends "Nothing was changed."

| Path | What you do | Expected message and log row |
| --- | --- | --- |
| AI proposal rejected | Run the unit test `llm-proposer.test.ts` (over-pool, non-eligible, duplicates) or point the key at a failing model | Proposal source shows the non-AI split with the rejection reason. Log: "AI proposal rejected, non-AI split used" with the violation |
| Denied or cancelled | At auth.world.org, decline or cancel (the issuer sends `error=access_denied`) | "Split not approved. You cancelled the World ID check." Log: Check cancelled, proof cancelled. No token is issued |
| Expired check | Leave the issuer page open for over 10 minutes (the attempt lifetime in `stepup.ts`; the issuer's own timeout has not been seen), then finish | "The World ID check expired before it finished. Start again." Log: Check expired |
| Wrong human | Finish the check with a World ID that is not the one already linked to your account, or one another account already uses | 403 STEP_UP_WRONG_ACCOUNT: "That World ID does not match this Clippo account, or another account already uses it." Log: Wrong approver |
| Not enough assurance | Finish with an account whose `acr` is not in the accepted list (orb, orb-face by default) | 403 STEP_UP_NOT_ELIGIBLE: "...does not have the verification this approval requires." Log: Proof rejected |
| Repeated token | After one approval, send `POST /api/campaigns/:id/split` again with the same `stepUpToken` (curl or devtools; the browser removes it from the URL) | A straight replay is stopped first by ALREADY_RELEASED or ALREADY_APPROVED (409). PROOF_REUSED (409 "That World ID check was already used.", log: Proof reused) only shows when those checks do not apply, so it is hard to stage on screen |
| Expired proposal | Wait 30 minutes after the agent proposes (or set `expiresAt` in the DB), then approve | 410 "The agent's proposal expired". Log: Proposal expired. The Approve button disappears; ask again |
| Wrong approver | As the admin on a campaign set to "campaigner only", or as a different campaigner, call `POST /api/agentpass/stepup/start` or `POST /api/campaigns/:id/split` | 403 Wrong approver (or "Not your campaign"). Log: Wrong approver |
| Split changed | Call `POST /api/campaigns/:id/split` (or `stepup/start`) with the agent's `agentProposalId` but one amount edited | 409 "not what the agent proposed (hash mismatch)". Log: Split changed. A token minted for the original split, sent with other amounts and no proposal id, gives 403 STEP_UP_MISMATCH (log: Proof rejected) |
| Already released | After both approvals, click approve again or repeat the request | 409 "already approved by everyone". Log: Already released |
| Issuer down | Only if the issuer or JWKS is unreachable | 503 STEP_UP_UNAVAILABLE: "World ID is temporarily unavailable. This is not a verdict on the check." Do not stage this |

The demo build does not show the step-up or most of the failure rows above. Against a real backend, an agent's split sent with the fake sheet's proof is refused with 403 STEP_UP_REQUIRED. With no backend and no escrow, the approval returns a canned "recorded, awaiting admin" result whatever the sheet outcome. Only the sheet's own Cancel ends in a refusal. Use the real step-up build for the failure rows, never the demo build, and never record them with `NEXT_PUBLIC_DEMO=1`. Not verified in a browser.

After each failure show: the activity panel row, `GET /api/campaigns/:id/split` has no new approval, `GET /api/creator/earnings` shows no new payout.

## Guardrail talking point

Show `src/lib/agents/guardrail.test.ts` (Agent Pass block): the agent module is pure, agent routes can only write the agent tables, and the split route
checks and consumes a World ID proof (its test pins the IDKit path order) before it creates an approval. The step-up token is single use through
`usedProof` (see `stepup.integration.test.ts`). Payouts only come from the escrow's on-chain event.
