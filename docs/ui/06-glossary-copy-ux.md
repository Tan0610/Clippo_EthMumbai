# F. Glossary, naming, messages and copy UX

Scope: branch docs/ui-guide (main bb2fbec). All paths are under `web/src/` unless noted. Quoted strings come from the code. Anything marked PROPOSAL or "proposed" is new text, not in the code. "not determined" means I could not confirm it from the code.

Abbreviations for files: `Shell` = components/Shell.tsx, `Bits` = components/Bits.tsx, `Desk` = components/DeskView.tsx, `Ledger` = components/LedgerView.tsx, `LDash` = components/LedgerDash.tsx, `CV` = components/ConfirmedViews.tsx, `Slip` = components/SlipDetail.tsx, `Join` = components/JoinView.tsx, `WC` = components/WorldCheck.tsx, `SU` = components/StepUpApprove.tsx, `Bench` = components/BenchView.tsx, `WS` = components/workspace/*, `api` = components/api.ts, `hooks` = components/hooks.ts, `errors.ts` = lib/worldid/errors.ts.

Method note: CSS turns many labels to UPPERCASE (globals.css:116, 130, 306, 353, 396). The code strings below are the source casing. The screen shows capitals for micro labels, tags, tabs, table headers and stamps.

---

## 1. Glossary

Columns: Term | Where it appears | Plain meaning | Who sees it | Clarity | Proposed plain label (PROPOSAL) | Note.
"Who": A = anonymous, C = creator, B = brand (campaigner), M = admin. Anonymous can open every page except that role pages show an error.

### 1.1 Navigation and place names

| Term | Where | Plain meaning | Who | Clarity | Proposed label | Note |
|---|---|---|---|---|---|---|
| Wire | Nav Shell.tsx:13; kicker "The Wire" WireView.tsx:32; link "Browse the wire" Hero.tsx:36, not-found.tsx:11; "Back to the wire" SlipDetail.tsx:295; "See the wire" FundView.tsx:143; "You're on the wire." JoinView.tsx:301 | The list of open campaigns that creators can join. | A, C, B, M | unclear | Campaigns (or "Find campaigns") | Page title is "Campaigns paying right now" (WireView.tsx:32), so the nav word and the heading differ. A newspaper wire is a news feed, not a job board. |
| Hire | Nav Shell.tsx:14; kicker "Hire" Directory.tsx:51; "Go to Hire" SharedView.tsx:22; metadata "Hire creators" hire/page.tsx:4 | A directory where a brand picks named creators and offers each a fixed price. | A, B | unclear | Hire creators | It is a verb as a nav item. A creator may read it as "hire me". |
| Desk | Nav Shell.tsx:15; "The Desk" DeskView.tsx:123; "Go to the desk" FundView.tsx:142; "Which desk is this wallet for?" Shell.tsx:141; "Pick your desk" page.tsx:103; "Two desks. Pick one." JoinView.tsx:248; row "Desk" AccountView.tsx:92; "Your desk" AccountView.tsx:107; "Desks" Footer Shell.tsx:180; "Desk assistant" CreatorAssistant.tsx:121 | Brand dashboard (nav, DeskView). Elsewhere it means your role (creator or brand). | A, B | misleading | Brand dashboard (nav: "My campaigns") | One word, five meanings: dashboard, role, role picker, footer group, helper box. Biggest naming problem. |
| Ledger | Nav Shell.tsx:16; "The Ledger" Ledger.tsx:66; "Go to the ledger" ModulePages.tsx:76; "Recent ledger activity" page.tsx:32; "How one line of the ledger gets written" page.tsx:48 | Creator earnings page: what you are owed and can claim. | A, C | unclear | Earnings | Brands also see "Ledger" in the nav but get a role error (see section 3). Table style is also called ledger. |
| Bench | Nav Shell.tsx:17; "The Bench" Bench.tsx:100; "The bench needs an admin wallet." Bench.tsx:123 | Admin review queue. | A, C, B, M | unclear | Admin review | Shown to everyone in the nav. Only admins can load it (Bench.tsx:104-108). |
| Account | Nav Shell.tsx:18; title "Who's signing" AccountView.tsx:86 | Your wallet, human check and channels. | A, C, B, M | clear | Account | Heading "Who's signing" does not match the nav name. |
| Standing | h2 Standing.tsx:22; rail "Your standing" ModulePages.tsx:74 | The public creator leaderboard (bottom of the Wire page). In ModulePages it means your own tier. | A, C, B | unclear | Top creators | Not in the nav. Sits under the campaign list (WireView.tsx:101). Two meanings. |
| Status ladder | Link LedgerDash.tsx:101; title ModulePages.tsx:64 kicker "Status" "Creator ladder" | Page that shows the creator levels and what you need for the next one. | C | unclear | Creator levels | Only reachable from small links in the Ledger side rail (LedgerDash.tsx:96-105). |
| Referral links / Referrals | LedgerDash.tsx:102; ModulePages.tsx:164 | Links a creator shares to earn a cut when a new person joins. | C | clear | Invite and earn | "Referral" is fine, hidden location is the issue. |
| On-chain profile | LedgerDash.tsx:103; ModulePages.tsx:241 | An optional public record of your clips and earnings, tied to your wallet. | C | unclear | Public record (optional) | "On-chain, non-transferable" in the kicker. |
| Slip / Slips | "Every slip is a funded USDC pool" WireView.tsx:33; "Pulling the slip" SlipDetail.tsx:290; "No such slip." SlipDetail.tsx:295; h2 id "slips" with text "Campaigns" DeskView.tsx:146-147; URL /slips/[id] | One campaign card or page. | A, C, B | unclear | Campaign | Visible text uses "slip" in only three places. Everywhere else it says campaign. |
| Dateline | Component Shell.tsx:33; strip text Shell.tsx:48 "Arc testnet · USDC" | The thin strip above the header with today's date and network. | A, C, B, M | unclear (label never shown to users) | Keep, add plain words: "Test network" | The word "Dateline" is only in code and the design brief. Users see a date and "Arc testnet · USDC". |
| Masthead / "Clipping bureau" | Shell.tsx:105 | Header, brand tagline. | All | clear | Keep | Tagline is cute but says nothing about what the product does. |
| Docket | FundView.tsx:68 (variable), aria "Campaign status" FundView.tsx:89 | The four-step progress list on the fund page. | B | clear (word not shown) | Keep "Campaign status" | |
| Tray | "Tray is empty." Desk.tsx:209; "Checking the tray" Desk.tsx:207; "The review tray did not load." Desk.tsx:208; "Clipped, N" Directory.tsx:103 | Desk: list of clips waiting for the brand to decide. Hire: your shortlist. | B | unclear | "Clips to review" / "Shortlist" | Same word, two unrelated lists. |

### 1.2 Money

| Term | Where | Plain meaning | Who | Clarity | Proposed label | Note |
|---|---|---|---|---|---|---|
| Pool | Wizard.tsx:166 "How big is the pool?"; Wizard.tsx:291 "Pool"; Slip.tsx:190; FundView.tsx:107, 152; Hero.tsx:47 | The total USDC a brand puts up for one campaign. | A, C, B | clear | Budget | The Hire flow calls it "Budget cap" (BriefBuilder.tsx:188) and the dashboard calls it "Budget" (DeskAnalytics.tsx:167). Same money, three names. |
| Per view | Wizard.tsx:256; WireView.tsx:46; format.ts:14 "Per verified view" | Creators earn a fixed rate for every 1,000 verified views. | A, C, B | clear | Pay per 1,000 views | Three spellings: "Per view", "Per verified view", "per 1K views" (Bits.tsx:35). |
| Human-approved split / "I approve the split" / Split / "split by approval" | format.ts:15; Wizard.tsx:257; WireView.tsx:46; Bits.tsx:40 | The brand decides at the end how much each creator gets, after a World ID check. | A, C, B | unclear | Brand decides the payout | Four names for one mode. "Split" alone says nothing. |
| Share the whole pool / Pool share | Wizard.tsx:258; WireView.tsx:46; format.ts:16; Bits.tsx:40 "shared by views" | The whole budget is divided at the end by each creator's share of views. | A, C, B | unclear | Split the budget by views | Wizard title is "Share the whole pool", filter and cards say "Pool share". The follow-up question "Share the pool by what?" (Wizard.tsx:164) is never asked: step list never includes shareBy (Wizard.tsx:40-45). |
| Human split | Wizard review line Wizard.tsx:314 (`pay.replace("_"," ")` gives "human split") | Same as Human-approved split. | B | misleading | see above | Code value leaks onto the review screen: "human split", "per view", "pool share", "me and admin". |
| Approver / "Who approves the split?" / "Only me" / "Me and an admin" | Wizard.tsx:165, 271-272; Desk.tsx:182, 190 "(1 of 2)"; AdminSplits.tsx:64 "two-party split" | The person or people whose World ID check releases the payout. | B, M | unclear | Who signs off | "(1 of 2)" appears on buttons with no explanation. |
| Allocated | Desk.tsx:160, 173; Slip.tsx:191; Bits.tsx:45 | Money already earmarked for creators out of the pool. | A, C, B | unclear | Committed | For non-per-view campaigns the value is always 0 (api.ts:168 sets paid only for PER_VIEW). Not determined whether intended. |
| Pool used | Desk.tsx:160, 172 | Same as Allocated, as a bar. | B | unclear | Budget used | Sits next to "Allocated" in the same row. Two headers, one number. |
| Left | Slip.tsx:192; Bits.tsx:48 "$X left of $Y" | Pool minus allocated. | A, C, B | clear | Remaining | |
| Spend | DeskAnalytics.tsx:168, 77 | Money paid out so far, against the budget. | B | unclear | Paid out | "Spend" can mean what the brand put in. |
| Budget | DeskAnalytics.tsx:167 | Same as Pool. | B | clear | | See Pool. |
| Cost per 1,000 views / Per 1K views | DeskAnalytics.tsx:88, 174, 120 | What the brand paid per 1,000 views, spend divided by views. | B | unclear | Cost per 1,000 views | Three label forms in one screen. |
| Rate | Slip.tsx:182; Wizard.tsx:292 "USDC / 1K views" | Price per 1,000 views. | A, C, B | clear | | |
| Claim | Ledger.tsx:147 "Claim X USDC"; Ledger.tsx:144 | Move your earned USDC to your own wallet. | C | clear | Withdraw | Needs a wallet signature and gas, which is not said on the page. |
| Claimable / Claimable now / Owed, claimable now | Ledger.tsx:140; LDash.tsx:45 | Earned money that is past its waiting period and can be withdrawn now. | C | clear | Ready to withdraw | |
| Settled / Settlements / Total settled | Ledger.tsx:84, 102; Hero.tsx:74 "settled"; page.tsx:12 "Views settle" | Views counted and turned into earned money. | A, C | unclear | Earned | "Settled" also sounds like "paid to you". It is not paid until claimed. |
| Open (status tag) | Ledger.tsx:98 | Earned and ready to claim. | C | misleading | Ready | "Open" in DealPanel.tsx:96 means "not signed yet". |
| Frozen, in review | Ledger.tsx:98, 142 | A payout paused while someone checks it. | C | clear | On hold | Reason shown only as hover title (Ledger.tsx:98). |
| Releases <date> | Ledger.tsx:98 (e.g. "Releases Nov 7") | The date this money becomes claimable. | C | unclear | Ready on Nov 7 | Explained only at Ledger.tsx:154 as "review window". |
| Retention window / review window | OnchainDisputes.tsx:59 "retention window"; Ledger.tsx:154 "review window" | Waiting period (default 7 days, fees.ts:32) when a brand can challenge pay. | C, B | unclear | Hold period | Two names for the same period. |
| Credits | Desk.tsx:110; Ledger.tsx:154; OnchainDisputes.tsx:41 | Earned amounts waiting to be claimed. | C, B | misleading | Earnings | Reads like store credit. |
| Still earning / Still accruing, est. / Estimates, before fees | Ledger.tsx:109; LDash.tsx:47 | Money creators are likely to earn from views not yet counted. | C | unclear | Expected earnings | Two labels for one number. |
| Est. USDC / Estimated | Standing.tsx:25, 43; Ledger.tsx:117 | Guess of earnings before platform fees. | A, C | unclear | Estimated earnings (USDC) | "Est." is a short form. |
| Platform fee | Shell.tsx:189-194; FeePreview.tsx:47 | A cut taken by the escrow from each side. | A, C, B | clear | | Hero says "Fee 0.1 to 0.5 per side" hardcoded (Hero.tsx:39). Footer reads the live value (Shell.tsx:189). They can disagree. |
| Gross payout / Net pool / You receive | FeePreview.tsx:46-54 | Before fee, after fee. | C, B | clear | | Good receipt wording. |
| Escrow | Desk.tsx; FundView.tsx:69, 86; Ledger.tsx:150; WS (many); Shell.tsx:190 | The locked account (a smart contract) that holds the pool until payout. | A, C, B | unclear | Held safely until paid | Never defined in one plain sentence. |
| USDC | Everywhere; Dateline Shell.tsx:48 | A dollar-priced digital coin. | All | unclear for newcomers | USDC (digital dollars) | UI mixes "$" and "USDC": `$` + number on USDC amounts (Bits.tsx:34; Desk.tsx:173). |
| Gas / "Gas is paid in USDC" | FundView.tsx:121, 124, 153 | The network's transaction fee. | B | unclear | Network fee | Jargon, no number shown. |
| Close and reclaim | Desk.tsx:193 | End the campaign and take back the unspent pool. | B | clear | Close and get back $X | Good, it shows the amount. |
| tx 0x... / Proof 0x... / split 0x... | FundView.tsx:137; Ledger.tsx:153; WS/WorkspaceView.tsx:202; CV.tsx:26; Desk.tsx:139 | Receipt numbers on the blockchain. | B, C | unclear | Transaction receipt | Raw hex shown in mono type. |

### 1.3 Verification and trust

| Term | Where | Plain meaning | Who | Clarity | Proposed label | Note |
|---|---|---|---|---|---|---|
| World ID | Join.tsx:275, 285; Account; many | A service that proves you are one real person without telling who you are. | C, B, M | unclear | "Human check (World ID)" | |
| Proof of Human | Join.tsx:16, 28, 285; AccountView.tsx:97; errors.ts:6 | The specific World ID credential Clippo needs. | C | unclear | Human check | Button reads "Verify with World ID (Proof of Human)" (Join.tsx:285): two jargon terms in one button. |
| Verified human / Verified with World ID. / World ID verified | LDash.tsx:29; Join.tsx:275; parts.tsx:73; Icons.tsx:128 | This account passed the human check. | A, C, B | clear | Verified person | |
| Verified (one word, many meanings) | Marks.tsx:8 tier "Verified"; panels stage "Verified" (ui-mocks/workspace.ts:55); "Verified views" Standing.tsx:24; "Verified human"; "Verified creators" FundView.tsx:71 | Human-checked, clip-checked, view-checked, or lowest tier, depending on place. | All | misleading | Use separate words | Five meanings. |
| Step-up | SU.tsx:78 "Approve with World ID step-up"; Desk.tsx:243; AgentPassPanel.tsx:26-32 | A second, stronger human check you must pass to release money. | B, M | unclear | Extra identity check | |
| Orb-class / fresh Orb-class check | SU.tsx:19; Desk.tsx:244; AdminSplits.tsx:79; AgentPassPanel.tsx:28 | The strongest World ID check (iris scan device). | B, M | unclear | strongest World ID check | Device name used as a level name. |
| Agent Pass | Desk.tsx:238, 243; AdminSplits.tsx:74, 78; AgentPassPanel.tsx:75 | The log and gate for payouts the AI proposed. | B, M | unclear | AI payout proposals | Name suggests a ticket. |
| World AgentKit / AgentBook | AgentPassPanel.tsx:76, 86 | The registry that ties an AI helper to a verified person. | B, M | unclear | (hide) | Developer product names on screen. |
| Nullifier | Join.tsx:18 (inside "Why Proof of Human?") | A one-time code that stops one person from opening a second account. | C | unclear | (avoid) | Expert term in an explainer. Also "Selfie Check", "Passport check" in same paragraph. |
| Agent | Footer Shell.tsx:175; Hero.tsx:15; Desk.tsx:206; "Agent note" Desk.tsx:217 | The AI that reads each clip against the brief. | All | unclear | AI reviewer | Also used for the AI that proposes payouts (Desk.tsx:188). |
| Agent note / AGENT NOTE | Desk.tsx:217; Slip.tsx:90; LDash.tsx:75 | The AI's written reason for its verdict. | A, C, B | unclear | AI reason | Variants: "Agent reason" (api.ts:353), "Agent verdict" (AdminAssistant.tsx:41), "Assistant summary" (Bench.tsx:137). |
| Assistant / Desk assistant / Negotiator | AdminAssistant.tsx:44; CreatorAssistant.tsx:121; DealPanel.tsx:11 | Three more AI helpers: admin summaries, creator advice, rate haggling. | C, B, M | unclear | AI helper | See naming section. |
| Stamp / Approved / Rejected / Needs human / In the queue | Stamp.tsx:16-19; CONF Stamp.tsx:27 | The verdict badge on a clip. | A, C, B | clear (Needs human: unclear) | Approved / Rejected / Waiting for a person / Checking | "In the queue" appears only as a badge for clips not yet read. |
| NEEDS HUMAN | Stamp via CSS; TAPE page.tsx:19; DeskAnalytics.tsx:60 | The AI was not sure, a person decides. | all | unclear | Waiting for a person | |
| Conf. / CONF 0.91 / model confidence 90% | LDash.tsx:66; Stamp.tsx:27; AgentPassPanel.tsx:47 | How sure the AI is, from 0 to 1. | C, B, M | unclear | AI certainty | Decimal in one place, percent in another. |
| Channel / Prove a channel / code in the bio | Join.tsx:293; Account.tsx:32; Join.tsx:59 | A YouTube/X/Instagram account you own, shown by pasting a code in its description. | C | clear | Link your channel | "Show it's yours." is a good heading. |
| Chainlink / CRE nodes / Chainlink confirmed | CV.tsx:8, 57; Join.tsx:66; AccountView.tsx:20 | Independent computers that read your view count and write it on the network. | A, C, B | unclear | "Independently confirmed" | Vendor name used as a status. |
| Confirmed / Pending | CV.tsx:8, 53-58 | Confirmed = views that were independently verified and are paid. Pending = Clippo's own count not yet confirmed. | C, B | unclear | Paid views / Not yet counted | CV.tsx:8 says "Only Confirmed is paid." Not obvious from the words. |
| Clippo count | CV.tsx:102; Slip.tsx:98, 209; LDash.tsx:37, 66; DeskAnalytics.tsx:41, 97; "Clippo views" DeskAnalytics.tsx:118 | Views as counted by Clippo itself. | C, B | misleading | Views (Clippo count) | Third view number next to Verified and Confirmed. |
| Verified views | Standing.tsx:24; ModulePages.tsx:85, 251; panels.tsx:93; Wizard.tsx:256 | Views on approved clips, read from the platform. | all | unclear | Counted views | Not the same as "Confirmed". |
| Proof (link) | CV.tsx:26 "Proof 0xabc…" | Link to the public record of the view report. | C, B | unclear | View receipt | |
| Referral | Slip.tsx:154-156; ModulePages.tsx:164 | A creator brings a new creator and gets a cut. | C | clear | | |
| Reliability | LDash.tsx:41 | Share of your judged clips that were approved. | C | unclear | Approval rate | Same number is called "approve rate" (ModulePages.tsx:46) and "% pass" (parts.tsx:72). |
| Tier / Rank | Marks.tsx:30; Wizard.tsx:304 "Higher-ranked only"; Bits.tsx:28 "Ranked only" | A level based on approved clips and approval rate. | A, C, B | unclear | Level | Two tier systems, see section 2. |
| Status ladder | see 1.1 | | | | | |
| Tests/Testnet / Arc | Shell.tsx:28, 48, 187, 196; FundView.tsx:101 "USDC on Arc" | Play network: test money with no value. Arc is the network name. | all | unclear | Test network (no real money) | Banner only on test deploy (Shell.tsx:22). Dateline always says "Arc testnet". |
| Mock / Demo labels | Shell.tsx:48 "demo build, sample data"; Bits.tsx:128; Standing.tsx:28; ClipBand.tsx:80; LoopClip.tsx:81; Hero.tsx:16, 91; AgentPassPanel.tsx:76 "Demo identity (fake human)" | Marks sample content. | all | clear | | Bits.tsx:128 shows the env var name "NEXT_PUBLIC_DEMO=1" to users. |

### 1.4 Campaign setup (brand)

| Term | Where | Plain meaning | Who | Clarity | Proposed label | Note |
|---|---|---|---|---|---|---|
| Campaign | Hero.tsx:33; Desk.tsx:127; everywhere | A paid job: a brand pays creators for clips. | all | clear | Campaign | Also called bounty (Hero.tsx:45, Directory.tsx:52), slip, hire, workspace. |
| Brief | Wizard.tsx:332 "Write the brief"; Slip.tsx:224 "The brief"; BriefBuilder (Hire); BriefSpec | The rules for clips: what to say, what not to say, label. | all | clear | Brief | In the wizard it is called "the story" (Wizard.tsx:160). |
| Story / Pitch | Wizard.tsx:160 "Here is the story."; Slip.tsx:176 shows `c.pitch` as the lead with no label | Short description of the campaign. | A, C, B | unclear | Summary | The word "Pitch" never appears on screen. |
| Disclosure label | Wizard.tsx:225; Slip.tsx:236; BriefBuilder.tsx:176 | Required wording like "#ad" that shows the post is paid. | C, B | unclear | Ad label (e.g. #ad) | |
| Must say / Must not say / Every clip must say / No clip may say | Slip.tsx:228, 232; Wizard.tsx:216-221; BriefBuilder.tsx:171, 174 | Required and banned points. | all | clear | | Four phrasings across three screens. |
| Source material / Download source / Source step | Slip.tsx:199-200; SourceStep.tsx; Wizard.tsx:232 "What content should creators use?" | The original video creators cut from. | C, B | unclear | Original video | |
| Upload a clip / Link a video / Generate one | Wizard.tsx:235-237 | Where the original video comes from. | B | clear | | "Generate one" makes an AI video. |
| AI-GENERATED | Wizard.tsx:312; SourceStep.tsx:150 | Label on AI-made video. | B | clear | | |
| Eligibility: Anyone verified / Higher-ranked only | Wizard.tsx:303-304; Slip.tsx:195 "Any verified" / "Ranked only" | Who may join. | B, C | unclear | Anyone verified / Experienced creators only | Three names for the same restriction. |
| View target | Wizard.tsx:293, 317 | Number of views the brand hopes for. | B | clear | Goal: views | |
| Arithmetic | Wizard.tsx:296; FundView.tsx:150 | Cost calculation box. | B | clear | Cost | |
| Docket stage names | FundView.tsx:69-72 "Fund / Admin review / Open to creators / Close" | The four steps after the wizard. | B | clear | | |
| Pending admin / awaiting funds | Desk.tsx:170 (status `replace("_"," ")`) | The campaign is waiting for funding or admin approval. | B | unclear | Waiting for funding / Waiting for admin | Shown as small lowercase text. |
| Objective: Awareness / Product demo / Launch announcement | ui-mocks/workspace.ts:36-38; BriefBuilder.tsx:146 | The goal of a hire brief. | B | clear | | |
| Rate line / Quantity | BriefBuilder.tsx:208, 216; panels.tsx:20 | A creator's price card entry (e.g. one short video) and how many. | B | unclear | Service and number | |
| Offered / Approved so far / Headroom / Over the cap | WorkspaceView.tsx:177-181; BriefBuilder.tsx:228 | Totals against the budget cap. | B | unclear | Remaining budget | "Headroom" is an engineer's word. |
| Clip this ad / Clipped / Drop / Strike | parts.tsx:79; Directory.tsx:103, 114; BriefBuilder.tsx:27 | Add to shortlist / in shortlist / remove / delete a line. | B | misleading | Add to shortlist / Remove | "Clip" also means the video. |
| Pass / Passed | panels.tsx:9, 42 | Decline a creator's offer. | B | unclear | Decline | Clashes with "pass rate". |
| Tracking / Funded, Posted, Verified, Paid | WorkspaceView.tsx:17; ui-mocks/workspace.ts:55 | Where each hired creator stands. | B | clear | | |

### 1.5 Review and appeals

| Term | Where | Plain meaning | Who | Clarity | Proposed label | Note |
|---|---|---|---|---|---|---|
| Correction | Bits.tsx:99; BriefBuilder.tsx:124 | An error box. | all | misleading | Problem | The word is the heading of every failure box. A user may think it asks them to correct something. |
| Appeal / Appeal this verdict / Appeal open / Send appeal | AppealPanel.tsx:90, 115; SlipDetail.tsx:86 | Ask a person to re-check a rejected clip. | C | clear | Ask for a review | Once per clip. |
| Escalate to an admin | AppealPanel.tsx:103 | Send an appeal to the admin after the brand upheld the rejection. | C | clear | | |
| Overturn / Uphold | Bench.tsx:27; AdminAssistant.tsx:52-53; OnchainDisputes.tsx:73 | Reverse / keep the AI or brand decision. | B, M | unclear | Reverse / Keep rejection | Legal words. |
| Dispute | OnchainDisputes.tsx:69 button "Dispute"; Bench tab "Dispute summaries" Bench.tsx:20 | In OnchainDisputes: brand challenges a creator's earned pay. In the Bench tab: appeals and flagged clips. | B, M | misleading | Challenge pay / Appeal cases | Two meanings. |
| Flagged clips / View patterns / Suspicious growth / Release hold / Keep hold | Bench.tsx:16, 19, 21, 28 | Clips or view spikes that look fake, and a pause on payout. | M | unclear | Possible fraud | |
| Campaigns to sign | Bench.tsx:15 | Campaigns waiting for admin approval. | M | unclear | Campaigns to approve | |
| Splits to approve | Bench.tsx:18 | Payout splits waiting for the admin's check. | M | unclear | Payouts to approve | |
| Waiting on your call / Agent was not sure | Desk.tsx:206 | Clips the AI could not decide, brand decides. | B | unclear | Clips for you to decide | |
| With a person / Human review | AppealPanel.tsx:28; CreatorAssistant.tsx:27 | A human reads this clip. | C | clear | | |
| Check for rejection risk / Likely reject | CreatorAssistant.tsx:84, 76 | Pre-check of your caption. | C | clear | | |
| Clear (clip) | Bench.tsx:26 | Admin accepts a flagged clip. | M | unclear | Accept | |
| Priority N / Ranked N | Bench.tsx:133; AdminAssistant.tsx:45 | Order the assistant put each case in. | M | clear | | |
| Rate deal / Allowed band / Floor / Ceiling / Countered | DealPanel.tsx:136, 19, 26, 28, 79 | Price negotiation between creator and brand inside limits. | C, B | unclear | Price offers | |

### 1.6 Blockchain and wallet

| Term | Where | Plain meaning | Who | Clarity | Proposed label | Note |
|---|---|---|---|---|---|---|
| Wallet / Connect wallet | Shell.tsx:131; many | A browser app that holds your digital money and signs you in. | all | unclear | Connect wallet (sign in) | Connecting is also the login. Not said. |
| Check your wallet | Shell.tsx:131; Desk.tsx:152; Join.tsx:264 etc. | A button label shown while a wallet popup is open. | all | unclear | Waiting for your wallet | Reads as an instruction, shown on a disabled button. |
| Role chip (`creator 0x71c9…8e3b`) | Shell.tsx:127 | Your role and shortened wallet address. | C, B, M | unclear | Role plus name | Hex address is the only identity. |
| On-chain / on Arc / the chain | FundView.tsx:123; Desk.tsx:110; Hero.tsx:29 | Recorded on a public blockchain network. | all | unclear | recorded publicly | |
| Snapshot | page.tsx:12 "A daily snapshot goes on-chain" | A daily saved view count. | A | unclear | Daily count | |
| Allow-list | Bench.tsx:107; Account.tsx:108 | List of approved admin wallets. | C, B | unclear | approved admin list | |
| Faucet / Testnet USDC faucet | Shell.tsx:196; FundView.tsx:129 | A free source of test money. | B | unclear | Get free test money | |
| Buy USDC with a card | FundView.tsx:128 | Card checkout via Transak. | B | clear | | |
| EIP-1193, MetaMask, Rabby | wallet.ts:40; chain/client.ts:76 | Wallet types. | all | unclear | browser wallet | |
| Hash / split hash / hash mismatch | Desk.tsx:139; server splitapproval.ts:61 | Fingerprint of the exact payout list. | B, M | unclear | payout fingerprint | |

---

## 2. Naming inconsistencies

### 2.1 Same thing, different names

| Thing | Names in use (file:line) |
|---|---|
| A paid job | "campaign" (Hero.tsx:33, Desk.tsx:127), "slip" (WireView.tsx:33, SlipDetail.tsx:295), "bounty" (Hero.tsx:45; Directory.tsx:52), "pool" (Wizard.tsx:166), "Creator workspace" (hire/w/[id]/page.tsx:6), "hire" (Shell.tsx:14), "Shared campaign view" (hire/share page.tsx:6) |
| The brand | "campaigner" (Shell.tsx:145; Desk.tsx:123; Join.tsx:255), "brand" (Hero.tsx:28; BriefBuilder.tsx:140), "Campaigners" (page.tsx:107), "I pay for clips" (Shell.tsx:145), "desk" (Join.tsx:248), "me" (Wizard.tsx:271) |
| The creator | "creator" (everywhere), "I clip" (Shell.tsx:144; Join.tsx:254), "Verified humans" (Hero.tsx:28), Directory "listing"/"ad" (Directory.tsx:129; parts.tsx:79) |
| The money amount | Pool (Wizard.tsx:291), Budget (DeskAnalytics.tsx:167), Budget cap (BriefBuilder.tsx:188), "In escrow" (WorkspaceView.tsx:170), "Offered" (BriefBuilder.tsx:228) |
| Money already committed | "Allocated" (Desk.tsx:160), "Pool used" (Desk.tsx:160), "Payout progress" "% of pool allocated" (Slip.tsx:214), "Spend" (DeskAnalytics.tsx:168), "paid" (code only) |
| Money you can withdraw | "Claimable now" (Ledger.tsx:140), "Owed, claimable now" (LDash.tsx:45), "What you're owed" (Ledger.tsx:66), "Open" tag (Ledger.tsx:98), "Settled amounts" (Ledger.tsx:67), "Total settled" (Ledger.tsx:102) |
| Expected money | "Still earning" (Ledger.tsx:109), "Still accruing, est." (LDash.tsx:47), "Est. USDC" (Standing.tsx:25), "Estimates, before fees" (Ledger.tsx:109) |
| Views | "Views" (Desk.tsx:160), "Verified views" (Standing.tsx:24), "Confirmed views" (CV.tsx:50), "Clippo count" (CV.tsx:102), "Clippo views" (DeskAnalytics.tsx:118), "Views, Clippo count" (LDash.tsx:37), "verified views" in Hire tracking (panels.tsx:93), "Pending" (CV.tsx:58) |
| Approval rate | "Reliability" (LDash.tsx:41), "approve rate" (ModulePages.tsx:46, 84), "% pass" and "pass rate" (parts.tsx:72; Directory.tsx:52) |
| Payout mode | format.ts:14-16 "Per verified view / Human-approved split / Pool share"; WireView.tsx:46 "Per view / Split / Pool share"; Wizard.tsx:256-258 "Per view / I approve the split / Share the whole pool"; Bits.tsx:40 "split by approval"; Wizard.tsx:314 "human split" |
| Who may join | "Anyone verified" / "Higher-ranked only" (Wizard.tsx:303-304); "Any verified" / "Ranked only" (Slip.tsx:195; Bits.tsx:28) |
| The AI reviewer | "the agent" (Hero.tsx:15), "AGENT NOTE" (Desk.tsx:217), "Agent reason" (api.ts:353), "Assistant summary" (Bench.tsx:137), "Agent verdict" (AdminAssistant.tsx:41), "the AI" (Desk.tsx:188), "model" (AgentPassPanel.tsx:47) |
| AI helpers | "agent" (clip reader), "AI" / "agent" (split proposer), "assistant" (admin), "Desk assistant" (CreatorAssistant.tsx:121), "negotiator" (DealPanel.tsx:11) |
| The extra human check | "World ID check" (Desk.tsx:251), "World ID step-up" (SU.tsx:78), "Agent Pass gate" (Desk.tsx:243), "fresh Orb-class check" (SU.tsx:19), "Proof of Human" (Join.tsx:285), "Human check" (AccountView.tsx:93), "Confirm you approve this split" (Desk.tsx:251) |
| Admin approval of a campaign | "Admin signs" (page.tsx:9), "Admin review" (FundView.tsx:70), "signed" (WireView.tsx:33), "pending admin" (Desk.tsx:170), "Campaigns to sign" (Bench.tsx:15), "Waiting on admin" (FundView.tsx:82) |
| Review list | "tray" (Desk.tsx:207-209), "queue" (Bench.tsx:120; Stamp.tsx:19 "In the queue"), "Waiting on your call" (Desk.tsx:206) |
| Remove an item | "Drop" (Directory.tsx:114), "Strike" (BriefBuilder.tsx:27), "Remove" aria (Directory.tsx:114), "Replace"/"Discard" (SourceStep.tsx:59, 172) |
| Error boxes | "Correction" (Bits.tsx:99), "Stopped." (Wizard.tsx:323; SourceStep.tsx:138), "Nothing changed" (Desk.tsx:131), "Could not continue." (Join.tsx:127), "Not sent." (DealPanel.tsx:128), "Not recorded." (AdminAssistant.tsx:32), "Not uploaded." (SourceStep.tsx:82) |
| Sign in | "Connect wallet" (Shell.tsx:131), "Signed in as" (Shell.tsx:126 aria), "Signed out" (Shell.tsx:155), "Disconnect" (AccountView.tsx:96), "Disconnect wallet" title (Shell.tsx:126) |
| Wizard length | "Eight questions" (page.tsx:108; Desk.tsx:155; Join.tsx:255) but steps are 8 or 9 (Wizard.tsx:40-45, shown as "Question N of M" Wizard.tsx:174) |
| Page names | Nav vs title: Wire / "Campaigns paying right now"; Hire / "Creators for hire"; Desk / "Your campaigns"; Ledger / "What you're owed"; Bench / "Read it, then decide"; Account / "Who's signing" |

### 2.2 One name, different meanings

| Word | Meanings (file:line) |
|---|---|
| Desk | dashboard (Shell.tsx:15); role (Shell.tsx:141; AccountView.tsx:92); role picker (page.tsx:103); footer group (Shell.tsx:180); assistant (CreatorAssistant.tsx:121); "Clear desk." empty state in admin (Bench.tsx:128) |
| Clip | the video (Slip.tsx:240 "Your clips"); creator role (Shell.tsx:144 "I clip"); shortlist action (parts.tsx:79 "Clip this ad"; Directory.tsx:103 "Clipped, N"); brand name |
| Verified | human-checked (Icons.tsx:128); lowest tier (Marks.tsx:8); view count (Standing.tsx:24); clip-checked stage (ui-mocks/workspace.ts:55); all creators in the directory (Directory.tsx:136) |
| Tier names | Marketplace tiers NEW / RISING / PRO / ELITE with RISING = 3+ clips, 60% (ui-mocks/workspace.ts:7-12; lib/workspace/rank.ts:28-31). Status ladder tiers VERIFIED / RISING / PARTNER / TOP with RISING = 5 clips, 70%, 1,000 views (lib/modules/ladder.ts:16-20). Same word "Rising", different rules. Marks.tsx:5-8 draws both with the same icon. On-chain profile prints a third list "None, Verified, Rising, Partner, Top" (ModulePages.tsx:216). |
| Open | claimable (Ledger.tsx:98); unsigned (DealPanel.tsx:96); campaign status "Open" (hire status OPEN, api.ts:1082); "open campaigns" (WireView.tsx:32); "open until closed" (Bits.tsx:50) |
| Signed / sign | admin approves a campaign (WireView.tsx:33); wallet signature "Waiting for signature" (Ledger.tsx:147); deal "Signed" (DealPanel.tsx:96); "A person signs" (Bench.tsx:101); "Who's signing" (AccountView.tsx:86) |
| Dispute | brand challenges earned pay (OnchainDisputes.tsx:69) vs Bench tab for appeals and flags (Bench.tsx:20) |
| Pass | decline an offer (panels.tsx:42); "pass rate" (parts.tsx:72); "Agent Pass" (Desk.tsx:238); "passed verification" (SharedView.tsx:42) |
| Approve | clip approved by AI; clip approved by brand (Desk.tsx:224); campaign approved by admin (Bench.tsx:25); creator approved for hire (panels.tsx:41); split approved with World ID (Desk.tsx:182); Wizard approver (Wizard.tsx:165); "Approve for launch" (SourceStep.tsx:171) |
| Review | AI read; human review of X/Instagram (CreatorAssistant.tsx:27); admin review (FundView.tsx:70); retention "review window" (Ledger.tsx:154); "Review the agent's split" (AdminSplits.tsx:67) |
| Pool share / shared | payout mode (format.ts:16); also a share link "Make shareable link" (ShareBox.tsx:53) |
| Split | payout mode, a proposal (Desk.tsx:136), a hash (Desk.tsx:139), "Splits to approve" (Bench.tsx:18) |
| Brief | wizard rules; the Hire "Write the brief" form that also sends offers; "Brief these creators" (ListView.tsx:63) |
| Tracking | Hire per-creator progress (WorkspaceView.tsx:17). Not related to analytics. |
| Agent | clip reader; split proposer; World "AgentKit" identity (AgentPassPanel.tsx:76) |
| Status | creator tier page (/status); table column (Ledger.tsx:91); campaign state (Desk.tsx:170) |
| Standing | leaderboard (Standing.tsx:22) vs your own tier (ModulePages.tsx:74) |
| Proof | World ID proof (hooks.ts:160); view proof link (CV.tsx:26); "Proof 0x…"; proof status in audit log (AgentPassPanel.tsx:117) |

---

## 3. Message catalog

### 3.1 How an error becomes text

1. A fetch fails (network): `req()` throws `Unreachable` (api.ts:70-72). `withFallback` turns it into `ApiError(503, "SERVICE_UNAVAILABLE", SERVICE_DOWN)` where SERVICE_DOWN = "The Clippo service did not answer." (api.ts:49, 86-91). In a demo build it silently shows sample data and sets the demo flag instead (api.ts:92-94).
2. A 5xx with no structured body, or code INTERNAL: same as step 1 (api.ts:77).
3. Any other non-OK response: `ApiError(status, code, body.error.message)`. If the code is CHAIN_NOT_CONFIGURED, NOT_CONFIGURED or FEATURE_NOT_CONFIGURED, the message becomes "Not configured on this deployment. " plus the server text (api.ts:50, 58, 79-80). **The server's English message is shown to the user as written**. The code and status are dropped, except `Request failed (${status})` when the body has no message (api.ts:79).
4. Hooks catch the error and store `e.message` (hooks.ts:22) with fallback "Request failed".
5. Click handlers call `errText(e, fallback)` (api.ts:631-638): ApiError message as written; wallet rejection (code 4001, ACTION_REJECTED) gives "You closed the wallet prompt. Nothing was changed."; TypeError gives "The Clippo service did not answer. Nothing was changed."; otherwise the wallet `shortMessage` (raw library text), else `e.message`, else "Something went wrong. Nothing was changed."
6. The page shows the text in a `Correction` box (Bits.tsx:93-109): small "Correction" label, bold text, optional fix line, optional "Try again". If the text starts with the service-down or not-configured sentence, `ServiceState` is shown instead (Bits.tsx:95-96; ServiceState.tsx:9-24), which prints the not-configured detail (ServiceState.tsx:10, 17) including any setting name the server put in the message.
7. World ID widget failures: `failOf(code)` in errors.ts:22-24. Backend refusals: `worldFailText` in WorldCheck.tsx:95-106.
8. Wallet errors come from `walletError` in lib/chain/client.ts:87-96 (frontend-visible; read for this guide).

### 3.2 Central and generic messages

| Situation / code | Text shown | File:line | Plain enough? | Suggested text (PROPOSAL) |
|---|---|---|---|---|
| Network down / HTTP 5xx | "The Clippo service did not answer." | api.ts:49 | yes | "Clippo could not be reached. Nothing was changed. Check your connection and try again." |
| Service state heading | "Service unavailable" / "Clippo could not reach its service." | ServiceState.tsx:13-14 | yes | keep |
| Service state body | "Nothing was changed and no money moved. Your connection, or the service itself, may be down. No sample data is shown in its place." | ServiceState.tsx:18 | yes (last sentence is developer talk) | drop "No sample data is shown in its place." |
| Not configured | "Not configured on this deployment." + server message | api.ts:50, 80 | no | "This feature is not switched on yet. Nothing was changed." Hide the detail from normal users |
| Not configured body | "{detail} Nothing was changed and no money moved. An operator needs to finish the configuration." | ServiceState.tsx:17 | no: detail may name settings such as ESCROW_ADDRESS (lib/chain/clippo-wallet.ts:43) or ANTHROPIC_API_KEY (lib/ai/llm.ts:515) | show only "An operator needs to finish setting this up." |
| Non-OK with no message | `Request failed (${status})` | api.ts:79; hooks.ts:22 "Request failed"; api.ts:241 | no (HTTP status in text) | "Something went wrong. Nothing was changed." |
| Fallback | "Something went wrong. Nothing was changed." | api.ts:631 | vague but safe | add what to do: "Try again in a minute." |
| Wallet prompt closed | "You closed the wallet prompt. Nothing was changed." | api.ts:34 | yes | keep |
| Wallet raw short message | `shortMessage` from the wallet library | api.ts:37 | no (raw text, can be a contract revert) | map the common ones; otherwise "The wallet could not complete this. Nothing was changed." |
| 401 not signed in, own-campaign list | "Sign in first" (server) | app/api/campaigns/route.ts:64 shown at Desk.tsx:151 | yes, partly | "Connect your wallet to see your campaigns." |
| 401 not signed in, creator pages | "Sign in: GET /api/auth/nonce, then POST /api/auth/session with a SIWE signature" | lib/auth.ts:88, shown via Correction at Ledger.tsx:73, Bench.tsx:123, ModulePages.tsx:20 | **no, developer wording** | "Connect your wallet to continue." |
| 403 wrong role | "Requires role: CREATOR" (or CAMPAIGNER, ADMIN) | lib/auth.ts:90, shown at Ledger.tsx:73, Desk.tsx:151 | **no, raw role code** | "This page is for creators. You are signed in as a brand." |
| Bad request | "Invalid request" | lib/http.ts:25 | no | name the field |
| Rate limit | "Too many requests; retry in {n}s" | lib/ratelimit.ts:47 | yes | "Too many tries. Wait {n} seconds." |
| Database down | "The database did not answer. In development run `npm run db:local` ... check DATABASE_URL, then retry." | lib/http.ts:77 | **no, developer wording** (structured 503, so api.ts:77 shows it as written) | "Clippo is having trouble. Try again soon." |
| Disabled module (404 FEATURE_DISABLED) | Page renders the 404 "Not on file" / "Nothing here." | ModulePages.tsx:2-3; not-found.tsx:8-13 | yes | keep; the 404 text says "switched off in this build" (not-found.tsx:12) |
| Generic 404 page | "Not on file" / "There is no page at this address." / "Nothing here." / "The link may be cut short, or this part of Clippo is switched off in this build." | not-found.tsx:8-12 | partly ("build") | drop "in this build" |
| Load failure titles | "The wire did not come back." + "Your campaigns are safe. Nothing was changed." | WireView.tsx:71 | yes | keep |
| Load failure titles | "Standing could not be tallied." | Standing.tsx:30 | no | "The top creators list did not load." |
| Load failure titles | "The review tray did not load." | Desk.tsx:208 | partly | "Clips to review did not load." |
| Load failure titles | "Your numbers did not load." "Connect a campaigner wallet, then try again." | DeskAnalytics.tsx:151 | yes | keep |
| Cause shown below Correction | `cause={...error}` is passed to Correction but Correction never prints `cause` unless it is a service message | Bits.tsx:93-97 | n/a | Note: `cause` is dropped for normal errors. |

### 3.3 Wallet and sign in

| Situation | Text shown | File:line | Plain enough? | Suggested text (PROPOSAL) |
|---|---|---|---|---|
| No wallet | "No browser wallet found. Install one from the list, then reload this page." | hooks.ts:72 | yes | keep |
| Wallet sheet, none found | "No wallet found" / "Clippo signs you in with a browser wallet extension. Install one, create or import an account, then reload this page." | WalletPicker.tsx:23, 35 | yes | add what a wallet is |
| Wallet error text | "No browser wallet found. Install MetaMask, Rabby or another EIP-1193 wallet, then reload." | lib/chain/client.ts:76; wallet.ts:40 | no (EIP-1193) | "Install a browser wallet such as MetaMask, then reload." |
| Wallet busy | "A wallet request is already in progress." | hooks.ts:84 | yes | keep |
| Signed out after account switch | "Your wallet switched accounts, so you were signed out. Connect again to continue." | hooks.ts:59 | yes | keep |
| User rejected in wallet | "You rejected the request in your wallet while {what}. Nothing was changed." | lib/chain/client.ts:91 | yes | keep ({what} reads "connecting", "signing in") |
| Pending request | "Your wallet already has a request waiting. Open the wallet extension, answer it, then try again." | lib/chain/client.ts:92 | yes | keep |
| Locked wallet | "Your wallet is locked or has not approved this site. Unlock it and approve the connection." | lib/chain/client.ts:93 | yes | keep |
| Chain missing | "Your wallet does not know the Arc Testnet network yet." | lib/chain/client.ts:94 | partly | "Your wallet needs the Arc test network added. Approve the prompt." |
| Chain add failed | "Could not add Arc Testnet (chain {id}) to your wallet: ... Add it manually: RPC {url}, chain ID {id}, currency USDC." | lib/chain/client.ts:153 | no, developer wording | link to a step-by-step guide |
| Generic wallet error | "Wallet error while {what}: {raw}" | lib/chain/client.ts:96 | no (raw) | hide raw behind "Details" |
| Role prompt | "Which desk is this wallet for?" / "A wallet holds one role, and it cannot be changed later. You will sign once more to create the account." | Shell.tsx:141-142 | partly | "Are you a creator or a brand? You cannot change this later for this wallet." |
| Connect failure sheet | "Could not connect" or "Signed out" | Shell.tsx:155 | yes | keep |
| Sign-in message wrong domain | "Sign-in message is expired, for another domain, or malformed (this server expects domain "x"; open the app at that address)" | lib/siwe.ts:66 | no | "Sign-in failed. Open Clippo at its main address and try again." |
| Bad signature / nonce | "Signature is not valid", "Nonce is unknown, expired or already used. Request a new one." | lib/siwe.ts:72, 83 | no (nonce) | "Sign-in expired. Try again." |
| Mid-connect button | "Check your wallet" | Shell.tsx:131 | partly | "Waiting for your wallet" |

### 3.4 World ID failure kinds (errors.ts, WorldCheck.tsx)

Kinds: cancelled, expired, repeated, failed, unavailable, unconfigured (errors.ts:3).

| Situation / code | Text shown | File:line | Plain enough? | Suggested text (PROPOSAL) |
|---|---|---|---|---|
| verification_rejected, user_rejected | "You declined the request in World App." | errors.ts:11-12 | yes | keep |
| cancelled | "You cancelled the check." | errors.ts:13 | yes | keep |
| Widget closed | "You closed the check before it finished." | IDKitSheet.tsx:80 | yes | keep |
| max_verifications_reached | "World ID says this check was already used the maximum number of times for this action." | errors.ts:14 | no | "This World ID has already been used for this. Each person can do it once." |
| nullifier_replayed | "World ID says this proof was already used." | errors.ts:15 | no (proof) | "This check was already used. Start a new one." |
| connection_failed | "The connection to World App dropped before the check finished." | errors.ts:16 | yes | keep |
| timeout | "The check timed out before it finished." | errors.ts:17 | yes | keep |
| rp_signature_expired | "The check request expired before it was answered." | errors.ts:18 | yes | keep |
| credential_unavailable | "Your World ID has no Proof of Human credential. You can browse as a viewer but cannot join campaigns as a creator." | errors.ts:6, 19 | partly (credential) | "Your World ID is not fully verified yet, so you can browse but not join as a creator." |
| Unknown code | `World ID could not complete the check (${code}).` | errors.ts:23 | **no, raw code** | "World ID could not complete the check. Try again." |
| Could not start | `e.message` or "The check could not be started." | IDKitSheet.tsx:65 | partly | keep |
| World ID not configured | "World ID is not set up on this deployment, so the check cannot run. Nothing was changed. An operator needs to add the World ID app, RP id and signing key. {detail}" | WorldCheck.tsx:48 | **no (RP id, signing key)** | "World ID is not set up yet. Nothing was changed." |
| Result "cancelled" (not configured) | "World ID is not configured on this deployment, so nothing was checked." | WorldCheck.tsx:23, 100 | partly | keep |
| WORLD_FAIL.cancelled | "You cancelled the check. Nothing was changed." | WorldCheck.tsx:87 | yes | keep |
| WORLD_FAIL.expired | "The check expired before it finished. Nothing was changed. Start again." | WorldCheck.tsx:88 | yes | keep |
| WORLD_FAIL.repeated / PROOF_REUSED | "That proof was already used. Each check works once. Nothing was changed." | WorldCheck.tsx:89, 97; lib/worldid/fresh.ts:20 | partly | "That check was already used. Start a new one." |
| WORLD_FAIL.failed | "World ID could not complete the check. Nothing was changed." | WorldCheck.tsx:91 | yes | keep |
| ALREADY_USED | "This World ID is already linked to another Clippo account. Nothing was changed." | WorldCheck.tsx:98 | yes | keep |
| ACCOUNT_ALREADY_VERIFIED | "This account is already verified with a different World ID. Nothing was changed." | WorldCheck.tsx:99 | yes | keep |
| WORLD_ID_DENIED | `${e.message}. Nothing was changed, and the proof was not consumed.` (message from World server text) | WorldCheck.tsx:101 | no (server reason, "proof was not consumed") | "World ID did not accept the check. Nothing was changed." |
| Demo simulator buttons | "Verify with Proof of Human (demo)", "Let it expire", "Reuse an old proof" | WorldCheck.tsx:73, 77, 78 | demo only | keep (demo) |
| Not verified (server) | `Verify with World ID before you use ${what}. Open Account and press "Verify with World ID".` | lib/worldid/signup.ts:20 | partly (button on Account says "Verify with World ID (Proof of Human)", AccountView.tsx:97) | match the button text |

### 3.5 Step-up and payout release messages

| Situation | Text shown | File:line | Plain enough? | Suggested text (PROPOSAL) |
|---|---|---|---|---|
| Approved, returning | "Verified with World ID (fresh Orb-class check). Completing approval..." | SU.tsx:19 | no (Orb-class) | "Identity check passed. Finishing the approval..." |
| Cancelled | "You cancelled at World ID. Nothing was approved." | SU.tsx:20 | yes | keep |
| Expired | "The check expired. Nothing was approved. Start again." | SU.tsx:21 | yes | keep |
| Mismatch | "That World ID is not the one linked to your account, or the split changed. Nothing was approved." | SU.tsx:22 | partly (split) | "That is not the World ID linked to your account, or the payout list changed. Nothing was approved." |
| Failed | "World ID could not be reached or validated. Nothing was approved." | SU.tsx:23 | yes | keep |
| Panel headings | "World ID step-up: nothing approved", "Recorded", "Nothing changed", "World ID step-up" | SU.tsx:162 | partly | "Identity check: nothing approved" |
| Always on denial | "The payout did NOT occur." plus ` (${r.code})` e.g. "(STEPUP_DEPENDENCY)" | SU.tsx:164 | **no, raw code; capital NOT** | remove the code or move it into a "Details" line; no shouting |
| Release failure | `Split not released. The payout did NOT occur. ${errText(...)}` | SU.tsx:150 | partly | "The payout was not released. Nothing was paid. {reason}" |
| Start failed | `Nothing was approved. ${t}` / heading "Nothing approved" | SU.tsx:90, 99 | partly | keep |
| Start button | "Approve with World ID step-up" / "Opening World ID" | SU.tsx:78, 97 | partly | "Approve with identity check" |
| Gate text | "You will leave for World ID for a fresh Orb-class check, then return here to complete it. Nothing is paid unless the check passes." | Desk.tsx:244 | partly | "You will go to World ID to confirm it is you, then come back here. Nothing is paid unless it passes." |
| Release result | "Split finalized for N creator(s). They can claim now." | Desk.tsx:108; SU.tsx:106 | yes | "Payout confirmed for N creators. They can withdraw now." |
| Waiting on chain | "Both approvals are in. Waiting for the chain to confirm the split. Credits appear once the escrow reports it." | Desk.tsx:110; SU.tsx:108 | no (chain, credits, escrow) | "Both approvals are in. Waiting for the network to confirm. Earnings will show up soon." |
| Waiting on other approver | "Your approval is recorded and sent on-chain. Awaiting campaigner and admin: they must approve the identical split with their own World ID check. Nothing is payable yet." | Desk.tsx:111; SU.tsx:109 | partly | "Your approval is saved. Waiting for {admin}. They must approve the same payout list. Nothing is payable yet." |
| Agent proposed | "The agent proposed X USDC across N creators. Review it, then approve with a fresh World ID check. Nothing is payable yet." | Desk.tsx:62 | partly | keep, replace "agent" with "AI" |
| No proposal | "No proposal. {errText}" | Desk.tsx:64 | partly | keep |
| Split refused | "Split not approved. {worldFailText}" | Desk.tsx:77, 95, 117 | partly | "Payout not approved." |
| Nothing to split | "No approved clips yet, so there is nobody to pay." / server "...nothing to propose" | api.ts:599; lib/agentpass/service.ts:124 | yes | keep |
| Agent audit outcomes | "Check cancelled", "Check expired", "Proposal expired", "Proof reused", "Wrong approver", "Split changed", "Step-up below Orb-class", "Step-up not bound to this split", "Step-up reused", "World ID unreachable" | AgentPassPanel.tsx:10-34 | no (log language) | rewrite for non-experts |
| Server refusals (examples) | "This split is not what the agent proposed (hash mismatch). Approve the agent's exact proposal." | lib/splitapproval.ts:61 | no | "The payout list changed. Review and approve the latest proposal." |
| Server refusals with a hex address | `${s.creatorWallet} has no approved clip in this campaign` | lib/splitapproval.ts:44 | **no (hex address)** | name the creator |
| Server refusals with a hex address | `${r.wallet} has not verified with World ID` | app/api/campaigns/[id]/split/route.ts:101 | **no (hex address)** | name the creator |
| Server refusals with a hex address | `The agent wallet ${address} is not registered to a verified human in AgentBook. ...` | lib/agentpass/service.ts:30 | **no** | "The AI helper is not registered yet." |
| Campaign state | `Campaign is ${c.status}, expected APPROVED` | lib/splitapproval.ts:30 | **no (status code in caps)** | "This campaign is not live." |
| Proposal | "The agent's proposal expired. Ask the agent for a fresh proposal." | lib/splitapproval.ts:59 | yes | keep |

### 3.6 Funding, claiming, chain

| Situation | Text shown | File:line | Plain enough? | Suggested text (PROPOSAL) |
|---|---|---|---|---|
| Fund failed | "The transfer did not go through." + fix "Nothing left your wallet. Check you have USDC on Arc and try again." | FundView.tsx:48, 101 | partly | "The deposit did not go through. Nothing left your wallet. Check you have test USDC and try again." |
| Escrow not configured | "Escrow is not configured on this deployment." "The contract address is not set, so funding is switched off and nothing can be sent. An operator needs to set the escrow address." | FundView.tsx:118; Ledger.tsx:150; hooks.ts:185 "The escrow contract address is not set, so nothing was sent." | no (contract address) | "Funding is not switched on yet. Nothing was sent." |
| Fund steps | "Approve USDC in your wallet", "Confirm the deposit", "Verifying on-chain", "Waiting for signature" | FundView.tsx:113 | partly | "Step 1 of 2: allow the deposit"; "Step 2 of 2: confirm the deposit" |
| Fund steps text | "Step 1 of 2: approve the escrow to take the pool in USDC. Gas is paid in USDC." | FundView.tsx:121-125 | no (approve, escrow, gas) | "Step 1 of 2: allow Clippo to move your USDC. A small network fee applies." |
| Fund success | "Transfer confirmed and verified" + `tx 0x…` | FundView.tsx:137 | partly | "Deposit confirmed." + receipt link |
| Funded page | "Creators can't see this campaign until an admin signs it. If it is rejected, the whole pool comes back to you." | FundView.tsx:85 | yes | keep |
| Chain id missing | "This campaign has no on-chain id yet, so it cannot be approved on-chain." / "...closed on-chain." | hooks.ts:217, 230 | no | "This campaign is not ready to approve yet. Try again in a minute." |
| Card checkout | "Opened the card checkout in a new tab. When the USDC lands in your wallet, come back and fund." | FundView.tsx:60 | yes | keep |
| On-ramp missing | "The card on-ramp is not configured on this deployment. Use the testnet faucet instead." | FundView.tsx:63 | partly | "Card checkout is not available. Use the free test-money link." |
| On-ramp error | "The on-ramp answered without a session address." | api.ts:612 | no | "Card checkout could not start." |
| High value | "High-value pool. Above $X net, so approval needs a fresh World ID check by an admin. Expect a longer review." | FundView.tsx:132 | partly | "Large budget. An admin must pass an extra identity check, so approval takes longer." |
| Claim failed | "The claim did not go through. Your balance is unchanged." / "N of M claims did not go through: {first}" | Ledger.tsx:55, 59 | yes | keep |
| Claim success | "Claimed and verified on-chain." + `tx …` | Ledger.tsx:153 | partly | "Withdrawn to your wallet." |
| Claim server | "Nothing is claimable yet. It may still be in its retention window or under dispute." | app/api/payouts/[id]/claim/route.ts:68 | partly | "Not ready to withdraw yet." |
| Claim client | "Not claimable yet (retention window ends {date})" / "Nothing claimable right now" / "This payout is frozen pending review" | lib/chain/client.ts:250-251 | partly | keep, change "retention window" |
| Claim help line | "Claims are separate per campaign, so one failed transfer never blocks the others. Pay-per-view credits unlock after a 7-day review window." | Ledger.tsx:154 | partly | "Each campaign is withdrawn on its own. Pay-per-view earnings are ready after a 7-day review period." |
| Dispute opened | "Dispute opened on-chain. These credits can't be claimed until it's settled." | OnchainDisputes.tsx:41 | partly | "Challenge opened. This pay is on hold until an admin decides." |
| Dispute upheld | "Dispute upheld. The credits left the creator's balance." | OnchainDisputes.tsx:41 | partly | "Challenge accepted. The pay was taken back." |
| Dispute denied | "Dispute denied. The credits release on schedule." | OnchainDisputes.tsx:41 | partly | |
| Dispute action failed | `Nothing changed. ${(e as Error).message.split("\n")[0]}` | OnchainDisputes.tsx:44 | **no, raw library text** | map messages |
| Dispute load failed | `Disputes did not load: ${error}` | OnchainDisputes.tsx:58 | no (raw) | |
| Transaction reverted | "The payout transaction reverted on-chain" / "Transaction reverted on-chain" | lib/chain/clippo-wallet.ts:105; indexer.ts:292 | no | "The network rejected the transaction. Nothing was paid." |
| Funding not verified | "No CampaignCreated event from the escrow in that transaction" | app/api/campaigns/[id]/fund/route.ts:67 | **no (event name)** | "We could not confirm your deposit yet. Try again." |

### 3.7 Creator flow, channels, clips, appeals

| Situation | Text shown | File:line | Plain enough? | Suggested text (PROPOSAL) |
|---|---|---|---|---|
| Code not found | heading "Code not found yet." + server reason + "Platforms can take a minute to show the change. Check the spelling and try again." | Join.tsx:124, 218; api.ts:836 | yes | keep |
| Sent to a person | "Sent to a person." "A reviewer will look for the code, usually within a day..." | Join.tsx:123, 217 | yes | keep |
| Old code | "Re-verify {handle}. This channel uses the old code. Get your new code, paste it in your bio, then check. Until then its views cannot be confirmed." | Join.tsx:112 | partly | "Update your code..." |
| Bio code explanation | "Keep it there. Chainlink nodes check your bio each time views are confirmed." | Join.tsx:66 | no (Chainlink nodes) | "Keep it there. Clippo re-checks it whenever views are counted." |
| Channel server errors | "Channel already linked to another account" (CHANNEL_TAKEN), "Not a valid youtube handle" (BAD_HANDLE) | app/api/channels/route.ts:32, 34 | partly (platform in lower case) | |
| Pending views hint | "N pending views, none confirmed. Chainlink nodes confirm views only for approved clips on a YouTube channel whose bio holds your code. Check the code below, then wait for the next report." | AccountView.tsx:19-20 | no | "N views are waiting. Views are paid only after they are independently confirmed. This needs an approved clip on a YouTube channel with your code in its description." |
| Not verified (join) | "Verify you are a person first." / "One person, one account. It takes under a minute." | Slip.tsx:246 | yes | keep |
| No join reasons | "This campaign is limited to creators the campaigner hired." / "Verify with World ID first." / "This campaign needs {tier} tier or better. You are {tier}." / "You can't join this one right now." | Slip.tsx:105-112 | yes (tier lowercased "rising") | "needs the Rising level or higher. You are New." |
| Server not eligible | "Requires tier RISING or higher (3+ approved clips, reliability >= 0.6)" | lib/workspace/eligibility.ts:40 | no (reliability >= 0.6) | |
| Submit errors | "That link is not YouTube, X or Instagram." (BAD_LINK), "Prove a YouTube channel first. Your account has none verified." (CHANNEL_UNVERIFIED) | api.ts:854, 848 | yes | keep |
| Submit server | "Verify channel ownership first", "This campaign does not accept YOUTUBE clips", "This video was already submitted to the campaign", "Could not read video" | app/api/submissions/route.ts:30, 31, 37, 45 | partly (platform in capitals) | |
| Link box | "Cannot submit This is not a YouTube, X or Instagram link." / "Wrong platform ... will be rejected." / "Human review ..." | CreatorAssistant.tsx:16, 21, 28 | yes | keep |
| Appeal states | "Waiting on the campaigner", "Campaigner upheld the rejection", "Waiting on admin", "Overturned", "Upheld by admin ... This is final." | AppealPanel.tsx:96, 102, 106-108 | yes | keep |
| Appeal server | "Only rejected clips can be appealed", "Already appealed", "The campaigner reviews first; an admin can step in after {ISO date}" | app/api/submissions/[id]/appeal/route.ts:18-19; lib/appeals.ts:37 | partly (ISO timestamp) | |
| AI queued | "Queued. The agent is reading the transcript." | api.ts:216, 866 | yes | |
| Verdict default | "Approved by the campaigner after review." | Desk.tsx:38 | yes | |

### 3.8 Wizard, hire, uploads

| Situation | Text shown | File:line | Plain enough? | Suggested text (PROPOSAL) |
|---|---|---|---|---|
| Wizard generic | "Stopped." + errText | Wizard.tsx:323 | partly | "That did not work." |
| Wizard hint | "A few more words, please." / "Good. Next, the agent writes the brief." | Wizard.tsx:200 | yes | keep |
| Writing | "The agent is writing the brief" / "Creating the campaign" / "The agent is sizing the pool" | Wizard.tsx:322 | yes | keep |
| Upload errors | "{name} is not a video. Use MP4, MOV or WebM." / "{name} is X MB. The limit is Y MB." | SourceStep.tsx:37-38 | yes | keep |
| Upload failed | "The upload failed. Nothing was saved." | SourceStep.tsx:46 | yes | |
| Upload service | "Upload to storage failed", `Upload failed (${status})`, server "This file is too large for a function request; upload it directly to storage (POST /api/uploads/direct)" | api.ts:716, 720, 755; app/api/uploads/route.ts:18 | **no (API path, status)** | "The upload failed. Try a smaller file." |
| Server upload codes | "File content is not a recognised mp4, webm or mov video", "Allowed types: video/mp4, ..." | lib/storage/files.ts:56, 58 | partly | |
| Local-only upload | "Held in this browser only. The upload service did not answer, so creators cannot reach this file yet." | SourceStep.tsx:62 | yes | |
| AI video | "Generation failed." / "The renderer stopped before finishing. Nothing was charged." | SourceStep.tsx:137 | yes | |
| AI provider | "AI quota exceeded, try again in a minute (free-tier request limits were reached)", "The AI provider rejected the configured API key", "The AI provider could not process the request (502)" | lib/ai/llm.ts:63, 71, 72 | **no (API key, status)** | "The AI helper is busy. Try again in a minute." |
| Brief form | "Name the campaign. Creators see this first.", "Say who is paying.", "Write at least a couple of sentences...", "List at least one thing every clip has to say.", "Pick a delivery date.", "That date has passed.", "Set a budget cap above zero.", "Every creator needs a quantity of at least 1." | BriefBuilder.tsx:59-66 | yes | keep (good voice) |
| Brief box | "N things need fixing before the brief can go out." | BriefBuilder.tsx:125 | yes | |
| Hire load/save | "The directory did not load.", "The brief was not saved.", "That decision was not saved.", "The list link was not made." | Directory.tsx:133; BriefBuilder.tsx:129; WorkspaceView.tsx:157; ShareBox.tsx:35 | yes | |
| Fund-all block | "Approve at least one creator to fund." / "Approved total is $X over the cap. Pass on someone or raise the cap in a new brief." | WorkspaceView.tsx:132-134 | yes | "Decline someone" |
| Hire server | "Hire is already funded; creators are locked", "Attach a brief before funding", "Approve at least one creator first" | lib/workspace/hires.ts:132, 231, 235 | yes | |
| Deal limits | "Offers must sit between $1.20 and $3.60 per 1K views." / "Outside the band: $a to $b. The negotiator cannot take this." | api.ts:1001; DealPanel.tsx:118 | yes | |
| Admin reason | "Give the campaigner a reason, at least a few words." | Bench.tsx:78 | yes | |

### 3.9 Where raw codes, status numbers, hex or developer wording can reach the user (summary)

1. HTTP status in text: `Request failed (${status})` (api.ts:79), `Upload failed (${status})` (api.ts:720, 755), `The AI provider could not process the request (502)` (lib/ai/llm.ts:72).
2. Raw machine codes: ` (${r.code})` after "The payout did NOT occur." (SU.tsx:164); `(${code})` for unknown World ID errors (errors.ts:23); `Campaign is ${c.status}, expected APPROVED` (lib/splitapproval.ts:30); Requires role: CREATOR (lib/auth.ts:90); hire status OPEN/FUNDING; Agent Pass log values `p.status.toLowerCase()` (AgentPassPanel.tsx:101) and `p.fallback.code.toLowerCase().replace(/_/g," ")` (AgentPassPanel.tsx:49).
3. Hex addresses and hashes: masthead chip (Shell.tsx:127); `tx 0x…` (FundView.tsx:137; Ledger.tsx:153; WorkspaceView.tsx:202; ModulePages.tsx:257); `split 0x…` (Desk.tsx:139; AgentPassPanel.tsx:96); creator "handle" is a shortened wallet when there is no display name (api.ts:212, 1257; ui-mocks/market.ts:60 shows "0x71c9…8e3b"); server messages with full wallet addresses (lib/splitapproval.ts:44; split/route.ts:101; lib/agentpass/service.ts:30); `Proof 0x…` link (CV.tsx:26).
4. Developer wording: env var names ("NEXT_PUBLIC_DEMO=1", Bits.tsx:128; "ESCROW_ADDRESS is not configured", lib/chain/clippo-wallet.ts:43; "set ANTHROPIC_API_KEY", lib/ai/llm.ts:515; "STORAGE_PROVIDER is not blob", app/api/uploads/direct/route.ts:18; "DATABASE_URL" and "npm run db:local", lib/http.ts:77); API paths ("GET /api/auth/nonce ... POST /api/auth/session", lib/auth.ts:88; "POST /api/uploads/direct", app/api/uploads/route.ts:18; "POST /api/campaigns/:id/attest", app/api/campaigns/[id]/approve/route.ts:34); "EIP-1193" (wallet.ts:40); "RPC ... chain ID" (lib/chain/client.ts:153); "RP id and signing key" (WorldCheck.tsx:48); "CampaignCreated event" (campaigns/[id]/fund/route.ts:67); "nullifier" (Join.tsx:18).
5. Raw third-party text: wallet `shortMessage` (api.ts:37); `(e as Error).message.split("\n")[0]` (OnchainDisputes.tsx:44); `setError((e as Error).message)` (OnchainDisputes.tsx:24); World ID server reason in WORLD_ID_DENIED (WorldCheck.tsx:101); wallet `raw` in "Wallet error while {what}: {raw}" (lib/chain/client.ts:96); AI model's own reasons (AgentPassPanel.tsx:54).

---

## 4. Status and empty-state copy

"Next step?" = does the text tell the user what to do next.

### 4.1 Empty states

| Where | Text | File:line | Next step? |
|---|---|---|---|
| Wire, no match | "Nothing on the wire matches that." + "Try another platform or payout rule." + "Clear filters" | WireView.tsx:74-82 | yes |
| Standing, empty | "No one is on the board yet." "Creators appear here after their first approved clip collects views." | Standing.tsx:31 | partly (says when, not what to do) |
| Desk, no campaigns | "No campaigns yet." "Eight questions, then fund it." + "Start one" | Desk.tsx:155 | yes |
| Desk tray empty | "Tray is empty." "Clips the agent can't call land here." | Desk.tsx:209 | no, nothing to do (fine) |
| Desk analytics, no clips | "No clips judged yet." | DeskAnalytics.tsx:48 | no |
| Desk analytics, daily | "No daily counts yet. The first bar lands after the next view snapshot." | DeskAnalytics.tsx:14 | no |
| Desk, no creators | "No creators yet." "Clips show up here the moment someone submits one." | DeskAnalytics.tsx:107 | no |
| Slip, closed | "Closed to new clips." "This campaign is no longer taking submissions." | Slip.tsx:242 | no |
| Slip, no wallet | "Connect a wallet to join." + button; "Joining and claiming use your own address." | Slip.tsx:244 | yes |
| Slip, unverified | "Verify you are a person first." + "Verify with World ID" | Slip.tsx:246 | yes |
| Slip, not joined | "Not joined yet." "Joining is free. Post on {platforms} from a channel you have proven, then paste the link here." | Slip.tsx:248-250 | yes |
| Slip, no clips | "No clips yet." "Paste a link above. The verdict lands here with its reason." | Slip.tsx:272 | yes |
| Slip, no history | "Daily history ... The chart fills in once the first daily view snapshots are saved." | Slip.tsx:18 | no |
| Slip, not found | "No such slip." "It may have closed, or the link is wrong." + "Back to the wire" | Slip.tsx:295 | yes |
| 404 | "Nothing here." + "Browse the wire" | not-found.tsx:11 | yes |
| Ledger, none settled | "Nothing settled yet." "Get a clip approved and the first entry lands the next time views are reported." | Ledger.tsx:86 | yes |
| Ledger, none earning | "No campaigns yet." "Submit a clip to a campaign and it shows up here." | Ledger.tsx:112 | yes (no link) |
| Ledger, no clips | "No clips sent." "Open a campaign on the wire and paste a link. The verdict lands here." | LDash.tsx:61 | yes (no link) |
| Claim button | "Nothing to claim" | Ledger.tsx:147 | no |
| Account, channels | "No channels yet." | AccountView.tsx:38 | no (button below) |
| Bench, queue empty | "Clear desk." "Nothing waiting in this section." | Bench.tsx:128 | no (fine) |
| Bench, disputes | "No open disputes." "Appeals and flagged clips will be summarised here." | AdminAssistant.tsx:29 | no |
| Bench, growth | "Nothing unusual." "No clip is growing faster than comparable clips." | AdminAssistant.tsx:82 | no |
| Bench, splits | "No splits waiting." "Two-party splits appear here once the campaigner has an approved clip to pay." | AdminSplits.tsx:55 | no |
| On-chain disputes | "No open disputes." / "No credits in their retention window." | OnchainDisputes.tsx:59 | no |
| Agent log | "No agent is delegated to this campaign yet. It is delegated the first time you ask it for a proposal." / "Nothing proposed yet." / "No activity yet." | AgentPassPanel.tsx:85, 91, 111 | partly |
| Hire directory | "No listing matches those filters." "Loosen the rate cap or the tier. The directory lists only World ID verified creators with a proven channel." + "Clear filters" | Directory.tsx:135-136 | yes |
| Hire tray | "Nothing clipped yet. Use "Clip this ad" on a listing to start a shortlist." | Directory.tsx:107 | yes |
| Hire brief, no picks | "Nobody is clipped yet." "Clip two or three listings first..." + "Open the directory" | BriefBuilder.tsx:105 | yes |
| Workspace missing | "No workspace under that number." ... + "Back to the directory" | WorkspaceView.tsx:80 | yes |
| Workspace tracking | "Tracking starts when the work is funded." / "Nobody was approved." / "No brief attached." | panels.tsx:70, 74, 108 | partly |
| Shared / list not found | "Nothing at this address." / "No list at this address." / "This list is empty." | SharedView.tsx:22; ListView.tsx:23, 42 | yes (links back) |
| Referrals | "Nothing to refer to." / "No links yet." "Make one above, then post it where your audience is." | ModulePages.tsx:172, 187 | partly |
| Status ladder, signed out | "Sign in to see your rung." "The ladder is public. Your place on it is not." | ModulePages.tsx:76 | yes |
| Deal | "No note." | DealPanel.tsx:87 | no |

### 4.2 Loading texts

Default label "Setting type" (Bits.tsx:68), with a blinking caret (Bits.tsx:73).

| Where | Text | File:line | Clear? |
|---|---|---|---|
| Wire | "Setting the wire" | WireView.tsx:70 | no, cute |
| Standing | "Counting views" | Standing.tsx:29 | yes |
| Desk campaigns | "Opening your books" | Desk.tsx:148 | no |
| Desk tray | "Checking the tray" | Desk.tsx:207 | no |
| Desk analytics | "Adding up the books" | DeskAnalytics.tsx:150 | no |
| Daily views | "Pulling the daily count" / "Pulling daily views" / "Tallying creators" | DeskAnalytics.tsx:98, 105; Slip.tsx:45 | yes |
| Slip | "Pulling the slip" / "Pulling your clips" | Slip.tsx:290, 270 | no / yes |
| Fund | "Opening escrow" | FundView.tsx:75 | **misleading**: it only loads the page, nothing is opened on the money |
| Ledger | "Balancing the books" / "Reading your record" | Ledger.tsx:70; LDash.tsx:17 | no |
| Account | "Reading your channels" | AccountView.tsx:34 | yes |
| Bench | "Ranking the queue" / "Summarising disputes" / "Comparing growth curves" / "Finding splits waiting on you" | Bench.tsx:120; AdminAssistant.tsx:27, 80; AdminSplits.tsx:47 | partly |
| Agent log | "Reading the agent log" | AgentPassPanel.tsx:78 | yes |
| Deal | "Opening the deal file" | DealPanel.tsx:67 | partly |
| Assistant | "Reading the brief", "Matching" | CreatorAssistant.tsx:41, 99 | yes |
| Hire | "Setting the classifieds", "Pulling your clipped list", "Opening the workspace", "Pulling the shared copy", "Pulling the list" | Directory.tsx:132; BriefBuilder.tsx:97; WorkspaceView.tsx:75; SharedView.tsx:17; ListView.tsx:18 | partly |
| Status/referrals/profile | "Reading the ladder", "Opening referrals", "Reading your profile" | ModulePages.tsx:56, 141, 233 | yes |
| Fee | "Reading the fee schedule" / Footer "Platform fee: reading the schedule from the escrow." | FeePreview.tsx:37; Shell.tsx:193 | partly |
| Wizard | "The agent is writing the brief" | Wizard.tsx:322 | yes |
| Buttons in progress | "Setting type" (BriefBuilder.tsx:238; ShareBox.tsx:53), "Check your wallet", "Waiting for signature" (Ledger.tsx:147), "Sending", "Checking" (Slip.tsx:248), "Working" (WorkspaceView.tsx:194), "Agent is working" (Desk.tsx:188) | | "Setting type" on a send button is not clear |

### 4.3 Success and confirmation messages

| Where | Text | File:line | Next step? |
|---|---|---|---|
| Desk | heading "Recorded" + message | Desk.tsx:131 | partly |
| Desk decisions | "Approved by you" / "Rejected by you" | Desk.tsx:39 | no |
| Desk closed | "Closed · 0xabc…" (tx hash prefix) or "Closed · done" | Desk.tsx:48, 193 | no (hex/"done") |
| Fund | "Transfer confirmed and verified" | FundView.tsx:137 | yes (buttons "Go to the desk" "See the wire") |
| Fund pages | "Signed. Live now." / "Not approved. Pool returns." / "In escrow. Waiting on admin." / "Fund the pool" | FundView.tsx:82 | yes |
| Join | "Verified with World ID." / "Channel proven." / "You're on the wire." + "Find a campaign" | Join.tsx:275, 121, 301-302 | yes |
| Channel copy | "Copied" / "Select and copy" | Join.tsx:62 | yes |
| Claim | "Claimed and verified on-chain." | Ledger.tsx:153 | no |
| Appeal | status notes (see 3.7) | AppealPanel.tsx:96-108 | yes |
| Dispute | "Dispute opened on-chain. ..." | OnchainDisputes.tsx:41 | no |
| Bench | "Approved and live", button labels as done state ("Approve", "Reject and refund", "Clear", "Overturn", "Release hold") | Bench.tsx:56, 89, 149 | no |
| Referral | "Referral recorded: the creator who sent you earns a cut of your activity." / "You were already referred by someone else, so this link was not counted. The first referral wins." / "This referral link could not be counted (for example, it is your own)." | Slip.tsx:154-156 | no |
| Share | "Public link, read only" + "Copy link" | ShareBox.tsx:39, 42 | yes |
| Theme | "Switch to paper theme" / "Switch to night theme" | Shell.tsx:76 | yes |

---

## 5. Tone check against the design brief

Brief rules (design/DESIGN.md:57-61): dry, direct, specific; sentence case; numbers over adjectives; say what happens and what it costs; no "Oops!", exclamation marks, emoji, "Seamless", "Unlock the power of".

### 5.1 What follows the rules

- No exclamation marks or emoji found in JSX text (searched `components` and `app`, results empty). No "Oops", "Supercharge", "Seamless".
- Many messages end with "Nothing was changed." (api.ts:631; SU.tsx:20-23; WorldCheck.tsx:87-91). That is specific and reassuring.
- FundView matches the brief examples nearly word for word ("Waiting on admin", pool refundable, FundView.tsx:82-86).
- BriefBuilder field errors say exactly what to fix (BriefBuilder.tsx:59-66).
- Fee preview is a clean receipt (FeePreview.tsx:44-54).

### 5.2 Where the copy breaks its own rules

| Issue | Where | Rule broken |
|---|---|---|
| Developer text shown to users | lib/auth.ts:88; lib/http.ts:77; Bits.tsx:128; WorldCheck.tsx:48; llm.ts:515 | "Say what happens and what it costs" |
| "unlock" in body copy | Ledger.tsx:154 "credits unlock after a 7-day review window" | brief bans "Unlock the power of"; the use here is mild but the word is on the ban list family |
| Shouting inside a sentence | "The payout did NOT occur." (SU.tsx:150, 164) | sentence case |
| Vague text | "Something went wrong. Nothing was changed." (api.ts:631); "Stopped." (Wizard.tsx:323); "Nothing here." (not-found.tsx:11); "Check" as a risk label (CreatorAssistant.tsx:76); "Open" (Ledger.tsx:98) | "Specific" |
| Adjectives for amounts | "High-value pool", "Expect a longer review" (FundView.tsx:132) | "Numbers over adjectives" (the threshold is shown in the same line, so partly fine) |
| Brief example conflicts with product | Brief says "Appeal within 7 days" (DESIGN.md:59). Server window is 72 hours (lib/appeals.ts:17). UI shows only "Once per clip" (AppealPanel.tsx:91) and a due time for the campaigner step (AppealPanel.tsx:97) | accuracy |
| Hard-coded numbers that can drift | Hero.tsx:39 "Fee 0.1 to 0.5 per side"; page.tsx:108 "Eight questions" vs 8 or 9 steps (Wizard.tsx:40-45); "7-day" fallback (Ledger.tsx:154) | "Real values from data" (DESIGN.md:39) |
| Jargon in plain-language places | Footer, landing: "escrow", "on-chain", "snapshot" (page.tsx:12), "Arc" | "Dry, direct" |
| Dateline | Brief wants `MON 27 OCT 2026 · ARC TESTNET · POOLS OPEN 14 · USDC` (DESIGN.md:39). Code shows date plus "Arc testnet · USDC" only (Shell.tsx:46-49). No pools-open count | brief vs code |
| "$" plus "USDC" | `$` before USDC amounts (Bits.tsx:34; Desk.tsx:173) and "USDC" labels elsewhere | consistency; test USDC has no value (Shell.tsx:28) |
| Different nouns for the same item | see section 2 | consistency |
| Decimal vs percent | "CONF 0.91" (Stamp.tsx:27) vs "model confidence 90%" (AgentPassPanel.tsx:47) | consistency |

### 5.3 Where the print metaphor makes a task harder

1. Nav words "Wire", "Desk", "Ledger", "Bench" are print terms with no hint of what they do. A first-time visitor cannot guess that "Bench" is admin only or that "Ledger" is earnings.
2. "Desk" is a role, a page and an assistant (section 2.2). The role chooser "Which desk is this wallet for?" (Shell.tsx:141) asks a permanent question with a print word.
3. "Clip this ad" (parts.tsx:79) borrows classifieds language for a shortlist button, but "clip" is also the video. A creator reading "Clipped, 2" sees nothing about their own work.
4. "Correction" as the error heading (Bits.tsx:99) reads as an instruction to the user.
5. "Slip" for a campaign (WireView.tsx:33) when the rest of the app says campaign.
6. "Strike" and "Drop" (BriefBuilder.tsx:27; Directory.tsx:114) for remove; "Pass" (panels.tsx:42) for decline.
7. Loading lines "Balancing the books", "Opening your books", "Setting the classifieds" do not say what is loading. "Opening escrow" (FundView.tsx:75) sounds like an action on money.
8. "Standing" (Standing.tsx:22) for a leaderboard; the leaderboard is not reachable from the nav.
9. Letters and numerals on choices ("A / B / C", "I / II / III" BriefBuilder.tsx:132) are decoration; they add reading load on tasks that need clarity.
10. The newspaper theme is strong on the landing page and the stamp, where it explains the product well ("Three possible stamps", page.tsx:85). It helps there.

---

## 6. Recommendations (all PROPOSAL)

### 6a. Quick wins: words only

Priority order: P1 fix first (blocks understanding or leaks developer text), P2 next, P3 polish.

**P1. Raw text and developer wording (copy changes in the client mapping or server messages)**

| # | Current | Proposed |
|---|---|---|
| 1 | "Sign in: GET /api/auth/nonce, then POST /api/auth/session with a SIWE signature" (lib/auth.ts:88) | "Connect your wallet to continue." |
| 2 | "Requires role: CREATOR" (lib/auth.ts:90) | "This page is for creators." (and "for brands", "for admins") |
| 3 | "The payout did NOT occur. (STEPUP_DEPENDENCY)" (SU.tsx:164) | "Nothing was paid." (code only in a Details line) |
| 4 | `World ID could not complete the check (${code}).` (errors.ts:23) | "World ID could not complete the check. Try again." |
| 5 | "Request failed (404)" (api.ts:79) | "Something went wrong. Nothing was changed." |
| 6 | "Demo build (NEXT_PUBLIC_DEMO=1): figures on this page are sample data." (Bits.tsx:128) | "Sample data. These figures are not real." |
| 7 | Not-configured detail with env names (ServiceState.tsx:17) | "An operator needs to finish setup." (log the detail) |
| 8 | World ID not set up: "... add the World ID app, RP id and signing key" (WorldCheck.tsx:48) | "World ID is not set up yet. Nothing was changed." |
| 9 | "Campaign is APPROVED, expected ..." (lib/splitapproval.ts:30) | "This campaign is not live." |
| 10 | Server messages with a wallet address (splitapproval.ts:44; split/route.ts:101) | Show the creator's name or "a creator in this payout". |
| 11 | "Opening escrow" loading (FundView.tsx:75) | "Loading" |

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

### 6b. Two naming options for the whole app

**Option 1: keep the newspaper brand, add a plain sublabel or tooltip to every nav item and screen title.**

Nav (two lines: print name, plain sublabel; on phone show both in the menu list):

| Nav item | Plain sublabel (PROPOSAL) |
|---|---|
| Wire | Find campaigns |
| Hire | Hire creators |
| Desk | My campaigns (brands) |
| Ledger | My earnings (creators) |
| Bench | Admin review |
| Account | Wallet and channels |

Page kickers (the small mono line above each title), exact text:

| Page | Kicker (PROPOSAL) |
|---|---|
| /wire | The Wire · Open campaigns you can join |
| /hire | Hire · Pick creators and set their pay |
| /desk | The Desk · Your campaigns as a brand |
| /ledger | The Ledger · Your earnings as a creator |
| /bench | The Bench · Admin review queue |
| /account | Account · Wallet, human check, channels |
| Standing (section) | Standing · Top creators |
| /status | Status · Creator levels |
| /referrals | Referrals · Invite and earn |
| /profile | Profile · Optional public record |

Also: tooltip text on "Needs human" ("The AI was not sure. A person decides."), on "Confirmed" ("Views independently checked. Only these are paid."), on "Escrow" ("Money held safely until payout."). Keep "Slip" only as decoration, not in text.

**Option 2: switch to plain names.**

| Today | Plain name (PROPOSAL) |
|---|---|
| Wire | Campaigns |
| Hire | Hire creators |
| Desk | My campaigns |
| Ledger | Earnings |
| Bench | Admin |
| Account | Account |
| Standing | Top creators |
| Status ladder | Levels |
| Slip | Campaign |
| Correction | Problem |
| Stamp | Verdict |
| Agent note | AI reason |
| Dateline | (remove name; show date and "Test network") |

**Recommendation: Option 1, with part of Option 2 applied to the words that cause the most confusion.** Why: the paper look and the stamp are the product's identity and they explain the mechanism well on the landing page (page.tsx:84-98). Removing every print word would also need many layout and metaphor changes (stamp, slip, tick bar). But the print names fail in the nav, in roles and in error boxes, where the user is doing a task. So: keep "The Wire / The Desk / The Ledger / The Bench" as large headings only, add the plain sublabel in the nav and in each kicker, and use plain words (Option 2) for these: Desk as role (use "creator" and "brand"), Slip, Correction, "Clip this ad", Standing, Credits, Open, Pass. This is a PROPOSAL and needs an owner decision.

### 6c. Information architecture and onboarding

**First-time creator today (from the code):**
1. Landing (page.tsx:103-122) -> "Verify and join" -> /join.
2. /join asks "Two desks. Pick one." (Join.tsx:248). The user must choose a role before they know what a wallet is.
3. Step 1 needs a browser wallet extension. No wallet: a sheet says "No wallet found" and lists install links (WalletPicker.tsx:23, 35). The first hard stop.
4. Connect wallet = sign-in (signature) with no explanation. Then World ID with two jargon terms on the button.
5. Step 2 channel code in the bio, then "I put it there. Check." X and Instagram go to a person "usually within a day" (Join.tsx:217), so the creator cannot submit during that time.
6. "You're on the wire." -> campaigns.
Where they get lost: the wallet and signature step, the "Proof of Human" wording, the long wait for X and Instagram, and "Desk" as a role. After joining, earnings, levels, referrals and public record are hidden behind small links in the Ledger side rail that appear only if each module answers (LedgerDash.tsx:92-105). The leaderboard is at the bottom of the Wire page (WireView.tsx:101). The nav gives no "Join" item.

**First-time brand today:**
1. Landing "Start a campaign" -> wizard (desk/new). The wizard can be filled in without a wallet. The wallet pops up on the last step (Wizard.tsx:120), and then a role sheet may appear (Shell.tsx:137-150) in the middle of "Create and go to funding".
2. Fund page needs test USDC on the Arc network, two wallet confirmations, and a network fee "paid in USDC" (FundView.tsx:121-125). Help links: card checkout, faucet.
3. Then "In escrow. Waiting on admin." with no time estimate and no notification described on the page (notification API exists, UI not read: not determined).
4. Where they get lost: pay modes (three names each, section 2), "approver", the hidden "Eight questions" count (8 or 9), the extra World ID step for large pools, "Agent Pass", and the fact that Hire (pick named creators) is a second, separate way to start a paid job, ending in a hidden "human split" campaign (WorkspaceView.tsx:115). Where a hire shows up on the Desk is not determined.
5. Every visitor sees "Bench" in the nav, and a creator who clicks "Desk" gets an error box (Section 3.2).

**Proposals:**
1. Role-aware nav: hide Bench for non-admins; show Desk to brands and Ledger to creators; show "Join" to anonymous visitors. (PROPOSAL)
2. Put a "What is a wallet?" line before the first wallet step, and say that connecting also signs you in. (PROPOSAL)
3. Replace role errors with a friendly redirect: "This page is for creators. You are a brand." (PROPOSAL)
4. Give the Ledger side links a visible home (a "More" row in the creator nav). Link to the leaderboard from the Wire heading. (PROPOSAL)
5. Show a plain "What happens next" list on the fund page (already close in the docket, FundView.tsx:68-73). Add an expected review time. (PROPOSAL)
6. One glossary page or hover help for: escrow, USDC, confirmed views, level. (PROPOSAL)
7. Decide whether Hire and Wizard are one flow ("Pay per clip" vs "Hire named creators") and name them as two ways in on the landing page. (PROPOSAL)
8. Fix the Wizard count: say "Question N of M" and drop "Eight questions" (Wizard.tsx:174; page.tsx:108). (PROPOSAL)

### 6d. Accessibility and mobile (from code)

1. Every `Stamp` is `role="status"` (Stamp.tsx:25). In a list of many clips, screen readers may announce each on load. Consider a plain label without live-region role. Not tested.
2. The Bench tabs use `role="tablist"` and `aria-selected` but no `tabpanel` link or arrow-key handling was found (Bench.tsx:111-113). The Creator assistant has a `tabpanel` (CreatorAssistant.tsx:127). Not determined whether arrow keys are handled elsewhere.
3. The wallet button aria-label reads the full address (Shell.tsx:126): long for a screen reader. Use the role plus a short name.
4. Tags and stamps depend on uppercase CSS; aria strings are mixed case (Stamp.tsx:25), which is fine, but "YT" and "IG" tags are abbreviations (Icons.tsx:150-152). Use full names for the visible text.
5. Small text: micro labels are 0.75rem (12px) in many rules (globals.css:116, 130, 306, 396), and ink-2 is used for them. The brief sets micro at 0.6875rem. Check contrast at this size. Not measured.
6. Tap targets: the brief wants 44px. Masthead items drop to 40px at one breakpoint (globals.css:621). Table row buttons use `.btn.sm` at 44px (globals.css:239), fine.
7. Mobile masthead: wallet and theme controls sit in `.masthead-tools`, which is hidden at one breakpoint until Menu is opened (globals.css:571, query not read). If so, "Connect wallet" is hidden behind Menu on phones. Not determined.
8. The step-up flow leaves the page and restores state from the URL (SU.tsx:27-60). The gate text warns the user (Desk.tsx:244). Good. Add a visible "Return to ..." instruction if the user lands elsewhere. (PROPOSAL)
9. Dates and numbers are hard-coded to en-US (format.ts; Ledger.tsx:98). Not a bug for the current audience; note for later.
10. Quantity input strips non-digits with `/D/g` (BriefBuilder.tsx:218), which removes the letter "D", not digits. Likely a typo for `/\D/g`. Not a copy issue, noted because it affects a form.
11. Heading order: the Desk page uses an h2 with id "slips" for "Campaigns" (Desk.tsx:147), fine. Bench list items use h2 inside list items (Bench.tsx:136): heading levels inside rows may be noisy for screen readers.
12. Images and clips: the sample clips use `aria-hidden` video with a text caption (LoopClip.tsx:73-81). Fine.
13. Color: stamps carry text, not color only (Stamp.tsx). Deal "Signed/Open" uses color plus word (DealPanel.tsx:96). Good.

### 6e. Things not to change (they work)

1. The stamp and the three outcomes (Approved, Rejected, Needs human): clear on sight, explained on the landing page (page.tsx:84-98).
2. The "Nothing was changed." habit and the "no money moved" line (ServiceState.tsx:18). It answers the first fear of anyone near money.
3. The fee receipt (FeePreview.tsx:44-54) and the funding docket (FundView.tsx:68-73).
4. The BriefBuilder inline errors (BriefBuilder.tsx:59-66). They say what to fix in plain words.
5. "Show it's yours." channel step and the copyable code box (Join.tsx:294; ChannelCode Join.tsx:46-71).
6. The appeal tracker "Campaigner reviews / Admin reviews / Final" (AppealPanel.tsx:44-46) and its status notes.
7. The demo labels ("Sample footage, not real creators", ClipBand.tsx:80; "Sample data, not live", Hero.tsx:91). Honest and visible.
8. "Close and reclaim $X" (Desk.tsx:193): says what happens and the amount.
9. Wizard questions as full sentences ("What are you promoting?", "How should creators be paid?", Wizard.tsx:158-169) and one question at a time with focus on the legend (Wizard.tsx:72-74).
10. Table reflow with `data-l` labels on phones (Standing.tsx:50; Ledger.tsx:96).
11. Skip link and landmarks (layout.tsx:50-60; Shell.tsx:116).
12. The print look itself on the landing page, wordmark and stamp. Keep the brand; fix the words around it (see 6b).

---

## Open items I could not determine

- Whether the Wizard "Share the pool by what?" step is intentionally removed (it is defined, Wizard.tsx:164, 262-267, but never in `stepsFor`, Wizard.tsx:40-45).
- Whether "Allocated" showing $0 for split and share campaigns is intended (api.ts:168).
- Whether hired campaigns appear on the Desk list.
- Which breakpoint hides `.masthead-tools` (globals.css:571).
- Whether notifications (API exists) have any UI.
- The 404 text "switched off in this build" and the ModuleLinks probe: users on a build with modules off see no link to them.
