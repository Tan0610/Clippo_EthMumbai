# Arc submission: Clippo

**Bounty:** Best Smart Contracts with Advanced Stablecoin Logic, In Arc Studio ($3,000).

**Submission contract:** `ClippoEscrow`, **built and deployed in Arc Studio**, on Arc testnet at `0xc7b9588ee0a4bff31e17ece1141ea404ad05e310`.
**Arc Studio project (make public with Share):** https://studio.arc.io/app/34ef3b95-32bd-48f9-9310-b8135e1d92ce

**One-liner:** Clippo is a clipping-campaign marketplace. Sponsors lock USDC in `ClippoEscrow` on Arc. The contract credits creators by views, holds each per-view credit for a retention window before it can be claimed, splits pools across many creators, and refunds the unspent rest — advanced, multi-step USDC settlement.

> Note: the public site `clippo-cre.vercel.app` runs a later, hardened version of this escrow. **This Arc submission is solely about the Arc Studio-built contract `0xc7b9588`.** To demo it, run the app with `ESCROW_ADDRESS=0xc7b9588…` (already set in `web/.env.local`).

## What they asked → what `ClippoEscrow` (0xc7b9588) does

Contract: `contracts/src/ClippoEscrow.sol` (3-arg constructor version). Tests: `contracts/test/ClippoEscrow.t.sol`.

| # | What they asked | What this contract does | Status |
| --- | --- | --- | --- |
| 1 | Conditional escrow with onchain dispute and automatic release | Funds lock at `createCampaign`; nothing is credited or claimable until an admin `approveCampaign`. `rejectCampaign` and post-deadline `closeCampaign` refund. Per-view credits sit in time tranches and **release automatically** once the retention window passes — no second approval needed. | **Met** (conditional + automatic release). No explicit dispute function in this version. |
| 2 | Programmable payroll or vesting in USDC | Pay-per-view: each creator is credited `delta × ratePer1kViews / 1000`, capped by the pool. Credits unlock only after a **retention window** (0–30 days, default 7, fixed per campaign). USDC only. | **Partly** — a time-lock on earned credits (not a cliff/linear vesting schedule). |
| 3 | Treasury management and payment splitting | **HumanSplit** (campaigner lists creators + amounts; two-party approval; a `bytes32` **World ID attestation** required on high-value) and **PoolShare** (views → weights, pro-rata at `closeCampaign`). Two-sided fees ≤ 50 bps, snapshotted per campaign; `withdrawFees` pays the treasury. | **Met** for splits; fee accounting for treasury. |
| 4 | Software-to-software payments | `reportViews` can only be called by a configured `reportAdapter` (a contract/service, e.g. a Chainlink CRE receiver), never a human — one service credits creators programmatically. | **Partly** — adapter pattern. |
| 5 | Crosschain conditional transfer (Circle Forwarder) | Not built. | **Not built** |
| 6 | Bonus: reusable by other builders | Standalone Solidity on OpenZeppelin v5, custom errors + events, exported ABI (`contracts/abi/`), Foundry tests. Constructor: token, treasury, owner; the report adapter is any contract, set once. | **Partly** |

## Qualification requirements

| | Requirement | Status |
| --- | --- | --- |
| (a) | Built in Arc Studio + shareable Studio URL, shown in the demo | **Met.** `ClippoEscrow` was imported, compiled and **deployed to Arc testnet from Arc Studio** (project URL above → `0xc7b9588`). Show the Studio project in the video. |
| (b) | Functional MVP (frontend + backend) + architecture diagram | **Frontend + backend: built.** The Next.js app wires to the escrow via `web/src/lib/chain/client.ts` (wallet sends the tx; the API verifies the receipt on-chain), and `/api/chain/config` reads **live fees from `0xc7b9588`**. **Diagram:** `docs/architecture.svg`. **Not yet run:** a full campaign fund→approve→claim through the UI against `0xc7b9588` on Arc — do one live run for the strongest evidence (the logic is covered by Foundry tests + the local E2E suite). |
| (c) | Video + presentation (core functions + Arc Studio + Circle tools) | **To record** (≤ 4:00). Outline: Studio project + deploy → app funds/approves against `0xc7b9588` → txs on `explorer.testnet.arc.io`; narrate USDC as escrow + gas token. |
| (d) | GitHub/Replit repo link | **Met:** https://github.com/Tan0610/Clippo_EthMumbai |

**Constructor:** `(usdc 0x3600…0000, treasury 0x6c94…354e, owner/admin 0x48c54…09bD)`.
**Circle + Arc tools used:** USDC as the escrow token and as Arc's gas token (fees paid in USDC), Arc testnet RPC + explorer, the Circle faucet. Not used: CCTP, Gateway, Circle Forwarder, EURC.

## Before submitting
1. **Make the Studio URL public** (Share → anyone with the link).
2. **Run one live campaign against `0xc7b9588`** via the local app (it's already wired) so requirement (b) has a real on-chain tx — otherwise state it as tested-in-Foundry only.
3. **Export** `docs/architecture.svg` to PNG for the form.
4. **Record** the ≤4-min video showing Arc Studio + the flow.
