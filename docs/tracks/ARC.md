# Arc track: Best Smart Contracts with Advanced Stablecoin Logic, In Arc Studio

Researched 2026-10-28, prize page re-read 2026-11-06 (https://ethglobal.com/events/mumbai/prizes). Prize $3,000. Status key: DONE (in repo), MANUAL (user must do), UNVERIFIED.

## Current state (checked 2026-11-06 against the code at HEAD)
- Bounty entered: "Best Smart Contracts with Advanced Stablecoin Logic, In Arc Studio", $3,000. The Mumbai prize page says every Arc prize requires Arc Studio, a shareable Studio project URL, and Studio shown in the demo.
- Arc Studio: not used yet. No Arc Studio project exists and there is no Studio project URL. `ClippoEscrow.sol` was written and tested in Foundry, not in Studio. This is an open item (see row 7).
- Deployed on Arc testnet: two escrows with code, both the OLD design (before commit 498f649). `0xd8453c22996bea11598a3dbf05112675b945c39c` is the one the live site (`clippo-six.vercel.app/api/chain/config`) points to. `0xc7b9588ee0a4bff31e17ece1141ea404ad05e310` is an earlier deploy that older versions of `docs/SUBMISSION_ARC.md` cited.
- The NEW enforcing escrow (World ID and CRE enforced in the contract, disputes, `claimFor`, `humanAttestor`) is not deployed anywhere. Nothing from it has run on real Arc. The live site runs the old build.
- Circle and Arc tools actually used in code: USDC as the escrow token (6-decimal ERC-20 interface, guarded in the constructor), Arc testnet RPC, Circle faucet link. CCTP, Gateway, Circle Wallets and Paymaster are not used anywhere in the code.

## Sources
- Arc docs index: https://docs.arc.io/llms.txt
- Connect to Arc: https://docs.arc.io/integrate/connect-to-arc and https://docs.arc.io/arc/references/rpc-endpoints.md
- Contract addresses: https://docs.arc.io/arc/references/contract-addresses
- Arc Studio: https://docs.arc.io/ai/arc-studio.md and CLI https://docs.arc.io/ai/arc-studio-cli.md
- ETHGlobal Mumbai prizes (Arc section, read 2026-11-06): https://ethglobal.com/events/mumbai/prizes
- ETHGlobal Cannes 2026 Arc prize (earlier event, same track idea): https://ethglobal.com/events/cannes2026/prizes/arc
- Arc winners blog (judging wording): https://www.arc.io/blog/meet-the-arc-track-winners-from-ethglobal-cannes-hackathon-and-what-we-learned

## Network facts (official docs.arc.io)
| Item | Value |
| --- | --- |
| Chain ID | 5042002 |
| Primary RPC | https://rpc.testnet.arc.io per the Arc docs (WS wss://rpc.testnet.arc.io). The older host rpc.testnet.arc.network also answers (docs.arc.network 301-redirects to docs.arc.io). A read-only `eth_chainId` call on 2026-11-06 returned 0x4cef52 (5042002) from both hosts. In this repo: `.io` is the default in `scripts/deploy-arc.mjs` and `web/src/lib/chain/config.ts`. `.network` is in `web/src/components/wallet.ts`, `cre/project.yaml` and `contracts/README.md`. Alternates: rpc.blockdaemon / rpc.drpc / rpc.quicknode .testnet.arc.io |
| Explorer | https://explorer.testnet.arc.io (older: testnet.arcscan.app). Gas tracker at /gas-tracker |
| Faucet | https://faucet.circle.com (Studio also has a built-in faucet). Third-party report: 20 USDC per 2 h per address, UNVERIFIED |
| USDC | 0x3600000000000000000000000000000000000000 (testnet and mainnet) |
| EURC (testnet) | 0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a |
| Decimals | Native gas balance 18 decimals; ERC-20 interface 6 decimals. Same balance, show one USDC row. Use only the ERC-20 interface (6) for transfers and balances |
| CCTP | domain 26; TokenMessengerV2 0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA; MessageTransmitterV2 0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275 |
| Gateway | GatewayWallet 0x0077777d7EBA4688BDeF3E311b846F25870A19B9; GatewayMinter 0x0022222ABE238Cc2C7Bb1f21003F0a260052475B |

Gas semantics: fees are paid in USDC, so a campaigner or creator needs only USDC. One faucet drop covers both campaign funding and gas.

## Arc Studio
- Web app: https://studio.arc.io/ (docs describe no login flow; expect an account or wallet sign-in, UNVERIFIED).
- Prompt to full-stack app: plans, generates, compiles and deploys Solidity to Arc testnet only (never mainnet), live sandbox with real testnet transactions, chat refinement, built-in faucet, wallet connect.
- Export: "Push to GitHub". CLI `@circle-fin/arc-studio-cli` (`npm i -g`, Node 20+): `arc-studio login`, `arc-studio run "<prompt>" --file src/X.sol` (uploads existing code as context; this is the import path), `arc-studio pull --out ./onchain --paths "contracts/**"` (export), `arc-studio deployments`, `arc-studio clone <public github repo>`.
- No documented "import project" button; the supported import is `--file` context or `clone`. Web UI import UNVERIFIED.
- Studio warns generated code must be reviewed before use.

## Prize requirements checklist
Requirements below come from the Mumbai prize page (https://ethglobal.com/events/mumbai/prizes, read 2026-11-06). Event dates reported as Nov 5-7 2026 (third-party).

| # | Requirement | Source | Status |
| --- | --- | --- | --- |
| 1 | Contracts on Arc using USDC/EURC beyond simple transfers (conditional escrow with dispute, payroll/vesting, payment splitting, crosschain conditional transfers) | Mumbai prize page | DONE in code: ClippoEscrow, three modes, fee split, refunds, retention, World ID linked wallets, HumanSplit attestations, disputes, claimFor. The code is the new enforcing design; it is not deployed (see Current state) |
| 2 | Functional MVP, working frontend and backend | Mumbai prize page | Web and API exist. The new escrow is not deployed and the live site runs the old build against the old escrow. Funding to claim on the new contract: not run on real Arc. To do: deploy it and set ESCROW_ADDRESS (MANUAL) |
| 3 | Architecture diagram | Mumbai prize page | `docs/architecture.svg` exists. Its Arc Studio banner and subtitle say the Studio project is not created yet and the contract was written and tested in Foundry. The flow caption mentions CRE reports, claim/claimFor and "Not yet run on real Arc". Known gap: the diagram does not show the `humanAttestor` / World ID registration or disputes. MANUAL/TODO: add those, and put the real Studio URL in the banner once the project exists |
| 4 | Video demo and presentation of core functions and use of Arc Studio and Circle tools | Mumbai prize page | MANUAL. Video rule: 2 to 4 minutes, hard cap 4:00, at least 720p, no AI voiceover, not sped up (see docs/DEMO_SCRIPT.md) |
| 5 | GitHub/Replit repo link | Mumbai prize page | MANUAL: push repo |
| 6 | State which bounty is entered | Mumbai prize page | MANUAL: write the exact name "Best Smart Contracts with Advanced Stablecoin Logic, In Arc Studio" in the submission |
| 7 | Built in Arc Studio; shareable Studio project URL and Studio shown in demo | Mumbai prize page: every Arc prize requires it | OPEN, not done: Arc Studio project not created yet. No Studio URL. MANUAL: follow docs/tracks/arc-studio-prompt.md, then record the real URL here |
| 8 | Working campaign funding to claim on Arc testnet | Functional MVP requirement (row 2) | OPEN: the old escrows are live; the new escrow is not deployed. MANUAL: deploy (below), run the flow |
| 9 | Judging: quality of solution, depth of technical implementation, creativity | Arc winners blog | Foundry tests exist (incl. `test_constructor_rejectsNon6DecimalToken`). Pass/fail not re-run when this table was updated, so no count is claimed |
| 10 | Arc-native: USDC as gas | Docs | Network property: gas is paid in Arc's native USDC, and `web/src/lib/chain/config.ts` declares USDC as the native currency. In the contract: constructor requires ERC-20 decimals() == 6; Deploy defaults to official USDC. UX note above |
| 11 | Crosschain conditional transfer via Circle Forwarder (named in track text) | Mumbai prize page | Doc path only (below), not built. Gateway, Circle Wallets and Paymaster: also not used. Nothing in `web/`, `cre/`, `contracts/` or `scripts/` calls them |

## Deploy and verify (exact commands)
Prereqs: testnet-only deployer key funded at https://faucet.circle.com (USDC is gas). Need ADMIN_ADDRESS, UPDATER_ADDRESS, FORWARDER_ADDRESS (Chainlink forwarder for Arc testnet from CRE docs, UNVERIFIED; any address works for a non-CRE demo) and HUMAN_ATTESTOR_ADDRESS (the backend key that signs World ID attestations; it is immutable in the escrow, so choose it before deploying). This deploy of the new design has not been run on Arc.

```bash
export PATH="$HOME/.foundry/bin:$PATH"
cd contracts && forge build && forge test
export ADMIN_ADDRESS=0x... UPDATER_ADDRESS=0x... FORWARDER_ADDRESS=0x... HUMAN_ATTESTOR_ADDRESS=0x...
export EXPECTED_WORKFLOW_OWNER=0x...   # CRE workflow owner; REQUIRED (receiver fails closed). Optional: EXPECTED_WORKFLOW_ID (bytes32), EXPECTED_WORKFLOW_NAME (bytes10)
# simulation-only alternative (mock forwarder passes no metadata): export INSECURE_SKIP_WORKFLOW_CHECK=true   # NEVER for production
# optional: TREASURY_ADDRESS CAMPAIGNER_FEE_BPS=25 CREATOR_FEE_BPS=25 (max 50 each) RETENTION_SECONDS GRACE_SECONDS HIGH_VALUE_THRESHOLD
export DEPLOYER_PRIVATE_KEY=0x...   # testnet only, local shell only. Read by scripts/deploy-arc.mjs. Never set it on Vercel
forge script script/Deploy.s.sol:Deploy --rpc-url https://rpc.testnet.arc.io \
  --private-key $DEPLOYER_PRIVATE_KEY --broadcast
# verify (explorer assumed Blockscout-style, UNVERIFIED; fall back to the explorer UI)
forge verify-contract <ESCROW_ADDR> src/ClippoEscrow.sol:ClippoEscrow --chain-id 5042002 \
  --verifier blockscout --verifier-url https://explorer.testnet.arc.io/api/ \
  --constructor-args $(cast abi-encode "constructor(address,address,address,address)" 0x3600000000000000000000000000000000000000 $TREASURY <DEPLOYER> $HUMAN_ATTESTOR_ADDRESS)
```
One-shot from repo root, which also writes config:
```bash
node scripts/deploy-arc.mjs --deploy     # forge script --broadcast --verify, then writes env
node scripts/deploy-arc.mjs              # only (re)write env from the last broadcast log
node scripts/deploy-arc.mjs --dry        # print only
```
It upserts ESCROW_ADDRESS, ESCROW_DEPLOY_BLOCK, REFERRAL_ADDRESS, PROFILE_ADDRESS, REPORT_RECEIVER_ADDRESS, ARC_RPC_URL, ARC_CHAIN_ID in web/.env.local, and sets `evm.receiverAddress` only in cre/workflows/clippo-settlement/config.staging.json (the local anvil fork config). Edit `config.production.json` by hand. The helper's cre/project.yaml step looks for a `REPLACE-WITH-ARC-TESTNET-RPC` placeholder that no longer exists there (the file already has a URL), so it changes nothing. ESCROW_DEPLOY_BLOCK is required with the new escrow. The helper itself defaults ARC_RPC_URL to rpc.testnet.arc.io. Deploy.s.sol reverts off chain 5042002 unless ALLOW_ANY_CHAIN=true.

## CCTP deposit path (doc only)
A campaigner holding USDC on another chain bridges to Arc with CCTP V2 (domain 26) or App Kit Bridge (https://docs.arc.io/app-kit/bridge.md), using the Forwarding Service (https://docs.arc.io/app-kit/tutorials/bridge/use-forwarding-service.md) to mint straight to their Arc address, then approves and calls `createCampaign`. A hook contract that calls createCampaign on mint is a later add-on.

## Unverified
Whether Arc Studio can run the Foundry tests or accept a pinned external contract (nobody has tried Studio yet); Prize weights beyond the listed $3,000; Studio login and web import UI; blockscout verifier path; faucet cap; Chainlink forwarder address on Arc; Circle USDC blacklisting could make claim/refund revert for a blocked address.
