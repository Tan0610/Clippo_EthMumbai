# Clippo UI guide

One place to start when we work on the look, the words and the buttons. It was written on 2026-11-07 from `main` at `bb2fbec`. Six detail files sit next to it in `docs/ui/`. Every claim in them comes from reading the code (file and line given), except `05-visual-pass.md`, which comes from screenshots of the demo build. **Nothing here was tested against the live site, a wallet or a real chain.** Where a detail file says "not determined", we did not find the answer.

All names, colors and label changes marked PROPOSAL are suggestions. Nothing in the app was changed.

## How to use this guide

| I want to... | Open |
| --- | --- |
| Change a color, font, spacing, button or other style | `docs/ui/01-design-system.md` |
| Know what a route is, who can open it, how the nav, sign-in and landing page work | `docs/ui/02-shell-routes-landing.md` |
| Know what every brand or admin button does (Desk, wizard, fund, Hire, Bench) | `docs/ui/03-brand-and-admin-screens.md` |
| Know what every creator button does (Join, Account, Ledger, Wire, campaign page) | `docs/ui/04-creator-screens.md` |
| See how the screens look to a first-time visitor | `docs/ui/05-visual-pass.md` and `docs/ui/shots/` |
| Rename things, fix error text, find unclear words | `docs/ui/06-glossary-copy-ux.md` |

`docs/ui/shots/` holds the desktop Paper screenshot of each of 16 screens. Phone and Night captures were left out to keep the repo small.

## The look in one page

The brief is `design/DESIGN.md` ("The Clipping Desk": a trade paper plus a bookkeeper's ledger). Plain CSS, no utility framework. Source of truth: `web/src/app/globals.css`.

**Fonts** (loaded in `web/src/app/layout.tsx` with `next/font/google`)
- Display: Bodoni Moda 500, 600, 700. Headlines, campaign titles, big numbers.
- Text: Schibsted Grotesk 400, 500, 700. Body, labels, buttons.
- Figures: Martian Mono 400, 500, 700. Money, views, addresses, micro labels in caps.

**Colors** (CSS variables; Night is set by the OS or by the Paper/Night toggle)

| Token | Paper | Night | Used for |
| --- | --- | --- | --- |
| `--paper` | `#f1ece0` | `#12100d` | page background |
| `--paper-2` | `#f8f5ec` | `#1a1713` | raised cards and slips |
| `--paper-3` | `#e7e0d0` | `#221e18` | table bands, washes |
| `--ink` | `#15120e` | `#ede6d6` | text, rules, borders |
| `--ink-2` | `#4a443a` | `#b5ac99` | secondary text |
| `--ink-3` | `#6b6455` | `#8f8775` | tertiary and disabled text |
| `--signal` | `#e8420c` | `#ff5a1f` | the one accent: money and the main action |
| `--signal-ink` | `#fff8ee` | `#12100d` | text on the accent |
| `--ok` | `#1d5c3a` | `#5dbb8a` | approved |
| `--no` | `#9b1c1c` | `#e2685f` | rejected, errors |
| `--hold` | `#8a5a00` | `#d9a441` | needs a human |

**Shape and feel:** radius 0 everywhere, no shadows except the hard 4px "press" offset on primary buttons, hairline rules, a faint paper noise. Page max width 1280px, 24px gutters. Contrast ratios and every hard-coded color outside these tokens are listed in `01-design-system.md` sections 2 and 11.

## Where things are (routes)

18 screens, plus a themed 404 ("Not on file"). Full table with who can open each one: `02-shell-routes-landing.md` section 1.

| Route | Plain meaning | Main user |
| --- | --- | --- |
| `/` | Landing page (sample content, no live data) | anyone |
| `/wire` | Open campaigns to browse | anyone |
| `/slips/[id]` | One campaign: rate, pool, rules, submit a clip | creator, anyone |
| `/join` | Creator sign-up: prove you are a person, prove a channel | creator |
| `/account` | Wallet, role and sign-in | everyone |
| `/ledger` | Creator earnings and the claim button | creator |
| `/desk`, `/desk/new`, `/desk/[id]/fund` | Brand dashboard, create a campaign, fund it | brand |
| `/hire` and its sub-pages | Pick named creators and fund them with one deposit | brand |
| `/bench` | Admin review queue | admin |
| `/profile`, `/referrals`, `/status` | Optional modules, **off by default**: they show the 404 page | creator |

There is no route guard. Every page renders for everyone, and the server's answer decides what a wrong role sees.

## The words: what to change first (all PROPOSAL)

The newspaper names (Wire, Desk, Slips, Ledger, Bench, Standing, Hire) are never explained on screen, and the nav name rarely matches the page title. `06-glossary-copy-ux.md` covers about 150 terms, two naming options and a recommendation: **Option 1, keep the newspaper brand and add a plain sub-label to every nav item and page kicker.** Ready-to-use label changes (from `06-glossary-copy-ux.md` section 6a):

**P2. Navigation, buttons and headings (current label -> proposed label)**

Navigation (Shell.tsx:13-18):
- Wire -> Campaigns
- Hire -> Hire creators
- Desk -> My campaigns (brand)
- Ledger -> Earnings (creator)
- Bench -> Admin
- Account -> Account (keep)
- (add) Join -> Join as a creator (not in nav today; footer only, Shell.tsx:183)

Page titles and kickers:
- "Campaigns paying right now" (WireView.tsx:32) -> keep as heading; kicker "The Wire" -> "Open campaigns"
- "Your campaigns" kicker "The Desk / Campaigner" (Desk.tsx:123) -> kicker "My campaigns"
- "What you're owed" kicker "The Ledger" (Ledger.tsx:66) -> "Your earnings"
- "Read it, then decide" kicker "The Bench" (Bench.tsx:100) -> "Admin review"
- "Who's signing" (AccountView.tsx:86) -> "Your account"
- "Standing" (Standing.tsx:22) -> "Top creators"
- "Status ladder" (LedgerDash.tsx:101) -> "Creator levels"
- "On-chain profile" -> "Public record"

Buttons and labels:
- "Connect wallet" -> "Connect wallet to sign in"
- "Check your wallet" (disabled, many) -> "Waiting for your wallet"
- "Verify with World ID (Proof of Human)" (Join.tsx:285) -> "Verify you are a person (World ID)"
- "Approve with World ID step-up" (SU.tsx:78) -> "Approve with identity check"
- "Setting type" (BriefBuilder.tsx:238; ShareBox.tsx:53) -> "Sending" / "Making link"
- "Clip this ad" / "Clipped" (parts.tsx:79) -> "Add to shortlist" / "In shortlist"
- "Drop" (Directory.tsx:114) -> "Remove"
- "Strike" (BriefBuilder.tsx:27) -> "Remove line"
- "Pass" (panels.tsx:42) -> "Decline"
- "Clear" (Bench.tsx:26) -> "Accept clip"
- "Overturn" / "Uphold" (Bench.tsx:27) -> "Reverse rejection" / "Keep rejection"
- "Reject and refund" (Bench.tsx:25) -> keep
- "Close and reclaim $X" -> keep
- "Claim X USDC" -> "Withdraw X USDC"
- "Fund X USDC" -> keep
- "Ask the AI to propose" / "Propose without AI (pro rata by clips)" (Desk.tsx:188-189) -> "Let the AI suggest the payout" / "Suggest an equal payout by clips"
- "Build it myself (1 of 2)" -> "Build the payout myself (you sign first)"
- "Review the agent's split (admin)" -> "Review the AI payout"
- "Appeal this verdict" -> "Ask for a review"
- "Escalate to an admin" -> keep
- "Dispute" (OnchainDisputes.tsx:69) -> "Challenge this pay"
- "I clip: creator" / "I pay for clips: campaigner" (Shell.tsx:144-145) -> "I am a creator: I post clips and get paid" / "I am a brand: I pay for clips"
- "Which desk is this wallet for?" -> "Are you a creator or a brand?"
- "Correction" (Bits.tsx:99) -> "Problem"

Table and field labels:
- "Pool used" + "Allocated" (Desk.tsx:160) -> one column "Committed"
- "Still accruing, est." -> "Expected, not yet earned"
- "Est. USDC" -> "Estimated USDC"
- "Clippo count" -> "Views (Clippo count)", with "Confirmed" -> "Paid views" and "Pending" -> "Not yet counted"
- "Conf." / "CONF 0.91" -> "AI certainty 91%"
- "Reliability" / "approve rate" / "% pass" -> "Approval rate" everywhere
- "Per view" / "Per verified view" -> "Pay per 1,000 views"
- "I approve the split" -> "I decide the payout at the end"
- "Share the whole pool" -> "Split the whole budget by views"
- "Higher-ranked only" / "Ranked only" -> "Experienced creators only"
- "Open" (Ledger.tsx:98) -> "Ready"
- "Credits" -> "Earnings"
- "Needs human" -> "Waiting for a person"
- "In the queue" -> "Being checked"
- "Agent note" -> "AI reason"
- "Waiting on your call" -> "Clips for you to decide"
- "Campaigns to sign" -> "Campaigns to approve"
- "Splits to approve" -> "Payouts to approve"
- "Dispute summaries" -> "Appeals and flags"
- "Suspicious growth" -> "Possible fake views"

The full list, including raw developer text that reaches users, is `06-glossary-copy-ux.md` section 6a.

## Biggest problems found

From code reading (detail files) and from screenshots (`05-visual-pass.md`). Severity and file:line are in the detail files.

**First-time user**
- The landing "Start a campaign" button sends a signed-out visitor to wizard step 1 with developer text instead of asking them to connect a wallet.
- Developer text reaches users, for example "Sign in: GET /api/auth/nonce, then POST /api/auth/session with a SIWE signature" and "Requires role: CREATOR".
- The nav is the same for every role.
- `/join` has no clear main button. The join action on a campaign page sits at the very bottom.
- Things that need a decision are at the bottom: "Waiting on your call" on `/desk`, the claim button on `/ledger`.
- `/profile`, `/referrals` and `/status` are not in the nav and show a 404 when off.

**Money screens**
- The Ledger shows two different "claimable" numbers, and "Still accruing, est." double counts money already owed or claimed.
- The claim button says "Waiting for signature", but Clippo's wallet sends the claim and the creator signs nothing.
- "Allocated" and "Pool used" show 0 for split and pool-share campaigns.
- "Close and reclaim" shows from the start, but the contract allows it only after the deadline plus one day, and the brand is never shown the end date.
- A fund error says "Nothing left your wallet" even when the deposit went through, and "Try again" could deposit twice.
- The admin's rejection reason is never shown to the brand.

**Names that mean several things**
- "Desk" has five meanings. "Verified" has five. "Clip" means the video, the creator role and a shortlist action.
- Four view numbers (Confirmed, Pending, Clippo count, Verified views); only Confirmed is paid, and the words do not say so.
- Two tier systems share the names Rising, Partner and Top.

**Hire, deals and admin**
- "Send to N creators" notifies nobody, and the agreed per-creator amounts are not tied to payment.
- The deal panel says the accepted rate applies, but the contract pays one campaign-wide rate.
- After the World ID redirect, `/bench` opens on a tab where the approval cannot finish; it completes only in "Splits to approve".
- Instagram channels cannot be proven from the screen.

**Looks and phone**
- Small grey mono-caps labels, even for error text.
- Orange means many things; the header "Connect wallet" is not orange.
- `/ledger` and `/desk` scroll sideways by 16px on a 390px phone, and their tables become very long stacks.
- Destructive and safe actions look the same on `/bench`.

## What is not covered or not proven

- Nothing was run against a wallet, World ID, YouTube or the chain. The visual pass used the demo build with API calls blocked, so the screens show sample data.
- The three optional pages were captured with stand-in data written by the screenshot agent, not the app's own sample data (extra captures not kept in the repo).
- The filled-in `/hire/brief` page was never seen.
- Night and phone views were only partly reviewed; the repo keeps only the desktop Paper shots.
- Items the agents could not determine are listed at the end of each detail file.

## Next step

Decide the naming option (we recommend Option 1) and which problems to fix first, then start UI work on a branch from `main`. Do not change `design/DESIGN.md` and this guide in two places at once: `01-design-system.md` section 10 lists where the brief and the CSS already differ.
