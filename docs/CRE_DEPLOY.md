# CRE deploy sheet (real Arc testnet)

Goal: put the enforcing escrow and the report receiver on real Arc testnet, then run the CRE workflow against it with `--broadcast`, reading the real YouTube video. This is a **simulation-mode** setup: the receiver trusts Arc's Chainlink *test* forwarder and our simulation wallet as workflow owner. It is not the final locked setup (see section 5).

## Wallets

| Role | Address | Needs USDC? | Key lives |
| --- | --- | --- | --- |
| Admin, treasury, campaigner and demo creator | `0x8CF9113b19Aa9D169365CA7B1BB9d7b957B460e5` (yours) | **Yes**: at least 6 USDC (5 for the campaign pool) plus gas | Your wallet. You type it into the deploy script, hidden. It is never saved. |
| CRE simulation wallet (sends the report, is the workflow owner) | `0x7149dCB8f568794c7bed1a3Bd90A6f397EeF01F6` | **Yes**, a little, for gas | `cre/.env` as `CRE_ETH_PRIVATE_KEY` (git-ignored) |
| Backend attestor (signs human registrations; fixed forever at deploy) | `0x62EdCF9A14F0aB803Ee154EE9709323E56655074` | Not for this demo; yes later if the backend pays gas for `claimFor` | `web/.env.local` as `HUMAN_ATTESTOR_PRIVATE_KEY` (git-ignored) |

The simulation and attestor keys are testnet-only, generated on this laptop, and were never printed.

## Steps

1. **Fund the wallets** at https://faucet.circle.com (pick Arc Testnet and USDC): the admin wallet and the simulation wallet.
2. **Deploy** (you run this, in your own Terminal, in `.worktrees/cre/cre`):
   ```
   cd "/Users/apple/eth mumbai/Clippo_EthMumbai/.worktrees/cre/cre"
   bash scripts/arc-deploy.sh
   ```
   It asks for the admin wallet's private key (hidden). It checks the key matches the admin address and the balance is enough before it sends anything. Then it: deploys the contracts, approves USDC, creates and approves one small PerView campaign ($10 per 1,000 views, 5 USDC pool), registers the creator wallet as a human (attestor-signed), checks the result, and saves the addresses (no keys) to `scripts/.arc-deploy.env` and the receiver address to `workflows/clippo-settlement/config.production.json`.
   Use a testnet-only wallet for the admin. If `0x8CF9…` also holds real funds anywhere, say so and use a different admin address (`ADMIN_ADDRESS=0x… bash scripts/arc-deploy.sh`).
3. **Tell Claude "deployed".** Claude reads the addresses from the file and runs:
   ```
   bash scripts/simulate-arc-real.sh vWk4YV_dbsE UCIZw3qclbEDMa4TCFMAatww
   ```
   That reads the real video and bio from YouTube, writes the report to real Arc, and checks `reportedViews` and `credited` on-chain.
4. **Record**: the terminal output, the transaction on https://explorer.testnet.arc.io, and (once the backend is deployed) the app's proof link: one tx hash in three places.
5. **Only if Chainlink approves deploy access** (`cre account access`): deploy the workflow, then switch the receiver from simulation to locked: `setForwarder` to the real KeystoneForwarder (`0x76c9cf548b4179F8901cda1f8623568b58215E62`), `setExpectedWorkflowOwner` to the organization address, `setExpectedWorkflowId` to the deployed workflow ID, `setWorkflowCheckSkipped(false)`, then `lockConfig()`. These are owner transactions from the admin wallet.

## What was tested before you run it

- Deploy script: dry run on a local fork of Arc with the public anvil test key and a mock USDC. All 5 steps passed and the three checks read yes (`reportAdapter` is the receiver, the creator is registered as a human, the workflow owner is the simulation wallet). The real Arc USDC cannot be emulated on a fork, which is why the campaign step is only proven with a mock USDC.
- Simulation script: dry run on the fork reached "youtube agreed: kept 1/1 clips" with the real YouTube read. The write step on the fork hung because the public Arc RPC rate-limited the fork, which does not apply to a run on real Arc (an earlier fork run with the same code delivered a report and `reportedViews` was 3).

## Not proven

Nothing has run on real Arc yet. Real Arc USDC behaviour in the campaign step is untested. Gas on Arc is paid in USDC; if forge reports a gas error, paste the printed error (it contains no secrets).
