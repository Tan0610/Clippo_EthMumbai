# Part B: App shell, routes, landing page, client data layer

Scope: the frame around every screen, the route list, sign-in and roles, the landing page, and how the browser loads data.
Source: branch `docs/ui-guide` (based on main `bb2fbec`). All file paths are under `web/src/` unless they start with `design/`.
Everything below was read from code. Nothing was run in a browser. Where a behaviour is worked out from code only, it is marked "(from code)". Where I could not tell, it says "not determined".

Quick vocabulary used in this part: "creator" = person who posts clips and gets paid. "campaigner" = brand that funds a campaign. "admin" = Clippo operator. "wallet" = browser extension (MetaMask, Rabby...) used to sign in and to send money.

---

## 1. Route map

There are 18 screens: the landing page plus 17 pages in the `(site)` folder. The `(site)` folder is only a grouping folder. It has no layout file of its own. All page chrome (banner, header, footer) comes from the root layout (`app/layout.tsx`).

There are no route guards. No middleware, no redirect and no role check exists in the page code. Every page renders for everyone. The server API refuses the wrong role, and the page then shows the API's error text. So "wrong role" below means "what the user sees after the API says no".

Page titles in the browser tab come from each page file. Format: `<page title> · Clippo` (template in `app/layout.tsx:35`).

| Route | File | What the screen is | Who can use it | Wrong role / signed out | Main components |
|---|---|---|---|---|---|
| `/` | `app/page.tsx` | Marketing landing page that explains Clippo and points to "Start a campaign", "Browse the wire" and "Verify and join". | Anyone | Nothing blocks. Static page, no API calls of its own. | `Hero`, `ClipBand`, `PoolTicker`, `LoopClip`, `Stamp` |
| `/wire` | `app/(site)/wire/page.tsx` (title "The Wire") | List of open campaigns that creators can clip, with filters and sort, plus a creator ranking table below. | Anyone (public APIs) | Nothing blocks. Service down: red "Service unavailable" box. | `WireView`, `Slip`, `Standing` |
| `/slips/[id]` | `app/(site)/slips/[id]/page.tsx` (no title set, uses the site default) | One campaign: rate, pool, brief, daily views, and for creators a place to join and paste clip links. | View: anyone for live or closed campaigns. A draft or unapproved campaign is visible only to its owner or an admin. Join and submit: verified creator. | Hidden/unknown id: Empty "No such slip." with button "Back to the wire". Signed out: Empty "Connect a wallet to join." Not verified (this includes every campaigner and admin): Empty "Verify you are a person first." with button "Verify with World ID" to `/join`. Closed or rejected: Empty "Closed to new clips." | `SlipDetail`, `ConfirmedViews`, `AppealPanel`, `CreatorAssistant`, `DealPanel`, `TickBar`, `Stamp` |
| `/join` | `app/(site)/join/page.tsx` ("Join") | Two-card chooser ("I clip" or "I pay for clips") then a short setup: creators verify as human and prove a channel; campaigners connect a wallet. | Anyone | Nothing blocks. | `JoinView`, `WorldCheck`, `ChannelProof` |
| `/account` | `app/(site)/account/page.tsx` ("Account") | Shows wallet, role, human-check status, a Disconnect button, and (creators only) the list of channels. | Anyone. Signed out it says "not connected". | Channels block appears only for a signed-in creator. Other roles see Identity and "Your desk" text only. | `AccountView`, `WorldCheck`, `ChannelProof` |
| `/desk` | `app/(site)/desk/page.tsx` ("The Desk") | Campaigner dashboard: numbers, list of own campaigns with actions, clips waiting for a decision, disputes, split approvals. | Campaigner (API: `/campaigns?mine=true` needs sign-in; `/dashboard/campaigner` needs campaigner) | Signed out: red box "Sign in first" plus button "Connect as a campaigner"; second box "The review tray did not load." A signed-in creator or admin sees an empty "No campaigns yet." with "Start one" (their own list is empty), no error (from code). | `DeskView`, `DeskAnalytics`, `AgentPassPanel`, `OnchainDisputes`, `StepUpReturnPanel`, `WorldCheck` |
| `/desk/new` | `app/(site)/desk/new/page.tsx` ("New campaign") | Step-by-step campaign wizard (8 steps, 9 if payout is "Human-approved split"; the last step is a review), ending in a created draft campaign. | Campaigner. Page opens for anyone. | See problem P1: the first button "Write the brief" calls an API that needs sign-in, so a signed-out visitor is stopped at step 1 with "Stopped." and developer text. Sign-in is only prompted at the last step ("Create and go to funding"). | `Wizard`, `SourceStep`, `PageHead` |
| `/desk/[id]/fund` | `app/(site)/desk/[id]/fund/page.tsx` ("Fund the pool") | Funding page for one campaign: shows the pool, the fee, and the "Fund N USDC" button; then shows the status of admin review. | Campaigner who owns the campaign | Signed out or other role: notice "Connect the campaigner wallet that holds the USDC." with button "Connect wallet" (see problem P4: this can loop). Unknown id: red box with the API message. | `FundView`, `FeePreview` |
| `/ledger` | `app/(site)/ledger/page.tsx` ("Ledger") | Creator earnings page: record, settled payouts, estimates, own clips with verdicts, and the Claim button. | Creator (API: `/creator/earnings` needs creator) | Signed out: red box with the API's developer sentence (P2) plus fix "Connect a creator wallet to see your ledger." and button "Connect as a creator". Campaigner/admin: red box "Requires role: CREATOR" plus "Try again" (useless). | `LedgerView`, `LedgerDash` (`CreatorHead`, `MySubmissions`, `ModuleLinks`), `FeePreview`, `ConfirmedViews` |
| `/bench` | `app/(site)/bench/page.tsx` ("The Bench") | Admin work queue: campaigns to sign, flagged clips, appeals, splits, view patterns, disputes, suspicious growth. | Admin (wallet must be on the operator allow-list `ADMIN_WALLETS`) | Signed out: red box plus button "Connect admin wallet". Signed in as creator/campaigner: yellow notice "You are viewing as {role}." and the red box "Requires role: ADMIN". | `BenchView`, `AdminSplits`, `AdminAssistant`, `OnchainDisputes`, `WorldCheck` |
| `/hire` | `app/(site)/hire/page.tsx` ("Hire creators") | Directory of creators for hire, with filters and a "clipped" shortlist tray. | Anyone to browse (public `/creators`). Making a share link needs a campaigner. | "Make shareable link" for a non-campaigner shows red box "The list link was not made." with the API text (from code). | `Directory`, `ShareBox`, `Ad` |
| `/hire/brief` | `app/(site)/hire/brief/page.tsx` ("Write the brief") | Form where a campaigner writes one brief and sets a rate per shortlisted creator, then sends offers. | Campaigner | No shortlist: Empty "Nobody is clipped yet." with "Open the directory". Not a campaigner: notice "Briefs are sent from a campaigner wallet." with "Connect campaigner wallet" (same loop as P4). | `BriefBuilder` |
| `/hire/w/[id]` | `app/(site)/hire/w/[id]/page.tsx` ("Creator workspace") | Campaigner workspace for one hire: approve or pass each creator, watch the budget, fund everyone in one step, track clips. | Campaigner who owns it, an admin, or a creator on it (API `/hires/:id`) | Unknown or not yours: Empty "No workspace under that number." Not a campaigner: the fund area shows "Connect the campaigner wallet that holds the USDC." Page is reached only by redirect after sending a brief (P8). | `WorkspaceView`, `ApprovalLedger`, `TrackingList`, `BriefSpec` |
| `/hire/lists/[token]` | `app/(site)/hire/lists/[token]/page.tsx` ("Shortlist") | Public read-only shortlist of creators, made from the Hire tray. Share link. | Anyone with the link | Bad token: Empty "No list at this address." | `ListView`, `Ad` |
| `/hire/share/[token]` | `app/(site)/hire/share/[token]/page.tsx` ("Shared campaign view") | Public read-only copy of a workspace for the campaigner and creators on it. Share link. | Anyone with the link | Bad token: Empty "Nothing at this address." with "Go to Hire". | `SharedView`, `ApprovalLedger`, `TrackingList`, `BriefSpec` |
| `/status` | `app/(site)/status/page.tsx` ("Status ladder") | Creator tier ladder and the signed-in creator's place on it. Optional module. | Ladder: anyone. Own place: creator. | Module off: the global 404 page. Signed out: ladder shows, side panel says "Sign in to see your rung." with button "Go to the ledger". | `StatusView` (in `ModulePages.tsx`), `TierMark` |
| `/referrals` | `app/(site)/referrals/page.tsx` ("Referrals") | Creator makes referral links and sees credit. Optional module. | Creator | Module off: the global 404 page. Signed out: red box plus "Connect as a creator". | `ReferralView` (in `ModulePages.tsx`) |
| `/profile` | `app/(site)/profile/page.tsx` ("On-chain profile") | Creator opts in or out of a public on-chain record of clips, views and earnings. Optional module. | Creator | Module off: the global 404 page. Signed out: red box plus "Connect as a creator". | `ChainProfileView` (in `ModulePages.tsx`) |
| any other path | `app/not-found.tsx` | Themed 404 page. Also what a switched-off optional module shows. | Anyone | n/a | `PageHead`, `Empty` |

Other files in `app/`: `robots.ts` (`/robots.txt`: blocks all crawlers when `NEXT_PUBLIC_TEST_DEPLOY=1`, else allows all), `favicon.ico`, `api/**` (server routes, not screens). One API route works like a screen hop: `app/api/auth/world/callback/route.ts` receives the World ID step-up redirect, then sends the browser back to the page it came from with `?stepup=...&attempt=...&code=...` (default return page `/desk`, see `lib/worldauth/stepup.ts:16`).

### Share links, tokens and query strings

| Link shape | Made where | Opens | Notes |
|---|---|---|---|
| `/hire/lists/<token>` | `ShareBox` ("Make shareable link", `components/workspace/ShareBox.tsx:19`) in the Hire tray | Public shortlist | Button "Brief these creators" copies the list into the tray and goes to `/hire/brief`. |
| `/hire/share/<token>` | `ShareLine` box in the workspace sidebar, text "Shared view, read only. For you and every creator on it." (`WorkspaceView.tsx:21-50`) | Read-only workspace | Shown only when the workspace has a token. |
| `/slips/<campaignId>?ref=<code>` | `/referrals` "Make link" (`ModulePages.tsx:192`) | Campaign page | The code is kept in sessionStorage key `clippo-ref-<id>` until the visitor joins (`SlipDetail.tsx:51-69`). Only codes of 3 to 64 letters, digits, `_` or `-` are accepted. |
| `/desk/<id>/fund?pool=<n>&mode=<mode>` | Wizard end (`Wizard.tsx:148`) and Desk "Fund N USDC" button (`DeskView.tsx:179`) | Funding page | `pool` is only a display fallback until the campaign loads (default 5000 if missing). |
| `<page>?stepup=<state>&attempt=<id>&code=<code>` | `/api/auth/world/callback` redirect | The page that asked for the step-up (`/desk` or `/bench`) | States: approved, cancelled, expired, mismatch, failed. The page reads the values once and removes them from the address bar (`StepUpApprove.tsx:43-55`). |

### Pages not linked from the main navigation

| Page | How a user can reach it |
|---|---|
| `/join` | Landing "Verify and join", footer "Join as a creator", slip page "Verify with World ID", ledger "Verify with World ID", World ID "no credential" box. Not in the nav. |
| `/desk/new` | Landing "Start a campaign" (hero) and "Start the wizard", footer "Start a campaign", Desk "New campaign" and "Start one". |
| `/desk/[id]/fund` | Wizard end, Desk table button. Not otherwise. |
| `/hire/brief`, `/hire/w/[id]` | Only through the Hire tray, then the brief form's redirect (`BriefBuilder.tsx:82`). No list of past workspaces exists (P8). |
| `/hire/lists/[token]`, `/hire/share/[token]` | Only through a pasted link. |
| `/status`, `/referrals`, `/profile` | Only as small links under the Claim box on `/ledger` (`LedgerDash.tsx:96-105`), and only when the module is on and the visitor is a signed-in creator. Otherwise nobody can find them. |
| `/hire` | Nav item "Hire" only. Not on the landing page or in the footer. |

---

## 2. App shell

All pages are drawn inside `app/layout.tsx`. Top to bottom (`layout.tsx:49-63`):

1. Skip link
2. TESTNET banner (only on test deployments)
3. Hidden SVG filter (ink-bleed for stamps; invisible)
4. Dateline strip (black bar)
5. Masthead (wordmark, Menu button, nav, theme toggle, wallet chip). Wrapped in `Suspense`; while it loads, an empty header of height 96px shows (`layout.tsx:56`).
6. `<main id="main">` holding the page
7. Footer

Fonts: Bodoni Moda (display), Schibsted Grotesk (text), Martian Mono (mono) (`layout.tsx:9-27`).

### 2.1 Skip link

Text "Skip to content", points to `#main`. Hidden off-screen until it gets keyboard focus (`globals.css:113-118`). `layout.tsx:50-52`.

### 2.2 TESTNET banner

| Item | Value |
|---|---|
| When it shows | Only when the build has `NEXT_PUBLIC_TEST_DEPLOY=1` (`Shell.tsx:22-25`). Otherwise nothing is rendered. |
| Exact text | **TESTNET** — test funds only. Arc testnet USDC has no value; this is a test deployment, so expect resets and please report anything odd. (`Shell.tsx:28`) |
| Look | Yellow bar (`#ffd84a`), dark text, sticky to the top of the window, mono font (`testdeploy.css`). |
| Same flag also does | Adds a line in the footer (see 2.7); adds `noindex` meta (`layout.tsx:34`); `robots.txt` blocks everything; response header `X-Robots-Tag: noindex, nofollow, noarchive` (`next.config.ts`). |

### 2.3 Dateline strip

Black bar above the masthead, small mono capitals. `Shell.tsx:33-53`.

| Field | Position | Text | Where the data comes from |
|---|---|---|---|
| Date | Left | Example: "Sat Nov 07 2026" | The visitor's own browser clock. Format `en-US` weekday short, month short, day 2-digit, year, with commas removed (`Shell.tsx:37`). Empty for the first instant after load. |
| Network label | Right | "Arc testnet · USDC" | Hard-coded text (`Shell.tsx:48`). It shows on every deployment, not only testnet ones. |
| Demo marker | Right, appended | " · demo build, sample data" | Appears only after the app has fallen back to sample data at least once in a demo build (`useDemo()`, `components/api.ts:32-45`). Not shown just because the demo flag is set. |

Nothing else (no edition number, no price, no user name). Hidden in print (`globals.css:462`).

### 2.4 Masthead

`Shell.tsx:82-163`.

Brand block (`Shell.tsx:102-106`):
- Link to `/`, accessible name "Clippo, home".
- Wordmark "Clippo" in bold italic display type.
- The "Blades" mark: two crossed diagonal lines (like open scissors or a clip mark) plus two short orange ticks on the right (`components/Icons.tsx:138-146`).
- Small mono caption "Clipping bureau". Hidden below 600px wide (and below 340px) (`globals.css:570`).
- There is no other "notch mark" element in the code. The only other notch is the clipped top-right corner of the wallet chip (`globals.css:212-217`).

Navigation (`Shell.tsx:12-19`, `116-122`). The list is the same for every visitor. It is not filtered by role and does not change when signed in.

| Order | Label (exact) | Href | Shown to | Page it opens |
|---|---|---|---|---|
| 1 | Wire | `/wire` | everyone | Open campaigns |
| 2 | Hire | `/hire` | everyone | Creator directory |
| 3 | Desk | `/desk` | everyone (meant for campaigners) | Campaigner dashboard |
| 4 | Ledger | `/ledger` | everyone (meant for creators) | Creator earnings |
| 5 | Bench | `/bench` | everyone (meant for admins) | Admin queue |
| 6 | Account | `/account` | everyone | Wallet and identity |

Not in the nav: Join, Status, Referrals, Profile, landing link (the wordmark is the only way home).

Active item: a link is "current" when the address equals its href or starts with `href + "/"` (`Shell.tsx:118`). So `/desk/new` and `/hire/w/abc` keep "Desk" and "Hire" lit. `/slips/...`, `/join`, `/status`, `/referrals`, `/profile` and `/` light nothing. Look: on wide screens, a 3px orange line under the item and a light paper background; on small screens, a 6px orange bar on the left (`globals.css:190`, `206`). The link carries `aria-current="page"`.

Mobile behaviour (`globals.css:193-209`, `561-575`):
- 861px and wider: nav is a row of mono capitals, tools sit on the right.
- 600 to 860px: nav is hidden behind a button. Button label is "Menu" and changes to "Close" when open (`Shell.tsx:114`). Theme toggle and wallet chip stay in the top row (chip max width 42% of screen).
- 599px and narrower: the theme toggle and the wallet chip are also hidden until "Menu" is pressed. A signed-in state is therefore not visible on a phone until the menu is opened (P12).
- The menu closes when the page changes and when Escape is pressed (`Shell.tsx:87-98`). Open nav items are full-width rows, minimum height 48px.

Paper/Night toggle (`Shell.tsx:55-80`):
- A small bordered button next to the wallet chip.
- Its label is the theme you would switch to, not the current one: it reads "Night" while the page is in Paper (light) and "Paper" while in Night (dark). Accessible name: "Switch to night theme" or "Switch to paper theme".
- Click: flips the page theme at once, sets `data-theme` on the page and saves `clippo-theme` in localStorage (errors ignored).
- First visit: follows the device setting (`prefers-color-scheme`). A saved choice is applied by a small script in the page head before first paint, so there is no flash (`layout.tsx:41`, `47`). The button label itself is set after load, so it can briefly show "Night" before correcting.
- "Paper" and "Night" are the only places these two words appear.

Wallet chip (`Shell.tsx:125-133`, hook in `components/hooks.ts:103-167`):

| State | What shows | What a click does |
|---|---|---|
| Not connected | Button "Connect wallet" | Starts sign-in with no role chosen (see section 3). |
| Connecting | Same button, disabled, label "Check your wallet" | Nothing. Waiting for the wallet pop-up. |
| Connected (any role) | Small orange role word (creator, campaigner or admin, shown in capitals) then the shortened address, e.g. `0x71c9…8e3b` (first 6 and last 4 characters). Hover text "Disconnect wallet". Screen-reader name: "Signed in as {role}, wallet {address}. Activate to disconnect." | Disconnects at once. No confirmation. |
| Wrong role for the page | There is no such state in the chip. The chip never knows what the current page needs. Each page decides on its own (see problems P3 and P4). | n/a |
| Verified | The chip does not show verified status. | n/a |

The chip has a clipped (notched) top-right corner (`globals.css:212-217`).

Sheets that open from the masthead (all drawn over the page with a dark backdrop):

| Sheet | Opens when | Exact text | Buttons |
|---|---|---|---|
| Wallet picker (`WalletPicker.tsx`) | Two or more wallets are installed, or none | Small label "Wallet". Title "Choose a wallet" (list of detected wallets, each a button with icon and name) or "No wallet found". When none: "Clippo signs you in with a browser wallet extension. Install one, create or import an account, then reload this page." plus links MetaMask, Rabby, Coinbase Wallet, Brave Wallet, OKX Wallet, Phantom (open in a new tab). | "Cancel" (when wallets are listed) or "Close". Escape also closes it. |
| Role chooser (`Shell.tsx:137-150`) | A new wallet signed in without a role | Label "New wallet". Title "Which desk is this wallet for?" Text "A wallet holds one role, and it cannot be changed later. You will sign once more to create the account." | "I clip: creator", "I pay for clips: campaigner", "Cancel". Escape does not close it. |
| Connect error / notice (`Shell.tsx:151-160`) | A connect step failed, or the user was signed out because the wallet account changed | Label "Wallet". Title "Could not connect" or "Signed out". Body is the message. | "Close". Escape does not close it. |

Messages seen in the "Signed out" sheet: "Your wallet switched accounts, so you were signed out. Connect again to continue." (`hooks.ts:59`).

### 2.5 Main area

`<main id="main" tabIndex={-1}>`. Every page body uses `<div class="wrap page">` and (on most pages) a `PageHead` block: a small mono "kicker" line, a large display headline with one italic word, and an optional lead sentence (`Bits.tsx:111-121`).

### 2.6 Footer

`Shell.tsx:165-201`. Three columns (stacked on small screens).

| Column | Content (exact) | Link target |
|---|---|---|
| 1 | Large italic "Clippo". Text: "Brands fund a USDC pool. Verified humans post clips. An agent checks each clip against the brief and writes down why. Agents never release money on their own." | none |
| 2, label "Desks" | "Wire, open campaigns" | `/wire` |
| | "Start a campaign" | `/desk/new` |
| | "Join as a creator" | `/join` |
| 3, label "Fine print" | Test-deploy only: bold "TESTNET — test funds only." then "Never send real funds to this app." | none |
| | Fee sentence. Loaded: "Platform fee: {x}% from the campaigner and {y}% from the creator, deducted by the escrow." Loading: "Platform fee: reading the schedule from the escrow." Failed: "Platform fee: the fee schedule could not be read from the service." Then always: "Payouts are USDC on Arc, claimed by the creator." | none |
| | "Arc testnet USDC faucet" | `NEXT_PUBLIC_FAUCET_URL`, default `https://faucet.circle.com`, new tab |

Fee numbers come from `GET /api/chain/config` (cached once per page load) through `useFees` (`FeePreview.tsx:10-27`). The footer has no link to Hire, Ledger, Bench or Account.

### 2.7 404 page

`app/not-found.tsx`. Kicker "No. 404". Headline "Not on file" (the word "file" in italic). Lead "There is no page at this address." Then an Empty box: title "Nothing here.", text "The link may be cut short, or this part of Clippo is switched off in this build.", button "Browse the wire" (to `/wire`). Used for unknown addresses and for optional modules that are off (`ModulePages.tsx:58,143,235` call `notFound()`).

### 2.8 Global error handling

- There is no `error.tsx`, `global-error.tsx` or `loading.tsx` anywhere in `app/`. A crash while drawing a page falls to the framework's default error screen, not a Clippo-styled one (P11).
- Data errors are handled inside each screen (section 5), not globally.
- Wallet and sign-in errors are shown in the masthead sheet "Could not connect" (2.4).
- `Suspense` is used in `layout.tsx` (masthead) and in the dynamic route pages `desk/[id]/fund`, `slips/[id]`, `hire/lists/[token]`, `hire/share/[token]`, `hire/w/[id]`. Their fallback is the `Loading` component with a route-specific label.

### 2.9 Page titles (browser tab) and big headings

| Route | Tab title (before " · Clippo") | Kicker line | Main headline |
|---|---|---|---|
| `/` | "Clippo — pay only for clips that passed" (site default, no suffix) | "The Clipping Desk", "Brands fund. Humans clip. An agent reads. Chain pays.", "Sample ledger" | "Clips get read before they get paid." |
| `/wire` | The Wire | The Wire / Open campaigns | Campaigns paying *right now* |
| `/slips/[id]` | (none, site default) | The Wire / No. {serial} / {payout mode} | the campaign title |
| `/desk` | The Desk | The Desk / Campaigner | Your *campaigns* |
| `/desk/new` | New campaign | Desk / New campaign | One question at a *time* |
| `/desk/[id]/fund` | Fund the pool | Desk / No. {serial} | changes: "Fund the pool", "In escrow. Waiting on admin.", "Signed. Live now.", "Not approved. Pool returns." |
| `/ledger` | Ledger | The Ledger / Creator earnings | What you're *owed* |
| `/bench` | The Bench | The Bench / Admin | Read it, then *decide* |
| `/account` | Account | Account | Who's *signing* |
| `/join` | Join | Join | Two desks. *Pick one.* |
| `/hire` | Hire creators | Hire / Creator directory | Creators *for hire* |
| `/hire/brief` | Write the brief | Hire / Brief / N creators | Write the *brief* |
| `/hire/w/[id]` | Creator workspace | Hire / No. {serial} / Funded or Draft | workspace title |
| `/hire/lists/[token]` | Shortlist | Hire / Shortlist / Read only | list title |
| `/hire/share/[token]` | Shared campaign view | Shared view / No. {serial} / Funded or Draft | workspace title |
| `/status` | Status ladder | Status / Creator ladder | Climb on *approved work* |
| `/referrals` | Referrals | Referrals / Creator | Bring a *person*, keep a cut |
| `/profile` | On-chain profile | Profile / On-chain, non-transferable | Your record, *on the record* |

Print-vocabulary words visible in the shell: Clipping bureau, Dateline, Wire, Desk, Ledger, Bench, Hire, Desks (footer), "Correction" (every error box), "Setting type" (default loading label), "Fine print", "Paper"/"Night", "Slip" (campaign card), "Not on file" (404). `design/DESIGN.md:61` is the author's own list: Desk (dashboard), Wire (marketplace), Slips (campaigns), Ledger (earnings), Standing (leaderboard), Corrections (errors), Bench (admin).

---

## 3. Sign-in and roles

### 3.1 What "sign in" is

Sign-in is "connect a browser wallet, then sign one text message". There is no email, no password, no social login. The message is a standard "Sign-In with Ethereum" (SIWE) message. Signing it costs no gas and does not move money. The server checks the signature and sets a cookie.

Sign-in does not switch or add any blockchain network. The wallet is asked to join the "Arc Testnet" network later, only when the user does a money action (fund, approve, close, dispute) (`lib/chain/client.ts:126-156`).

### 3.2 Step by step for a first-time visitor

| # | What the visitor sees | What happens in code |
|---|---|---|
| 1 | Landing page. The only sign-in control is the masthead chip "Connect wallet". The landing page has no "Sign in" button and no explanation of wallets. | `Shell.tsx:130-132` |
| 2 | Click "Connect wallet". The chip turns grey and says "Check your wallet". | `connect()` in `hooks.ts:83-101` |
| 3 | If exactly one wallet extension is installed: it is used with no extra screen. If several: sheet "Choose a wallet". If none: sheet "No wallet found" with install links. | `chooseWallet()` `hooks.ts:65-80`. The choice is kept in memory only. |
| 4 | Wallet extension pop-up 1: "connect this site / share your account". | `requestAccount()` `lib/chain/client.ts:100-111` |
| 5 | Wallet extension pop-up 2: "sign this message" (the SIWE text). | `signIn()` `lib/chain/client.ts:166-189`: `GET /api/auth/nonce`, sign, `POST /api/auth/session` |
| 6a | Existing account, or an admin wallet: chip changes to `{role} 0x…`. Done. | `app/api/auth/session/route.ts` |
| 6b | New wallet with no role known: sheet "Which desk is this wallet for?" with "I clip: creator" and "I pay for clips: campaigner". Picking one repeats steps 3 to 5, so the user signs a second time. | server answers `400 ROLE_REQUIRED` (`session/route.ts:41`), UI shows the sheet (`hooks.ts:96`) |
| 6c | New wallet where the page already knows the role (see 3.3): account is created at once with that role. One signature only. | |
| 7 | Any failure: sheet "Could not connect" with the message. Cancelling a wallet pick or the role sheet shows nothing. A wallet "reject" shows e.g. "You rejected the request in your wallet while connecting. Nothing was changed." | `hooks.ts:95-99`, `lib/chain/client.ts:87-98` |

Server rules (`app/api/auth/session/route.ts`): nonce is single use for 10 minutes; session cookie `clippo_session` is httpOnly, SameSite Lax, valid 7 days, Secure on https. Rate limited (30 sign-ins per 10 minutes).

### 3.3 How the role is chosen and stored

| Question | Answer |
|---|---|
| Who decides a role? | The first sign-in of a wallet. After that the role is fixed in the database. The role sheet says "it cannot be changed later". |
| Roles | creator, campaigner, admin. |
| How does a visitor pick creator or campaigner? | (a) The role sheet above. (b) `/join`: two cards "I clip" (A) and "I pay for clips" (B). Clicking a card only remembers the choice in the page; it is passed to the next "Connect wallet" press. (c) Role-specific buttons on pages (below). |
| Role-specific connect buttons | creator: "Connect as a creator" (Ledger, Status, Referrals, Profile), "Connect wallet to claim" (Ledger), "Connect wallet" (Slip page, Join creator step). campaigner: "Connect as a campaigner" (Desk), "Connect wallet" (Fund, Workspace, Join campaigner step), "Connect campaigner wallet" (Brief), and the last wizard step "Create and go to funding". admin: "Connect admin wallet" (Bench). |
| Can the UI make someone an admin? | No. Admin comes only from the server allow-list (`ADMIN_WALLETS` env, `lib/auth.ts:53`). A wallet on the list becomes admin at sign-in even if it had a different role before (`session/route.ts:44-46`). "Connect admin wallet" sends no role, so a new non-admin wallet still gets the role sheet. `components/AccountView.tsx:108` says this in words: "Admin rights come from the operator's allow-list, not from this page." |
| What if the button asks for a different role than the account has? | The server keeps the account's own role and ignores the request. The UI then still thinks the wrong role is connected (problem P4). |
| Where is the role kept in the browser? | Only in memory (`hooks.ts:38-39`: `pickedRole`). Reload restores the real role from `GET /api/auth/me`. |
| Role word in the UI | Lower case "creator", "campaigner", "admin" in the wallet chip, Account page row "Desk", Bench notice. |

### 3.4 What "verified" means in the UI

- Verified = this account passed the World ID "Proof of Human" check. The server stores that a unique human did it; the UI stores only the yes/no (`ApiUser.verified`, `api.ts:222`).
- Only creators are offered the check. Buttons: "Verify with World ID (Proof of Human)" on `/join` (step 1) and on `/account` (only for a signed-in, unverified creator). The check opens a World ID pop-up (IDKit). Details of the "why" are in a fold-out "Why Proof of Human?" (`JoinView.tsx:13-22`).
- Where "verified" shows: Account row "Human check: verified" + tick mark, or "not verified"; Join step 1 "Verified with World ID."; Ledger head "Verified human" (or a link "Verify with World ID"); tick mark next to creator names in rankings and the directory.
- What it unlocks: joining a campaign (`SlipDetail.tsx:130,245`), step 2 on `/join` (greyed out and inert until verified, `JoinView.tsx:292`), being listed in the Hire directory, submitting clips (server).
- Campaigners and admins have no way to become "verified" in this UI, which causes problem P6.
- Separate from this, admins and campaigners do fresh per-action World ID checks to approve big campaigns and payout splits (labelled "Agent Pass" or "World ID step-up"). Those are not "verified" status.
- If the person has no Proof of Human credential: box "No Proof of Human credential." with link "Get a credential" and button "Continue without verifying (viewer only)" (`JoinView.tsx:25-36`).

### 3.5 What each role sees in the nav

| Role | Nav items shown | Notes |
|---|---|---|
| Signed out | Wire, Hire, Desk, Ledger, Bench, Account | Same list. |
| Creator | Wire, Hire, Desk, Ledger, Bench, Account | Desk and Bench lead to errors or empty states. |
| Campaigner | Wire, Hire, Desk, Ledger, Bench, Account | Ledger and Bench lead to "Requires role" errors. |
| Admin | Wire, Hire, Desk, Ledger, Bench, Account | Desk shows "No campaigns yet." Ledger errors with "Requires role: CREATOR". |

### 3.6 Session persistence and disconnect

| Event | Behaviour | Code |
|---|---|---|
| Page load or refresh | One call `GET /api/auth/me`. If the cookie is valid the chip shows the account at once. The result is checked only once per page load. If the service is down this call fails silently and the chip shows "Connect wallet". | `hooks.ts:103-125` |
| Cookie life | 7 days. | `session/route.ts:60` |
| Click the chip (disconnect) | `POST /api/auth/logout` clears the cookie, the wallet choice is forgotten, user is set to none. The page is not reloaded, redirected or refreshed. Data already on screen stays until the user reloads or presses a retry button. The wallet extension keeps its own permission for the site. | `hooks.ts:153-158` |
| Wallet account switched inside the extension | If the new account differs from the signed-in wallet, the app logs out and shows the "Signed out" sheet. Only watched while this page session knows which wallet provider is in use. | `hooks.ts:52-62` |
| Tab closed and reopened within 7 days | Still signed in. | |
| Wallet choice | Not saved. After a reload with several wallets installed, later wallet actions use `window.ethereum` (whatever wallet owns it), which may not be the wallet used to sign in (from code, `lib/chain/wallets.ts:88-95`). |
| Connect from the masthead while on a page | The page does not re-load its data. Pages that offer their own connect button call a retry after sign-in (e.g. Desk, Ledger). The masthead chip does not. | `useAsync` loads once (`hooks.ts:14-32`) |

### 3.7 Demo build sign-in

If the build has `NEXT_PUBLIC_DEMO=1` and no wallet is installed, "Connect wallet" signs in a sample identity with no pop-ups: creator `0x71c9…8e3b`, campaigner `0xca3b…e1f5`, admin `0xad00…0001`, all "not verified" (`api.ts:228-232`, `250-253`). With a wallet installed it signs in for real.

---

## 4. Landing page

File `app/page.tsx`, hero in `components/landing/Hero.tsx`. The whole page is sample content. It makes no API call of its own. Everything marked "Sample" is hard-coded text.

Scroll effects: sections slide or rise in on scroll (CSS scroll-driven animation in `app/landing.css`), stamps "land" with a small rotation. All motion is off when the visitor prefers reduced motion. Looping sample videos (`public/clips/c1..c12`, webm/mp4 + jpg poster) play only while on screen, never under reduced motion or data saver, at most 2 at once on phones and 6 on larger screens (`components/LoopClip.tsx`).

| Order | Section | Headline / label (exact) | Copy | Buttons / links (label -> destination) | Live data? |
|---|---|---|---|---|---|
| 1 | Hero (`Hero.tsx`) kicker row | "The Clipping Desk" · "Brands fund. Humans clip. An agent reads. Chain pays." (hidden on narrow screens) · "Sample ledger" | | | no |
| 1 | Hero headline | "Clips get read before they get paid." (last word "paid." in orange italic) | Lead: "A brand puts USDC in a pool. Verified humans cut clips and post them. An agent checks every one against the brand's story, stamps it, and writes the reason in the margin. Approved views settle on-chain. Rejected creators see exactly why." | "Start a campaign" (with arrow) -> `/desk/new`. "Browse the wire" (outline) -> `/wire`. | no |
| 1 | Hero fine print | | "Fee 0.1 to 0.5 per side, taken by the escrow. A person approves every campaign before a creator can join." | | Hard-coded. No unit shown. The real number is in the footer (P10). |
| 1 | Hero figure "Sample: one bounty, two clips, one payout" | Slip "Bounty No. 0042 · Ledgerlane", "Explain the 3-minute close", "Pool remaining, USDC" counting down 1,816.20 -> 1,740.00 (starts after 1.4s, lasts 0.9s; jumps straight to the end under reduced motion), stub "$2.40 per 1,000" | Entry "02 · @duskpilot" (youtube): "Watch a real month-end close, start to finish, in three minutes." Stamp Approved conf 0.94. Margin: "On brief. Both required points said. #ad label at 0:02." Payout line "@duskpilot ... +76.20 USDC settled". Entry "03 · @numbers.nina" (x): "It's guaranteed to save 20 hours a week." (underlined wavy). Stamp Rejected conf 0.88. Margin: "Guaranteed savings are on the prohibited list. No disclosure label found. Creator sees this, and can appeal." Caption "Sample data, not live. Rejected clips are never paid." | none | Sample |
| 1 | Clip band (`ClipBand.tsx`) | "On the wire this week" · "Sample footage, not real creators" | 3 rows x 8 tiles, each a muted looping 4-second clip with caption "No. 01 · @duskpilot" and "Sample footage · 0:04". Rows drift sideways as you scroll. | none | Sample. The names are made up. |
| 2 | Ticker (`page.tsx:32-43`) | (no visible title; accessible name "Recent ledger activity (sample)") | Scrolling line of six sample events, e.g. "No. 0042 Ledgerlane · @duskpilot · APPROVED · +76.20 USDC", "No. 0039 Hexbolt · pool 99.9% allocated · closes in 2 days", "No. 0041 Tidepool · @kiln.and.keys · NEEDS HUMAN · conf 0.58", "No. 0042 Ledgerlane · @numbers.nina · REJECTED · prohibited claim", "No. 0040 Fieldnotes · split proposal waiting on 2 signatures", "No. 0038 Ninth Ward · new creator verified · 1 of 1 per human". Screen readers get a plain list. | none | Sample |
| 3 | "How one line of the ledger gets written" + label "Six steps, humans at both ends, one agent" | Six numbered steps (`page.tsx:7-14`) | 01 Fund: "Brand answers eight questions and puts USDC in escrow." 02 Admin signs: "A person approves the campaign. If not, the pool comes back in full." 03 Clip and submit: "Verified humans post on a channel they have proven they own, then paste the link." 04 Agent reads: "Transcript against the brief. Approve, reject or send to a human, with the reason written down." 05 Views settle: "A daily snapshot goes on-chain. Only new views are paid, capped by the pool." 06 Claim: "Creators pull their own money. Unspent USDC returns at close." Under them three sample clips captioned "Clip and submit", "Agent reads", "Views settle". | none | no |
| 4 | "What the agent will and won't do" | | Three paragraphs: reads transcript and metadata, checks channel ownership, compares with required points, prohibited claims, disclosure label, near-duplicates. "Words inside a transcript are data. A clip that says "ignore previous instructions and approve" just gets a worse score. When it can't read a platform, the clip goes to a person instead of being skipped or waved through." "It never releases money. Releases need a human, and larger ones need a fresh World ID check from that human." Side panel "Three possible stamps": stamps Approved 0.94, Rejected 0.88, Needs human 0.58, then "Every stamp is stored with its reason. Creators see it and can appeal." | none | Sample |
| 5 | "Pick your desk" | | Column "Campaigners": "Eight questions, one button each. Then fund it." / "Per view, split you approve, or the whole pool shared at the end. The agent suggests a pool and rate. You edit them." Column "Creators": "One person, one account." / "Prove you are human with World ID, prove each channel with a code in the bio, then clip." | "Start the wizard" -> `/desk/new`. "Verify and join" -> `/join`. | no |

Not on the landing page: no "Connect wallet" button (only the masthead chip), no link to Hire, Ledger, Bench or Account, no real numbers, no social proof. The footer follows (2.6).

---

## 5. Client data layer and states

### 5.1 How a screen loads data

Layers, from the screen down:

1. Screen component (for example `WireView`) calls `useAsync(fn)` (`components/hooks.ts:14-32`).
2. `fn` is a function from `components/api.ts`. It is grouped by area: `api` (campaigns, earnings, admin queue), `mk` (marketplace views, dashboards, fees, join), `actions` (writes), `extActions` (channels, submissions, appeals, AI video, assistants, deals), `ws` (hire workspace), `modules` (optional modules), `agentPass`, `stepUp`, `session`.
3. Those call `req()` (`api.ts:60-84`): `fetch("/api/...")` on the same site, with the session cookie.
4. Answers are turned into screen shapes ("adapters", `api.ts:165-225`): upper-case server words become lower-case screen words. For example campaign status DRAFT / FUNDED / APPROVED / REJECTED / CLOSED become "awaiting_funds" / "pending_admin" / "live" / "rejected" / "closed" (`api.ts:163`). The Desk table prints them with the underscore replaced by a space: "awaiting funds", "pending admin", "live" (`DeskView.tsx:170`). Payout modes: "Per verified view", "Human-approved split", "Pool share" (`format.ts:13-17`).

`useAsync` returns `{ status: "loading" | "ready" | "error", data, error, retry }`.
- It runs once when the screen mounts, and again only if the `fn` changes or `retry()` is called.
- There is no automatic refresh, no refetch on tab focus, no cache between pages. Going to another page and back loads again.
- Writes call `retry()` themselves when needed (Desk after close, Ledger after claim, Fund after funding).
- Shared module-level caches: the chain config and fee schedule (`wallet.ts:10`), the direct-upload flag, and the session store.
- The only timer-based refresh in the app is the AI-video job check every 1.5 seconds while a job is "queued" or "rendering" (`SourceStep.tsx:96-101`).

### 5.2 State components

| State | Component | What the user sees | Notes |
|---|---|---|---|
| Loading | `Loading` (`Bits.tsx:68-80`) | A ruled block of grey lines. The first line holds a label and a blinking caret. Default label is "Setting type". Announced politely to screen readers. | Labels are custom per screen: "Setting the wire", "Opening your books", "Checking the tray", "Balancing the books", "Counting views", "Ranking the queue", "Opening escrow", "Pulling the slip", "Pulling the list", "Pulling the shared copy", "Opening the workspace", "Setting the classifieds", "Pulling your clipped list", "Reading the ladder", "Opening referrals", "Reading your profile", "Adding up the books", "Reading your record", "Pulling your clips", "Reading your channels", "Finding splits waiting on you", "Reading the agent log", "Reading the brief", "Matching", "Opening the deal file", "Summarising disputes", "Comparing growth curves", "Pulling daily views", "Pulling the daily count", "Tallying creators". `OnchainDisputes` has no loading state. |
| Empty | `Empty` (`Bits.tsx:82-91`) | Dashed box, bold serif title, one muted sentence, optional button, optional looping sample clip. | Examples: "Nothing on the wire matches that." ("Clear filters"), "No campaigns yet." ("Start one"), "Tray is empty.", "Nothing settled yet.", "Clear desk.", "No clips yet.", "No one is on the board yet." |
| Error | `Correction` (`Bits.tsx:93-109`) | Red-bordered box. Small label "Correction", then a bold message, then an optional second line, then "Try again" (text button) if a retry exists. | Always labelled "Correction". The `cause` input is only used to detect a service-down message. It is never printed (P5). |
| Error: service down or not set up | `ServiceState` (`ServiceState.tsx`) | Box with a thick left border. Label "Service unavailable" or "Not configured". Bold line. Paragraph. Button "Try again". | Replaces any `Correction` whose message (or its fix or cause) starts with "The Clippo service did not answer." or "Not configured on this deployment." Exact copy below. |
| Inline notice | CSS class `notice` / `notice warn` | Bordered paper box with a bold first word, e.g. "Recorded", "Nothing changed", "Stopped.", "Not verified." Warn = amber border. | This is the app's nearest thing to a toast. It stays on the page until replaced. |
| Field error | CSS `.field.bad` + `.err` | Red input border and bold red sentence under the field. | |
| Demo marker | `DemoNote` (`Bits.tsx:123-131`) | Amber mono line "Demo build (NEXT_PUBLIC_DEMO=1): figures on this page are sample data." | Shown only after the app fell back to sample data. It prints the environment variable name to the user (P14). |

ServiceState copy (exact):
- Service down: label "Service unavailable"; line "Clippo could not reach its service."; text "Nothing was changed and no money moved. Your connection, or the service itself, may be down. No sample data is shown in its place."
- Not configured: label "Not configured"; line "This part of Clippo is not switched on for this deployment."; text "{detail or "A required setting is missing."} Nothing was changed and no money moved. An operator needs to finish the configuration."

### 5.3 How API errors become user text

`req()` (`api.ts:60-84`) sorts answers into three kinds:

| Server answer | Becomes | User sees |
|---|---|---|
| No answer at all (network failure), or a 5xx with no structured error body (or code `INTERNAL`) | "unreachable" | Normal build: error "The Clippo service did not answer." (code `SERVICE_UNAVAILABLE`, 503) -> `ServiceState` "Service unavailable". Demo build: sample data. |
| 4xx, or a structured 5xx | `ApiError(status, code, message)` using the server's own `error.message`, or "Request failed (NNN)" | The server's sentence as written. Codes `CHAIN_NOT_CONFIGURED`, `NOT_CONFIGURED`, `FEATURE_NOT_CONFIGURED` get the prefix "Not configured on this deployment. " -> `ServiceState` "Not configured". |
| 2xx | data | |

`errText(error, fallback)` (`api.ts:631-639`) is used by buttons and forms. Order of rules:
1. `ApiError` -> its message.
2. Wallet closed the prompt (code 4001, "ACTION_REJECTED", or `UserRejectedRequestError`, also looked up inside nested causes) -> "You closed the wallet prompt. Nothing was changed."
3. A browser `TypeError` (usually "failed to fetch") -> "The Clippo service did not answer. Nothing was changed."
4. An error with `shortMessage` -> that.
5. Any `Error` -> its message.
6. Otherwise -> "Something went wrong. Nothing was changed."

`useAsync` does not use `errText`. It shows `error.message` directly (`hooks.ts:22`).

Server messages worth designing for, because they reach users unchanged (`lib/auth.ts:86-93`):
- Signed out: "Sign in: GET /api/auth/nonce, then POST /api/auth/session with a SIWE signature" (P2). Some routes say "Sign in first" instead (`campaigns/route.ts`).
- Wrong role: "Requires role: CREATOR" (or "CAMPAIGNER", "ADMIN", or "CAMPAIGNER or ADMIN").
- Not yours: "Not your hire" (and similar).

Wallet and chain errors (`lib/chain/client.ts:87-98`) have plain wording: rejected request ("You rejected the request in your wallet while {action}. Nothing was changed."), pending request ("Your wallet already has a request waiting. Open the wallet extension, answer it, then try again."), locked wallet, missing network, and "Add it manually: RPC ..., chain ID ..., currency USDC."

Calls that skip this layer (they use a second, simpler fetch helper in `lib/chain/client.ts:38-51`): fund preview, claim, on-chain approve/reject/close, split approval, disputes list. Their errors are plain `Error` objects. `OnchainDisputes` prints the raw message ("Disputes did not load: ..."). A network failure there shows the browser's own wording, not Clippo's.

### 5.4 Demo mode (`NEXT_PUBLIC_DEMO=1`)

The demo flag is a build setting for screenshots (`api.ts:24-30`). Normal builds never show sample data.

| Situation | Normal build | Demo build |
|---|---|---|
| Service unreachable | Red `ServiceState` box with "Try again". No fake numbers. | After a 350ms pause, the screen gets sample data from `ui-mocks/*`, the global demo flag flips, the dateline appends " · demo build, sample data", and `DemoNote` lines appear (`api.ts:86-97`). |
| No wallet installed, press "Connect wallet" | Sheet "No wallet found" | Signs in a sample creator, campaigner or admin (3.7). |
| World ID check | Real World ID pop-up | Always a "simulator" sheet with buttons "Verify with Proof of Human (demo)", "Cancel", "No Proof of Human credential", "Let it expire", "Reuse an old proof" (even if the service is up) (`WorldCheck.tsx:22,57-84`). |
| Funding, claiming with no escrow configured | Notice "Escrow is not configured on this deployment." and the button is off | Fake transaction after 1.0 to 1.2 seconds with hash `0xdemo000...` |
| Uploads, AI video, deals, channels, step-up redirect | Real or error | Simulated locally (progress bar, a job that moves queued -> rendering -> ready in about 9 seconds, step-up kept in sessionStorage) |
| Hire workspace | Real | Records whose ids start `demo-`, `demo.` or `cr-` never go to the server (`workspace/mockStore.ts:34`) |

What sample data looks like (`ui-mocks/`): five campaigns (Ledgerlane 0042, Tidepool 0041, Fieldnotes 0040, Hexbolt 0039, Ninth Ward 0038) with serial numbers, pools of 1,500 to 8,000 USDC and rates of 1.1 to 3.0 per 1K views; four sample clips for creator "@mara.reels" with verdicts approved / rejected / needs human / pending; an admin queue of five items; a leaderboard of five wallet-shaped names (`0x71c9…8e3b`...). Data files: `ui-mocks/data.ts`, `market.ts`, `workspace.ts`, `ext.ts`, and `components/workspace/mockStore.ts`.

How a screen looks when the API is down (normal build): the landing page works (static). Pages with a `useAsync` call show `ServiceState`: "Service unavailable / Clippo could not reach its service." with "Try again". The footer fee line says "Platform fee: the fee schedule could not be read from the service." The chip says "Connect wallet" (the check for an existing session fails quietly). A connect attempt ends in the sheet "Could not connect" with "The Clippo service did not answer. Nothing was changed."

Fields the data adapter leaves empty for live data (they look real in the design but are placeholders): `creators: 0`, `closesIn: ""`, `daily: []` (`api.ts:187,191`); `paid` is 0 for every payout mode except per-view (`api.ts:168`). Result with live data: the Slip card always says "open until closed", never shows a creator count, and shows 0% allocated for split and pool-share campaigns. The campaign page shows "Creators 0". Clips from the server list are all labelled "YouTube" (`api.ts:211`).

### 5.5 Which screen calls which API

"API" = HTTP routes under `/api`. "On-chain" = a transaction the user's wallet signs (or reads) on the Arc network. Every page also triggers the shell calls: `GET /auth/me` (once) and `GET /chain/config` (once, for the footer fees).

| Screen | API calls | On-chain calls |
|---|---|---|
| Shell (all pages) | `GET /auth/me`, `GET /auth/nonce`, `POST /auth/session`, `POST /auth/logout`, `GET /chain/config` | none (sign-in only signs a text message) |
| `/` landing | none | none |
| `/wire` | `GET /marketplace/trending?days=7&limit=40`, `GET /leaderboard?sort=views or earnings&limit=25` | none |
| `/slips/[id]` | `GET /campaigns/:id`, `GET /campaigns/:id/submissions` (always, even signed out), `GET /campaigns/:id/views`, `GET /creator/earnings` (creators, for "Your confirmed views"), `GET /campaigns/:id/eligibility` and `POST /referral/attribute` (button "Join this campaign"), `GET /channels` then `POST /submissions` (button "Submit"), `GET /appeals`, `POST /submissions/:id/appeal`, `POST /appeals/:id/escalate`, assistants `POST /assistant/creator/explain`, `POST /assistant/creator/check`, `GET /assistant/creator/matches`, deals `GET/POST /campaigns/:id/deal`, `POST /campaigns/:id/deal/accept`, `POST /campaigns/:id/deal/decline` | none |
| `/join` | `GET /channels`, `POST /channels`, `POST /channels/:id/upgrade-code`, `POST /channels/:id/verify`, `POST /worldid/rp-signature`, `POST /worldid/verify` | none |
| `/account` | `GET /channels`, `GET /dashboard/creator`, channel posts as on `/join`, `POST /worldid/rp-signature`, `POST /worldid/verify` | none |
| `/desk/new` | `POST /wizard/suggest` (twice: first and when reaching "size"), `POST /uploads` or `GET /uploads/direct` + `POST /uploads/complete`, `POST /ai-video/jobs`, `GET /ai-video/jobs/:id` (every 1.5s), `POST /ai-video/jobs/:id/approve`, `POST /campaigns`, `POST /campaigns/:id/source` | none |
| `/desk/[id]/fund` | `GET /campaigns/:id`, `GET /campaigns/:id/fund` (preview, campaigner), `POST /campaigns/:id/fund` (receipt check), `POST /onramp/session` (button "Buy USDC with a card") | Wallet asks to add or switch to Arc Testnet; USDC `approve` (only if allowance is short); escrow `createCampaign` |
| `/desk` | `GET /campaigns?mine=true` (twice), `GET /campaigns/:id/submissions` (per live campaign), `GET /dashboard/campaigner`, `GET /campaigns/:id/views`, `POST /submissions/:id/verdict`, `POST /campaigns/:id/agent`, `GET /campaigns/:id/agent`, `POST /campaigns/:id/split/propose`, `POST /campaigns/:id/split/audit`, `POST /campaigns/:id/split`, `POST /campaigns/:id/stepup/start`, `GET /stepup/:attemptId`, `POST /campaigns/:id/close`, `GET /chain/disputes`, `POST /worldid/rp-signature`, `POST /chain/report` | `closeCampaign`; `approveSplit`; `disputeCredits` |
| `/ledger` | `GET /creator/earnings`, `GET /dashboard/creator`, `GET /submissions`, probes `GET /status/ladder`, `GET /referral/summary`, `GET /creator/onchain-profile`, claim: `GET /payouts/:id/claim` (preview) then `POST /payouts/:id/claim` | none from the user's wallet. Clippo's own wallet sends the payout and pays the gas (`lib/chain/client.ts:248-253`). |
| `/bench` | `GET /admin/queue`, `POST /campaigns/:id/attest`, `POST /campaigns/:id/approve`, `POST /campaigns/:id/reject`, `PATCH /admin/flags/:id`, `POST /submissions/:id/verdict`, `GET /campaigns`, `GET /campaigns/:id/agent`, `POST /campaigns/:id/split`, `POST /campaigns/:id/stepup/start`, `GET /chain/disputes`, `GET /assistant/admin/disputes`, `GET /assistant/admin/growth`, `POST /assistant/admin/growth/:id/hold`, `POST /worldid/rp-signature`, `POST /chain/report` | `approveCampaign` (with World ID proof when high value); `rejectCampaign`; `approveSplit`; `resolveDispute` |
| `/hire` | `GET /creators?limit=200`, `POST /shortlists` ("Make shareable link") | none |
| `/hire/brief` | `GET /creators?limit=200`, `POST /briefs`, `POST /hires`, `POST /hires/:id/creators` (once per creator), `GET /hires/:id` | none |
| `/hire/w/[id]` | `GET /hires/:id`, `PATCH /hires/:id/creators/:creatorId` (Approve / Pass), `POST /hires/:id/fund`, then `GET/POST /campaigns/:id/fund`, `GET /hires/:id` | Add/switch network; USDC `approve`; escrow `createCampaign` |
| `/hire/lists/[token]` | `GET /shortlists/shared/:token` | none |
| `/hire/share/[token]` | `GET /hires/shared/:token` | none |
| `/status` | `GET /status/ladder`, `GET /status/me` | none |
| `/referrals` | `GET /referral/summary`, `GET /campaigns`, `POST /referral/links` | none |
| `/profile` | `GET /creator/onchain-profile`, `POST /creator/onchain-profile` | none from the user's wallet (opt-in is stored by the server; clearing on-chain data is described as a wallet transaction, no button exists in this UI) |

Not used by any screen: `GET /hires` (list of hires), `POST /wizard/aeo`, `/snapshots/*`, `/notifications*` (no notifications UI exists).

---

## 6. Cross-cutting behaviours

### 6.1 Money actions through the wallet

| Action | Button label (exact) while idle -> while busy | Wallet pop-ups the user sees | Result text |
|---|---|---|---|
| Fund a campaign (`FundView.tsx:112-126`) | "Fund {n} USDC" -> "Approve USDC in your wallet" (step 1, only if allowance is short) -> "Confirm the deposit" (step 2) -> "Verifying on-chain" -> generic "Waiting for signature" | First time: add/switch network "Arc Testnet"; USDC allowance approval; deposit | Idle help: "Funding is two wallet confirmations: allow USDC, then deposit the pool. The service verifies the receipt on-chain before the campaign counts as funded." Step lines: "Step 1 of 2: approve the escrow to take the pool in USDC. Gas is paid in USDC." / "Step 2 of 2: confirm the deposit into escrow." / "The service is reading the receipt on-chain before it counts the funds." Success: notice "Transfer confirmed and verified" + `tx 0x...` as plain text (no explorer link). Failure: red box with the error plus "Nothing left your wallet. Check you have USDC on Arc and try again." + "Try again". |
| Fund all hires (`WorkspaceView.tsx:193`) | "Fund all, $N" -> same step labels ("Working" when unknown) | Same as above | Same failure box. The button is also disabled with a reason line, e.g. "Approve at least one creator to fund." |
| Claim (`LedgerView.tsx:146-153`) | "Claim {n} USDC" -> "Waiting for signature". "Nothing to claim" when none ready. "Connect wallet to claim" when signed out. | None. Clippo's wallet sends it. The label still says "Waiting for signature" (P9). | Success: notice "Claimed and verified on-chain." + tx lines. Partial failure: "{k} of {m} claims did not go through: {first error}". Claims run one by one so one failure does not block the rest. |
| Close campaign (`DeskView.tsx:193`) | "Close and reclaim ${n}" -> after done "Closed · 0xabcdef12…" in place of the button | Network switch if needed; close transaction | Failure: notice "Nothing changed" + error |
| Admin approve / reject campaign (`BenchView.tsx`) | "Approve", "Reject and refund" (opens a reason box first: "Reason for the campaigner", hint "The pool is refunded in full on-chain. Your wallet signs the refund first.") -> buttons disabled while busy -> row shows the label of what was done ("Approve", "Clear", "Overturn", "Approved and live"...) | Wallet transaction; for high-value pools a World ID check first | Failure: red text under the row |
| Approve a payout split | Campaigner "Approve agent's split" / "Build it myself"; admin from "Splits to approve" | A World ID check (pop-up) for hand-built splits. For AI proposals a full-page jump to World ID (`auth.world.org`) and back, then the wallet transaction. | Notice texts "Split finalized for N creators. They can claim now.", "Both approvals are in. Waiting for the chain to confirm the split. Credits appear once the escrow reports it.", "Your approval is recorded... Awaiting {campaigner/admin}: they must approve the identical split... Nothing is payable yet." Failure: "Split not approved. {reason}" |
| On-chain dispute | "Dispute", "Uphold", "Deny" | Wallet transaction | Notice "Dispute opened on-chain. These credits can't be claimed until it's settled." etc. |

Common patterns: a failed or rejected wallet prompt always ends with the words "Nothing was changed" or "Nothing left your wallet". Pending states are shown only as a change of the same button's label. There is no global progress bar, no pending-transaction list and no block-explorer link for the user's own transactions (explorer links appear only for CRE "Proof" links in confirmed-views cells, `ConfirmedViews.tsx`).

Fee preview (`FeePreview.tsx`): a "receipt" box with label "Fee preview, funding" or "Fee preview, claim", lines "Pool you send / Platform fee, x% / Net pool for creators" or "Gross payout / Platform fee, x% / You receive". Loading: "Reading the fee schedule". Failed: "The fee schedule could not be read from the service, so no figure is shown. Reload to try again."

### 6.2 Polling and refresh

- No polling except the AI video job check (1.5s).
- No live updates, no websocket, no refetch on focus.
- After most writes the screen re-runs its loader (`retry`) or updates its local state.
- After a World ID step-up redirect the page reloads from scratch and `StepUpReturnPanel` finishes the job (`StepUpApprove.tsx`). A notice appears: "World ID step-up", "Verified with World ID (fresh Orb-class check). Completing approval...", or the failure texts ("You cancelled at World ID. Nothing was approved.", "The check expired. Nothing was approved. Start again.", "That World ID is not the one linked to your account, or the split changed. Nothing was approved.", "World ID could not be reached or validated. Nothing was approved.") followed by "The payout did NOT occur."
- Hire selection ("clipped" tray) is kept in browser localStorage `clippo-ws-sel` so it survives page changes (`workspace/parts.tsx`). The hire budget cap is kept in localStorage per hire (`api.ts` `capKey`), so it can be missing on another device.

### 6.3 Notices, toasts and dialogs

- There are no toasts. Results appear as inline `notice` boxes that stay until the next action.
- Dialogs: the three masthead sheets, the World ID pop-up, the World ID "not configured" sheet ("World ID · Not configured"), and the demo simulator.
- Screen-reader announcements: loading blocks use `role="status"`; error boxes use `role="alert"`; result lists use `aria-live="polite"`.
- Copy buttons switch their label to "Copied" for about 2 seconds.

### 6.4 Form validation style

| Form | When checked | How shown |
|---|---|---|
| Campaign wizard (`Wizard.tsx:79-92`) | Continuously. The main button stays disabled (grey) until the step is valid: idea needs 12 or more characters; story needs summary 20+ characters, a required point and a disclosure label. Button label: "Write the brief" on step 1, "Next", "Create and go to funding" on the last. | No red messages for these. Server errors appear as a "Stopped." notice above the buttons. |
| Brief form (`BriefBuilder.tsx:44-52`) | On submit | A red line with a cross icon under each bad field, border turns red, focus moves to the error summary (`#brief-errs`). Messages: "Name the campaign. Creators see this first.", "Say who is paying.", "Write at least a couple of sentences: what the product is and what the clip must show.", "List at least one thing every clip has to say.", "Pick a delivery date.", "That date has passed.", "Set a budget cap above zero.", "Every creator needs a quantity of at least 1." Over-budget is only a warning; it does not block sending. |
| Clip link (`SlipDetail.tsx:131,256-269`) | Live | "Submit" disabled while empty or when the link is not YouTube, X or Instagram. Server error under the field. A "readiness" hint block (`LinkReadiness`) shows as you type. |
| Channel handle (`JoinView.tsx:205`) | Live | "Get my code" disabled until the handle has 3+ characters. |
| Admin reject reason (`BenchView.tsx:76-78`) | On click | "Give the campaigner a reason, at least a few words." |
| Hire directory | Live | Rate cap input accepts digits only. |

Required fields have no asterisk or "(required)" label anywhere (from code).

---

## 7. Shell and route UX problems

Severity: High = blocks or misleads a first-time user on the main path. Medium = confusing or wrong in a common case. Low = polish. Items marked (from code) were not reproduced in a browser.

| ID | Sev | Problem | Where |
|---|---|---|---|
| P1 | High | The landing CTA "Start a campaign" and the footer link lead to a wizard that fails for a signed-out visitor. The first button "Write the brief" calls `POST /wizard/suggest`, which needs a campaigner or admin sign-in. The visitor sees a "Stopped." notice with "Sign in: GET /api/auth/nonce, then POST /api/auth/session with a SIWE signature". A signed-in creator sees "Requires role: CAMPAIGNER or ADMIN". The page promise "Nothing is charged until the last step" is true but sign-in is not mentioned until the last step. (from code) | `Wizard.tsx:100,120,323`; `app/api/wizard/suggest/route.ts:10`; `app/(site)/desk/new/page.tsx:11` |
| P2 | High | Developer text reaches users. The signed-out message is a programmer instruction (route names and "SIWE signature") and shows in red boxes on Ledger, Bench, Status, Referrals, Profile and in the wizard. | `lib/auth.ts:88`; `LedgerView.tsx:73`; `BenchView.tsx:123`; `ModulePages.tsx:20` |
| P3 | High | The nav is the same for everyone. "Desk" (campaigners), "Ledger" (creators) and "Bench" (admins) show to all, signed out or not. A wrong click ends in a red "Requires role: ..." box or an unrelated empty state. The nav gives a first-time visitor no hint which item is theirs. | `Shell.tsx:12-19` |
| P4 | High | Wrong-role loop. On Fund, Workspace and Brief pages, a creator or admin sees "Connect the campaigner wallet that holds the USDC." and a "Connect wallet" button. The button asks for a signature but cannot change the role of an existing account (the server keeps the old role), so nothing changes. Only `/account` explains the way out ("switch accounts in your wallet and connect again"). | `FundView.tsx:108-109`; `WorkspaceView.tsx:187-191`; `BriefBuilder.tsx:238-243`; `hooks.ts:83-101`; `session/route.ts:35-48` |
| P5 | Medium | `Correction` never prints its `cause` text. Specific reasons are lost: Wire, Desk "The review tray did not load.", Slip clips and others show only the generic title. Also every error box carries the print word "Correction" as its label. | `Bits.tsx:93-109`; e.g. `WireView.tsx:71`, `DeskView.tsx:208` |
| P6 | Medium | Slip page says "Verify you are a person first." to campaigners and admins, who can never be verified in this UI. The button leads to `/join`, which is a creator flow. | `SlipDetail.tsx:130,245-246` |
| P7 | Medium | Pages do not refresh after the masthead connects or disconnects. Disconnect leaves the old data on screen. Connect from the chip leaves old errors until "Try again". On a slip page, a visitor who connects and joins can see "Your clips did not load." because the clip list was requested while signed out. (from code) | `hooks.ts:14-32,153-158`; `SlipDetail.tsx:116-117,271` |
| P8 | Medium | Hire workspaces have no index. After sending a brief the user lands on `/hire/w/<id>`; there is no link to it from Desk, nav or Hire. The list endpoint `GET /hires` exists but no screen uses it. Losing the address loses the workspace. | `BriefBuilder.tsx:82`; `api.ts` (no `ws` list call) |
| P9 | Medium | Claim button says "Waiting for signature" but no wallet signature is requested; Clippo's wallet sends the payout. Footer says "claimed by the creator", the code comment in `hooks.ts:204` says the creator calls claim. | `LedgerView.tsx:147`; `lib/chain/client.ts:248-253` |
| P10 | Medium | Landing says "Fee 0.1 to 0.5 per side" with no unit; the footer shows the live schedule read from the service (a code comment in `api.ts` says the default is 0.25% per side). Two different fee statements on one page, and the hero one has no unit. | `Hero.tsx:39` vs `Shell.tsx:188-194` |
| P11 | Medium | No `error.tsx`, `global-error.tsx` or `loading.tsx`. A render crash shows the framework default screen. | `app/` (files absent) |
| P12 | Medium | On phones (599px and below) the wallet chip and theme toggle are hidden inside "Menu". The user cannot see whether they are signed in, or which role, without opening the menu. | `globals.css:569-574` |
| P13 | Medium | Role is decided at first sign-in with little context: masthead "Connect wallet" works, then a sheet asks "Which desk is this wallet for?" and a second signature is needed. Choice is permanent. The text "desk" is a print word; the buttons use "I clip" and "I pay for clips". | `Shell.tsx:137-150` |
| P14 | Medium | Data placeholders look like real fields: Slip card never shows creators or a close date and shows 0% allocated for split and pool-share campaigns; campaign page shows "Creators 0"; all clips from the server list are labelled "YouTube". | `api.ts:168,187,191,211` |
| P15 | Medium | Optional pages `/status`, `/referrals`, `/profile` can be found only through small links on the Ledger sidebar, and only when switched on. Off, they show a 404 that says "switched off in this build". | `LedgerDash.tsx:91-105`; `ModulePages.tsx:58,143,235` |
| P16 | Medium | After the World ID step-up redirect, an admin returns to `/bench` on the "All" tab. The result notice is mounted inside the "Splits to approve" tab, so it shows only after the admin opens that tab. (from code) | `BenchView.tsx:37,117`; `AdminSplits.tsx:52`; `StepUpApprove.tsx:43-55` |
| P17 | Medium | "Make shareable link" in the Hire tray is shown to everyone but only campaigners can create lists. Others get a red "The list link was not made." box with API text. | `workspace/ShareBox.tsx`; `app/api/shortlists/route.ts` |
| P18 | Low | Inconsistent titles: tab says "The Wire", "The Desk", "The Bench" but "Ledger" and "Account"; the Ledger headline kicker says "The Ledger". Nav says "Wire", "Desk", "Bench", "Ledger" without "The". The slip page has no title at all. | page files in `app/(site)/**`; `slips/[id]/page.tsx` |
| P19 | Low | Footer lists only three links. Hire, Ledger, Bench, Account and the optional pages are absent. Landing never mentions Hire. | `Shell.tsx:179-184`; `app/page.tsx` |
| P20 | Low | Disconnect is one click on the whole chip with no confirmation; the hint "Disconnect wallet" is a hover tooltip only, so touch users get no hint. | `Shell.tsx:126` |
| P21 | Low | The demo note prints the build setting name "NEXT_PUBLIC_DEMO=1" to users. | `Bits.tsx:127` |
| P22 | Low | Dateline always says "Arc testnet · USDC", even on deployments where that may not be true; the date is the visitor's clock, not an edition date. | `Shell.tsx:48` |
| P23 | Low | Escape closes the wallet picker but not the role chooser or the connect-error sheet. No focus handling is coded for those two sheets. | `WalletPicker.tsx:14-18`; `Shell.tsx:137-160` |
| P24 | Low | `/join` shows a "Could not connect." box that is filled only by World ID results; wallet connect errors appear in the masthead sheet instead, so the Join box rarely applies. | `JoinView.tsx:265,280` |
| P25 | Low | `OnchainDisputes` has no loading state, prints raw errors ("Disputes did not load: ...") and bypasses the service-down box. | `OnchainDisputes.tsx:13-31,50-52` |
| P26 | Low | The wallet chosen at sign-in is not remembered after reload; with several wallets installed later actions may go to a different wallet (from code). | `lib/chain/wallets.ts:88-95` |
| P27 | Low | Theme button label can show "Night" for a moment even when the saved theme is Night, until the effect runs. | `Shell.tsx:56-64` |

---

## Not determined / could not verify

- Nothing was run. All screen text, states and flows come from reading code, not from a browser session. Items marked "(from code)" are inferences from reading the call order.
- How the raw HTTP errors look in the browser tab when the database is down (depends on the server).
- Whether the `Suspense` fallback in `layout.tsx:56` flashes visibly (depends on timing).
- Whether any wallet shows its own network prompts differently from what `ensureChain` requests (wallet-specific).
- Focus trapping inside the masthead sheets. No code is present; behaviour of the browser is not checked.
- Real values of `ADMIN_WALLETS`, `FEATURE_STATUS_LADDER`, `FEATURE_REFERRAL`, `FEATURE_TOKENIZATION`, `NEXT_PUBLIC_*` flags on any live deployment (so whether the optional pages exist for real users is not known).
- The creator-side view of `/hire/w/[id]` (a creator on a hire can read it by the API, but no screen links creators to it).
- The wizard question list and screen details, the Desk/Bench panels, the Hire forms and visual design are covered by other parts. This part only lists what they call and how they fail.
