# Clippo focus guide

Keep us on track until the deadline: **Sat 2026-11-07 09:00 IST**. Read this before starting any task. Update it when a decision changes. The step-by-step history lives in `docs/BUILD_LOG.md`; this file is the plan and the rules. Last reviewed: 2026-11-07, after PR #2 (CRE work and the teammate's World step-up) was merged into `main` (`ab35b35`).

## The one rule

A partner must sit in the **core** of Clippo. If we remove it, a real user must lose something the core loop depends on.

Before you build anything, answer these three questions. If any answer is "no", do not build it.

1. Which partner does this serve: **Chainlink CRE**, **World**, or **Arc**?
2. If that partner is removed, does the product change for a user, not just a label on a page?
3. Would a plain replacement (cron job, Postgres, phone check, another chain) do the same job with no user loss?

If the answer to 3 is "yes", the work is an add-on. Skip it, or cut it down to the part that has no plain replacement.

## The three partners (3 picks on the form, nothing else)

All tracks of one partner count as one pick. Do not add a fourth partner.

| Partner | Track we target | What makes it core | Where it stands (2026-11-07) | Read |
| --- | --- | --- | --- | --- |
| Chainlink | Best workflow with CRE ($1,500) | The escrow credits views only from the receiver the CRE workflow reports through, and the nodes read the views from YouTube themselves. The app shows Confirmed views with a proof link. | Built. Simulated with the CRE CLI on real Arc, reading the real YouTube video (tx `0xa41f91da…c8409`, 3 views). Not deployed on the CRE network, one node, our wallet sends the report. Not locked. | `docs/tracks/CRE.md` |
| World | Best Use of IDKit ($2,500); related: Agent Pass ($5,000) | The escrow credits only wallets linked to a unique human, and an unverified account cannot post. | Built and tested with doubles. IDKit has not run live: no real proof, `WORLD_ID_*` unset on the deployed site, debrief not filled. The step-up (Agent Pass) has never run against the real issuer. | `docs/tracks/WORLD_IDKIT.md` |
| Arc | Best Smart Contracts with Advanced Stablecoin Logic, In Arc Studio ($3,000) | The escrow holds USDC and pays gas in USDC on Arc. | Contracts, frontend and backend are real; the enforcing escrow is deployed on Arc testnet (simulation mode). Crosschain not built. **Arc Studio was not used by us**, and the prize requires it. | `docs/SUBMISSION_ARC.md` |

Prize text and requirements: https://ethglobal.com/events/mumbai/prizes (re-read it before submitting; partners can change it).

## What we may say today, and what we may not

| We may say | We may NOT say |
| --- | --- |
| The enforcing escrow and the receiver are deployed on Arc testnet (`0x1e05…26Ef`, `0x6b0f…C0cd`), and 114 Foundry tests pass. | That the receiver is locked, or that the contracts were built or deployed in Arc Studio. |
| The CRE workflow ran with `cre workflow simulate --broadcast` on real Arc, read the real YouTube video, and the escrow credited 3 views (0.03 USDC). | That the workflow is deployed on the CRE network, that Chainlink nodes signed the report, or that consensus ran across nodes. |
| The deployed site (`clippo-cre.vercel.app`, built from `main`) shows those 3 Confirmed views with a proof link to the real transaction. | That the records behind it are organic: the user, channel, campaign and clip are seeded and labelled `[SEED]`. |
| IDKit is integrated and tested with test doubles; the credential and the failure paths are documented. | That any World proof has run in this repo, or that IDKit works against the real portal. |
| The step-up is written and tested against a local fake issuer. | That it works against the real `auth.world.org`. |
| Prize World proofs are mocked fake identities (World says so). | That a proof is production-grade. |
| The demo creator's human registration was signed by our attestor wallet as a stand-in. | That the creator passed a World ID check. |

Rules: never claim something works unless it was run. Never invent tx hashes. Record real hashes in `docs/BUILD_LOG.md` the moment they exist.

## What is done and what is open

Done (see the build log for evidence):
- [x] Enforcing escrow deployed on Arc testnet, one campaign created and approved, demo wallet registered as a human (stand-in).
- [x] CRE workflow v2 built, tested (26 tests), compiled, simulated on a local fork and on real Arc with the real YouTube API.
- [x] Backend: confirmed-views table, indexer, manifest route, wallet-bound channel codes. Frontend: Confirmed and Pending views.
- [x] Deployed site on its own Vercel project and database, from `main`.
- [x] Docs corrected and aligned with the code; architecture diagram redrawn.

Open, in the order that matters for the submission:
1. **Arc Studio.** Decide how to meet the requirement honestly: open the Studio URL on file and see what it holds, or import the current contract into Studio and share the project, and show Studio in the video. Until then say plainly that we did not use it. (`docs/tracks/ARC.md`)
2. **IDKit live run.** Set `WORLD_ID_*` on the deployed site (needs the Developer Portal app that exists), run one real proof and one failure path, then fill the debrief with real numbers. (`docs/tracks/WORLD_IDKIT.md`)
3. **CRE deploy access.** Run `cre account access` and report the result. Deploy is optional for the prize; without it the immutable layer (pin the workflow, lock the receiver) stays undone.
4. **Record the video.** Under 4:00, at least 720p, your own voice, not sped up. The CRE segment is the three-screen demo: terminal, explorer, site. (`docs/DEMO_SCRIPT.md`)
5. **Submit before 09:00 IST** with a buffer of at least one hour.

After the merge, the next work is UI. Start a new branch from `main`.

## Prize requirements checklist

Tick only when it exists and was run. Detailed status is in each track document.

**Chainlink CRE**
- [x] A CRE workflow that links a blockchain with an external API (YouTube)
- [x] A successful CLI simulation (real Arc tx `0xa41f91da…c8409`)
- [x] The workflow is meaningfully used by the project (the escrow credits views only through it)
- [ ] Live deployment on the CRE network (optional; deploy access not enabled)

**World IDKit**
- [x] IDKit in the app (tested with doubles)
- [x] Result verified on the server, and the wallet linked on-chain (tested with doubles)
- [x] A written trust moment and why the credential is enough
- [ ] One success and one alternative path, run live
- [ ] Short debrief with real numbers

**Arc (smart contracts track)**
- [x] Working frontend and backend, plus an architecture diagram
- [x] The submission names the exact bounty
- [ ] Shareable Arc Studio project URL that judges can open, and Studio shown in the demo
- [ ] Video and presentation (not recorded)
- [x] Repo link: https://github.com/Tan0610/Clippo_EthMumbai

**Everyone**
- [x] Public repo with small commits
- [x] What existed before the event is written down (README, "project history")
- [x] Where AI tools were used is written down (README)
- [ ] Video 2 to 4 minutes

## Traps to avoid

- **Fraud flags:** `web/src/lib/antifraud/flags.ts` confirms flags of two kinds, `VIEW_ANOMALY` and `CLIP_DELETED`. If you add a ban, ban only on `VIEW_ANOMALY`, or a creator who deletes a clip gets banned.
- **New CRE data route:** if you add a route that CRE reads, apply the same filters as `web/src/lib/clip-manifest.ts`: approved campaign, PerView or PoolShare, clip still live, verdict approve, wallet-bound channel code, and no open `VIEW_ANOMALY` flag. A route that skips them bypasses the rules.
- **Old escrow addresses:** two older-design escrows exist on Arc testnet (`0xd845…c39c`, `0xc7b9…e310`). Neither is the current escrow. Do not quote them as "the" deployed contract.
- **Single-node simulator:** CRE simulation has no real consensus, and the report comes from our own wallet. Say that; do not claim a trust gain you did not show.
- **Seeded records:** the deployed demo site holds `[SEED]` rows on purpose. Say so wherever you show it.
- **Do not mix World proof versions.** Pick one and keep it.
- **No LICENSE file** is tracked. The owner must choose a license; do not add one without asking.

## Rejected on purpose (do not spend time here)

- Uniswap, ENS, 0G, Hedera, Whitechain, 1inch, Arkiv, Definitive, EF tracks, CCIP: each would sit beside the core loop, and a plain replacement does the same job.
- Arc DeFi, consumer-agent and Bridge Kit tracks: they would mean reframing Clippo. Arc Studio Continuity is the fallback if the smart-contracts track cannot be met.

## Open decisions for the owner

1. Arc Studio: what does the Studio URL on file contain, and do we import the current contract into Studio?
2. License for the repo.
3. Who owns each file when two sessions work at once (one session per file group avoids overwrites).
