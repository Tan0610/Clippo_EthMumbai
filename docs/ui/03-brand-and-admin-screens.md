# C. Brand and admin screens

Scope: /desk, /desk/new, /desk/[id]/fund, /hire, /hire/brief, /hire/lists/[token], /hire/share/[token], /hire/w/[id], /bench.
Everything below comes from the code on branch docs/ui-guide (base main bb2fbec). "Not determined" means the code did not answer.

Word map used in this file (code word -> plain meaning):
- Brand = "campaigner" in code. Creator = person who posts clips. Admin = Clippo operator on an allow-list.
- Desk = brand dashboard. Bench = admin queue. Wire = public list of live campaigns. Slip = one campaign card/page. Hire = pick named creators instead of an open campaign.
- Escrow = the smart contract `ClippoEscrow` that holds the USDC. Pool = the USDC the brand puts in.
- Campaign status in the UI: `awaiting_funds` (draft, not paid in), `pending_admin` (paid in, waiting for an admin), `live`, `rejected`, `closed`. Mapped in `components/api.ts:163` from DRAFT, FUNDED, APPROVED, REJECTED, CLOSED.

Global facts that affect every screen:
- Top nav (`components/Shell.tsx:12`) shows Wire, Hire, Desk, Ledger, Bench, Account to everybody, whatever the role. Footer has "Start a campaign" -> /desk/new.
- Every screen is wallet-gated. The session role comes from the wallet (SIWE sign-in). A new wallet is asked "Which desk is this wallet for?" with "I clip: creator" / "I pay for clips: campaigner" (`Shell.tsx:141`). The role cannot be changed later.
- Gas on Arc is paid in USDC. Fees: 0.25% (25 bps) per side by default, read from the escrow (`lib/chain/fees.ts`; allowed 0.10% to 0.50%). Brand fee is taken at funding, creator fee at claim.
- A campaign ends at an on-chain `deadline`. Default is 30 days after funding (`CAMPAIGN_DEADLINE_SECONDS` can change it; `api/campaigns/[id]/fund/route.ts:39`). No screen shows this date to the brand.
- Failure copy pattern: red "Correction" box with "Try again", or notice "Nothing changed". Service down: "Clippo could not reach its service." Not set up: "This part of Clippo is not switched on for this deployment."

---

### /desk : "The Desk" (page title) / heading "Your campaigns"
- Purpose: the brand's dashboard. See each campaign, fund it, release payouts, review unsure clips, close it.
- Who: campaigner wallet. Others see an error (the list route needs a signed-in user; the numbers route needs the CAMPAIGNER role).
- Reachable from: nav "Desk"; fund page ("Go to the desk", kicker "Desk"); footer is not linked here.

Layout, top to bottom (`components/DeskView.tsx`):
1. Header. Kicker "The Desk / Campaigner". Title "Your campaigns". Lead: "What is live, what is waiting on you, and what is still in escrow."
2. Button link "New campaign".
3. Return panel for World ID step-up (`StepUpReturnPanel`). Only visible after coming back from World ID (see Agent split flow).
4. Message strip. Title "Recorded" (green) or "Nothing changed" (warning), then text of the last action.
5. One "Split proposal: {campaign}" strip per proposal touched in this page session. Shows "Awaiting campaigner/admin", "Awaiting chain confirmation" or "Finalized", then "Campaigner approved/not yet · Admin approved/not yet", then `split 0x...` (the split fingerprint). Memory only; disappears on reload.
6. "The numbers" (DeskAnalytics), only when at least one campaign exists. See below.
7. Section "Campaigns": table.
8. Section "Waiting on your call", small label "Agent was not sure": clips the AI could not judge.
9. "On-chain disputes" section, only if any campaign is "Per verified view" (see below).
10. One "Agent Pass activity: {title}" section per "Human-approved split" campaign, any status.
11. When a split approval is in progress: the "Agent Pass gate: World ID step-up" box (agent proposal) or the World ID pop-up (self-built split).

Campaigns table columns and meaning:
- "Campaign": title (link to /slips/{id}, the public campaign page) and a small line `No. {last 4 of id, upper case} · {payout rule} · {status}`. Status shows with the first underscore replaced ("awaiting funds", "pending admin"). Payout rule names: "Per verified view", "Human-approved split", "Pool share" (`format.ts:13`).
- "Pool used": a tick bar of Allocated / pool. aria text "N percent used".
- "Allocated": `$paid / pool`. IMPORTANT: `paid` is not read from the chain. For "Per verified view" it is estimated as views/1000 x rate, capped at the pool (`api.ts:168`). For the other two payout rules it is always 0. So "Pool used" and "Allocated" are 0 for split and pool-share campaigns even after payouts exist.
- "Views": if the campaign is "Human-approved split" (or the numbers failed to load): number + "Clippo count" (Clippo's own count). Otherwise: confirmed number, "Pending N" (adds ", not paid yet" if confirmed is 0), a "Chainlink" badge once something is confirmed, and "Proof 0xabc..." link to the on-chain report. While the numbers load it shows "…". Meaning: Confirmed = views read from YouTube by Chainlink CRE nodes and written on Arc; only Confirmed is paid. Pending = Clippo's own count (`ConfirmedViews.tsx:8`).
- Last column (no heading, hidden "Actions"): buttons, see controls table.

"The numbers" (`DeskAnalytics.tsx`), heading "The numbers", label "All campaigns":
- "Budget": sum of pool sizes (gross, before the fee).
- "Spend": sum of per-campaign spend from the server. For "Human-approved split" = USDC credited by approved splits. For the other two = the larger of credited payouts and the estimate from the payout formula over approved clips (`lib/workspace/marketplace.ts:221`).
- "Confirmed views" (+ "Pending", badge, proof link) if any campaign pays by views; else "Views, Clippo count". Then a note "Confirmed and pending" with the sentence "Confirmed = read from YouTube by Chainlink CRE nodes and written on Arc. Pending = Clippo's own count. Only Confirmed is paid."
- "Per 1K views": spend / views x 1000, or "no views yet".
- "Approved / rejected": clip counts.
- Then one campaign at a time. With more than one campaign, a button per campaign title picks which (aria-pressed). Heading = that title. Blocks: "Spend against budget" (`$spend of $budget · $remaining left`, tick bar "N percent of the budget spent"; remaining = budget minus spend, so it ignores the fee already withheld); "Clips, approved and rejected" (bar + legend "Approved N", "Rejected N", "Needs human N"; "No clips judged yet."); "Cost per 1,000 views" (big number, text "Spend divided by Clippo-counted views on approved clips."); "Confirmed views, this campaign" line (not for split campaigns); "Daily views, Clippo count" (bar chart, peak day in orange; empty text "No daily counts yet. The first bar lands after the next view snapshot."); "Per creator" table with columns "Creator", "Clips", "Approved", "Rejected", "Clippo views", "Cost, USDC", "Per 1K".
- Per-creator table is computed in the browser from the campaign's submission list (`api.ts:1293`): views come from each clip's stored metadata, and cost is that creator's share of views x the campaign's average rate. It is NOT the real credited amount. The server already returns real per-creator cost, claimed amounts and confirmed views (`marketplace.ts:233`) but this table does not use them. Creator names are shortened wallets.

Controls table:

| Label | Kind | Where | What it does | Technical effect | Enabled when | Result user sees | Clearer label |
|---|---|---|---|---|---|---|---|
| "New campaign" | link | header | Opens the campaign wizard | none, goes to /desk/new | always | wizard page | "Create a campaign" |
| "Start one" | link | empty state | same | goes to /desk/new | no campaigns | wizard | "Create your first campaign" |
| "Connect as a campaigner" | button | list error state | Signs in with wallet as brand, reloads list | wallet connect + SIWE sign message (`session.connect("campaigner")`), then list reloads | no wallet session; shows "Check your wallet" while busy | list appears or error sheet "Could not connect" | "Connect wallet as a brand" |
| Campaign title | link | table | Opens public campaign page | goes to /slips/{id} | always | campaign page | (fine) |
| "Fund {pool} USDC" | link | row actions | Goes to the funding page | /desk/{id}/fund?pool={pool} | status `awaiting_funds` | fund page | "Pay {pool} USDC into escrow" |
| "Ask the AI to propose" | button | row actions | AI writes a payout split for approved clips. Nothing is paid | 1) POST /api/campaigns/{id}/agent (delegate the AI agent wallet; refused 403 `AGENT_NOT_REGISTERED` unless the agent wallet is registered to a human in AgentBook; the error text then tells the brand to run `npx @worldcoin/agentkit-cli register 0x...`); 2) POST /api/campaigns/{id}/split/propose {mode:"llm"} (20 per hour). Proposal lives 30 minutes (`agentpass/service.ts:139`). | live + "Human-approved split", no proposal in memory, not busy | green strip "The agent proposed X USDC across N creators. Review it, then approve with a fresh World ID check. Nothing is payable yet." Label becomes "Agent is working" meanwhile. Fail: "No proposal. {reason}" | "Let the AI suggest who gets paid" |
| "Propose without AI (pro rata by clips)" | button | row actions | Same, but plain formula (share of approved clips) | same two calls with mode "deterministic" | same | same text | "Suggest a split by clip count" |
| "Build it myself" / "Build it myself (1 of 2)" | button | row actions | Software builds the split by approved clips of the net pool (pool minus brand fee, floored to cents) and asks you to approve it | GET /api/campaigns/{id}/submissions (`actions.splitPlan`); then World ID pop-up | live + "Human-approved split", no proposal | World ID pop-up. Error "Split not approved. No approved clips yet, so there is nobody to pay." | "Review the split and approve" (it does not let you edit amounts) |
| "Approve agent's split" / "Approve agent's split (1 of 2)" | button | row actions | Opens the World ID gate for the AI proposal | none yet; opens the "Agent Pass gate" box | the AI proposal exists in this page session | gate box | "Approve this split" |
| "Ask the AI again" | button | row actions | new AI proposal, replaces the old | as "Ask the AI to propose" | not busy | same | "Get a new AI suggestion" |
| "Propose without AI" | button | row actions | new formula proposal | as above | not busy | same | "Get a formula-based split" |
| "Approve with World ID step-up" | button | gate box | Leaves the site for World ID (auth.world.org) to prove you are a fresh real human | POST /api/campaigns/{id}/stepup/start {operation SPLIT_RELEASE, splits, agentProposalId, returnPath}; then browser redirect to `authorizeUrl` | not busy; label "Opening World ID" while busy | page leaves. Fail: "Nothing approved" + reason | "Verify with World ID and approve" |
| "Cancel" | button | gate box | Closes the gate box | none | always | box closes | (fine) |
| "Close and reclaim ${pool-paid}" | button | row actions | Closes the campaign on-chain and returns unspent USDC to your wallet | wallet tx `closeCampaign(onchainId)` on `ClippoEscrow`, wait for receipt, then POST /api/campaigns/{id}/close {txHash}. If the escrow is not set up it only calls the API | status `live` | after: text "Closed · 0x1234abcd…" (first 10 chars of tx hash) and list reloads. Fail: red strip "Nothing changed" + wallet/chain text | "Close campaign and take back unspent USDC" |
| "Approve" (Waiting on your call) | button | review tray | Accepts a clip the AI was unsure about | POST /api/submissions/{id}/verdict {APPROVE, "Approved by the campaigner after review."} (sets confidence 1, decided by human) | not yet decided | text "Approved by you" | "Accept clip" |
| "Reject" | button | review tray | Rejects the clip | same, REJECT, reason "Rejected by the campaigner after review." | not yet decided | text "Rejected by you". Creator may appeal | "Reject clip" |
| Clip title | link | review tray | Opens the clip on its platform in a new tab | external | always | new tab | (fine) |
| Pick buttons (campaign titles) | toggle | The numbers | Shows numbers for that campaign | none | more than one campaign | block changes | (fine) |
| "Try again" | link-button | any error box | Reloads that block | repeats the read | on error | reload | (fine) |

Agent split flow in detail (agent proposal):
1. Click "Ask the AI to propose" -> delegate -> propose (see table).
2. Row now shows "Approve agent's split". Click it -> gate box: "Agent Pass gate: World ID step-up" with text "You are releasing the agent's split for {title}: N creators, X USDC. You will leave for World ID for a fresh Orb-class check, then return here to complete it. Nothing is paid unless the check passes." The box shows only count and total, not who gets what; per-creator amounts and reasons are in the "Agent Pass activity" section below.
3. "Approve with World ID step-up" -> redirect to World ID -> return to /desk?stepup=approved&attempt=ID.
4. `StepUpReturnPanel` reads the attempt (GET /api/stepup/{id}). Only status AUTHORIZED counts (valid 5 minutes, `worldauth/stepup.ts`). Then POST /api/campaigns/{id}/split {splits, agentProposalId, stepUpAttemptId}, then a wallet transaction `approveSplit(id, creators, amounts, proof)` on the escrow (wallet may ask to switch to Arc Testnet first), wait for receipt.
5. Strip text: "Verified with World ID (fresh Orb-class check). Completing approval..." then one of:
   - "Split finalized for N creators. They can claim now." (never returned by the split route; it returns AWAITING_CHAIN)
   - "Both approvals are in. Waiting for the chain to confirm the split. Credits appear once the escrow reports it." (also shown for "Only me" campaigns where only one approval exists: wrong wording)
   - "Your approval is recorded and sent on-chain. Awaiting admin: they must approve the identical split with their own World ID step-up. Nothing is payable yet."
   - failure: "Split not released. The payout did NOT occur. {reason}"
   - denied states (`StepUpReturnPanel` copy): "You cancelled at World ID. Nothing was approved." / "The check expired. Nothing was approved. Start again." / "That World ID is not the one linked to your account, or the split changed. Nothing was approved." / "World ID could not be reached or validated. Nothing was approved."
6. Contract: `approveSplit` needs the caller to be the campaigner (or an admin when "Me and an admin"), a proof the Clippo backend signed for this exact split, and a human not already used on the other side (`SameHuman`). With "Only me" it credits creators at once. With "Me and an admin" both must send the identical split; a different split replaces the pending one and clears approvals. Total cannot exceed pool minus already allocated (`PoolExceeded`). Only creators whose wallet is linked to a World ID human can be credited.

Self-built split flow ("Build it myself"): no step-up redirect. A World ID pop-up (IDKit, action `clippo-approve-split`, bound to the split fingerprint) opens in the page. On success: POST /api/campaigns/{id}/split {splits, worldIdProof}; wallet tx `approveSplit`; POST /api/chain/report {txHash}. Same strips as above. Cancel/expire/fail in the pop-up logs an audit row (POST /api/campaigns/{id}/split/audit) and shows "Split not approved. {reason}". There is no screen showing the split amounts before this approval.

On-chain disputes (brand view, `OnchainDisputes.tsx`, heading "On-chain disputes", label "Challenge credits before they release"):
- Only for "Per verified view" campaigns. Lists payouts (up to 50) still unclaimed that have a release date, from GET /api/chain/disputes.
- Row: campaign title; `0xabcd…1234 · {amount} USDC · releases {date}` or `open until {date}`.
- Button "Dispute" (when not open): wallet tx `disputeCredits(onchainId, creatorWallet)`, then POST /api/chain/report. The creator's credits still inside the 7-day wait cannot be claimed until an admin settles. If no admin settles by the deadline (7 days after you open it), the credits release on their normal schedule. Notice: "Dispute opened on-chain. These credits can't be claimed until it's settled."
- "Under dispute" label when open. Empty: "No credits in their retention window." Error: "Disputes did not load: {reason}". Failure: "Nothing changed. {first line of wallet error}".
- Per-view credits become claimable only 7 days after being credited (`retentionPeriod`). The list does not hide rows whose date has passed; disputing those reverts (`NothingToDispute`).

States:
- Loading: "Opening your books" (list), "Checking the tray", "Adding up the books", "Pulling the daily count", "Tallying creators".
- Empty: "No campaigns yet." + "Eight questions, then fund it." / "Tray is empty." + "Clips the agent can't call land here." / "No creators yet."
- Error: Correction boxes: list error text from the service; "The review tray did not load."; "Your numbers did not load." with "Connect a campaigner wallet, then try again."; "Daily views did not load."; "Creator performance did not load."
- Waiting for wallet: "Check your wallet" on the connect button. Close has no busy label and no disabled state while the wallet prompt is open (double click is possible).
- Waiting for admin: status text "pending admin" in the table; no explanation and no action in that row.
- Disabled: agent buttons while "Agent is working".

Copy worth noting:
- "Pool used" vs "Allocated" vs "Spend" vs "Budget": four money words for overlapping ideas, and they disagree (see above). `DeskView.tsx:160`, `DeskAnalytics.tsx:167`.
- "Agent was not sure" (`DeskView.tsx:206`), "Tray is empty." (:209), "Opening your books" (:148): print jargon.
- "Agent Pass", "AgentBook", "World AgentKit", "step-up", "Orb-class", "proof" appear in the brand's screen (`DeskView.tsx:242`, `AgentPassPanel.tsx`). A brand cannot know these.
- Audit tags like "Step-up below Orb-class", "Proof reused" (`AgentPassPanel.tsx:10`).
- "(1 of 2)" on buttons means "you are the first of two approvers".
- "Clippo count" vs "Confirmed" vs "Pending" for views.

Problems and suggestions:
- HIGH: "Allocated"/"Pool used" is 0 for two of three payout rules and an estimate for the third. Show real credited amount (server already returns `allocated`, `components/api.ts` ignores it).
- HIGH: "Close and reclaim" is offered at once on live campaigns, but the contract only allows closing after deadline + 1 day grace (`closeCampaign` reverts `DeadlineNotReached`). The brand is never told the end date. Show "Closes on {date}" and disable the button until then. The refund amount in the label (pool - paid) is also an estimate; real refund = net pool - allocated. For "Pool share" campaigns the whole pool is shared among creators at close, so "reclaim" is near zero.
- HIGH: `rejectReason` (what the admin wrote) is never shown to the brand anywhere (only read in `api.ts:198`).
- HIGH: no UI for `reclaimUnapproved` (brand takes funds back if no admin signed before the deadline), although the contract has it.
- HIGH: the AI proposal exists only in page memory. Reload loses the "Approve agent's split" button and the brand must ask again (proposals expire after 30 minutes anyway).
- HIGH: no split preview before approval for "Build it myself" and the gate box. Show a table of creator, clips, amount.
- MEDIUM: "Waiting on your call" shows platform "youtube" for every clip (`adaptSub` hard-codes it, `api.ts:211`).
- MEDIUM: the brand-side needs-human list loads one request per live campaign (N+1) and ignores closed campaigns.
- MEDIUM: "Per creator" table is an estimate presented as cost.
- MEDIUM: no way to revoke the agent although the API has DELETE /api/campaigns/{id}/agent.
- LOW: closed/rejected campaigns stay in the table with no explanation line.
- LOW: "Close" has no busy state.

---

### /desk/new : "New campaign" (page title) / heading "One question at a time"
- Purpose: a question-by-question form that creates a draft campaign, then sends the brand to the funding page.
- Who: a brand. The first AI step (`POST /api/wizard/suggest`) requires a signed-in CAMPAIGNER or ADMIN, but the wizard only connects the wallet at the very last step (`Wizard.tsx:120`). A visitor who is not signed in will fail on step 1 with the raw API text "Sign in: GET /api/auth/nonce, then POST /api/auth/session with a SIWE signature" (`lib/auth.ts:88`). A creator wallet gets "Requires role: CAMPAIGNER or ADMIN".
- Reachable from: Desk "New campaign" / "Start one"; footer "Start a campaign"; fund page "Change the answers".

Layout (`app/(site)/desk/new/page.tsx`, `Wizard.tsx`):
- Header: kicker "Desk / New campaign", title "One question at a time", lead "Nothing is charged until the last step. You can go back and change any answer."
- Left rail "Progress": "Question N of M" (M = 8, or 9 when the payout rule is "I approve the split"), a dot per step, and a note "Promoting" with the first 90 characters of the idea.
- Form: a fieldset whose legend is "Q01 ..." plus the question. Buttons at the bottom: "Back" (from Q2 on) and the main button with an arrow. Enter inside a text input also presses the main button. Main button is disabled until the step is valid or while working.
- Working line under the form: "The agent is writing the brief" (step 1), "The agent is sizing the pool" (step before size), "Creating the campaign" (last step). Error line: bold "Stopped." plus text.
- All answers live in page memory only. Reload or leaving loses everything.

Questions, in order:

| Q | Question text | Controls | Valid when | On "Next" |
|---|---|---|---|---|
| 1 | "What are you promoting?" | textarea, label "One or two sentences. The agent turns it into a full brief." Hint: "A few more words, please." / "Good. Next, the agent writes the brief." | idea >= 12 characters | button "Write the brief": POST /api/wizard/suggest {idea}; fills title, topic, summary, must say, must not say, disclosure, attribution. Only if the brief is empty. Editing the idea clears the brief, so going back and editing overwrites any story edits. |
| 2 | "Here is the story. Edit anything." | inputs: "Campaign title"; "What creators should make"; "Must say, one per line"; "Must not say, one per line"; "Disclosure label". Hint under Disclosure: "The agent checks every clip against these four things. Edit until they say what you mean." | summary >= 20 characters, at least one must-say line, disclosure not empty | next |
| 3 | "What content should creators use?" | see ticket cards below | choice made and its part ready | next |
| 4 | "Where should clips be posted?" | checkbox tickets A "YouTube" ("Built first. Transcript and views read automatically."), B "X" ("Second. Unreadable posts go to a person."), C "Instagram" ("Third. Unreadable posts go to a person."); hint "Choose one or more." | one or more picked | next |
| 5 | "How should creators be paid?" | tickets, see below | one picked | next |
| (5b) | "Who approves the split?" | only when Q5 = "I approve the split". Tickets A "Only me" ("One World ID check from you releases the split."), B "Me and an admin" ("Two people sign before money moves.") | one picked | next |
| 6 | "How big is the pool?" | see below | pool > 0, target > 0, rate > 0 for "Per view" | on the way in, a second suggest call (payoutMode) loads the size options |
| 7 | "Who can join?" | tickets A "Anyone verified" ("Every World ID-verified creator can join."), B "Higher-ranked only" ("Creators with a track record of approved clips.") | one picked | next |
| 8 | "Check it, then fund it." | summary list, no inputs | always | button "Create and go to funding" |

A question "Share the pool by what?" (tickets "Views", "Approved clips") exists in code (`Wizard.tsx:164`, :262) but is never reached: the step list never includes it (`stepsFor`, :40). The server forces pool-share campaigns to share by views anyway (`api/campaigns/route.ts:50`) and rejects "Approved clips" (:30). Dead code.

Q3 ticket cards (what it means):
- A "Upload a clip": "Creators cut from your original file. They can play and download it." Brand uploads a file. Creators get a download button on the campaign page.
- B "Link a video": "Point at a video you already host." Brand pastes a public address. Creators cannot download it from Clippo.
- C "Generate one": "Describe it. Clippo makes an AI video, labelled as AI-generated." Brand writes a description, Clippo renders a video, brand must approve it.
Extra controls per card (`SourceStep.tsx`):
- Upload: drop zone "Drop the original here", text "or choose a file · MP4, MOV, WebM · up to 200.0 MB". Video only. While sending: file name, percent, tick bar, link "Cancel". After: video preview, name and size, link "Download", link "Replace". Errors: "{name} is not a video. Use MP4, MOV or WebM." / "{name} is X MB. The limit is 200.0 MB." / "Not uploaded." + reason. Warning "Held in this browser only. The upload service did not answer, so creators cannot reach this file yet." (the wizard still lets you continue; no file gets attached).
- Link: input "Video URL" placeholder "https://", hint "A public address creators can open. Creators cannot download it from Clippo." Valid when it looks like http(s)://x.y.
- Generate: textarea "Describe the video" (hint "Shots, setting, tone. Do not name real people or brands you do not own."), checkbox "I confirm I hold the rights to everything described here, and that creators may cut and repost the result. It will carry an AI-GENERATED label.", button "Generate video" (disabled until description >= 20 characters and the box is ticked; "Sending" while busy; "Try again" after a failure). Calls POST /api/ai-video/jobs (5 per hour). Then a 4-step tracker "Queued / Rendering / Ready / Approved" with progress, polled every 1.5 seconds. When ready: video preview, text "Watch it through. Nothing goes to creators until you approve this exact video.", button "Approve for launch" (POST /api/ai-video/jobs/{id}/approve), link "Discard and start over". After approval: label "Approved for launch", links "Download" and "Start over". Failure box "Generation failed." The wizard cannot continue until the job is approved.

Q5 ticket cards (what it means for money and creators):
- A "Per view": "A fixed rate per 1,000 verified views, until the pool runs out." Contract mode PerView. Creators are credited automatically from Chainlink CRE view reports at the rate, capped by the remaining pool. Credits can be claimed only 7 days after crediting, and the brand can dispute them in that window. Needs a rate on Q6.
- B "I approve the split": "The agent pre-scores. You approve the final split with a fresh World ID check." Contract mode HumanSplit. Nothing is credited until the brand (and admin, if chosen) approve a split on the Desk. Then a second question asks who approves.
- C "Share the whole pool": "Divided at the end by each creator's share of verified views. Every dollar gets spent." Contract mode PoolShare. Nothing is credited until the campaign is closed (after the deadline), when the escrow divides the whole pool by views.
Choosing a card clears the other branch's answers.

Q6 size screen: label "Agent suggestions for this kind of campaign" with three buttons. Real labels from the server are "Starter" (500 USDC, 2 USDC per 1K), "Standard" (2000, 3), "Large" (5000, 4) (`lib/ai/campaign-writer.ts:52`); each shows `$pool`, optional `$rate per 1K ·`, `target N K views` where target = pool / rate x 1000 (so for non-per-view rules the target still divides by the per-view rate, an arbitrary number). Clicking one fills the inputs. Inputs: "Pool" (USDC), "Rate" (USDC / 1K views, only for "Per view"), "View target" (views). Note under Per view: "Arithmetic ${pool} at ${rate} per 1K covers N views, before fees." The pool you type is the gross amount; the 0.25% brand fee comes out of it. View target is stored with the campaign; no screen in this scope uses it.

Q7 meaning: "Higher-ranked only" = creator tier "Rising" or better (3+ approved clips and 60%+ pass rate; `lib/workspace/rank.ts`). The wizard text does not say this.

Q8 summary rows (`Wizard.tsx:309`): "Promoting" (first 60 chars), "Content" ("AI-generated video, approved" / "Upload, {file}" / "Linked video"), "Label" ("AI-GENERATED", only for generated), "Platforms" (raw ids: "youtube, x"), "Payout" (e.g. "per view", "human split, me and admin", "pool share"), "Pool", "Rate", "Target", "Who" (raw "anyone" or "ranked"). Title, story, fee and end date are not shown.

End of wizard ("Create and go to funding"):
1. If no signed-in user: wallet connect + sign-in as campaigner.
2. POST /api/campaigns creates a DRAFT campaign (not funded, no money moved). The id is remembered so retry does not create a second draft.
3. Upload: POST /api/campaigns/{id}/source {uploadId}. Generated video: POST /api/campaigns/{id}/source {jobId}. Link: sent inside the create call.
4. Browser goes to /desk/{id}/fund?pool={pool}&mode={payout}.

Controls table:

| Label | Kind | Where | What it does | Technical effect | Enabled when | Result | Clearer label |
|---|---|---|---|---|---|---|---|
| "Write the brief" | button | Q1 | AI drafts the story | POST /api/wizard/suggest | idea >= 12 chars | Q2 filled. Fail: "Stopped." + reason | "Draft my brief with AI" |
| "Next" | button | Q2-Q7 | go on | Q before size also calls suggest again | step valid | next question | (fine) |
| "Back" | button | Q2 on | previous question | none | not first | previous question | (fine) |
| "Create and go to funding" | button | Q8 | creates draft, goes to fund page | see above | always | fund page; fail "Stopped." + reason | "Create campaign, then pay" |
| ticket cards A/B/C | radio/checkbox | Q3, Q4, Q5, Q5b, Q7 | picks an option | none | always | card highlights | (fine; letters A/B/C add nothing) |
| size suggestion buttons | toggle | Q6 | fills pool, rate, target | none | after suggestions load | inputs fill | (fine) |
| "Cancel", "Replace", "Download", "Generate video", "Approve for launch", "Discard and start over", "Start over", "Try again" | button/link | Q3 | see Q3 | see Q3 | see Q3 | see Q3 | "Download" = "Download file" |

States: loading = working lines above; error = "Stopped." box; there is no success page, the success is the redirect; no empty state; disabled = main button until valid.

Copy worth noting:
- Page title "New campaign" vs heading "One question at a time". Rail says "Question N of M" but the legend says "Q01". Empty-state on Desk says "Eight questions" but split campaigns have nine.
- "The agent" is used for the AI writer. "Disclosure label" is not explained (it means the "#ad / Paid partnership" wording).
- "The agent checks every clip against these four things" (`Wizard.tsx:227`): the hint sits under only one field and "four" is not defined (apparently summary, must say, must not say, disclosure).
- Platform cards describe the product's build order ("Built first", "Second", "Third"), not what matters to a brand.
- "Share the whole pool" and "Every dollar gets spent" do not say that money is only paid after the campaign ends.

Problems and suggestions:
- HIGH: step 1 needs a signed-in brand but the wizard only asks for the wallet at the end. Connect the wallet first (or gate the page with a connect screen).
- HIGH: no end date question. Add "How long should it run?" and show the date on the summary (the deadline decides when closing, refunds and pool-share payout become possible).
- MEDIUM: summary shows machine words ("anyone", "youtube, x", "human split"). Show the title, plain wording, the fee, and net pool.
- MEDIUM: progress is lost on reload. Save drafts (a DRAFT campaign already exists server-side).
- MEDIUM: "Replace" and the local-file warning allow continuing with a file creators cannot get.
- LOW: remove the dead "Share the pool by what?" step. View target is unexplained.

---

### /desk/[id]/fund : "Fund the pool" (page title); heading changes with status
- Purpose: put the pool into escrow, then wait for an admin to sign the campaign.
- Who: the brand that owns the campaign (preview and funding routes check ownership: 403 "Not your campaign"). A not-connected visitor sees a connect box.
- Reachable from: wizard end; Desk "Fund {pool} USDC"; hire workspace does not use this page.

Layout (`FundView.tsx`):
1. Header. Kicker: link "Desk" and `No. {serial}`. Title by status: draft -> "Fund the pool"; funded -> "In escrow. Waiting on admin."; live -> "Signed. Live now."; rejected -> "Not approved. Pool returns.". Lead: draft "The pool goes into escrow before an admin looks at the campaign. It is refundable in full if the admin says no."; after funding "Creators can't see this campaign until an admin signs it. If it is rejected, the whole pool comes back to you."
2. Four-step list "Campaign status": "Fund" (detail "Move the pool into escrow" / "{pool} USDC in escrow"), "Admin review" ("Starts once the pool is in" / "In the queue. A person reads the brief." / "Rejected. The pool is refundable in full."), "Open to creators" ("Verified creators can join" / "Live now"), "Close" ("Unspent USDC returns to you"). Current step highlighted; once live the highlighted step is step 3 and "Close" is never reached.
3. Left column (not yet funded): "Pool" label with the big amount and "USDC"; connect box or buttons; messages. Funded: green strip "Transfer confirmed and verified" + `tx 0x...` (only right after funding in this visit), text, and buttons.
4. Right column "What this costs" ("The arithmetic"): "Pool" amount, "Gas" "paid in USDC", then the fee receipt, then a note.

Fee preview (receipt box):
- Title "Fee preview, funding". Lines: "Pool you send" = pool; "Platform fee, 0.25%" = minus pool x fee; "Net pool for creators" = pool minus fee. Footnote either "From the service, as the escrow will charge it." (signed-in brand: from GET /api/campaigns/{id}/fund) or "0.25% on the campaigner side, 0.25% on the creator side, as set on the escrow." (visitor: from GET /api/chain/config).
- If the service cannot say: "The fee schedule could not be read from the service, so no figure is shown. Reload to try again." Loading: "Reading the fee schedule".
- Extra notice "High-value pool." "Above ${threshold} net, so approval needs a fresh World ID check by an admin. Expect a longer review." Threshold default 1,000 USDC, tested on the NET pool.
- Side note: "The campaigner fee is taken by the escrow when you fund. Creators pay their own share when they claim. Unspent USDC returns at close." Contract detail: the fee is held back at funding but only goes to Clippo's treasury when the admin approves. A rejection refunds the full amount including the fee (`rejectCampaign`).
- Fee is on the pool you send (not added on top). Gas is extra and also paid in USDC, so the wallet needs a little more than the pool.

Wallet sequence when "Fund {pool} USDC" is pressed (`lib/chain/client.ts: fundCampaign`):
1. (Only if not signed in earlier) wallet account request and a sign-in message signature.
2. GET /api/campaigns/{id}/fund for exact arguments.
3. Wallet account request and, if the wallet is on another network, a request to switch to or add "Arc Testnet".
4. Read USDC allowance. If lower than the pool: wallet prompt 1 = USDC `approve(escrow, pool)`. Button text "Approve USDC in your wallet", help "Step 1 of 2: approve the escrow to take the pool in USDC. Gas is paid in USDC."
5. Wallet prompt 2 = `createCampaign(mode, ratePer1kViews, poolAmount, deadline, requireAdminApproval, metadataURI)` on the escrow. Button text "Confirm the deposit", help "Step 2 of 2: confirm the deposit into escrow." The escrow pulls the pool, keeps the fee aside, sets state Funded and marks it high-value if the net pool is above the threshold.
6. Wait for receipt. Button text "Verifying on-chain", help "The service is reading the receipt on-chain before it counts the funds." POST /api/campaigns/{id}/fund {txHash}: the server re-reads the chain (needs a `CampaignCreated` event from the escrow for this campaign, the owner's wallet, equal amount) and moves the campaign DRAFT -> FUNDED.
7. Page shows "Funded" state. Status becomes `pending_admin`.
If the allowance was already enough, only one prompt appears and the "Step 1 of 2" text never shows. Before the first prompt the button says "Waiting for signature" and help "Confirm in your wallet. Gas is paid in USDC." Default help text: "Funding is two wallet confirmations: allow USDC, then deposit the pool. The service verifies the receipt on-chain before the campaign counts as funded."

Controls table:

| Label | Kind | Where | What it does | Technical effect | Enabled when | Result | Clearer label |
|---|---|---|---|---|---|---|---|
| "Connect wallet" | button | notice "Connect the campaigner wallet that holds the USDC." | signs in as brand | wallet connect + sign-in | no session, or role is not campaigner | box replaced by fund buttons | "Connect brand wallet" |
| "Fund {pool} USDC" | button | left column | deposit, see sequence | wallet txs + POST /fund | not signing; escrow configured | success strip, or red box: what failed + "Nothing left your wallet. Check you have USDC on Arc and try again." + "Try again" | "Pay {pool} USDC into escrow" |
| "Change the answers" | link | beside fund button | goes to the wizard | /desk/new | before funding | blank wizard (does NOT edit this campaign; the draft stays on the Desk) | "Start over" |
| "Buy USDC with a card" | button | under fund button | opens card checkout (Transak) in a new tab for the pool amount | POST /api/onramp/session {campaignId, amount}; window.open(url) | not busy ("Opening checkout") | message "Opened the card checkout in a new tab. When the USDC lands in your wallet, come back and fund." Fail: "The card on-ramp is not configured on this deployment. Use the testnet faucet instead." (only on 404) or the service text | "Buy USDC with a card" (fine) |
| "Testnet USDC faucet" | link | same row | opens the Circle faucet in a new tab | external `FAUCET_URL` | always | new tab | (fine) |
| "Go to the desk" | link | funded state | back to dashboard | /desk | funded | Desk | (fine) |
| "See the wire" | link | funded state | public campaign list | /wire | funded | Wire | "See live campaigns" |
| "Desk" | link | header kicker | back to dashboard | /desk | always | Desk | (fine) |

States:
- Loading: "Opening escrow". Error: Correction with the service text and "Try again".
- Unconfigured escrow: warning "Escrow is not configured on this deployment." "The contract address is not set, so funding is switched off and nothing can be sent. An operator needs to set the escrow address." and the button is disabled.
- Signing: button text changes as above, disabled.
- Failed: red box (above).
- Waiting for admin: title "In escrow. Waiting on admin." and text "You will see the decision here and on your desk. Until then the pool, rate and payout rule are locked."
- Rejected: title "Not approved. Pool returns."; the admin's reason is not shown.
- Closed campaign: not handled; a closed campaign opens as if unfunded and shows the Fund button (the "funded" test only covers pending_admin, live, rejected).

Copy worth noting: "escrow", "Net pool for creators", "Gas", "on Arc", "Admin review" ("A person reads the brief."), "docket" steps. "refundable in full" under Rejected even though the refund already happened on-chain when the admin rejected.

Problems and suggestions:
- HIGH: if the deposit goes through but the server check (step 6) fails, the screen says "Nothing left your wallet" although the USDC is in escrow. Pressing "Try again" would send a second deposit (no recovery by tx hash). Add "check the last transaction" recovery and word the error by stage.
- HIGH: the screen never says that funding is only refunded automatically if an admin rejects, and that if nobody approves before the deadline the brand must call `reclaimUnapproved` (no button exists).
- MEDIUM: "Buy USDC with a card" buys exactly the pool amount, not pool + gas.
- MEDIUM: "Change the answers" creates a duplicate draft.
- MEDIUM: show approximate wait ("how long does admin review take") and the end date.
- LOW: two-step wording is wrong when an allowance already exists.

---

### /hire : "Hire creators" (page title) / heading "Creators for hire"
- Purpose: browse vetted creators with their own rate cards, collect a shortlist, share it, or write a brief for them. "Hiring" in this product = the brand picks named creators and pays each an agreed amount, instead of opening a public campaign.
- Who: anyone can browse (GET /api/creators needs no sign-in). Only a brand wallet can make a link or a brief.
- Reachable from: nav "Hire"; /hire/brief, list and share pages link back.
- Directory contains only creators who are listed, World ID verified, and have at least one verified channel (`lib/workspace/hires.ts:75`).

Layout (`workspace/Directory.tsx`):
- Header: kicker "Hire / Creator directory", title "Creators for hire", lead "Pick the people you want instead of opening a bounty. Rates are set by the creators, in USDC. Tiers come from approved clips and pass rate, never follower counts."
- Left rail "Filters and shortlist": filter form, then the tray "Clipped, N".
- Right: "Listings" with count `shown of total`; cards.

Filters: "Search" (handle, niche, bio word); "Tier" buttons Elite / Pro / Rising / New, each with a count and rule text: "Verified, no track record yet" (New), "3+ approved clips, 60%+ pass rate" (Rising), "10+ approved clips, 75%+ pass rate" (Pro), "25+ approved clips, 85%+ pass rate" (Elite); "Niche" select; "Platform" select (Any / YouTube / X / Instagram); "Cheapest rate, up to" (USDC, whole numbers). All filtering happens in the browser.

Card (an "ad"): "For hire", `No. {serial}`, name, tier mark, up to two niches, platform icons, bio, rate lines (`label` and `$price`), facts "N approved clips", "X% pass" or "no clips judged yet", "World ID verified". "pass" = share of the creator's clips that were approved. Footnote "USDC, set by the creator".

Tray: "Clipped, N" and, when N > 0, a dollar figure = sum of each picked creator's cheapest line. Each row has "Drop". Buttons: "Write the brief" (link) and the share form. Tray is stored in this browser (`localStorage` key `clippo-ws-sel`); it is not an account feature.

Controls table:

| Label | Kind | Where | What it does | Technical effect | Enabled when | Result | Clearer label |
|---|---|---|---|---|---|---|---|
| "Filters" / "Hide filters" | button | rail (shows on narrow screens) | shows/hides the form | none | always | form toggles | (fine) |
| Search box | input | filters | filters list | none | always | list shrinks | (fine) |
| Tier buttons | toggle | filters | one tier only (exact match; click again to clear) | none | always | list shrinks | (fine) |
| Niche / Platform | select | filters | filter | none | always | list shrinks | (fine) |
| "Cheapest rate, up to" | input | filters | keeps creators whose cheapest line is at or under the number | none | always | list shrinks | "Max price per deliverable" |
| "Clear filters" | link-button | filters and empty state | resets filters | none | always | full list | (fine) |
| "Clip this ad" / "Clipped" | toggle | card | add/remove from tray | local storage only | always | tray count changes | "Add to shortlist" / "Shortlisted" |
| "Drop" | button | tray | remove | local storage | always | row leaves | "Remove" |
| "Write the brief" | link | tray | goes to /hire/brief | none | tray not empty | brief page | "Write the brief for these creators" |
| "List name" | input | share form | name of the public list (max 60, default "Shortlist") | none | always | | |
| "Make shareable link" | button | share form | creates a public read-only list | POST /api/shortlists {title, creatorIds} (brand only, otherwise 401/403 text) | not busy ("Setting type") | box "Public link, read only" with the address, "Copy link" ("Copied") and "Open". Fail: "The list link was not made." + reason + "Try again" | "Create share link" |

States: loading "Setting the classifieds"; error "The directory did not load."; empty "No listing matches those filters." ("Loosen the rate cap or the tier. The directory lists only World ID verified creators with a proven channel."); tray empty text "Nothing clipped yet. Use "Clip this ad" on a listing to start a shortlist."

Copy worth noting: "Clip this ad", "Clipped", "Drop", "classifieds", "bounty", "listing", "ad" — "clip" already means a creator's video elsewhere in the product. "Tier" words: Elite, Pro, Rising, New.

Problems and suggestions:
- MEDIUM: "Clip" has two meanings (video vs shortlist). Use "Shortlist".
- MEDIUM: tier filter is "exact tier" here; the API supports "minimum tier". Say "Elite only" or allow "Pro and above".
- LOW: no sorting control in the UI (API supports tier, rate, clips).
- LOW: tray only in this browser.

---

### /hire/brief : "Write the brief" (page title and heading)
- Purpose: write one brief for the shortlisted creators, choose a rate line and quantity per creator, set a budget cap, and create the hire workspace.
- Who: brand wallet to send. Anyone can open it; others see "Briefs are sent from a campaigner wallet."
- Reachable from: Directory "Write the brief"; shortlist page "Brief these creators"; empty state links back.

Layout (`workspace/BriefBuilder.tsx`): header kicker "Hire / Brief / N creators", title "Write the brief", lead "One brief goes to every creator on the list. Each one gets their own rate, and nothing is charged until you approve and fund." Then three sections:
- "I The job": "Campaign name", "Brand", "Objective" (tickets A "Awareness": "Name the product, say what it does, link the page. Counted in verified views."; B "Product demo": "Show the product working on a real task, start to finish, on screen."; C "Launch announcement": "One dated announcement with the offer. Posts inside the launch window."), "What the clip is about" (hint "Plain sentences. The agent that checks each clip reads exactly this.").
- "II The rules": "Every clip must say" (lines, "Add a line", "Strike"), "No clip may say", "Disclosure label" (hint "Required wording, and where it has to appear."), "Delivery date", "Budget cap, USDC" (hint "You cannot approve more than this in total.").
- "III The offers": text "Rates are the creators' own. You pick a line from each card and a quantity. You cannot haggle the price down here." Per creator: "Rate line, set by the creator" (select `label, $price`), "Quantity" (shows `= $amount`). Then "Offered, all creators" total and a sentence: under cap "$X of the $Y cap is unspoken for."; over cap "Offers add up to $X more than your $Y cap. You can still send them. You will not be able to approve all of them."
- Buttons: "Send to N creators" (or "Setting type" while busy); not-brand: notice + "Connect campaigner wallet"; link "Back to the directory".

Validation messages: "Name the campaign. Creators see this first." / "Say who is paying." / "Write at least a couple of sentences: what the product is and what the clip must show." (30 chars) / "List at least one thing every clip has to say." / "Pick a delivery date." / "That date has passed." / "Set a budget cap above zero." / "Every creator needs a quantity of at least 1." A red box "N things need fixing before the brief can go out." lists them.

What "Send to N creators" really does (`api.ts` `ws.createWorkspace`): POST /api/briefs {title, story, deliverables [objective title], deadline}; POST /api/hires {title, briefId}; POST /api/hires/{id}/creators for each creator {creatorId, rateLabel, quantity}; the cap is saved only in this browser (`localStorage clippo-ws-cap-{id}`, the API has no cap field); then go to /hire/w/{id}. Nothing is sent to creators: no notification is created (no notify call in the hire code), and the code gives creators no screen listing their hires. Amount = creator's price x quantity from the creator's own rate card. The brief's platforms are not sent, so the API default (YouTube only) applies to the later campaign.

Controls table: besides the buttons above, "Strike" removes a line (only when more than one), "Add a line" adds one. State: loading "Pulling your clipped list"; empty "Nobody is clipped yet." with "Open the directory"; save failure "The brief was not saved." + reason + retry.

Problems:
- HIGH: label "Send to N creators" implies creators are notified. They are not. Use "Create the hire workspace".
- MEDIUM: the quantity box removes the letter "D" instead of non-digits (`BriefBuilder.tsx:218` `replace(/D/g,"")`); letters are accepted and then fail validation.
- MEDIUM: the cap lives in one browser only, so other devices and the shared view show no cap.
- LOW: "Delivery date" is stored but not enforced by anything seen in the code.

---

### /hire/lists/[token] : "Shortlist" (page title); heading = list name
- Purpose: a public read-only list someone shared. Not an account page.
- Who: anyone with the link (GET /api/shortlists/shared/{token}). No sign-in.
- Reachable from: link made by "Make shareable link".
- Layout: kicker "Hire / Shortlist / Read only" (Hire is a link); title = list name; lead "{N} creators picked from the directory. Rates are the creators' own, in USDC."; cards (same as directory, no clip button); right rail "The arithmetic": "Creators" N, "One cheapest line each" $sum; text "Nothing is held or charged by opening this list. Hiring starts with a written brief and per-creator approval, then one funding step."; button "Brief these creators".
- Controls: "Brief these creators" = replaces your local tray with this list and goes to /hire/brief (no API). "Browse the directory" link on the not-found state. "Hire" link in kicker.
- States: loading "Pulling the list"; not found "No list at this address." ("The link may be cut short or the list was withdrawn. Ask whoever sent it for a fresh one."); empty list "This list is empty." ("Every creator on it has since left the directory."); error "The list did not load."
- Notes: "withdrawn" is mentioned but there is no control to withdraw a list. Creators removed from the directory silently drop out.

---

### /hire/share/[token] : "Shared campaign view" (page title); heading = workspace title
- Purpose: a public read-only copy of a hire workspace for the brand and the creators on it.
- Who: anyone with the link (GET /api/hires/shared/{token}); no sign-in, no wallet.
- Reachable from: the "Shared view" link in the workspace (after the brief is sent).
- Layout (`SharedView.tsx`): kicker "Shared view / No. {serial} / Funded|Draft"; title; lead "{brand} is hiring N creators. Everyone on the campaign sees the same page."; note "Read only. Nothing here can be changed from this link. Funds move only after the campaigner approves and funds." (after funding: "Payment is released per creator once the clip passes verification."); section "Offers" (table "Offers and approvals, USDC": "Creator", "Rate line", "Amount", "Decision" as stamp "Awaiting"/"Approved"/"Passed", "Running total"; footer "Approved total"); section "Tracking"; right rail: "Approved so far" or "In escrow", amount, "of ${cap} cap" (only if this browser knows it), tick bar, and "The brief".
- Controls: none except "Go to Hire" on the not-found state.
- States: loading "Pulling the shared copy"; not found "Nothing at this address." ("The link may be cut short, or the campaigner has withdrawn it. Ask them for a new one."); error "The shared view did not load."
- Notes: every creator's price and decision is visible to everyone who has the link (including other creators). The token cannot be revoked in the UI. "Funded" is shown as soon as the funding step starts, before the admin approves.

---

### /hire/w/[id] : "Creator workspace" (page title); heading = campaign name
- Purpose: the brand's control room for a hire: approve or pass each creator, watch the budget, fund everyone with one deposit, track progress.
- Who: the brand that owns it or an admin; a creator who is on it can read (no token). Others: 403 shown as the error.
- Reachable from: "Send to N creators" on the brief page. No list of past workspaces exists in the UI (API GET /api/hires exists), so the link is the only way back.

Layout (`workspace/WorkspaceView.tsx`, `panels.tsx`):
- Header: kicker "Hire / No. {serial} / Funded|Draft". Lead: draft "{N} offers out. Approve each creator, watch the total, then fund everyone in one step."; funded "{total} USDC is in escrow for N creators. Each is paid only after their clip passes verification."
- Tab buttons: "Approvals", "Tracking", "Brief" (opens "Tracking" by default once funded).
- "Approvals" tab: table "Offers and approvals, USDC": "Creator" (name + tier), "Rate line" (`label × qty`), "Amount", "Decision", "Running total" (sum of approved so far), footer "Approved total". Draft: each row has two toggle buttons "Approve" and "Pass"; pressing the active one again goes back to "Awaiting". Under it: "{n} still awaiting your decision. Pass is not final until you fund, so you can change your mind."
- "Tracking" tab: before funding Empty "Tracking starts when the work is funded." After: per approved creator a row with name, `rate × qty`, a four-step track "Funded / Posted / Verified / Paid", the amount, and either "Waiting on the clip" or "{N} verified views", "{a} of {b} clips approved", link "Open the clip". "Nobody was approved." if none.
- "Brief" tab: brand and objective, summary, "Every clip must say", "No clip may say", "Disclosure", "Deliver by", "Budget cap". Empty "No brief attached."
- Right rail "Budget and funding": "Approved so far" (or "In escrow") dollars, "of ${cap} cap", tick bar, rows "Creators approved: N of M", "Headroom", "Fee, 0.25%" (total x fee; it is not subtracted from the total shown), over-cap note "Over the cap by $X."; funding area; share box.

Creator states (`ui-mocks/workspace.ts`):
- Decision: PROPOSED shown as "Awaiting" (creator was added, brand has not decided); APPROVED "Approved" (brand wants to hire and pay this creator; only these are funded and allowed to submit clips); REJECTED "Passed" (brand declined).
- Stage (tracking): "Not funded" (not approved or hire not funded) -> "Funded" (money in escrow, no clip yet) -> "Posted" (a clip was submitted) -> "Verified" (at least one clip approved by the AI/human) -> "Paid" (a payout has been credited; not necessarily claimed).

Controls table:

| Label | Kind | Where | What it does | Technical effect | Enabled when | Result | Clearer label |
|---|---|---|---|---|---|---|---|
| "Approvals" / "Tracking" / "Brief" | toggle | tab row | switches view | none | always | | (fine) |
| "Approve" | toggle | Approvals row | marks creator approved (again = back to awaiting) | PATCH /api/hires/{id}/creators/{creatorId} {status} (brand owner or admin; hire must still be open). Screen updates first and rolls back on error | hire not funded | total updates. Fail: "That decision was not saved." + reason | "Hire this creator" |
| "Pass" | toggle | Approvals row | marks creator passed | same | same | same | "Decline this creator" |
| "Connect wallet" | button | rail | signs in as brand | wallet connect + sign-in | not a brand session | funding button appears | "Connect brand wallet" |
| "Fund all, ${total}" | button | rail | one deposit for every approved creator | 1) POST /api/hires/{id}/fund creates ONE draft "Human-approved split" campaign with approver "Only me", pool = sum of approved amounts, source "link" (no URL), eligibility anyone verified; the hire flips to funding. 2) the same wallet sequence as the fund page (`approve` USDC if needed, then `createCampaign`). 3) POST /api/campaigns/{id}/fund {txHash}. 4) reload the workspace | at least one approved, total not over the cap, not already signing | tab goes to "Tracking", shows `tx 0x...`. Button texts "Approve USDC in your wallet" / "Confirm the deposit" / "Verifying on-chain" / "Working". Fail: red box + "Nothing left your wallet. Check you have USDC on Arc and try again." + "Try again" | "Pay all approved creators" |
| "Copy link" / "Open" | button/link | rail share box | copy or open `/hire/share/{token}` | clipboard | token exists | "Copied" | (fine) |

Blocker text under the button: "Approve at least one creator to fund." or "Approved total is $X over the cap. Pass on someone or raise the cap in a new brief."; otherwise "One deposit to the escrow covers every approved creator. Unspent USDC returns at close. The service verifies the receipt on-chain before the hire counts as funded."

States: loading "Opening the workspace"; not found "No workspace under that number." ("It may have been removed, or the link is wrong. Workspaces belong to the campaigner account that wrote the brief; use its shared link if you were invited."); error "The workspace did not load."; waiting for wallet = button texts; funded = tab Tracking.

What happens after funding (code path): the new campaign is FUNDED and sits in the admin Bench under "Campaigns to sign". Only after an admin approves can creators submit clips (only hired creators can: "This campaign is limited to creators the campaigner hired."). The brand then pays out from the Desk with the "Human-approved split" buttons.

Problems and suggestions:
- HIGH: the agreed per-creator amounts are not wired to payment. The Desk offers only "Ask the AI", formula by clip count, or "Build it myself" (clip-count formula). The API route `GET /api/hires/{id}/split-preset` that would give the agreed amounts is not called by any screen. Also the preset amounts equal the gross pool, while a split may only spend the pool minus the brand fee. The text "Each is paid only after their clip passes verification" is not guaranteed as shown.
- HIGH: workspace shows "Funded" / "In escrow" as soon as the deposit is made, before an admin signs; if the admin rejects, the workspace is not updated by anything seen in the code.
- MEDIUM: approve/pass controls render for every viewer; a creator who clicks gets "not saved".
- MEDIUM: "Fee, 0.25%" is shown as an extra number, but the fee is taken out of the pool, so the real creator pool is lower than the approved total.
- MEDIUM: no way to find the workspace again except the URL.
- LOW: the budget cap is browser-only.
- Whether hire campaigns are hidden from the public Wire: not determined.

---

### /bench : "The Bench" (page title) / heading "Read it, then decide"
- Purpose: the admin's work queue: sign campaigns, decide flagged clips and appeals, approve two-party splits, settle on-chain disputes, handle suspicious view growth.
- Who: admin wallet only (the server checks an allow-list, and on-chain actions also need the wallet to be an admin on the escrow). Others see a warning.
- Reachable from: nav "Bench" (shown to every role).

Layout (`BenchView.tsx`):
- Header: kicker "The Bench / Admin", title "Read it, then decide", lead "The assistant ranks the queue and summarises each dispute. It recommends. A person signs."
- Warning when signed in as a non-admin: "You are viewing as {role}." "The queue only loads for an admin wallet. Admin rights come from the operator's allow-list: connect an allow-listed wallet."
- Tab row "Queue sections": "All", "Campaigns to sign", "Flagged clips", "Appeals", "Splits to approve", "View patterns", "Dispute summaries", "Suspicious growth". No counts.
- Body per tab. Tabs All / Campaigns / Flagged / Appeals / View patterns share one list.

Queue items (data from GET /api/admin/queue). Each row: a big number "Priority N", a dark tag, a small "by" label, optional "$X USDC", a title, a note with a label, buttons. "Priority" is just the order of the list (campaigns, then appeals, then flagged clips, then patterns), not a score. Finished rows stay and show the button label as text.

| Item type | Tag | Title | Note label and text | Buttons | What each does |
|---|---|---|---|---|---|
| Campaign | "Campaign" or "High-value campaign" | "{title}, {pool} USDC pool" (+ " (high value)") | "Brief summary": the story summary | "Approve", "Reject and refund" | see below |
| Flagged clip | "Flagged clip" | "Flagged: {clip title}" | "Agent note": AI reason + " Flags: ..." | "Clear", "Reject clip" | POST /api/submissions/{id}/verdict APPROVE ("Cleared by admin after review.") / REJECT ("Rejected by admin after review."). Which clips appear: AI "needs human" clips where the campaign chose "Me and an admin", or the clip was unreadable (X/Instagram), or an open fraud flag exists. |
| Appeal | "Appeal" | "Appeal: {clip title}" | "Agent reason": the AI's reason (the creator's note is not shown here, only on "Dispute summaries") | "Overturn", "Uphold" | verdict APPROVE ("Appeal overturned by admin.") / REJECT ("Appeal upheld by admin: original verdict stands."). |
| View pattern | "View pattern" or "Deleted clip" | "Unusual view growth" or "Clip deleted or made private" | "Detector": numbers ("Daily growth of N views against a threshold of M (x baseline). Views stay held until you decide.") or "Video {id} is no longer readable. The creator's unclaimed payouts in this campaign are frozen until you decide." | "Release hold", "Keep hold" | PATCH /api/admin/flags/{id} DISMISS (false alarm: restores the clip, unfreezes payouts, releases the view hold) / CONFIRM (fraud: stays excluded and frozen). The row does not say which campaign or clip. |

Campaign row buttons:
- "Approve" (normal pool): wallet tx `approveCampaign(onchainId)` on the escrow (admin only; state Funded -> Approved; the withheld fee moves to Clippo's treasury; reverts if the deadline has passed), then POST /api/campaigns/{id}/approve {txHash}. Result text "Approve". If the escrow is not configured it only calls the API (which returns "not configured").
- "Approve" (high-value pool): opens a World ID pop-up (IDKit, action `clippo-approve-campaign`, text "Confirm you approve this high-value campaign"). On success: POST /api/campaigns/{id}/attest {worldIdProof} returns a signed proof; wallet tx `approveCampaign(onchainId, proof)` (the contract checks and records it); POST approve. Result "Approved and live". Fail text from the World ID layer, e.g. "You cancelled the check. Nothing was changed."
- "Reject and refund": first click only opens the box "Reason for the campaigner" (placeholder "What has to change before this can go live?", hint "The pool is refunded in full on-chain. Your wallet signs the refund first."). Second click on the same button needs at least 5 characters ("Give the campaigner a reason, at least a few words.") then wallet tx `rejectCampaign(onchainId)` (full refund to the brand, fee included; the admin cannot receive it) and POST /api/campaigns/{id}/reject {reason, txHash}. There is no cancel button for the reason box. The brand cannot see this reason (see /desk).
- Not shown in the queue: the brand's source video, the AI-video launch status, the campaign end date, creator rules.
- AI-generated source gate: the app refuses to mark such a campaign live unless the video finished, rights were confirmed and the brand approved it (`lib/source.ts`). That check runs after the on-chain approval, so an admin can approve on-chain and then see a 409 error (`SOURCE_NOT_READY`, `RIGHTS_NOT_CONFIRMED`, `SOURCE_NOT_APPROVED`); the on-chain approval cannot be undone and the app keeps the campaign off the Wire and flags it for review.

Tab "Splits to approve" (`AdminSplits.tsx`):
- Lists live "Human-approved split" campaigns whose approver is "Me and an admin": title and `Pool X USDC · two-party split`, and a result line after acting ("Finalized" / "Both approved, awaiting chain confirmation" / "Recorded. Still awaiting ...").
- Button "Review the agent's split (admin)" ("Loading the proposal" while busy): loads the campaign's Agent Pass activity (GET /api/campaigns/{id}/agent) and picks an open AI proposal that has not expired. If none: "Nothing to approve. The agent has no open proposal for this campaign (none yet, or it expired). Ask the campaigner to request a fresh one."
- When found: per-creator list (wallet, amount, reason, "Written by the AI (advisory, re-checked by software) · model confidence N%" or "Non-AI option: pro rata to approved clips") and the box "Agent Pass gate: World ID step-up (admin)" with "Approve with World ID step-up" and "Cancel". Same redirect flow as on the Desk; the admin then sends the wallet tx `approveSplit` from the admin wallet. The identical split must have been approved by the brand; the two approvers must be different humans (`SameHuman`).
- Below: text "The agent only proposes. Your World ID check is bound to the exact split hash; if the split changed, expired, or the check is cancelled, expired or fails, nothing is approved, no payout occurs, and it is logged below." and the "Agent Pass activity (all campaigns)" log (GET /api/admin/agent-pass): agents, "Proposed by the agent" list, "Audit log" with tags ("Agent delegated", "Agent proposed", "Human approved", "Refused, nothing changed", step-up outcomes) and who/when/proof state.
- Empty: "No splits waiting." "Two-party splits appear here once the campaigner has an approved clip to pay."

Tab "Dispute summaries": two parts.
1. "On-chain disputes" (admin view, label "Refunds go to the brand, never to an admin"): rows of open disputes only (`title`, wallet, amount, "open until {date}"). Buttons "Uphold" (wallet tx `resolveDispute(id, creator, true)`: the disputed credits are removed from the creator, returned to the pool or, if the campaign is closed, paid straight to the brand; notice "Dispute upheld. The credits left the creator's balance.") and "Deny" (`resolveDispute(..., false)`: "Dispute denied. The credits release on schedule."). Then POST /api/chain/report. Empty "No open disputes." (small text). Errors "Nothing changed. {first line}".
2. "Dispute summaries" proper (`AdminAssistant.tsx`, GET /api/assistant/admin/disputes, up to 100): rows with tag "Appeal" or "Flagged", creator, title, two quotes "Agent verdict" and "Creator says", "Assistant summary", "Ranked N: {why}" (why = open appeal / views at stake / waiting hours / outcome unclear; score from views, age, open appeal +20, unclear +10), a label "Overturn" (green) / "Uphold" (red) / "Needs your eyes" (recommendation, advice only), "CONF 0.xx", and buttons "Overturn" and "Uphold" (the recommended one is filled). Buttons call the same verdict route as the queue (APPROVE with "Appeal overturned by admin after reading the dispute summary." / REJECT with "Rejection upheld by admin after reading the dispute summary."). Done text "Overturned" / "Upheld". Empty "No open disputes." ("Appeals and flagged clips will be summarised here."). This list contains every AI "needs human" clip and every pending appeal, not only those in the "Flagged clips" tab.

Tab "Suspicious growth" (GET /api/assistant/admin/growth): rows with tag "View pattern", creator and link, campaign title, a bar chart of views added per day (hot days tinted), "day 1" ... "day N", "dashed: typical X a day · peak Y (Nx)", and "Assistant reading". Label "Payout on hold" or "Not held". Button "Hold payout" / "Release hold": POST /api/assistant/admin/growth/{id}/hold {held}. A hold creates a view-anomaly flag; views after the flagged day stop being reported for that clip; "Release hold" dismisses open flags. Empty "Nothing unusual." ("No clip is growing faster than comparable clips.").

Controls table (tabs and shared):

| Label | Kind | Where | What it does | Technical effect | Enabled when | Result | Clearer label |
|---|---|---|---|---|---|---|---|
| Eight tab buttons | tab | tab row | switch section | none | always | | add counts |
| "Connect admin wallet" | button | queue error | sign in as admin | wallet connect + sign-in (admin if allow-listed) | role not admin | queue reloads | (fine) |
| "Approve", "Reject and refund", "Clear", "Reject clip", "Overturn", "Uphold", "Release hold", "Keep hold" | button | queue rows | see tables above | see tables above | row not busy / not done | result text shows the label | "Approve campaign", "Reject campaign and refund", "Approve clip", "Reject clip", "Reverse the rejection", "Keep the rejection", "Release payout hold", "Confirm fraud" |
| "Review the agent's split (admin)" | button | Splits tab | see above | GET /campaigns/{id}/agent | not loading | gate box or error | "Review and approve split" |
| "Approve with World ID step-up", "Cancel" | button | gate box | see Desk | stepup/start | | | |
| "Uphold" / "Deny" | button | on-chain disputes | see above | `resolveDispute` | not busy | notices above | "Take credits back" / "Let credits release" |
| "Hold payout" / "Release hold" | button | growth | see above | POST hold | always | label flips | (fine) |

States: loading "Ranking the queue", "Finding splits waiting on you", "Summarising disputes", "Comparing growth curves", "Reading the agent log"; empty "Clear desk." "Nothing waiting in this section."; error Correction with the service text, plus "The bench needs an admin wallet."; success = text replaces the buttons; waiting for wallet = row buttons disabled while busy (no text).

Copy worth noting:
- Title "The Bench", "Clear desk.", "Priority N", "Splits to approve", "View patterns", "Suspicious growth", "Dispute summaries" (and "On-chain disputes" inside it).
- Lead says "The assistant ranks the queue"; only the dispute tab is ranked by the assistant. The main queue just lists in a fixed order.
- "Overturn" / "Uphold" are used both for clip appeals and for on-chain credit disputes, with opposite meanings for the person being paid. On a "Flagged" clip, "Overturn" means "approve".
- "Release hold" / "Keep hold" (View patterns tab) and "Hold payout" / "Release hold" (Suspicious growth tab) describe the same kind of hold with different buttons.
- "Agent Pass", "step-up", "Orb-class", "split hash".

Problems and suggestions:
- HIGH: appeals that the brand has not yet decided (and that are not overdue) appear in the queue, but the server refuses the admin until the appeal is escalated or 72 hours (`APPEAL_SLA_HOURS`) have passed ("The campaigner reviews first; an admin can step in after ..."). Show stage, owner and due date and hide buttons until the admin may act (`lib/appeals.ts`).
- HIGH: after the World ID redirect, /bench opens on "All", where the return panel is not mounted. The approval only completes once the admin opens "Splits to approve" (the attempt is valid 5 minutes). Mount the return panel at the top of the page.
- HIGH: the two-party split path only works for AI proposals (the admin cannot find a split the brand built with "Build it myself (1 of 2)"), and AI proposals expire after 30 minutes. Allow the admin to review the brand's pending split (the API `GET /api/admin/split-proposals` exists but is unused).
- HIGH: a high-value or AI-source campaign can be approved on-chain and then fail the app-side check; show the source/launch status in the row and check it before the wallet transaction.
- MEDIUM: queue rows do not show the creator's appeal text, the campaign, the clip link, or the source video; "Priority N" is not a real ranking.
- MEDIUM: the same flag appears in "View patterns" and "Suspicious growth" with different wording.
- MEDIUM: no counts on tabs; no way to see finished work.
- MEDIUM: nav shows Bench to non-admins.
- LOW: "Reject and refund" reason box has no cancel; the reason is never shown to the brand.

---

### Deal panel (used on /slips/[id], brand side) : "Rate deal"
Not a route but a brand control. Shown on a live "Per verified view" campaign page to a signed-in brand or creator (hidden for admins, hidden when no wallet).
- Heading "Rate deal", label `Listed ${rate} per 1K`, text "The negotiator trades offers inside the band the campaigner set. Anything outside goes to a person. Money moves only when both sides accept."
- Shows status ("Proposed", "Countered", "Agreed", "Declined", "Expired"), "Pool left $X USDC", the band "Allowed band, USDC per 1K views" with "floor", "ceiling" and hatched "negotiator accepts alone, up to $X", the list of offers (Creator / Campaigner / Negotiator, note, time, rate), and "Creator accepted / has not accepted" with "Signed"/"Open" for each side.
- Brand controls: "Accept ${rate}" (POST /api/campaigns/{id}/deal/accept) when the last offer came from the creator side and you have not accepted; "Decline" (POST .../deal/decline). Text for the brand: "Campaigners answer offers here. Counter-offers and standing limits need a named creator, which this panel does not select yet." Brands cannot make offers or set the band in the UI (API `POST /deal/limits` and `GET /deals` are unused), so the default band is plus/minus 50% of the listed rate and the auto-accept limit stays off.
- Result text after both accept: "Both sides accepted ${rate} per 1K views. This rate applies to this creator's approved clips from now on."
- Problem (HIGH): the contract pays every creator the campaign's single rate (`reportViews` uses `c.ratePer1kViews`), and the accepted rate is only stored (`acceptedRate`), not read by any payout code found. The claim "This rate applies ... from now on" is not backed by the code read. Time stamps in offers show raw ISO text because `niceDeal` uses a broken pattern (`api.ts:~873`).

---

## Brand and admin journeys

1. Create and fund a campaign (brand)
   1. Connect a wallet (nav "Connect wallet"); pick "I pay for clips: campaigner" if asked.
   2. Nav "Desk" -> button "New campaign" (or /desk/new).
   3. Q1 "What are you promoting?" type 12+ characters -> "Write the brief".
   4. Q2 "Here is the story. Edit anything." edit fields -> "Next".
   5. Q3 "What content should creators use?" pick A "Upload a clip", B "Link a video" or C "Generate one", finish its part (for C: tick the rights box, "Generate video", wait, "Approve for launch") -> "Next".
   6. Q4 "Where should clips be posted?" tick platforms -> "Next".
   7. Q5 "How should creators be paid?" pick "Per view", "I approve the split" or "Share the whole pool" -> "Next". If "I approve the split": "Who approves the split?" pick "Only me" or "Me and an admin" -> "Next".
   8. Q6 "How big is the pool?" pick "Starter / Standard / Large" or type Pool (and Rate, View target) -> "Next".
   9. Q7 "Who can join?" pick "Anyone verified" or "Higher-ranked only" -> "Next".
   10. Q8 "Check it, then fund it." -> "Create and go to funding" (wallet asks to sign in if needed).
   11. On "Fund the pool" read the fee box. If you need USDC: "Buy USDC with a card" or "Testnet USDC faucet".
   12. Press "Fund {pool} USDC". Wallet: switch to Arc Testnet if asked; confirm the USDC approval ("Approve USDC in your wallet"); confirm the deposit ("Confirm the deposit"). Wait for "Verifying on-chain".
   13. Page title becomes "In escrow. Waiting on admin." Press "Go to the desk". Row status reads "pending admin".

2. Approve it as admin
   1. Connect an admin wallet (button "Connect admin wallet" if the queue shows an error). Nav "Bench".
   2. Open tab "Campaigns to sign". Read the row ("Brief summary").
   3. Normal pool: press "Approve", confirm the wallet transaction (`approveCampaign`). Row text becomes "Approve". High-value pool (net above 1,000 USDC): press "Approve", complete the World ID pop-up, then confirm the wallet transaction; row text "Approved and live".
   4. To refuse: press "Reject and refund", type a reason (5+ characters), press "Reject and refund" again, confirm the wallet transaction. The pool goes back to the brand in full.
   5. Brand's Desk row changes to "live" (or "rejected"; the reason is not displayed).

3. Review a clip the AI was unsure about
   - Brand: Desk -> section "Waiting on your call" -> read "Agent note" and open the clip title link -> "Approve" or "Reject".
   - Admin (only when the campaign chose "Me and an admin", the clip was unreadable, or a fraud flag is open): Bench -> tab "Flagged clips" -> "Clear" or "Reject clip".
   - Creator appeal afterwards: Bench -> tab "Appeals" (or "Dispute summaries") -> "Overturn" or "Uphold". Works only after escalation or 72 hours; before that the row shows an error.

4. Release a human split (campaign with "I approve the split")
   - Needs at least one approved clip and creators with a World ID.
   - Brand, AI route: Desk -> row -> "Ask the AI to propose" (or "Propose without AI (pro rata by clips)") -> read the green strip and the section "Agent Pass activity: {title}" -> "Approve agent's split" (or "... (1 of 2)") -> "Approve with World ID step-up" -> finish World ID -> back on /desk the strip reports the result; confirm the wallet transaction `approveSplit`.
   - Brand, own route: Desk -> row -> "Build it myself" -> complete the World ID pop-up -> confirm the wallet transaction.
   - If the campaign is "Me and an admin": within 30 minutes of an AI proposal, the admin goes to Bench -> "Splits to approve" -> "Review the agent's split (admin)" -> "Approve with World ID step-up" -> after returning, open "Splits to approve" again so the return panel runs -> confirm the wallet transaction. Status moves to "Awaiting chain confirmation", then credits appear for creators.
   - Creators then claim on their own Ledger screen (not in this document).

5. Close a campaign and reclaim funds
   1. Wait until the campaign deadline plus one day (default 30 days + 1 day after funding; not shown anywhere).
   2. Desk -> row -> "Close and reclaim ${...}" -> confirm the wallet transaction `closeCampaign`.
   3. Row shows "Closed · 0x...". Unspent pool (net pool minus allocated) returns to the brand wallet; creators keep what was credited. For "Share the whole pool", the escrow first splits the whole pool by views, then returns only rounding dust.
   4. Before the deadline the wallet transaction fails (`DeadlineNotReached`); the exact text shown is not determined.
   5. If the admin never signed the campaign: there is no button; the contract function `reclaimUnapproved` exists but the UI does not call it.

6. Dispute credits (brand, "Per verified view" campaigns)
   1. Desk -> section "On-chain disputes" -> find the row (`... · releases {date}`).
   2. Press "Dispute" -> confirm the wallet transaction `disputeCredits`. Notice "Dispute opened on-chain. These credits can't be claimed until it's settled." Row shows "Under dispute".
   3. Admin: Bench -> tab "Dispute summaries" -> top block "On-chain disputes" -> "Uphold" (credits go back to the pool or to the brand) or "Deny" (credits release on schedule) -> confirm the wallet transaction `resolveDispute`.
   4. If no admin acts within 7 days of the dispute, the credits release on their normal schedule.

7. Hire named creators (brand)
   1. Nav "Hire" -> use filters -> "Clip this ad" on each creator.
   2. Optional: "List name" -> "Make shareable link" -> "Copy link" and send it.
   3. "Write the brief" -> fill "I The job", "II The rules", "III The offers" -> "Send to N creators".
   4. On /hire/w/{id}: for each creator press "Approve" or "Pass".
   5. Press "Fund all, ${total}" -> wallet steps as in journey 1, step 12.
   6. Admin approves the resulting campaign (journey 2). Creators on the list can then submit clips. Brand pays out from the Desk (journey 4).
   7. Share "Shared view" link with the team.
