# CRE deploy sheet (real Arc testnet)

> **Status banner, 2026-11-07.** Steps 1 to 4 and section 6 were run. Done: the enforcing escrow `0x1e05373c199D764f7dE0353d58AFEa2b4C6326Ef` and receiver `0x6b0f6C0f324C615Add6BfcA5EE0b8eeD66F2C0cd` are on real Arc testnet in simulation mode; one `cre workflow simulate --broadcast` against them read the real YouTube video and credited the creator (tx `0xa41f91daf5431332ecaf1fbdfbf7f8ca13a38d39de8c41d0c1291f229f5c8409`, `reportedViews` 3, 0.03 USDC); the site https://clippo-cre.vercel.app shows that transaction as its proof link. NOT done: step 5 (deploy the workflow on the CRE network, then lock the receiver), because deploy access is not enabled for our account. The receiver is still in simulation mode and not locked. Evidence and limits: `docs/tracks/CRE.md`.

Goal: put the enforcing escrow and the report receiver on real Arc testnet, then run the CRE workflow against it with `--broadcast`, reading the real YouTube video. This is a **simulation-mode** setup: the receiver trusts Arc's Chainlink *test* forwarder and our simulation wallet as workflow owner. It is not the final locked setup (see step 5).

## Wallets

| Role | Address | Needs USDC? | Key lives |
| --- | --- | --- | --- |
| Admin, treasury, campaigner and demo creator | `0x8CF9113b19Aa9D169365CA7B1BB9d7b957B460e5` (the owner's) | **Yes**: at least 6 USDC (5 for the campaign pool) plus gas | The owner's wallet. Typed into the deploy script, hidden. It is never saved. |
| CRE simulation wallet (sends the report, is the workflow owner) | `0x7149dCB8f568794c7bed1a3Bd90A6f397EeF01F6` | **Yes**, a little, for gas (funded) | `cre/.env` as `CRE_ETH_PRIVATE_KEY` (git-ignored) |
| Backend attestor (signs human registrations; fixed forever at deploy) | `0x62EdCF9A14F0aB803Ee154EE9709323E56655074` | Not for this demo; yes later if the backend pays gas for `claimFor` | `web/.env.local` as `HUMAN_ATTESTOR_PRIVATE_KEY` (git-ignored; also a sensitive variable on Vercel) |

The simulation and attestor keys are testnet-only, generated on this laptop, and were never printed. No key or API key value is written in any doc.

## Steps (state on 2026-11-07)

1. **Fund the wallets** at https://faucet.circle.com (pick Arc Testnet and USDC): the admin wallet and the simulation wallet. *Done.*
2. **Deploy** (the owner runs this in their own Terminal, from the repo's `cre/` folder): *Done.*
   ```
   cd "<repo>/cre"
   bash scripts/arc-deploy.sh
   ```
   It asks for the admin wallet's private key (hidden). It checks the key matches the admin address and the balance is enough before it sends anything. Then it: deploys the contracts, approves USDC, creates and approves one small PerView campaign ($10 per 1,000 views, 5 USDC pool), registers the creator wallet as a human (attestor-signed), checks the result, and saves the addresses (no keys) to `scripts/.arc-deploy.env` (git-ignored) and the receiver address to `workflows/clippo-settlement/config.production.json`.
   Use a testnet-only wallet for the admin. If `0x8CF9…` also holds real funds anywhere, use a different admin address (`ADMIN_ADDRESS=0x… bash scripts/arc-deploy.sh`).
   Result (read back from the chain; creation txs and deploy block from `docs/BUILD_LOG.md` entry 17):
   - ClippoEscrow `0x1e05373c199D764f7dE0353d58AFEa2b4C6326Ef`, creation tx `0xc65b42e4998cc93d4d9bb2a363d53acf11129329fd5426feaaeb004f9de5ba03`, deploy block 71094327.
   - ClippoReportReceiver `0x6b0f6C0f324C615Add6BfcA5EE0b8eeD66F2C0cd`, creation tx `0x4d1369931084c290dc49b92f1231672f6106668815a8c109ebdd04a85b02e522`.
   - Read back from the chain: `reportAdapter` is the receiver, the creator is registered as a human, the workflow owner is the simulation wallet. Forwarder: Arc's simulation forwarder `0x6E9EE680ef59ef64Aa8C7371279c27E496b5eDc1`. Receiver flags: `workflowCheckSkipped` true, `configLocked` false, `expectedWorkflowId` zero (re-read from Arc).
3. **Run the simulation** against it: *Done.*
   ```
   bash scripts/simulate-arc-real.sh vWk4YV_dbsE UCIZw3qclbEDMa4TCFMAatww
   ```
   It reads the real video and bio from YouTube (the manifest, one real clip, comes from a local mock backend), writes the report to real Arc, and checks `reportedViews` and `credited` on-chain. Result: "youtube agreed: kept 1/1 clips", 1 report, 0 failed rows, tx `0xa41f91daf5431332ecaf1fbdfbf7f8ca13a38d39de8c41d0c1291f229f5c8409` (block 71094857), `reportedViews` 3, `credited` 30000 units (0.03 USDC). Output: `docs/tracks/cre-simulation-real-arc.txt`.
4. **Record**: the terminal output, the transaction on https://explorer.testnet.arc.io, and the app's proof link: one tx hash in three places. *Done.* The steps for showing it are in `docs/tracks/CRE.md` section 5.
5. **Only if Chainlink approves deploy access** (`cre account access`; `cre whoami` showed "Deploy Access: Not enabled" when last checked, and the owner has not reported the result). *NOT done.* Deploy the workflow with the CLI and the deployment registry private (the CRE web page only shows results): `cre workflow deploy ./workflows/clippo-settlement --target production-settings`, and create the secret with `cre secrets create`. Then switch the receiver from simulation to locked: `setForwarder` to the real KeystoneForwarder (`0x76c9cf548b4179F8901cda1f8623568b58215E62`), `setExpectedWorkflowOwner` to the organization address, `setExpectedWorkflowId` to the deployed workflow ID, `setWorkflowCheckSkipped(false)`, then `lockConfig()`. These are owner transactions from the admin wallet. `lockConfig` reverts while `workflowCheckSkipped` is on.

## 6. The deployed site (Vercel): what was actually done

The old `clippo-six.vercel.app` project is not in the owner's Vercel account (it belongs to someone else), so a NEW project was created: **https://clippo-cre.vercel.app** (project `clippo-cre`, team `aniruddha1295s-projects`).

1. `vercel link --yes --scope aniruddha1295s-projects --project clippo-cre` (creates the project; the GitHub connect step failed and is not needed, so the project is not connected to the repository and deploys are CLI uploads).
2. Database: `vercel integration add neon --name clippo-cre-db ...` after the owner accepted Neon's terms in the browser. It created a free Neon database and connected it to the project (`DATABASE_URL` and friends).
3. Migrations: `npm run db:migrate:direct` with the unpooled URL (all migrations applied to the empty database).
4. Production variables (names only): `ESCROW_ADDRESS=0x1e05373c199D764f7dE0353d58AFEa2b4C6326Ef`, `ESCROW_DEPLOY_BLOCK=71094327`, `SESSION_SECRET` and `CRON_SECRET` (generated, not printed), `HUMAN_ATTESTOR_PRIVATE_KEY` and `YOUTUBE_API_KEY` (sensitive), `NEXT_PUBLIC_TEST_DEPLOY=1`. Never add `CRE_ETH_PRIVATE_KEY`.
5. `vercel deploy --prod` from `web/` (a local `npm run build` passed first). The site now runs `main` at `ab35b35` (state given 2026-11-07).
6. Seed: `node scripts/seed-cre-demo.mjs` (dry run) then `--confirm` (no stale old-escrow campaigns existed, so `--retire-old` was not needed). Then `POST /api/snapshots/refresh` (real YouTube count) and `POST /api/chain/sync` (real Arc events), both with `Authorization: Bearer $CRON_SECRET`. The seeded rows (user, channel, campaign, clip, approval) are labelled `[SEED]`; views, credit and proof are not seeded.

Result, read from the public site: `GET /api/campaigns/cmw5jiz940005scec1r7rcyaz` (the seed campaign) returns `performance.confirmedViews = 3`, `pendingViews = 0`, and the proof is the CRE transaction `0xa41f91daf5431332ecaf1fbdfbf7f8ca13a38d39de8c41d0c1291f229f5c8409` (re-read with curl). The campaign page `/slips/cmw5jiz940005scec1r7rcyaz` shows "Confirmed views, all creators: 3", the Chainlink badge and the proof link (browser check done earlier).

Notes: the manifest route lists a clip only after its approval day has finished (UTC), so `GET /api/snapshots/clips` returns an empty list today (`{"day":"2026-11-05","clips":[]}` when last read) and the demo run used a local manifest. The seeded clip should appear once UTC day 2026-11-06 has ended (not checked yet); the first run with the deployed manifest feeding the workflow is the open follow-up (command in `docs/tracks/CRE.md` section 6, item 5). Brand `/desk` cannot be signed into on production with the placeholder campaigner, and the creator's own `/ledger` needs a wallet signature from `0x8CF9...60e5` (not opened). The site is publicly reachable; `/api/health` shows `ready: false` only because the LLM, World ID, admin list and blob storage are not configured, which the CRE demo does not need.

## What was tested before the run

- Deploy script: dry run on a local fork of Arc with the public anvil test key and a mock USDC. All 5 steps passed and the three checks read yes. The real Arc USDC cannot be emulated on a fork, so the campaign step was only proven with a mock USDC before the real run.
- Simulation script: dry run on the fork reached "youtube agreed: kept 1/1 clips" with the real YouTube read. The write step on the fork hung because the public Arc RPC (`rpc.testnet.arc.network`) rate-limited the fork (HTTP 429); that does not apply to a run on real Arc, and the run through `rpc.testnet.arc.io` passed (`docs/tracks/cre-simulation-real-youtube.txt`).

## Not proven

- The run is a SIMULATION: one CRE node, our own wallet sent the report through Arc's Chainlink test forwarder, so no Chainlink nodes signing is shown. The workflow is not deployed, the receiver is not locked, and no workflow id is pinned.
- The manifest in the real run came from a local mock backend, not from the deployed site.
- On real Arc, the campaign step worked: campaign 1 exists and was approved (the CRE report credited it, and `reportViews` needs state Approved). The script ended with "campaign id 1 approved" and did not decode the campaign state. Not run on real Arc: funding through the app, a claim, a dispute, a close.
- Gas on Arc is paid in USDC; if forge reports a gas error, paste the printed error (it contains no secrets).
