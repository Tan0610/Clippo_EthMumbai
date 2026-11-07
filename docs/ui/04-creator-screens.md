# D. Creator screens and public marketplace views

Scope: `/join`, `/account`, `/ledger`, `/wire`, `/slips/[id]`, `/profile`, `/referrals`, `/status`, plus the components behind them. Source: branch `docs/ui-guide` (main `bb2fbec`). Everything below is read from the code. "Not determined" means the code does not say.

Paths are under `web/src/` unless noted. Component files are in `web/src/components/`.

## 0. Shared building blocks (used on every screen below)

### 0.1 Words the screens use, in plain language

| Screen word | Plain meaning (from code) |
| --- | --- |
| Wire | The list of open campaigns (`/wire`). |
| Slip | One campaign card / campaign page (`/slips/<id>`). `No. XXXX` = last 4 characters of the campaign id, upper case (`api.ts` `serial`). |
| Ledger | The creator earnings page (`/ledger`). |
| Standing | The creator leaderboard (bottom of `/wire`). |
| Desk | The role a wallet holds. "Desk" on Account shows `creator`, `campaigner` or `admin`. Also the name of the brand dashboard (`/desk`). |
| Correction | Any error box (`Bits.tsx:93`). Label `Correction`, bold what failed, optional fix, `Try again` link. |
| Agent / Agent note | The AI checker that reads a clip against the brief. Agent note = the `reason` text of the verdict (`SlipDetail.tsx:90`). |
| Stamp | The verdict badge. Text: `Approved`, `Rejected`, `Needs human`, `In the queue` (pending). CSS makes it upper case. `CONF 0.91` under it = confidence (0 to 1). |
| Confirmed views | Views read from YouTube by Chainlink CRE nodes and written on Arc. Only these are paid (`ConfirmedViews.tsx:8`). |
| Pending (views) | Clippo's own count minus confirmed. Not paid yet. |
| Clippo count | Clippo's own view count of approved clips. |
| Proof | Link to the on-chain report transaction (`Proof 0xabcd...`). |
| Retention window | 7 days by default (`RETENTION_DAYS` / escrow `retentionPeriod`). Pay-per-view credits unlock only after it. |

### 0.2 Shared components

- `PageHead` (`Bits.tsx:111`): small kicker line, big title, optional lead sentence.
- `Loading` (`Bits.tsx:68`): ruled lines with a typing caret and a label (e.g. `Balancing the books`).
- `Empty` (`Bits.tsx:82`): bold title, one sentence, optional action. Optional `LoopClip`.
- `Correction` (`Bits.tsx:93`): if the message starts with `The Clippo service did not answer.` or `Not configured on this deployment.` it shows `ServiceState` instead (`ServiceState.tsx`): micro label `Service unavailable` or `Not configured`, bold `Clippo could not reach its service.` or `This part of Clippo is not switched on for this deployment.`, then "Nothing was changed and no money moved...", and a `Try again` button.
- `DemoNote`: only in a `NEXT_PUBLIC_DEMO=1` build: "Demo build (NEXT_PUBLIC_DEMO=1): figures on this page are sample data." Not in production.
- `LoopClip` (`LoopClip.tsx`): a small muted looping sample video in a frame. Caption `Waiting on a clip` and `Sample footage · 0:04`. Decorative (`aria-hidden`). It plays only while on screen, never with reduced motion or data saver. Only used in the empty state of `/wire` (`clip={2}`).
- `Stamp` (`Stamp.tsx`), `TickBar` (a row of ticks = percent bar), `Slip` card (`Bits.tsx:20`), `VerifiedMark` (a rosette icon with tooltip `Verified human`).
- `TierMark` (`Marks.tsx`): chevrons plus a tier word. See problem P-TIER below.

### 0.3 Wallet connect and sign-in (every "Connect wallet" button does this)

Code: `hooks.ts:83` `connect`, `wallet.ts:46`, `lib/chain/client.ts:93-140`.

1. Pick a wallet (`chooseWallet`). One browser wallet found: used automatically. Several: sheet `Choose a wallet` (each wallet is a button, plus `Cancel`). None: sheet `No wallet found` with install links and a `Close` button; error text `No browser wallet found. Install one from the list, then reload this page.`
2. Ask the wallet for an account (`eth_requestAccounts`). The wallet pops up. Wallet errors become: `You rejected the request in your wallet while connecting. Nothing was changed.`, `Your wallet already has a request waiting. Open the wallet extension, answer it, then try again.`, `Your wallet is locked or has not approved this site...`, or `Wallet error while connecting: ...`.
3. Sign-in message (SIWE): `GET /api/auth/nonce`, then the wallet shows a signature request (no gas, no money), then `POST /api/auth/session {message, signature, role}`. The server sets a cookie, valid 7 days. No chain switch happens here (chain add/switch is only done for on-chain actions).
4. Role. New wallet with no role given: server answers `ROLE_REQUIRED` and a sheet appears in the header: `New wallet` / `Which desk is this wallet for?` / `A wallet holds one role, and it cannot be changed later. You will sign once more to create the account.` Buttons: `I clip: creator`, `I pay for clips: campaigner`, `Cancel`. An existing wallet keeps its role; the role asked for is ignored (`api/auth/session/route.ts`). Admin wallets come from the operator allow-list.
5. Failure: sheet `Could not connect` with the message and `Close`. If the wallet later switches account, the session is ended and sheet `Signed out` says `Your wallet switched accounts, so you were signed out. Connect again to continue.`
6. `Disconnect` (header wallet chip, or Account button): `POST /api/auth/logout`, forget the wallet, clear the user.

Server rate limits (message `Too many requests; retry in Ns`): nonce 60 per 10 min, session 30 per 10 min.

### 0.4 World ID check (used by Join step 1 and Account)

Code: `WorldCheck.tsx`, `IDKitSheet.tsx`, `api/worldid/rp-signature`, `api/worldid/verify`, `lib/worldid/signup.ts`, `errors.ts`.

1. Button click opens `WorldCheck` (kind `proof-of-human`, purpose `Prove you are a unique human (Proof of Human)`).
2. The page asks `POST /api/worldid/rp-signature {action}`. The server signs a one-time request (needs a signed-in user). 503 `NOT_CONFIGURED` means World ID env vars are missing: sheet `World ID · Not configured` / "World ID is not set up on this deployment, so the check cannot run. Nothing was changed. An operator needs to add the World ID app, RP id and signing key." + `Close`.
3. The World ID widget (IDKit) opens. The user approves in the World App. Credential asked: Proof of Human.
4. The proof goes to `POST /api/worldid/verify`. Server verifies with World's Developer Portal, then enforces one human = one account: the nullifier (a unique per-person code for this action) is stored unique in `User.worldIdNullifier`. It marks `verified = true`.
5. If the chain is configured, the server also links this wallet to the human in the escrow (`ensureHuman`, paid by Clippo's wallet). Only linked wallets can ever be credited by the contract (`ClippoEscrow.sol` header, `NotHuman`). If this link fails the error is swallowed: the app still says verified (see P-WORLD-LINK).

Failure texts the user can see (all prefixed to the "Not verified." box):

| Cause | Text |
| --- | --- |
| User closes widget | `You closed the check before it finished. Nothing was changed.` |
| User declines in World App | `You declined the request in World App. Nothing was changed.` |
| Timeout / connection dropped / request expired | `The check timed out before it finished. Nothing was changed.` / `The connection to World App dropped before the check finished. Nothing was changed.` / `The check request expired before it was answered. Nothing was changed.` |
| Proof already used | `That proof was already used. Each check works once. Nothing was changed.` (or the World ID messages `World ID says this proof was already used.` / `...already used the maximum number of times for this action.`) |
| No Proof of Human credential | Not an error box. Shows the amber box `No Proof of Human credential.` + "Your World ID has no Proof of Human credential. You can browse as a viewer but cannot join campaigns as a creator." + link `Get a credential` (opens `docs.world.org/world-id/idkit/credentials`) + button `Continue without verifying (viewer only)` (goes to `/wire`). |
| Other widget error | `World ID could not complete the check (<code>). Nothing was changed.` |
| Not configured | `World ID is not configured on this deployment, so nothing was checked. Nothing was changed.` |
| Server: World says no | `<reason>. Nothing was changed, and the proof was not consumed.` (`WORLD_ID_DENIED`, 403) |
| Server: person already has another account | `This World ID is already linked to another Clippo account. Nothing was changed.` (`ALREADY_USED`, 409) |
| Server: this account verified with a different person | `This account is already verified with a different World ID. Nothing was changed.` (409) |
| Server unreachable | `The Clippo service did not answer.` |

Also under the button: a `Why Proof of Human?` expandable note (`JoinView.tsx:13`): about one nullifier per person, "This limits duplicate accounts; it does not prove anyone is honest. Approving a release is checked separately."

Demo build only (`NEXT_PUBLIC_DEMO=1`): a simulator sheet with `Verify with Proof of Human (demo)`, `Cancel`, `No Proof of Human credential`, `Let it expire`, `Reuse an old proof`. Not in production.

---

## 1. `/join` : "Two desks. Pick one."

Page `<title>`: `Join`. File: `JoinView.tsx` (310 lines), `app/(site)/join/page.tsx`.

- **Purpose:** onboarding. A person picks "I clip" (creator) or "I pay for clips" (campaigner). Creators then prove they are a unique human and prove they own a channel.
- **Who:** anyone, signed in or not. Creator steps need a wallet.
- **Reachable from:** footer link `Join as a creator`; landing page link `Verify and join` (`app/page.tsx:118`); `/slips/<id>` button `Verify with World ID`; `/ledger` link `Verify with World ID`. There is no "Join" item in the top nav (`Shell.tsx:12`: Wire, Hire, Desk, Ledger, Bench, Account).

### Layout, top to bottom

1. Kicker `Join`. Title `Two desks. Pick one.` (the word "Pick one." is italic). Lead: `A wallet holds one role. To try the other desk, use another account in your wallet.`
2. Role choice (only until a choice is made). Radio group, aria label `Pick a desk`. Two big tiles:
   - `A` / `I clip` / "Verify you are a person, prove a channel, pick a campaign."
   - `B` / `I pay for clips` / "Connect a wallet, answer eight questions, fund a pool."
   Choosing a tile only remembers the role locally (`s.pick`) and swaps the screen. It does not sign in. After choosing, the tiles disappear and there is no back control (see P-JOIN-1).
3. If role = campaigner: section `Connect the wallet that will hold the pool.` Then either `Connected as <wallet>` plus link `Start a campaign` (to `/desk/new`), or button `Connect wallet`. (Campaigner flow beyond this is documented in the desk part of the docs.)
4. If role = creator: a numbered list of steps.

**Step 1 · One person, one account** (micro label). Heading `Prove you are a human.` Three possible bodies:
   - Already verified: `Verified with World ID.` with the verified mark.
   - No wallet connected: "Connect your wallet first. Your account is tied to it, and so is the World ID check." + button `Connect wallet` (`Check your wallet` while connecting).
   - Wallet connected, not verified: "World ID checks you are a unique person without handing over who you are. Clippo only stores that you passed." + button `Verify with World ID (Proof of Human)` + `Why Proof of Human?` note. Below: the no-credential box (if relevant) and the red box `Not verified.` + message.

**Step 2 · Prove a channel** (micro label). Heading `Show it's yours.` The whole step is dimmed to 40% and not clickable (`inert`) until Step 1 is verified. Contents:
   - If verified: list `Channels to re-verify` (only channels on the old code format; nothing renders if none or on load error).
   - `ChannelProof` form: `Platform` select (`YouTube`, `X`, `Instagram`) with hint "YouTube is read automatically. X and Instagram bios cannot always be read, so a person may confirm them."; `Channel handle` input (placeholder `@yourchannel` or `@yourhandle`); button `Get my code`.
   - After code issued: label `Paste this in your YouTube channel description (About)` (or `profile bio` for X/Instagram), the code in a dashed box, button `Copy`, a sentence, and the check button.

**Done** (appears only after a channel was proven in this visit). Micro `Done`, heading `You're on the wire.`, button `Find a campaign` (to `/wire`).

### The bio code `clippo:<wallet>`

- Format: `clippo:` + the creator's wallet address in lower case (`lib/channel-code.ts`). Example: `clippo:0x71c9e3b2...`.
- It is the same code for every channel of the same wallet. It contains the wallet so Chainlink CRE nodes can check from the public bio which wallet owns the channel, without trusting Clippo's database.
- Texts: YouTube: "Keep it there. Chainlink nodes check your bio each time views are confirmed." X / Instagram: "Leave it up until a reviewer confirms it. After that you can remove it." (`JoinView.tsx:64`)
- Old-format channels (a random code like `CLP-MAR-7K3Q`): a verified YouTube channel with an old code is flagged `needsReverify`. Its views cannot be confirmed until it is verified again with the new code. A not-yet-verified channel with an old code is silently given the new code by the server (`api/channels/route.ts`).

### Controls table

| Label | Kind | Where | What it does | Technical effect | Enabled when | Result the user sees | Clearer label suggestion |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `I clip` (tile A) | radio | Role choice | Picks the creator path. | Local only: `s.pick("creator")`. No API call. | Always (until a role is chosen). | Role tiles replaced by Step 1 and Step 2. | `I'm a creator (I post clips)` |
| `I pay for clips` (tile B) | radio | Role choice | Picks the brand path. | Local only: `s.pick("campaigner")`. | Always. | Connect-wallet section. | `I'm a brand (I fund campaigns)` |
| `Connect wallet` (step 1) | button | Step 1, no wallet | Starts wallet connect and sign-in as creator. | Section 0.3 with role `CREATOR`. | Not while `Check your wallet` (connecting). | Wallet chip in header shows the address. Failure shows the header sheet `Could not connect`. | `Connect wallet (free, no gas)` |
| `Verify with World ID (Proof of Human)` | button | Step 1 | Opens the World ID check. | Section 0.4: rp-signature, widget, `POST /api/worldid/verify`. | Wallet connected and not verified. | Success: step 1 turns into `Verified with World ID.`, step 2 unlocks. Failure: `Not verified.` + text. | `Verify I'm a real person (World ID)` |
| `Why Proof of Human?` | details/summary | Step 1 | Expands an explanation. | None. | Always. | Paragraph text. | `Why do I need this?` |
| `Get a credential` | link | No-credential box | Opens World docs in a new tab. | External link. | Only after the no-credential result. | New tab. | `How to get a Proof of Human credential` |
| `Continue without verifying (viewer only)` | link-button | No-credential box | Goes to the marketplace as a viewer. | Navigates to `/wire`. | Same. | Wire page. | `Browse campaigns as a viewer` |
| `Platform` | select | Step 2 | Chooses YouTube, X or Instagram. | Local. Changing it clears the issued code and the check state. | Step 2 unlocked. | Hint changes placeholder. | `Where do you post?` |
| `Channel handle` | text input | Step 2 | Channel name. | Local. Typing clears the issued code. | Step 2 unlocked. | none | `Your channel @handle` |
| `Get my code` | button | Step 2 | Registers the channel and shows the bio code. | If no session, connects as creator first. `POST /api/channels {platform, handle}`. Server: creator only, must be verified human, handle normalised and validated, handle not owned by another account. Creates a channel with code `clippo:<wallet>`. If you already added this handle it returns the same channel. | Handle has 3+ characters and not already working. Hidden once a code exists. | Code box appears. Failure box `Could not continue.` + server text: `Verify with World ID before you use channel proof. Open Account and press "Verify with World ID".` (403 `NOT_VERIFIED`), `Not a valid YOUTUBE handle` (400, platform name in capitals), `Channel already linked to another account` (409), `Requires role: CREATOR` (403, wallet is a campaigner), `Too many requests...`. | `Get my verification code` |
| `Copy` | button | Code box | Copies the code. | `navigator.clipboard.writeText`. | Always. | Label changes to `Copied` for 2.5 s, or `Select and copy` if the browser refused. | `Copy code` |
| `I put it there. Check.` | button | Step 2, after code | Asks the server to look for the code in the bio. | `POST /api/channels/<id>/verify`. YouTube: YouTube Data API reads the channel by handle, checks the description contains the code. X: X API reads the bio. Instagram: see problem P-JOIN-IG. If the platform cannot be read: admin notified (`CHANNEL_REVIEW`), response 202 `review`. | Not while checking, after proven, or after sent for review. | Checking: label `Reading your profile`. Success: `Channel proven.` with a check mark. Review: label `Waiting for review` + box `Sent to a person.` Missing code: box `Code not found yet.` + server reason + "Platforms can take a minute to show the change. Check the spelling and try again." | `Check my bio now` |
| `Get my new code` | button | Re-verify list | For a channel on the old code: issues the new code. | `POST /api/channels/<id>/upgrade-code`. YouTube only. Sets code to `clippo:<wallet>` and `verified = false`. | Not while `Issuing a code`. | The code box and check button appear. Notice before: `Re-verify <handle>.` "This channel uses the old code. Get your new code, paste it in your bio, then check. Until then its views cannot be confirmed." | `Get my new bio code` |
| `Find a campaign` | link | Done | Goes to the marketplace. | Navigates to `/wire`. | After a channel is proven in this visit. | Wire page. | `Browse campaigns` |
| `Connect wallet` (campaigner) / `Start a campaign` | button / link | Campaigner branch | Connects as campaigner / goes to `/desk/new`. | Section 0.3 role `CAMPAIGNER`. | | | |

### Every failure message on /join for the channel check

Server messages come from `api/channels/[id]/verify/route.ts` and the YouTube/X/Instagram clients:

- `Channel not found` (YouTube handle does not exist, 422 `CODE_NOT_FOUND`).
- `Code not found in channel bio` (YouTube, 422).
- `X account not found`, `Code not found in X bio` (X).
- `Connect this Instagram account with the Connect Instagram (OAuth) flow to verify ownership` (Instagram, 422; no such button exists, see P-JOIN-IG).
- `Verify with World ID before you use channel proof...` (403, account not verified).
- Network: `The Clippo service did not answer.`
- The UI prints these as `Code not found yet.` followed directly by the server text, then the fixed sentence. Text runs together: `Code not found in channel bio Platforms can take a minute...` (no full stop, `JoinView.tsx:218`).

### States

- Loading: `Reading your profile` / `Issuing a code` on the buttons. `OldChannels` has no loading state (renders nothing).
- Empty: no channels = nothing extra.
- Error: red boxes `Not verified.`, `Could not continue.`, `Code not found yet.`. Wallet/connect errors appear in the header sheet, not on the page.
- Waiting for wallet: button text `Check your wallet`.
- Not verified: Step 2 dimmed and inert. No explanation text on the dimmed step itself.
- Disabled: `Get my code` under 3 characters; check button after found/review.
- Success: `Verified with World ID.`, `Channel proven.`, then `Done`.

### Copy worth noting

- `JoinView.tsx:248` "Two desks." is print jargon; "desk" = role.
- `JoinView.tsx:255` "answer eight questions": refers to the campaign wizard; the count is not checked here.
- `JoinView.tsx:272` `Step 1 · One person, one account`: the heading below it (`Prove you are a human.`) is clearer.
- `JoinView.tsx:302` `You're on the wire.` "Wire" is jargon.
- `JoinView.tsx:123` `Sent to a person.` (review) says "usually within a day" but nothing in code guarantees it.
- `JoinView.tsx:197` "X and Instagram bios cannot always be read, so a person may confirm them."

### Problems and suggestions

- **P-JOIN-1 (medium):** after picking a tile there is no way back; the radio group is removed. A wrong choice needs a page reload. Add a `Change` link.
- **P-JOIN-IG (high):** Instagram channels cannot be proven from the UI. `lib/platforms/instagram.ts:105` returns not-ok without the "unavailable" flag when there is no OAuth token, so the server answers 422 `CODE_NOT_FOUND` and never sends it to human review. The text says "Connect this Instagram account with the Connect Instagram (OAuth) flow", but no component calls `/api/channels/instagram/oauth/start`. The page hint promises "a person may confirm them" and the review box says "A reviewer will look for the code". For Instagram that does not happen. X works (code check or review).
- **P-JOIN-2 (medium):** wrong-role wallet. A wallet that already exists as a campaigner, opened on `/join` as creator, connects as campaigner (role ignored by server). The UI then offers World ID and channel steps and fails at `Get my code` with `Requires role: CREATOR`. Show a clear "This wallet is a campaigner account" message.
- **P-JOIN-3 (medium):** the `Done` step only appears when the channel was proven in the same visit. After `Waiting for review` there is no next step or link. Also nothing tells the user that a verified account can already browse and join campaigns.
- **P-JOIN-4 (low):** connect errors never reach the on-page `Could not connect.` boxes (`fail` is only set by the World ID result, `JoinView.tsx:233`). Those boxes are effectively dead; real errors show in the header sheet.
- **P-JOIN-5 (low):** handle rule mismatch: UI needs 3+ characters, server allows 2+.
- **P-JOIN-6 (low):** the code is the same for every channel, so two channels give the same text. Fine technically; the UI does not say so.
- **P-WORLD-LINK (medium):** if the on-chain human link fails after a successful World ID check, the user sees `Verified with World ID.` but the escrow will refuse to credit this wallet later (`NotHuman`). No error or retry is shown (`api/worldid/verify/route.ts`).
- **P-JOIN-7 (low):** the step list is not reachable from the main nav; first-time users coming from Wire may not find it. Add `Join` to the nav for signed-out users.

---

## 2. `/account` : "Who's signing"

Page `<title>`: `Account`. File: `AccountView.tsx`. Title text: `Who's signing` (the word "signing" italic). No lead sentence. Kicker `Account`.

- **Purpose:** show which wallet and role is signed in, do the human check, manage channels.
- **Who:** anyone. Sections change by state. **Reachable from:** nav `Account`.

### Layout

1. Section `Identity`. Table: `Wallet` (short address or `not connected`), `Desk` (`creator` / `campaigner` / `admin`, or `—`), `Human check` (`verified` with mark, or `not verified`). Buttons row (see table). Under it, if creator and not verified: `Why Proof of Human?`, no-credential box, `Not verified.` box.
2. Section `Channels` (only if signed in as creator). Sub-parts:
   - Pending hint (amber box, only if confirmed views are zero but pending views exist): `<N> pending views, none confirmed.` + "Chainlink nodes confirm views only for approved clips on a YouTube channel whose bio holds your code. Check the code below, then wait for the next report."
   - List of channels: handle (bold), platform in lower case, and a status on the right: `Proven` (green), `Re-verify needed` or `Code pending` (amber). For a channel that is not proven and has a code, the re-verify block opens inline (`ChannelReverify`: `Get my new code` if on the old format, otherwise the code box, `Copy` and `I put it there. Check.`).
   - Empty: `No channels yet.`
   - Button `Add a channel` opens the same form as Join step 2 (`ChannelProof`) plus a link-button `Done` to close it.
3. Section `Your desk`: "Each wallet holds one role, chosen the first time it signs in and fixed after that. To use another desk, switch accounts in your wallet and connect again. Admin rights come from the operator's allow-list, not from this page." Plus the amber `Signed out` notice text if the wallet switched.

### Controls

| Label | Kind | Where | What it does | Technical effect | Enabled when | Result | Clearer label |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `Disconnect` | button | Identity | Signs out. | `POST /api/auth/logout`, forgets wallet. | Wallet connected. | Wallet shows `not connected`. | `Sign out` |
| `Connect wallet` | button | Identity | Connect and sign in with no role asked (existing wallets keep their role; new wallets get the role sheet). | Section 0.3. | Not while connecting (`Check your wallet`). | Address appears. | `Connect wallet` |
| `Verify with World ID (Proof of Human)` | button | Identity | World ID check. | Section 0.4. | Wallet connected, not verified, role creator. | Success: `Human check` becomes `verified`. | `Verify I'm a real person` |
| `Add a channel` | button | Channels | Opens add-channel form. | Local. | Always. | Form appears. | `Add another channel` |
| `Done` | link-button | Channels, form open | Closes the form. | Local. | | | `Close` |
| Plus all channel controls from Join (`Platform`, `Channel handle`, `Get my code`, `Copy`, `I put it there. Check.`, `Get my new code`) | | | | See section 1. After a successful check the list reloads. | | | |

### States

- Loading: `Reading your channels`.
- Error: `Correction` with the server text and "Channels belong to creator accounts." + `Try again`.
- Not connected: Identity shows `not connected`; only `Connect wallet`.
- Not verified creator: World ID button and explanation.
- Campaigner / admin: no World ID button, no Channels section.

### Problems

- **P-ACC-1 (medium):** an X channel waiting for human review shows `Code pending` and the check button again; the "waiting for review" state is lost after reload.
- **P-ACC-2 (low):** `Desk` row shows lowercase `creator`; the word "Desk" is jargon. Suggest `Account type`.
- **P-ACC-3 (low):** the Account page never shows notifications, appeals or earnings; there is no profile (display name) editing here.
- **P-ACC-4 (medium):** a wrong-role or logged-out user sees no explanation of what to do next beyond `Connect wallet`.

---

## 3. `/ledger` : "What you're owed"

Page `<title>`: `Ledger`. Files: `LedgerView.tsx`, `LedgerDash.tsx`, `ConfirmedViews.tsx`, `FeePreview.tsx`. Kicker: `The Ledger` / `Creator earnings`. Title: `What you're owed` ("owed" italic). Lead: `Settled amounts, ready to pull. The creator fee comes off when you claim. Nobody else can hold your money up.`

- **Purpose:** show a creator's earnings and let them claim money.
- **Who:** signed-in creators. **Reachable from:** nav `Ledger`; Status page button `Go to the ledger`.
- Data: `GET /api/creator/earnings` (creator only; it first syncs new on-chain credits for up to 25,000 blocks), and `GET /api/dashboard/creator`, `GET /api/submissions`, `GET /api/chain/config`.

### Layout, top to bottom

**Your record** (heading, `CreatorHead`). Right of the heading: verified mark and `Verified human`, or link `Verify with World ID` (to `/join`); plus a tier mark. Stats:
- `Confirmed views` (big number) with `Pending <n>[, not paid yet]` and a `Chainlink confirmed` badge and `Proof 0x...` link. Shown if the creator has at least one pay-per-view or pool-share campaign. Otherwise `Views, Clippo count`. Plain words: Confirmed = views the Chainlink nodes read and wrote on-chain, the only ones that pay. Pending = Clippo's count not yet confirmed. The badge shows once confirmed > 0 or a proof exists.
- `Clips sent`: all submissions.
- `Approved / rejected`: counts of approved and rejected verdicts (not "needs human").
- `Reliability`: approved / (approved + rejected), as percent. 0 when nothing decided.
- Explainer: `Confirmed and pending` + `Confirmed = read from YouTube by Chainlink CRE nodes and written on Arc. Pending = Clippo's own count. Only Confirmed is paid.`
- Three money figures:
  - `Owed, claimable now`: server `totals.claimable` = sum of unclaimed amounts of payouts that are PENDING and not frozen. It includes credits still inside the 7-day window (see P-LEDGER-1).
  - `Claimed`: gross amount already pulled to the wallet (before the creator fee).
  - `Still accruing, est.`: server `totals.estimated` = sum over campaigns of the estimated total for your approved clips' views (see P-LEDGER-2). Before fees. Zero for split campaigns.

**Settlements** (heading). Table columns `Day`, `Campaign`, `USDC`, `Status`. One row per campaign you have been credited in (credits merge into one row; `Day` is the date the first credit arrived). `USDC` = total gross credited to you (not just the open part). Status:
- `Claimed · 0xabcdef12...` (first 10 characters of the transaction),
- `Frozen, in review` (hover shows reason, e.g. clip deleted or fraud hold),
- `Releases Nov 13` (still inside the review window; date is `releaseAt` of the row),
- `Open` (ready to claim).
Footer `Total settled` = open amounts + claimed. Empty: `Nothing settled yet.` / "Get a clip approved and the first entry lands the next time views are reported."

**Still earning** (heading, tag `Estimates, before fees`). Explainer note if any pay-per-view/pool-share campaign. Table `Campaign` (with payout rule below the title: `Per verified view`, `Human-approved split`, `Pool share`), `Approved clips`, `Views` (Confirmed with Pending beneath, or `Clippo count` for split campaigns), `Est. USDC` (or `set by split` for split campaigns). Footer `Total, confirmed and pending` if 2+ such campaigns. Empty: `No campaigns yet.` / "Submit a clip to a campaign and it shows up here."

**Your clips** / `With verdicts` (`MySubmissions`). Table `Clip`, `Verdict`, `Conf.`, `Clippo count`. `Clip` = title (link to the clip on its platform, new tab), campaign and date, and `Agent note` + reason. `Verdict` = `Approved`, `Rejected`, `Needs human` or `Pending`, plus `Appeal open`. `Conf.` = agent confidence 0.00 to 1.00 (a human decision shows 1.00; `–` if zero). `Clippo count` = views (compact like `12K`) or `–`. Empty: `No clips sent.` / "Open a campaign on the wire and paste a link. The verdict lands here."

**Claim rail** (right column, aria label `Claim`):
- `Claimable now` + big figure + `USDC`. Computed in the browser: open payouts (not fully claimed, amount left > 0) that are not frozen and whose `releaseAt` is empty or past. Excludes still-locked money (this differs from `Owed, claimable now` above).
- Rows: `Open entries` (count of open payouts), `Already claimed`, `Frozen, in review` (only if > 0).
- Claim button (see table).
- Fee box `Fee preview, claim`: `Gross payout`, `Platform fee, 0.25%`, `You receive`; footnote `0.25% on the campaigner side, 0.25% on the creator side, as set on the escrow.` Fee % is read from the escrow (default 25 bps each side, range 10 to 50). Shown only when claimable > 0. If the fee schedule cannot be read: `The fee schedule could not be read from the service, so no figure is shown. Reload to try again.`
- Small print: `Claims are separate per campaign, so one failed transfer never blocks the others. Pay-per-view credits unlock after a 7-day review window.` (the number comes from the server).
- Links (only if the optional module endpoints answer): `Status ladder`, `Referral links`, `On-chain profile`. Status ladder shows when the ladder is on (its endpoint is public). The other two appear only for a signed-in creator and only if that module is on. Modules are OFF by default (`lib/features.ts`), so normally none show.

### What each number means

| Figure | Plain meaning | Counted when |
| --- | --- | --- |
| Confirmed views | Views the Chainlink workflow confirmed for you in that campaign (highest cumulative reported on-chain). | After a CRE report lands. The workflow runs daily at 00:30 UTC (`cre/workflows/.../config.*.json`). |
| Pending views | Clippo's own view count minus confirmed. | Updates when Clippo refreshes view snapshots (daily cron). |
| Owed, claimable now (top) | Unclaimed credited money that is not frozen. Gross. May include money still locked. | |
| Claimable now (rail) | Same but only money past the review window. Gross; the fee comes off at claim. | |
| Releases `<date>` | Day the review window ends for that row. | Pay-per-view only. |
| Frozen, in review | Money held because a clip was deleted/made private or a fraud flag is open. | Set by the server (`lib/antifraud/flags.ts`). |
| Est. USDC | Estimated total for your approved clips' views so far, before fees. Per view: views/1000 x rate (scaled down if the pool is short). Pool share: pool x your share. Split: not estimated. | |
| Claimed | Gross already pulled. | |

How money becomes claimable (contract `ClippoEscrow.sol`): per-view credits come only from the CRE report and mature `retention` (7 days) after being credited; the campaigner may dispute credits inside the window and block them. Pool-share credits only exist after the campaign closes. Split credits exist after both approvers release the split. The creator-side fee (default 0.25%) is taken from the gross at claim.

### Controls

| Label | Kind | Where | What it does | Technical effect | Enabled when | Result | Clearer label |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `Connect as a creator` | button | Error state | Connects and reloads. | Section 0.3 with role `CREATOR`, then retry. | Only shown when no wallet. | Ledger loads. | `Connect wallet to see your earnings` |
| `Try again` | link-button | Error `Correction` | Reloads. | Re-calls earnings. | Signed in. | | |
| `Verify with World ID` | link | Your record | Goes to `/join`. | Navigation. | Not verified. | | `Verify I'm a person` |
| `Connect wallet to claim` | button | Claim rail | Connects as creator. | Section 0.3. | Not connecting. | | |
| `Claim <amount> USDC` | button | Claim rail | Pulls all unlocked money, one request per campaign. | For each ready payout id, in order: `GET /api/payouts/<id>/claim` (preview; blocks locally if frozen or not yet released), then `POST /api/payouts/<id>/claim {}`. The server (creator only, verified human) checks the chain is configured, then Clippo's own wallet calls `claimFor(campaignOnchainId, creatorWallet)` on the escrow and pays the gas. The contract sends the amount minus the creator fee to the creator's wallet only. The server then reads the transaction receipt and requires a `Claimed` event for this wallet and campaign. No wallet popup and no gas for the creator. | Signed in, not busy, at least one ready payout, escrow configured. | While busy the label says `Waiting for signature` (nothing is actually signed, see P-LEDGER-3). Success: box `Claimed and verified on-chain.` + `tx 0x...` for each success; the page reloads its data. Label when nothing: `Nothing to claim`. | `Claim <amount> USDC to my wallet` |
| `Try again` | link-button | Claim `Correction` | Repeats the claim. | Same as above. | Ready payouts exist. | | |
| `Status ladder` / `Referral links` / `On-chain profile` | links | Claim rail | Open optional pages. | Navigation. | Module on. | | |
| Clip title link | link | Your clips | Opens the clip on YouTube/X/Instagram. | External, new tab. | | | |
| `Proof 0x...` link | link | Confirmed views | Opens the on-chain report in the Arc explorer. | External; only `http(s)` links render. | A report exists. | | `View on-chain proof` |

### Claim failure cases (exact text)

If several claims fail: `<k> of <n> claims did not go through: <first message>`; if all fail: the first message. Messages:

- Frozen: the freeze reason, e.g. `Clip <id> was deleted or made private; unclaimed balance frozen pending admin review`, or `This payout is frozen pending review` (client check; server 409 `PAYOUT_FROZEN`).
- Too early (client): `Not claimable yet (retention window ends <local date time>)`. Or `Nothing claimable right now`.
- Server: `Nothing is claimable yet. It may still be in its retention window or under dispute.` (409 `NOTHING_CLAIMABLE`, contract `NothingToClaim`).
- `Already claimed` (409).
- `Verify with World ID before you use claims. Open Account and press "Verify with World ID".` (403).
- `Campaign has no on-chain escrow` (409).
- `No Claimed event for your wallet and this campaign in that transaction` (422 `CLAIM_NOT_VERIFIED`).
- `Not configured on this deployment. ...` (escrow address not set). The rail shows amber `Escrow is not configured on this deployment.` / `Claims are switched off until the contract address is set.` and disables the button.
- `The claim did not go through. Your balance is unchanged.` (any unknown error).
- `The Clippo service did not answer. Nothing was changed.`

### States

- Loading: `Balancing the books`; record: `Reading your record`; clips: `Pulling your clips`.
- Empty: texts above.
- Error: `Correction`. Not signed in shows the server's raw sentence `Sign in: GET /api/auth/nonce, then POST /api/auth/session with a SIWE signature` (see P-LEDGER-4) plus `Connect a creator wallet to see your ledger.`; signed in: `Your money is on-chain and unaffected.`
- Waiting for wallet: not applicable to claim (no wallet prompt). Connect uses `Check your wallet`.
- Not verified: record shows `Verify with World ID`; claim fails with the 403 text.
- Disabled: claim button when busy, nothing ready, or escrow missing.

### Copy worth noting

- `LedgerView.tsx:66` "What you're owed" vs `Owed, claimable now` vs `Claimable now`: three similar names for different numbers.
- `LedgerDash.tsx:47` `Still accruing, est.`
- `LedgerView.tsx:147` `Waiting for signature`.
- `LedgerView.tsx:154` "Claims are separate per campaign..." technical.
- `LedgerView.tsx:98` `Frozen, in review`, `Releases Nov 13`, `Open`: "Open" means ready to claim but also sounds like "not finished".
- `LedgerView.tsx:68` "Nobody else can hold your money up." is not exactly true: a frozen payout or a campaigner dispute can hold it.
- `LedgerDash.tsx:66` column `Conf.` = confidence; easily read as "Confirmed".

### Problems and suggestions

- **P-LEDGER-1 (high):** the top `Owed, claimable now` figure (server) counts credits still inside the review window, while the rail `Claimable now` (browser) excludes them. A creator can see two different "claimable" numbers on one page. Use one definition, and show "locked until <date>" separately.
- **P-LEDGER-2 (high):** `Still accruing, est.` is the estimate for all views of approved clips (`lib/earnings.ts:46`), not the part not yet credited. Part of it is already in `Owed` or `Claimed`, so adding the three figures double counts. Rename to `Estimated total from views so far` or subtract credited amounts.
- **P-LEDGER-3 (medium):** the busy label `Waiting for signature` is wrong. The claim uses Clippo's wallet; the user signs nothing (`lib/chain/client.ts:248`). Also the code comment in `hooks.ts:204` says "claim(id) on the escrow" but the real call is the server's `claimFor`. Use `Sending your money...`. The success box lists transaction hashes without an explorer link or amount.
- **P-LEDGER-4 (high):** signed-out users see a developer sentence (`Sign in: GET /api/auth/nonce...`) in the error box. A non-creator wallet sees `Requires role: CREATOR`. Replace with plain messages for 401 and 403.
- **P-LEDGER-5 (medium):** the `Releases <date>` per row uses the latest credit's date for the whole row (indexer overwrites `releaseAt` with the newest credit, `lib/chain/indexer.ts:170`). The contract releases each day's credit separately. So the screen (and the client-side claim check) can say "not yet" for money the contract would already release.
- **P-LEDGER-6 (medium):** a campaigner dispute (contract `disputeCredits`) is not shown to the creator. The row stays `Releases ...` or `Open`, and a claim then fails with the "may still be in its retention window or under dispute" text.
- **P-LEDGER-7 (medium):** pool-share campaigns pay nothing until the campaign closes. The screen shows an estimate but never says "pays after the campaign closes". Same for split: "set by split" gives no hint of who decides.
- **P-LEDGER-8 (medium):** a rejected clip in `Your clips` shows the reason but no `Appeal` control or link to the campaign page. The only appeal control is on `/slips/<id>`.
- **P-LEDGER-9 (low):** first paint: `now` starts at 0 until an effect runs, so rows with a release date briefly look "not released".
- **P-LEDGER-10 (low):** claim list is by payout row, one request each; a long list means many sequential requests with no progress indicator.

---

## 4. `/wire` : "Campaigns paying right now"

Page `<title>`: `The Wire`. Files: `WireView.tsx`, `Standing.tsx`, `Bits.tsx` (`Slip`). Kicker: `The Wire` / `Open campaigns`. Title: `Campaigns paying right now` ("right now" italic). Lead: `Every slip is a funded USDC pool that an admin has signed. Pick one you can say true things about.`

- **Purpose:** the public marketplace. Browse open campaigns and see the creator leaderboard.
- **Who:** anyone, no sign-in. **Reachable from:** nav `Wire`, footer `Wire, open campaigns`, landing page, 404 page `Browse the wire`, Join `Find a campaign`.
- Data: `GET /api/marketplace/trending?days=7&limit=40` (only campaigns in status Approved/live) and `GET /api/leaderboard?sort=...&limit=25`.

### Layout

1. Filter row: segmented buttons `All platforms`, `youtube`, `X`, `instagram` (aria group `Filter by platform`); segmented `Any rule`, `Per view`, `Split`, `Pool share` (`Filter by payout rule`); select `Sort` with `Trending`, `Highest rate`, `Most left`.
2. Campaign cards ("slips"). Each card is a link to `/slips/<id>`:
   - `No. XXXX` serial; brand (the campaign's topic text); payout rule (`Per verified view`, `Human-approved split`, `Pool share`); tag `Ranked only` if the campaign needs a higher-ranked creator.
   - Title.
   - Rate: per view campaigns: `$2.40` + `per 1K views` (USDC per 1,000 views). Others: `$5,000` (the pool) + `split by approval` or `shared by views` / `shared by approved clips`.
   - Progress bar `<n> percent of the pool allocated`; `$<left> left of $<pool>`; `open until closed` (always, the closing time is never filled in, `adaptCampaign closesIn: ""`).
   - Platform tags `YT`, `X`, `IG`; `<n>K views` or `no views yet`.
   - Under the card: `#<rank>` (only when sorted by Trending), then `+12K views in 7 days` or `No new views in 7 days`, and a verified mark if the campaigner is verified.
3. `Standing` section (see below).

How the trending order is made (`lib/workspace/marketplace.ts:trendScore`): views gained in the last 7 days + 100 x approved clips + 25 x clips submitted in the last 7 days. Highest first. `Pool`, `left` and the bar come from the campaign pool (gross, before the platform fee) and, for per view campaigns, an estimate views/1000 x rate capped at the pool. For the other two rules the bar is always 0% and `left` equals the full pool.

### Controls

| Label | Kind | What it does | Technical effect | Result | Clearer label |
| --- | --- | --- | --- | --- | --- |
| `All platforms` / `youtube` / `X` / `instagram` | toggle buttons (aria-pressed) | Show only campaigns that accept that platform. | Local filter, no request. | List shrinks. | `All`, `YouTube`, `X`, `Instagram` (labels are inconsistent: two are lower case) |
| `Any rule` / `Per view` / `Split` / `Pool share` | toggle buttons | Filter by how the campaign pays. | Local. | List shrinks. | `Any payout`, `Paid per view`, `Split by the brand`, `Shared pool` |
| `Sort` select: `Trending`, `Highest rate`, `Most left` | select | Reorders the list. Trending = server order. Highest rate = per-view rate (other rules count as 0). Most left = pool minus allocated. | Local. | | `Hot now`, `Highest pay per 1K views`, `Most money left` |
| Campaign card | link | Opens the campaign page. | Navigates to `/slips/<id>`. | | |
| `Clear filters` | link-button | Resets platform and rule (not sort). | Local. | | |
| `Try again` | link-button | Reloads. | | | |

### States

- Loading: `Setting the wire`. Error: `Correction` `The wire did not come back.` / `Your campaigns are safe. Nothing was changed.` + cause + `Try again`. Empty after filters: `Nothing on the wire matches that.` / `Try another platform or payout rule.` + `Clear filters` and a looping clip captioned `Waiting on a clip`. No special text when there are no campaigns at all (same empty text).

### Standing (leaderboard, same page)

- Heading `Standing`; toggle `Verified views` | `Est. USDC` (label of the group: `Rank creators by`).
- Table: `#`, `Creator` (display name or short wallet, verified mark, tier chip, a bar relative to the leader), `Verified views`, `Approved clips`, `Campaigns`, `Est. USDC`. Caption `Ranked by verified views on approved clips. Earnings are estimates before platform fees.` Top 25.
- `Verified views` here is Clippo's own count of approved clips' views, not the Chainlink Confirmed number (CRE scope keeps the leaderboard on Clippo count, `docs/CRE_SCOPE.md` section 1.4). `Est. USDC` = estimates for per view and pool share + credited split payouts.
- Tier chips (marketplace tiers, `lib/workspace/rank.ts`): `New`; `Rising` = 3+ approved clips and reliability 0.6 or more; `Pro` = 10+ and 0.75; `Elite` = 25+ and 0.85. Reliability = approved / (approved + rejected).
- Loading `Counting views`. Empty `No one is on the board yet.` / `Creators appear here after their first approved clip collects views.` Error `Standing could not be tallied.` / `Nothing was changed. Try again.`

### Problems

- **P-WIRE-1 (medium):** `Allocated`/`left`/progress is a computed estimate for per view and always 0% for the other two rules, so `$5,000 left of $5,000` can be wrong. The label should say "estimated".
- **P-WIRE-2 (medium):** `open until closed` is the same on every card; the `closes in` text can never appear (`closesIn` is always empty). Remove or fill it.
- **P-WIRE-3 (medium):** the card shows nothing about the eligibility rule in words except the small `Ranked only` tag, nothing about "needs a verified channel", and not the confirmed/pending distinction.
- **P-WIRE-4 (medium):** `Verified views` in Standing is not Confirmed views; the two words clash with the Ledger. Rename to `Views (Clippo count)` or show Confirmed.
- **P-TIER (high):** two tier systems with the same names. Marketplace/`Standing`/Ledger chip: New, Rising (3 clips), Pro, Elite. `/status` ladder: Verified, Rising (5 clips, 70%, 1K views), Partner, Top. `Marks.tsx` maps both to one icon set. A creator can be `Rising` in one and not the other. "Ranked only" uses the first one.
- **P-WIRE-5 (low):** the platform buttons mix `youtube` / `instagram` (lower case) with `X`. `creators` count on cards never shows (always 0 in `adaptCampaign`).
- **P-WIRE-6 (low):** `Sort` / `Highest rate` ignores split and pool campaigns (rate 0), which sink to the bottom with no explanation.

---

## 5. `/slips/[id]` : the campaign page (title = the campaign title)

Page `<title>`: none set (browser shows the site default `Clippo — pay only for clips that passed`). Files: `SlipDetail.tsx`, `AppealPanel.tsx`, `CreatorAssistant.tsx`, `DealPanel.tsx`, `ConfirmedViews.tsx`, `Stamp.tsx`.

- **Purpose:** read the brief, see performance, join, submit clips, read verdicts, appeal rejections.
- **Who:** anyone can read it. Joining and submitting needs a signed-in, verified creator. **Reachable from:** a card on `/wire`, referral links (`/slips/<id>?ref=<code>`), `Campaigns that fit` list.
- Data: `GET /api/campaigns/<id>` (visible when campaign is Approved or Closed; otherwise 404), `GET /api/campaigns/<id>/views`, `GET /api/campaigns/<id>/submissions` (a creator sees only their own), `GET /api/creator/earnings`.

### Layout

**Header:** breadcrumb link `The Wire` (back to `/wire`), `No. XXXX`, payout rule. Big title. Lead = the campaign's summary sentence.

**Left rail "The brief"** (aria label; no visible heading):
- `Rate`: per view: `$2.40` `per 1K` (USDC per 1,000 views). Other rules: the pool amount.
- `Pool`: total USDC the brand put in (gross, before the platform fee).
- `Allocated`: for per view: estimate views/1000 x rate (capped at pool); other rules: always 0 (not the real allocated amount).
- `Left`: pool minus allocated.
- `Closes`: `when closed` (always, the closing time is never filled in).
- `Post on`: platforms allowed (`YouTube, X, Instagram`).
- `Who`: `Any verified` or `Ranked only`. "Ranked only" = needs tier Rising or better: 3+ approved clips and reliability at least 0.6 (`lib/workspace/eligibility.ts`).
- `Source material` + button `Download source` (only when the brand uploaded a file): downloads it, opens a new tab.

**Heading `Performance`** + `<n> views, Clippo count` (the sum of views of approved clips):
- `Confirmed views, all creators` line (not shown for split campaigns): number, `Chainlink confirmed` badge, `Pending <n>[, not paid yet]`, `Proof 0x...` link, and the explainer `Confirmed = read from YouTube by Chainlink CRE nodes and written on Arc. Pending = Clippo's own count. Only Confirmed is paid.`
- Chart of cumulative daily views, `day 1` to `day N`; before two daily points exist: note `Daily history` / `The chart fills in once the first daily view snapshots are saved.`
- `Payout progress` `<n>% of pool allocated` with a tick bar.
- `Creators` (always `0` today, see problems) and `Clips` (= approved clips).

**Heading `The brief`:** the story paragraph (description, else summary). `Must say` list (green left bar) = required points. `Must not say` list (red left bar) = prohibited claims. `Disclosure` = the label text the clip must show (e.g. `#ad`). The campaign's attribution rule (e.g. "Credit the source footage") is not displayed (see problems).

**Heading `Your clips`** (the join and submit area). Which body appears:
1. Campaign closed (Closed, or Rejected): `Closed to new clips.` / `This campaign is no longer taking submissions.`
2. No wallet: `Connect a wallet to join.` + button `Connect wallet` + "Joining and claiming use your own address." (+ " You arrived through a referral link." if `?ref=`).
3. Wallet but not verified: `Verify you are a person first.` + link `Verify with World ID` (to `/join`) + "One person, one account. It takes under a minute."
4. Verified but not joined and no clips: `Not joined yet.` + button `Join this campaign` + "Joining is free. Post on YouTube or X from a channel you have proven, then paste the link here." (platform list from the campaign).
5. Joined (or already has clips): the submit form and the list of your clips.

**Form:** label `Clip link`, input with placeholder `https://youtube.com/shorts/… or x.com/… or instagram.com/…`, button `Submit` (`Sending` while working). Hint: `Before you submit: say the required points out loud, show the label in the first 5 seconds, avoid every prohibited claim.` Live readiness line under the box (`LinkReadiness`).

**Each clip row:** platform and date; tag `Appeal open`; clip title link; `Agent note` + reason; the appeal panel; on the right the stamp (`Approved` / `Rejected` / `Needs human` / `In the queue`, with `CONF 0.91`), `<n> views` or `no views yet`, a label `Clippo count` (or `Clippo count (pending)` on pay-per-view / pool-share campaigns), and `<amount> USDC` or `unpaid`.

For signed-in creators on pay-per-view / pool-share campaigns: `Your confirmed views` line (same `ConfirmedViews` block, with your numbers).

**Below:** `Desk assistant` box (creators, open campaigns) and `Rate deal` box (pay-per-view campaigns), described next.

### How a creator submits a clip, step by step

1. Be signed in as a creator and verified (`/join`).
2. Have a proven channel on the same platform as the link (`/join` step 2 or `/account`).
3. Click `Join this campaign`: calls `GET /api/campaigns/<id>/eligibility`. Joining is only a check; nothing is stored by the server. If eligible: the form appears. If not: red text (see below).
4. Post the clip on the platform. Paste the link in `Clip link`, click `Submit`.
5. The page picks the platform from the link (YouTube, X, Instagram; else the button stays disabled and the red note `Cannot submit This is not a YouTube, X or Instagram link.` shows). It reads your channels (`GET /api/channels`) and uses the first verified channel on that platform. No verified channel on that platform: `Prove a YouTube channel first. Your account has none verified.` (X/Instagram worded the same way).
6. `POST /api/submissions {campaignId, channelId, link}` (30 per hour per IP). The server, in one request: checks campaign is live and you may submit, checks channel is yours and verified and allowed on this campaign, parses the link, refuses duplicates, fetches the video (title, description, transcript, views), asks the AI to judge it, saves clip and verdict. The result appears right away at the top of `Your clips`.
7. The AI decides (`lib/ai/verifier.ts`): Reject if the video was not posted from your verified channel (`The clip was not posted from a channel you have verified.`), or an exact duplicate. Needs human if there is no transcript, the platform cannot be read (X, Instagram), the AI is unsure (confidence under 0.75), the AI is unavailable, the text tries to instruct the AI, it is a near duplicate, the disclosure label is missing, a prohibited claim appears, or attribution is missing (an approval is downgraded, never upgraded, by these rules). Approve otherwise.

Join and submit failure text (shown in red under the box or in the empty state):
- `This campaign is limited to creators the campaigner hired.` (`NOT_HIRED`)
- `Verify with World ID first.` (`NOT_VERIFIED`)
- `This campaign needs rising tier or better. You are new.` (higher-ranked rule; tier names from the marketplace system)
- `You can't join this one right now.`
- Submit: `Campaign not open for submissions`, `Requires tier RISING or higher (3+ approved clips, reliability >= 0.6)`, `This campaign is restricted to the creators approved on its hire`, `Verify channel ownership first`, `This campaign does not accept YOUTUBE clips`, `Not a valid YOUTUBE video link`, `This video was already submitted to the campaign`, `Could not read video` (or the platform error, 422 `VIDEO_UNREADABLE`), `Verify with World ID before you use submissions...`.

Readiness lines under the input (`CreatorAssistant.tsx:13`): wrong platform: `Wrong platform This campaign pays for YouTube posts. A X link will be rejected.` YouTube: `YouTube: transcript and views are read automatically. Verdict in under a minute.` X / Instagram: `Human review X posts cannot be read automatically. This one goes to a person, not the agent, and cannot be approved instantly. Expect up to a day.`

### The verdict stamp and the Agent note

| Stamp | Meaning (from code) | What happens next |
| --- | --- | --- |
| `Approved` (green) | AI (or a human) judged the clip follows the brief. | Counts toward views and pay. Views are then tracked daily; only Confirmed views pay on per view / pool share. |
| `Rejected` (red) | AI or a human judged it breaks the brief, or wrong channel, or duplicate. | Creator may appeal once. |
| `Needs human` (ochre) | The AI was not sure or could not read the clip. | A reviewer decides. Panel text: `With a person` + `The agent was not sure.` (YouTube) or `This platform cannot be read automatically.` + `A reviewer decides. Nothing for you to do.` |
| `In the queue` (dashed grey) | No verdict yet. | In practice not seen after a real submit, because the verdict is created with the submission. The old text `Queued. The agent is reading the transcript.` exists as a fallback. |

`CONF 0.91` = the AI's own estimate of how likely its answer is right (0 to 1). A human decision is stored as confidence 1.00. The stamp in the Ledger table says `Pending` for the same state (inconsistent word).

`Agent note` = the AI's reason (1 to 3 sentences) or a fixed system message, or the human reviewer's reason after an override. Some notes contain technical text such as `(confidence 0.62 below threshold 0.75; sent to human review)`, `Possible prompt injection in clip text; sent to human review.`, `Not auto-approved: the required disclosure label "#ad" was not found in the clip text; sent to human review.`

### The appeal (inside each clip row, `AppealPanel.tsx`)

Shown only for a `Rejected` clip (or an approved clip whose appeal was overturned). Progress strip `01 Campaigner reviews` / `02 Admin reviews` / `03 Final`.

| Label | Kind | What it does | Technical effect | Enabled when | Result | Clearer label |
| --- | --- | --- | --- | --- | --- | --- |
| `Appeal this verdict →` + `Once per clip · the campaigner reads it first` | link-button | Opens the appeal form. | Local. | Rejected, never appealed. | Form appears. | `Appeal this rejection` |
| `Why is the verdict wrong?` | textarea (min 10 chars) | Your note. Placeholder `Point at the timestamp or the rule.` Hint `One appeal per clip. The reviewer reads your note next to the agent's reason.` | Local. | | | |
| `Send appeal` | button | Sends the appeal. | `POST /api/submissions/<id>/appeal {note}` (creator only, own clip, only a Rejected verdict, only once). Creates an Appeal (stage Campaigner, status Open, due in 72 hours, env `APPEAL_SLA_HOURS`), sets the verdict's appeal status to Pending, notifies the campaigner. | Note has 10+ characters, not busy. | Form closes, `Appeal open` tag, note `Waiting on the campaigner` + `Due <date time>. After that an admin may step in.` + `The clip stays rejected until someone decides.` Errors: `Only rejected clips can be appealed`, `Already appealed`. | `Send my appeal` |
| `Cancel` | link-button | Closes the form. | Local. | | | |
| `Escalate to an admin →` | link-button | After the campaigner upheld the rejection, hand it to an admin. | `POST /api/appeals/<id>/escalate`. Creator allowed only when status is Upheld. Stage becomes Admin, admins notified. | Campaigner upheld. | Note `Waiting on admin` / `An admin makes the final decision. The clip stays rejected until then.` | `Ask an admin to decide` |

Appeal states: `Waiting on the campaigner` (`That has passed, so an admin may now take it over.` if overdue), `Campaigner upheld the rejection` (+ resolution text, "You can hand it to an admin for a final decision."), `Waiting on admin`, `Overturned` ("The clip now counts toward payout."), `Upheld by admin` ("This is final."). Resolving an appeal changes only the verdict; payouts are not touched directly (`lib/appeals.ts` header). The creator is notified through an in-app record, but no screen shows notifications (see P-SLIP-6).

### Desk assistant (creators on open campaigns)

Heading `Desk assistant`, `Advice. It does not decide verdicts.` Tabs:
- `Explain the brief`: loads on open. `POST /api/assistant/creator/explain`. 2 to 3 plain sentences (AI, with a fixed fallback), `Do` list, `Avoid` list, `Label`. 30 per hour.
- `Check before posting`: textarea `Caption and description you plan to post`, hint "The link in the box above is checked too." / "Paste the link above to include it." + "Nothing is submitted." Button `Check for rejection risk` (`Reading`). `POST /api/assistant/creator/check`. Rule-based, mirrors the verifier. Result rows: `Likely reject` (blocking), `Check` (warning), `Note`, each with the rule name (`Disclosure`, `Must not say`, `Must say`, `Platforms`, `Review`, `Attribution`, `Topic`, `Integrity`, `Clear`). Enabled when caption or link has text.
- `Campaigns that fit`: `GET /api/assistant/creator/matches`. Up to 5 open campaigns you have not submitted to, each with a score number (fit 0 to 99), campaign link, `<platform> · <pays>` and `Why`. Score = 0.25 + 0.45 if you have a verified channel on an allowed platform + up to 0.3 for topic overlap with your approved clips + up to 0.15 for pay.

### Rate deal (per view campaigns, signed-in non-admin)

Heading `Rate deal`, `Listed $2.40 per 1K`, text "The negotiator trades offers inside the band the campaigner set. Anything outside goes to a person. Money moves only when both sides accept." Shows status (`Proposed`, `Countered`, `Agreed`, `Declined`, `Expired`), `Pool left`, band bar (`Allowed band, USDC per 1K views`), offers list, `Creator accepted / has not accepted` + `Signed` / `Open`. Controls: `Accept $x.xx`, `Decline`, form `Rate` (USDC / 1K views), `Note`, button `Send offer` / `Send counter`. `POST/GET /api/campaigns/<id>/deal...`. Creators must be verified. The rate must be inside the band (`Outside the band: $a to $b. The negotiator cannot take this.`). After both accept: "Both sides accepted $x per 1K views. This rate applies to this creator's approved clips from now on." Campaigners see `Campaigners answer offers here. Counter-offers and standing limits need a named creator, which this panel does not select yet.` (Full documentation of deals belongs to the brand part; the claim in the last sentence is checked in P-SLIP-4.)

### Referral inside the page

`?ref=<code>` is kept in the browser session for this campaign. On `Join this campaign`, if eligible, `POST /api/referral/attribute {code}`. Notes shown: `Referral recorded: the creator who sent you earns a cut of your activity.`, `You were already referred by someone else, so this link was not counted. The first referral wins.`, `This referral link could not be counted (for example, it is your own).`. When the referral module is off, nothing is shown.

### States

- Loading: `Pulling the slip` (page), `Pulling daily views`, `Pulling your clips`, `Reading the brief`, `Matching`, `Opening the deal file`.
- Not found: `No such slip.` + button `Back to the wire` + `It may have closed, or the link is wrong.` Error: `Correction` `That campaign could not be loaded.` + cause.
- Empty clips: `No clips yet.` / `Paste a link above. The verdict lands here with its reason.`
- Closed: `Closed to new clips.` and assistant/deal hidden.
- Waiting for wallet: `Check your wallet` on `Connect wallet`.
- Not verified: `Verify you are a person first.`
- Disabled: `Submit` when sending, empty or bad link; `Join this campaign` while `Checking`.

### Copy worth noting

- `SlipDetail.tsx:224` `The brief` (the rail has no visible heading although its aria label is "The brief").
- `SlipDetail.tsx:190` `Allocated` is an estimate; `Closes` always says `when closed`.
- `SlipDetail.tsx:209` `<n> views, Clippo count` next to `Confirmed views, all creators`.
- `SlipDetail.tsx:240` `Your clips`, `Not joined yet.`, `Joining is free.`
- `SlipDetail.tsx:265` hint: "say the required points out loud, show the label in the first 5 seconds" - the "first 5 seconds" rule is not checked by the AI; the AI only checks that the label text appears in the transcript/title/description.
- Stamp `Needs human`, `In the queue`, `CONF`.

### Problems and suggestions

- **P-SLIP-1 (high):** the creator is never told how they get paid on this page: nothing explains Confirmed vs Pending beyond the explainer (visible only on the all-creators line), nothing says that pool-share pays after the campaign closes, split is decided by the brand, and per view pays after a 7-day window and a 0.25% fee.
- **P-SLIP-2 (high):** the brief hides one enforced rule: attribution (e.g. "Credit the source footage"). The AI downgrades a clip that has no crediting words or @mention (`verifier.ts checkStoryRules`), but the creator is not shown the rule on this page.
- **P-SLIP-3 (medium):** the page picks the first verified channel on the link's platform (`api.ts submitLink`). A creator with two YouTube channels who posts on the second gets `The clip was not posted from a channel you have verified.` (REJECT, confidence 1.0). Let the user pick the channel, or match it by the link.
- **P-SLIP-4 (high):** the deal text "This rate applies to this creator's approved clips from now on" is not enforced anywhere in the code I read: `acceptedRate` is only stored and returned (`lib/deals.ts`); the escrow credits with the campaign's own `ratePer1kViews` (`ClippoEscrow.sol reportViews`); API docs say accepting "moves no money". Not determined whether another process applies it. Remove or reword until it is.
- **P-SLIP-5 (medium):** `earned` is always 0, so every clip shows `unpaid`; `Creators` always shows 0; `Clips` counts approved clips only; platform on reloaded clips is always labelled YouTube (`adaptSub`). Hide or fix.
- **P-SLIP-6 (high):** appeal and verdict results are delivered only as in-app notification records; no screen reads them (`api/notifications` has no UI). The creator must come back and look. Add a status badge in the Ledger and the nav.
- **P-SLIP-7 (medium):** `Join this campaign` does nothing server-side (no record), so it is a gate with no meaning. Many creators will think they "joined". Either drop it or show the eligibility result in words ("You can submit here").
- **P-SLIP-8 (medium):** the `Desk assistant` runs an AI request as soon as a creator opens any campaign page (`Explain the brief` is the default tab), counted in the 30 per hour limit.
- **P-SLIP-9 (low):** the `Download source` button is a link with `download`; the file link text `Upload` icon suggests uploading.
- **P-SLIP-10 (medium):** the verdict arrives only after the page waits for the server to read the video and call the AI; the button shows only `Sending`. A slow transcript fetch can look stuck.
- **P-SLIP-11 (low):** jargon: `Slip`, `Pool`, `Allocated`, `Agent note`, `CONF`, `Clippo count`, `Desk assistant`, `Rate deal`, `negotiator`.

---

## 6. Optional module pages (`/status`, `/referrals`, `/profile`)

Files: `ModulePages.tsx`, `lib/features.ts`, `lib/modules/*`. The three modules are OFF by default: env `FEATURE_STATUS_LADDER`, `FEATURE_REFERRAL`, `FEATURE_TOKENIZATION` (the profile page) are `false` in `.env.example`; on only for `true` or `1`.

### When a module is off

The page asks its API first. A disabled module answers 404 `FEATURE_DISABLED`; the page then calls `notFound()`. The visitor sees the site 404 page (`not-found.tsx`): kicker `No. 404`, title `Not on file`, lead `There is no page at this address.`, `Nothing here.` button `Browse the wire`, and the sentence `The link may be cut short, or this part of Clippo is switched off in this build.` The links to these pages (`Status ladder`, `Referral links`, `On-chain profile`) on the Ledger only render when the endpoint answers, so with modules off the links are absent.

Order of checks on the server: the feature switch is checked before sign-in, so a signed-out visitor to an off module also sees the 404.

When a module is on but the visitor is signed out (referrals, profile): a `Correction` with the raw server text `Sign in: GET /api/auth/nonce, then POST /api/auth/session with a SIWE signature`, then `Connect a creator wallet to see this page.` and a button `Connect as a creator`. The status ladder is public, so signed-out visitors see the rungs and the rail says `Sign in to see your rung.`

If the Clippo service is unreachable, these pages show the 404 as well (the probe treats a network failure as "module off", `api.ts` `probe`). See P-MOD-1.

### 6.1 `/status` : "Climb on approved work"

Page `<title>`: `Status ladder`. Kicker `Status` / `Creator ladder`. Title `Climb on approved work`. Lead: `Tiers come from approved clips, approve rate and verified views. Followers are not counted. One fraud flag caps you at the first rung.`

- **Purpose:** show the creator tiers and where you stand.
- **Who:** anyone (ladder public); your own place needs a creator login. **Reachable from:** Ledger link `Status ladder` (module on only).
- Data: `GET /api/status/ladder` (public), `GET /api/status/me` (creator).

Layout:
- `The rungs` (heading): numbered list. Each rung: tier name (`Verified`, `Rising`, `Partner`, `Top`), a chip for your current one, requirement text, and on the right `Held` / `You are here` / `Ahead` (blank when signed out). Requirements (`lib/modules/ladder.ts`): Verified: `Verify as a human with World ID.` Rising: `5 approved clips, 70% approve rate, 1K verified views.` Partner: `20 approved clips, 85% approve rate, 50K verified views.` Top: `50 approved clips, 92% approve rate, 500K verified views.`
- Rail `Your standing`: signed out: `Sign in to see your rung.` + button `Go to the ledger` + `The ladder is public. Your place on it is not.` Signed in: `Your tier` (name or `None yet`; if none: `Verify with World ID to enter the first rung.`), table `Approved clips`, `Approve rate`, `Verified views`, `Fraud flags`; `To reach <tier>` with bars for `Approved clips` and `Verified views` (`have / need`) and a line `Approve rate  x% / y%`; at the top: `Top rung. Nothing above it.`
- `Verified views` = Clippo's own count of views on approved clips (not Chainlink Confirmed). `Fraud flags` counts verdict flags named duplicate, injection, fraud, fake_views, botted; any flag means tier Verified at most. An unverified person has no tier.
- Controls: only `Go to the ledger` (link) and `Try again` / `Connect as a creator` in the error gate.
- States: `Reading the ladder`.

Problems:
- **P-STATUS-1 (high):** a second tier system with the same names as the marketplace tiers (see P-TIER). Nothing on the page says which tier gates "Ranked only" campaigns (it is the marketplace one: Rising = 3 clips, reliability 0.6). This ladder is informational (and the on-chain profile tier).
- **P-STATUS-2 (medium):** a `duplicate` flag (given to a rejected duplicate clip) counts as fraud and caps the creator at Verified. The wording "fraud flag" is harsh for a duplicate upload.
- **P-STATUS-3 (low):** `Go to the ledger` is a poor next step when signed out; the ledger then asks to connect.

### 6.2 `/referrals` : "Bring a person, keep a cut"

Page `<title>`: `Referrals`. Kicker `Referrals` / `Creator`. Title `Bring a person, keep a cut`. Lead (numbers from the server, defaults 5%, $100, 24 hours): `Share a campaign link. When someone verified joins through it, you earn 5% of their activity, up to $100, with 24 hours between credits.`

- **Purpose:** create and share referral links for campaigns and see credit.
- **Who:** signed-in creators. **Reachable from:** Ledger link `Referral links` (module on only).
- Data: `GET /api/referral/summary`, `GET /api/campaigns`, `POST /api/referral/links`.

Layout:
- If frozen: amber `Referral credit is frozen on your account.` / `Links you already made stay up, but nothing new accrues until an admin lifts it.`
- `Make a link`: select `Campaign` (every campaign the list returns) and button `Make link` (`Making`). Empty: `Nothing to refer to.` / `Links attach to a live campaign. None are open right now.`
- `Your links`: for each link, the campaign title and a box with `<this site>/slips/<campaignId>?ref=<code>` and a `Copy` button (`Copied`). Empty: `No links yet.` / `Make one above, then post it where your audience is.`
- Rail `Referral totals`: `Credited so far` (USDC), `People referred`, `Room under the cap`, `Cut` (percent), bar `Share of the referral cap used`.

Controls:

| Label | Kind | What it does | Technical effect | Enabled when | Result |
| --- | --- | --- | --- | --- | --- |
| `Campaign` | select | Picks the campaign for the link. | Local (defaults to first). | Campaigns exist. | |
| `Make link` | button | Creates (or returns the existing) link for that campaign. | `POST /api/referral/links {campaignId}`. Only live (Approved) campaigns: else `Campaign not open for referral`. Frozen: `Referrer is frozen`. One link per creator per campaign; the code is random. | Not busy, not frozen. | Link appears at the top. |
| `Copy` | button | Copies the full link. | Clipboard. | | `Copied` for 1.8 s. |

How credit is earned: when a verified new creator opens the link, joins (`Join this campaign` on the slip), the code is attributed once (first referral wins; not yourself; not the same human; no loops; the referee must be a verified human). Credit is recorded by `POST /api/referral/accrue`, which only an admin or the cron secret can call, with limits (5% cut, $100 cap, 24 h cooldown by default). What triggers accrual and how the credit is paid out to the creator is not determined from the screens or routes read: no screen shows a payout or claim for referral credit.

Problems:
- **P-REF-1 (high):** `Credited so far` is a record only; no screen or button claims or pays it, and the code that calls accrue is not on any creator path. A creator may expect money.
- **P-REF-2 (medium):** "activity" is not defined for the creator ("5% of their activity" of what: views, earnings?). Not determined from code what amount is passed in.
- **P-REF-3 (low):** the list of campaigns in the select is not filtered to live ones; a non-live pick fails with `Campaign not open for referral`.
- **P-REF-4 (low):** a visitor who opens a referral link but is not yet a creator keeps the code only in the browser session of that campaign page.

### 6.3 `/profile` : "Your record, on the record"

Page `<title>`: `On-chain profile`. Kicker `Profile` / `On-chain, non-transferable`. Title `Your record, on the record`. Lead: `An opt-in public profile of your approved clips, views and earnings, tied to your wallet. It cannot be sold or moved, and there is no token.`

- **Purpose:** opt in to publishing your track record on-chain.
- **Who:** signed-in creators. **Reachable from:** Ledger link `On-chain profile` (module on only).
- Data: `GET /api/creator/onchain-profile`, `POST /api/creator/onchain-profile {optIn}`.

Layout:
- `What would be published`: `Tier` (`None`, `Verified`, `Rising`, `Partner`, `Top`; only non-zero when the status ladder module is also on), `Approved clips`, `Rejected clips`, `Verified views`, `Earned, USDC` (total of claimed payouts, gross). If written before: `Last written <date>` and `tx 0x...`.
- Rail `Status`: big `Opted in` or `Off`. Text when off: `Nothing is published unless you opt in. You can opt out at any time.` When on: `Your figures are written to your wallet's profile when they change. Opting out stops new writes; clearing what is already on-chain is a transaction from your wallet.`
- Button `Opt in` (primary) or `Opt out` (ghost), `Saving` while working. Error: `Correction`.

Technical effect of the button: only sets a flag in Clippo's database (`setOptIn`). Opting out also clears the stored sync state. Actual writing is done by an admin/cron sync (`POST /api/creator/onchain-profile/sync`) using a server signer (`updateProfile` on `ClippoCreatorProfile`), and only for creators who already called `optIn()` on that contract from their own wallet (otherwise skipped: `has no on-chain profile (the creator must call optIn() on ClippoCreatorProfile first)`). No screen has a button for that wallet transaction or for clearing on-chain data.

Problems:
- **P-PROF-1 (high):** `Opt in` promises "written to your wallet's profile" but the page cannot create the on-chain profile; nothing tells the creator they must also call `optIn()` from their wallet, and a sync run by an operator is needed. A creator can see `Opted in` forever with nothing on-chain.
- **P-PROF-2 (medium):** `Tier` shows `None` when the status ladder module is off, even for a creator with approved clips.
- **P-PROF-3 (low):** "tied to your wallet", "non-transferable", "no token" are legal-style claims; `Opt out` text mentions a wallet transaction that the UI cannot start.

### 6.4 Problems common to modules

- **P-MOD-1 (low/medium):** service down or network failure on these pages shows the 404 "Not on file" instead of an error with `Try again`.
- **P-MOD-2 (low):** pages for modules that are off give no hint that a feature exists; fine for production, but a team member testing sees only a 404.

---

## 7. Problems that cut across all these screens

- **P-VOCAB (high):** print words (Desk, Wire, Slip, Ledger, Standing, Correction, Stamp, Bench, Hire) and invented terms (Clippo count, Confirmed/Pending, Agent note, Desk assistant, negotiator, rungs) are never explained on first use. A short glossary tooltip or plain labels (`Campaigns`, `Earnings`, `Leaderboard`, `Error`) would help most.
- **P-NAV (medium):** nav shows `Hire`, `Desk`, `Bench` to every visitor, including creators; there is no `Join` link in the nav and no link to `/status`, `/referrals`, `/profile` unless a module is on.
- **P-MONEY (high):** four related money numbers with different definitions (see P-LEDGER-1, P-LEDGER-2); gross vs net (fee at claim) is explained only in the small fee preview.
- **P-WALLET (medium):** wallet connect uses a SIWE signature, a role sheet and a possible wallet picker; texts such as `Check your wallet` do not tell which of those is expected.

---

## 8. Creator journeys

For each journey: screen, exact label, and where a first-time user most likely gets stuck (STUCK).

### J1. Join and verify as a human

1. Open the site. Footer `Join as a creator` or landing link `Verify and join` (the nav has no join item). Screen `/join`, title `Two desks. Pick one.`
2. Click the tile `I clip` (radio).
3. Step 1 · One person, one account, `Prove you are a human.` Click `Connect wallet`. (Header may first show `Choose a wallet` or `No wallet found`.) The wallet asks for an account, then a signature request. If the wallet is new the header sheet asks `Which desk is this wallet for?`: click `I clip: creator`, sign again.
4. Click `Verify with World ID (Proof of Human)`. The World ID widget opens; approve in World App.
5. Success: `Verified with World ID.` and Step 2 is no longer dimmed.
STUCK: no browser wallet installed (needs an extension, mobile browsers); not knowing what World ID or World App is; a wallet that is already a campaigner account; a person with no Proof of Human credential (box `No Proof of Human credential.`, `Continue without verifying (viewer only)`); the dimmed Step 2 gives no hint that Step 1 must be finished first.

### J2. Prove a YouTube channel

1. `/join` Step 2 · Prove a channel (`Show it's yours.`), or `/account` section `Channels` and click `Add a channel`.
2. `Platform` = `YouTube`. Type `Channel handle` (e.g. `@yourchannel`). Click `Get my code`.
3. Copy the code (`clippo:0x...`) with `Copy`.
4. In YouTube Studio, paste it into the channel About description and save.
5. Back on Clippo click `I put it there. Check.` Success: `Channel proven.` On `/join` the `Done` block appears with `Find a campaign`.
6. If the channel was on an old code: Account shows `Re-verify needed`; click `Get my new code`, paste the new one, click `I put it there. Check.`
STUCK: the check fails with `Code not found yet.` because YouTube takes a minute or the code was put in a place other than the channel description (About); handle typed with a different spelling (`Channel not found`); the code looks like a text a person might change (it is the wallet in lower case); having two channels (see P-SLIP-3). Keep the code in the bio, the nodes read it again at every report. For X, a person may confirm (`Sent to a person.`). For Instagram the proof cannot be completed from the UI (P-JOIN-IG).

### J3. Find a campaign

1. Nav `Wire`. Screen `/wire`, `Campaigns paying right now`.
2. Use the filters `All platforms` / `youtube` / `X` / `instagram`, `Any rule` / `Per view` / `Split` / `Pool share`, and `Sort`.
3. Click a card. Screen `/slips/<id>`. Read `Rate`, `Pool`, `Left`, `Post on`, `Who`, then `The brief` (`Must say`, `Must not say`, `Disclosure`).
4. Optional: open `Desk assistant` tab `Campaigns that fit` to get suggestions.
STUCK: not understanding the rules `Split` and `Pool share` (how and when they pay); `Ranked only` campaigns (tier rules are not explained); the numbers `Allocated` and `Left` being estimates.

### J4. Submit a clip

1. Be verified (J1) and have a proven channel (J2). Open the campaign page `/slips/<id>`.
2. In `Your clips` click `Join this campaign`. (If asked, `Connect wallet` or `Verify with World ID` first.)
3. Optional: tab `Check before posting`: paste the caption, click `Check for rejection risk`.
4. Post the video on the platform (YouTube Short etc.), with the required points spoken, the label (e.g. `#ad`) in the text.
5. Paste the link in `Clip link`. Click `Submit`. Wait for `Sending`.
6. The clip appears at the top of `Your clips` with a stamp and an `Agent note`.
STUCK: no verified channel on that platform (`Prove a YouTube channel first...`); the video has no captions so the AI cannot read it (`Needs human`); posting from a different channel than the verified one (instant `Rejected`); missing disclosure label in the text; submitting the same video twice (`This video was already submitted to the campaign`); a wrong-platform link (`A X link will be rejected`).

### J5. Read a rejection and appeal

1. `/slips/<id>` (the only place with the appeal control), `Your clips`, find the clip with the `Rejected` stamp. Read `Agent note`.
2. Click `Appeal this verdict →`.
3. In `Why is the verdict wrong?` write at least 10 characters (point at the time or the rule). Click `Send appeal`.
4. Wait: `Waiting on the campaigner` (due in 72 hours). Come back to the same page to look at the progress strip `01 Campaigner reviews` / `02 Admin reviews` / `03 Final`.
5. If the campaigner upheld it: click `Escalate to an admin →`. Wait for `Waiting on admin`.
6. Final: `Overturned` (the clip then counts toward payout) or `Upheld by admin` (`This is final.`).
STUCK: finding where to appeal (the Ledger lists the rejection but has no appeal link); no notification when the campaigner decides; not knowing that the appeal is once per clip; a `Needs human` clip has no appeal (nothing to do).

### J6. See confirmed views

1. `Ledger`. Section `Your record`: the big `Confirmed views` figure, `Pending <n>, not paid yet`, `Chainlink confirmed` badge and `Proof 0x...` link.
2. Table `Still earning`, column `Views`: Confirmed per campaign with Pending beneath.
3. On `/slips/<id>`: `Confirmed views, all creators` under `Performance`, and `Your confirmed views` in `Your clips`.
4. Click `Proof 0x...` to open the on-chain report on the Arc explorer.
5. If the pending number is more than zero and confirmed is zero, `/account` shows `<n> pending views, none confirmed.`: check the code in the YouTube bio and wait for the next report (daily 00:30 UTC).
STUCK: why Confirmed is lower than the number on YouTube (only approved clips on a channel whose bio holds the code are counted, and only after the daily report); the label `Conf.` in the clips table means confidence, not confirmed; HUMAN_SPLIT campaigns show no Confirmed number at all (`Clippo count`).

### J7. Claim money

1. Nav `Ledger`. Check `Claimable now` in the right rail and the `Status` column in `Settlements` (`Open` = ready, `Releases Nov 13` = still in the 7-day window, `Frozen, in review` = held).
2. If not signed in: click `Connect wallet to claim`.
3. Read the fee box `Fee preview, claim` (`Gross payout`, `Platform fee`, `You receive`).
4. Click `Claim <amount> USDC`. No wallet popup is expected. The label says `Waiting for signature` while it runs.
5. Success: `Claimed and verified on-chain.` and the transaction hash. `Already claimed` goes up and the rows show `Claimed · 0x...`. The money (minus the fee) is in the creator's wallet on Arc.
6. On failure read the red `Correction` (see claim failure cases) and click `Try again`.
STUCK: two different "claimable" numbers (P-LEDGER-1); `Waiting for signature` makes people look for a wallet popup; claim refused with "retention window or under dispute" without a way to see the cause; pool-share and split money not appearing until the campaign closes or the brand releases; not being verified (`Verify with World ID before you use claims`).

---

## 9. What could not be determined from the code

- How and when referral credit is generated and paid (accrue is admin/cron only; no caller on a creator path found).
- Whether an accepted deal rate is applied anywhere to payouts (only stored; contract uses campaign rate).
- Whether "usually within a day" for human review is promised by any process (no SLA in code for channel or clip review; the appeal SLA is 72 hours, `APPEAL_SLA_HOURS`).
- The exact number of wizard questions ("eight questions", `JoinView.tsx:255`); belongs to the brand wizard part.
- Real-world behaviour of World ID, YouTube, X and Instagram APIs (not run).
- Which optional modules are on in the deployed site (all default off; depends on environment).
