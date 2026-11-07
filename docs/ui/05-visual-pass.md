# E. Visual pass (rendered screens, first-time visitor view)

How this was captured: branch `docs/ui-guide` (main bb2fbec), `NEXT_PUBLIC_DEMO=1`, dev server on port 3310, every `**/api/**` request aborted so the built-in sample data renders. Chromium via playwright-core. Three viewports per theme: Paper (light) 1280x900, Night (dark) 1280x900, phone 390x844 (full page). Phone Night shots exist for every route (`*_phone_night.png`) but I only read the desktop Night shots of /, /wire, /ledger and /desk closely; Night findings for other routes are inferred from the shared theme and are not individually verified.

Screenshot folder: `docs/ui/shots/` (only the desktop Paper view of each screen is kept in the repo; phone and Night captures were left out to keep the repo small)
File pattern per route `<slug>`: `<slug>_paper.png`, `<slug>_night.png`, `<slug>_phone_paper.png`, `<slug>_phone_night.png`.
Slugs: `home` (/), `wire`, `slips` (/slips/c-ledgerlane), `join`, `account`, `ledger`, `desk`, `desknew` (/desk/new), `deskfund` (/desk/c-ledgerlane/fund), `hire`, `hirebrief`, `bench`, `profile`, `referrals`, `status`, `notfound`.

IMPORTANT finding about three routes: in plain demo mode `/profile`, `/referrals` and `/status` all render the **404 page ("Not on file")**, not their own screen. Their `profile_*`, `referrals_*`, `status_*` shots are therefore identical to `notfound_*`. The cause is that these three are optional server modules that are OFF by default; with the API blocked they resolve to "module off" and call `notFound()`. To see the real screens I made extra shots with my OWN stubbed API answers (not app sample data): `mod_<name>_anon_paper.png`, `mod_<name>_signed_paper.png`, `mod_<name>_signed_night.png`, `mod_<name>_signed_phone_paper.png` where name is `status`, `referrals`, `profile`. Treat those as "what it looks like when the module is on". Also `menu_phone_open_paper.png` (phone menu open).

Extra capture notes: the landing page uses scroll-driven fade-in, so I shot `/` with reduced motion on (otherwise lower sections are blank in a full-page shot). The Next.js dev badge was hidden. All 64 required shots rendered with HTTP 200 (404 for the missing route). No console errors.

Shared chrome (appears on every page, described once):
- Top black strip: "SAT NOV 07 2026" on the left; "ARC TESTNET · USDC · DEMO BUILD, SAMPLE DATA" on the right. On phone it is cut: "ARC TESTNET · USDC · DEMO BUILD, SAM…".
- Header: wordmark "Clippo" with a small scissors mark, grey mono caption "CLIPPING BUREAU". Nav tabs, mono caps: "WIRE | HIRE | DESK | LEDGER | BENCH | ACCOUNT". Right side: a boxed "NIGHT" toggle (shows "PAPER" in dark) and a "Connect wallet" button (plain outlined, NOT orange). When signed in the button reads "CREATOR 0x71c9…8e3b" in orange text.
- Current tab has a cream background and a small orange underline.
- Footer on every page: "Clippo" + "Brands fund a USDC pool. Verified humans post clips. An agent checks each clip against the brief and writes down why. Agents never release money on their own."; column "DESKS" with links "Wire, open campaigns", "Start a campaign", "Join as a creator"; column "FINE PRINT" with "Platform fee: 0.25% from the campaigner and 0.25% from the creator, deducted by the escrow. Payouts are USDC on Arc, claimed by the creator." and link "Arc testnet USDC faucet".
- Phone: header collapses to wordmark + boxed "MENU" button. Menu opens as a full-width list (WIRE, HIRE, DESK, LEDGER, BENCH, ACCOUNT), then a "NIGHT" button and "Connect wallet" button below the list. Menu rows are tall enough to tap (about 48px).
- Page-head pattern on inner pages: a mono-caps "kicker" line (for example "THE WIRE OPEN CAMPAIGNS"), then a big serif headline with one italic word, then a grey intro line, then a thick black rule.
- In demo mode an amber line "DEMO BUILD (NEXT_PUBLIC_DEMO=1): FIGURES ON THIS PAGE ARE SAMPLE DATA." sits in the kicker. A real visitor will not see this, but it shows the kicker row is crowded.

---

### / (home) (screenshots: home_paper.png, home_night.png, home_phone_paper.png, home_phone_night.png)
- First impression: A bold editorial landing page with a huge headline "Clips get read before they get paid." and a fake bounty ticket on the right. A visitor can tell it is a "brands pay creators for clips, an AI checks them" product within seconds, and the two buttons are clear, but the newspaper words (Clipping Bureau, Wire, Ledger) are not explained.
- Top to bottom:
  - Chrome (see above), then a double rule and a row: "THE CLIPPING DESK" (left), "BRANDS FUND. HUMANS CLIP. AN AGENT READS. CHAIN PAYS." (centre), "SAMPLE LEDGER" (right).
  - Headline: "Clips get read before they get *paid.*" ("paid." is italic orange).
  - Left text: "A brand puts USDC in a pool. Verified humans cut clips and post them. An agent checks every one against the brand's story, stamps it, and writes the reason in the margin. Approved views settle on-chain. Rejected creators see exactly why."
  - Buttons: orange "Start a campaign →", outlined "Browse the wire". Under them a mono note: "Fee 0.1 to 0.5 per side, taken by the escrow. A person approves every campaign before a creator can join."
  - Right: a tilted ticket "BOUNTY NO. 0042 · LEDGERLANE", "Explain the 3-minute close", "POOL REMAINING, USDC", big orange "1,740.00", side stub "$2.40 PER 1,000". Below it two stacked cards: "02 · @duskpilot YOUTUBE" with quote and green stamp "APPROVED CONF 0.94", margin note "On brief. Both required points said. #ad label at 0:02."; a settle row "@duskpilot ……… +76.20 USDC SETTLED"; then "03 · @numbers.nina" with quote "It's guaranteed to save 20 hours a week." (red squiggle underline) and red stamp "REJECTED CONF 0.88", note "Guaranteed savings are on the prohibited list. No disclosure label found. Creator sees this, and can appeal."
  - Mono caption: "SAMPLE DATA, NOT LIVE. REJECTED CLIPS ARE NEVER PAID."
  - Section "ON THE WIRE THIS WEEK" / "SAMPLE FOOTAGE, NOT REAL CREATORS": three rows of framed video thumbnails, each captioned like "NO. 01 · @DUSKPILOT SAMPLE FOOTAGE · 0:04". Rows are cropped by the page edge (sliding marquee).
  - A scrolling ticker strip: "No. 0042 Ledgerlane · @duskpilot · APPROVED · +76.20 USDC | No. 0039 Hexbolt · pool 99.9% allocated · closes in 2 days | No. 0041 Tidepool · @kiln.and.keys · NEEDS …".
  - Section "How one line of the ledger gets written" / "SIX STEPS, HUMANS AT BOTH ENDS, ONE AGENT": 01 Fund, 02 Admin signs, 03 Clip and submit, 04 Agent reads, 05 Views settle, 06 Claim, each with one sentence. Then three more thumbnails "CLIP AND SUBMIT / AGENT READS / VIEWS SETTLE".
  - Section "What the agent will and won't do": three paragraphs; right column "THREE POSSIBLE STAMPS" with big stamps APPROVED (green), REJECTED (red), NEEDS HUMAN (amber), caption "Every stamp is stored with its reason. Creators see it and can appeal."
  - Section "Pick your desk": two columns. "CAMPAIGNERS: Eight questions, one button each. Then fund it." link "Start the wizard". "CREATORS: One person, one account." link "Verify and join".
  - Footer.
- Visual hierarchy: Eye goes first to the giant headline, then the orange "paid." and the orange pool number "1,740.00". "Start a campaign" is the clear primary button (orange, shadow). Hard to read: the mono fee note under the buttons and the "THE CLIPPING DESK ... SAMPLE LEDGER" row are small grey mono caps. The thumbnail captions are tiny mono caps and wrap onto 3 lines ("NO. 12 · @PILOT.TWO / SAMPLE FOOTAGE · / 0:04"). The page is long (about 4000px) and dense in the middle; the footage grid repeats the same few stock images (same people appear several times) which looks fake. A large empty gap appears at the end of the page with scroll-reveal when motion is off (animation-dependent).
- Phone: Headline stacks to 3 lines and stays readable. Both buttons go full width, stacked; "Start a campaign" is a big easy tap target. The ticket and cards drop below the text. The thumbnail rows still scroll sideways (the cropped cards are meant to be a marquee, but they look cut off). Step list becomes a single column, fine. The two "Pick your desk" columns stack; the text links "Start the wizard" and "Verify and join" are plain underlined text, small to tap. The top black strip text is cut off.
- Night: Works well. Cream text on near-black, orange accent brighter and still readable. Stamps keep their colours. Footer link text is readable. No unreadable areas found.
- Visual problems:
  - (medium) Many mono-caps micro labels (kicker row, fee note, captions, ticker) are small and low contrast grey.
  - (medium) Newspaper words appear with no explanation: "Clipping Bureau", "Desk", "Wire", "Ledger", "Pick your desk".
  - (medium) Thumbnail marquee is cropped on both edges and repeats images.
  - (low) The "Browse the wire" and "Start a campaign" lead to two different audiences but the page never says which button is for creators; the creator path is only at the very bottom ("Verify and join").
  - (low) A creator has no top-level call to action in the hero.

### /wire (screenshots: wire_paper.png, wire_night.png, wire_phone_paper.png, wire_phone_night.png)
- First impression: A grid of "ticket" cards, each a campaign with a big orange price. It is understandable as "list of jobs that pay", but the page says "Campaigns paying right now" while the nav and kicker say "Wire", and the intro uses the word "slip".
- Top to bottom:
  - Kicker: "THE WIRE OPEN CAMPAIGNS" (+ amber demo line). Headline "Campaigns paying *right now*". Intro: "Every slip is a funded USDC pool that an admin has signed. Pick one you can say true things about."
  - Filter bar: platform toggles "ALL PLATFORMS | YOUTUBE | X | INSTAGRAM"; rule toggles "ANY RULE | PER VIEW | SPLIT | POOL SHARE"; "SORT" dropdown showing "Trending".
  - Five cards in a masonry grid. Each: brand + rule mono caps ("HEXBOLT  PER VERIFIED VIEW"), "No. 0039", serif title ("Hexbolt torque wrench: one-handed demo"), big orange rate ("$1.10 PER 1K VIEWS"), a striped progress bar, "$2 left of $1,500", "CLOSES IN 2 DAYS", platform chips "YT / X / IG", "1.36M VIEWS · 27 CREATORS". Some have a black tag "RANKED ONLY". Under each card a caption like "#1 +109K VIEWS IN 7 DAYS" with an orange check mark.
  - Other cards: "Ledgerlane: explain the 3-minute close" ($2.40 PER 1K VIEWS), "Tidepool Coffee, cold brew in 90 seconds" ("$2,000 SHARED BY APPROVED CLIPS", rule "POOL SHARE"), "Fieldnotes: why we stopped using slides" ("$8,000 SPLIT BY APPROVAL", rule "HUMAN-APPROVED SPLIT"), "Ninth Ward Records: the pressing plant tour" ($3.00).
  - Section "Standing" with toggle "VERIFIED VIEWS | EST. USDC", amber demo note, "RANKED BY VERIFIED VIEWS ON APPROVED CLIPS. EARNINGS ARE ESTIMATES BEFORE PLATFORM FEES." Table: "# / CREATOR / VERIFIED VIEWS / APPROVED CLIPS / CAMPAIGNS / EST. USDC". Rows are wallet addresses ("0x71c9…8e3b") with badges ELITE, PRO, RISING, NEW and a small bar.
- Visual hierarchy: Orange rate numbers pull the eye first, which is right. Card titles are second. The cards have an uneven masonry layout (different heights), so the eye jumps. The first card shows "$2 left of $1,500" with a completely full bar, which looks odd. The "#1 +109K VIEWS IN 7 DAYS" captions sit tight under each card and are tiny. The Standing table is clean but lists raw wallet addresses (no names), so it is hard to relate to a person.
- Phone: Filter toggles wrap awkwardly (INSTAGRAM and POOL SHARE fall onto their own full-width row, orphaned). Cards stack in one column and read well. The Standing table turns into stacked blocks (each creator = a 5-line block with a double rule), long but readable. No horizontal overflow.
- Night: Good. Orange stays readable; active filter chips become cream with dark text.
- Visual problems:
  - (high) "Wire" and "slip" are not explained; the headline says campaigns but the nav says Wire.
  - (medium) "RANKED ONLY", "HUMAN-APPROVED SPLIT", "POOL SHARE", "SPLIT" are unexplained tags on cards.
  - (medium) Card rate says "$1.10 PER 1K VIEWS" but the page never says who pays whom or what a "verified view" is.
  - (medium) Mixed card widths and the tiny rank captions look unfinished.
  - (low) Standing shows only wallet addresses.

### /slips/c-ledgerlane (screenshots: slips_paper.png, slips_night.png, slips_phone_paper.png, slips_phone_night.png)
- First impression: A detailed campaign page with a rate, a chart and the brief. It is clear what the campaign is and what you may say, but the one thing a creator must do (join) is at the very bottom behind a wallet gate.
- Top to bottom:
  - Kicker: "THE WIRE" (link) "NO. 0042 PER VERIFIED VIEW". Headline "Ledgerlane: explain the 3-minute close". Sub: "Accounting software that closes the month in three minutes."
  - Left column: "RATE" with big orange "$2.40 PER 1K"; key/value list "POOL $5,000 / ALLOCATED $3,260 / LEFT $1,740 / CLOSES 9 days / POST ON YouTube, X / WHO Any verified"; "SOURCE MATERIAL" with button "Download source".
  - Right column: "Performance" and "1,358,000 views, Clippo count"; "CONFIRMED VIEWS, ALL CREATORS" "1,059,240" with green badge "CHAINLINK CONFIRMED", "PENDING 298,760", link "PROOF DEMO-NOT-A-REAL-TRANSACTION"; margin note "Confirmed = read from YouTube by Chainlink CRE nodes and written on Arc. Pending = Clippo's own count. Only Confirmed is paid."; line chart (149K / 74K / 0, day 1 to day 14); "PAYOUT PROGRESS 65% of pool allocated" (orange striped bar); "CREATORS 41  CLIPS 112".
  - "The brief": paragraph; "MUST SAY" (green-bar items), "MUST NOT SAY" (red-bar items), "DISCLOSURE #ad or 'Paid partnership' label visible in the first 5 seconds".
  - "Your clips": dashed box "Connect a wallet to join." "Joining and claiming use your own address." orange button "Connect wallet".
  - Footer.
- Visual hierarchy: Orange "$2.40" first, then the chart and the big black "1,059,240". The brief (what the creator needs) is below the fold on desktop. The primary action is the lowest element on the page, visually weak versus the dense analytics above it. Must say / must not say with green / red bars is a good, quick-to-read pattern.
- Phone: Single column; chart shrinks and its axis labels become very small (about 6-7px, unreadable). Facts list stacks label above value. "Connect wallet" is the only orange block and is easy to hit.
- Night: Fine.
- Visual problems:
  - (high) Creator action (join/connect) is at the bottom; no sticky or top button.
  - (medium) Chainlink words ("CHAINLINK CONFIRMED", "Clippo count", "Pending", "CRE nodes") are jargon-heavy for a first visit.
  - (medium) Chart axis labels unreadable on phone.
  - (low) "PROOF DEMO-NOT-A-REAL-TRANSACTION" link text is long mono caps.

### /join (screenshots: join_paper.png, join_night.png, join_phone_paper.png, join_phone_night.png)
- First impression: Two big choice cards. It is a clean fork, but the cards look like text boxes, not buttons.
- Top to bottom: Kicker "JOIN". Headline "Two desks. *Pick one.*" Sub "A wallet holds one role. To try the other desk, use another account in your wallet." Two cards: "A / I clip / Verify you are a person, prove a channel, pick a campaign." and "B / I pay for clips / Connect a wallet, answer eight questions, fund a pool." Each has a half-circle ticket notch on the right edge. Footer. The page is short, about 900px, with a large empty right half.
- Visual hierarchy: Headline first. Cards are the same weight, no orange, no arrow, no button label. Nothing says "click here". The little notch on the right looks like a decoration, not an action.
- Phone: Cards stack, readable; the notch is clipped by the right edge. Tap area is the whole card, which is large, but it does not look tappable.
- Night: Fine.
- Visual problems:
  - (high) Cards have no visible call to action (no button, no arrow, no hover hint on a still).
  - (medium) "Desk" is used for roles here ("Two desks") but "DESK" in the nav means the campaigner area only.
  - (medium) The half of the page to the right of the cards is empty; cards are small.
  - (low) The letters "A" and "B" are meaningless labels.

### /account (screenshots: account_paper.png, account_night.png, account_phone_paper.png, account_phone_night.png)
- First impression: A sparse identity page with a "not connected" state. Clear enough, but "Who's signing" is an odd title and it is mostly empty.
- Top to bottom: Kicker "ACCOUNT". Headline "Who's *signing*". Section "Identity": rows "WALLET not connected", "DESK –", "HUMAN CHECK not verified"; orange button "Connect wallet". Section "Your desk": "Each wallet holds one role, chosen the first time it signs in and fixed after that. To use another desk, switch accounts in your wallet and connect again. Admin rights come from the operator's allow-list, not from this page." Footer.
- Hierarchy: Orange button is the only accent and is clear. Value text is mono and larger than labels; labels are tiny grey mono caps. Right half of the desktop page is empty.
- Phone: Rows stack (label above value), good. Button is easy to tap.
- Night: Fine.
- Visual problems:
  - (medium) "Who's signing", "Desk", "Human check" are unclear; the "Desk" value shows only "–".
  - (low) Large empty area; the page feels unfinished.
  - (low) There are two "Connect wallet" buttons on screen (header and body), the header one is not orange.

### /ledger (screenshots: ledger_paper.png, ledger_night.png, ledger_phone_paper.png, ledger_phone_night.png)
- First impression: A creator earnings dashboard: "What you're owed". It feels like a bank statement; the money numbers are clear but the page is long and full of tiny mono labels.
- Top to bottom:
  - Kicker "THE LEDGER CREATOR EARNINGS". Headline "What you're *owed*". Sub: "Settled amounts, ready to pull. The creator fee comes off when you claim. Nobody else can hold your money up."
  - "Your record" with "VERIFIED HUMAN" and a "PRO" badge. Stat row: "CONFIRMED VIEWS 47,736 / PENDING 21,864 / CHAINLINK CONFIRMED", "CLIPS SENT 11", "APPROVED / REJECTED 8/2", "RELIABILITY 80%". Margin note "CONFIRMED AND PENDING ...".
  - Money row: "OWED, CLAIMABLE NOW $86.80", "CLAIMED $43.11", "STILL ACCRUING, EST. $155.20".
  - "Settlements" table "DAY / CAMPAIGN / USDC / STATUS" (Oct 26 Ledgerlane 33.84 OPEN ... CLAIMED · 0X4F1C…A90…), "Total settled 129.91". Note: the USDC and STATUS headers collide ("USDCSTATUS") and amounts touch the status tag ("33.84OPEN").
  - Right rail: "CLAIMABLE NOW" "86.80 USDC", "OPEN ENTRIES 3", "ALREADY CLAIMED 43.11", orange "Connect wallet to claim", box "FEE PREVIEW, CLAIM: Gross payout 86.80 / Platform fee, 0.25% -0.22 / You receive 86.58".
  - "Still earning" "ESTIMATES, BEFORE FEES" table "CAMPAIGN / APPROVED CLIPS / VIEWS / EST. USDC" (with Chainlink badge and "PROOF DEMO-NOT-A-REAL-TRANSACTION" wrapped on 2 lines; "8,400 set by split / CLIPPO COUNT").
  - "Your clips" "WITH VERDICTS": table "CLIP / VERDICT / CONF. / CLIPPO COUNT"; each row has a clip title link, tag APPROVED (green) / REJECTED (red) / NEEDS HUMAN (amber) / PENDING (dashed), and an "AGENT NOTE" in italic with a bracket.
- Hierarchy: Big mono "86.80" in the right rail wins; the orange claim button is clear. The record and money rows are good. But three tables follow with 3 to 5 columns of tiny mono caps. The "CONFIRMED AND PENDING" explanation is repeated twice.
- Phone: Tables turn into stacked label/value blocks (very long: page is 5600px). The page scrolls sideways by 16px (document width 406 vs 390), caused by hidden table captions. The claim panel and fee preview are at the very bottom, far from the "Claimable now" number. Verdict tags are fine.
- Night: Good. Orange button strong; green/red/amber tags readable.
- Visual problems:
  - (high) On phone the claim button is at the bottom of a very long page.
  - (medium) Settlements table: header "USDCSTATUS" runs together, amounts and status tags touch ("33.84OPEN").
  - (medium) Slight horizontal scroll on phone (406px).
  - (medium) Jargon repeated: "Confirmed / Pending / Chainlink / Clippo count / CRE".
  - (low) The "AGENT NOTE" bracket line overlaps the first letter of the note text in the clip rows.

### /desk (screenshots: desk_paper.png, desk_night.png, desk_phone_paper.png, desk_phone_night.png)
- First impression: A campaigner dashboard. The orange "New campaign" button is clear, but below it the page is a long wall of stats, a bar chart and tables.
- Top to bottom:
  - Kicker "THE DESK CAMPAIGNER". Headline "Your *campaigns*". Sub "What is live, what is waiting on you, and what is still in escrow." Orange button "New campaign".
  - "The numbers" "ALL CAMPAIGNS": stats "BUDGET $13,000 / SPEND $4,460.00 / CONFIRMED VIEWS 1,059,240 (PENDING 298,760, CHAINLINK CONFIRMED) / PER 1K VIEWS $2.82 / APPROVED / REJECTED 133/34", margin note.
  - Campaign title "Ledgerlane: explain the 3-minute close" with a switch of two campaign names. "SPEND AGAINST BUDGET $3,260.00 of $5,000 · $1,740.00 left"; "CLIPS, APPROVED AND REJECTED" (green/red bar, "Approved 112, Rejected 28, Needs human 1"); "COST PER 1,000 VIEWS $2.40"; "CONFIRMED VIEWS, THIS CAMPAIGN 1,059,240"; "DAILY VIEWS, CLIPPO COUNT" bar chart (last bar orange); "PER CREATOR" table with 0x addresses and ELITE/PRO/NEW badges.
  - "Campaigns" table "CAMPAIGN / POOL USED / ALLOCATED / VIEWS": row 1 button "Close and reclaim $1,740"; row 2 buttons "Ask the AI to propose" (orange), "Propose without AI (pro rata by clips)", "Build it myself (1 of 2)", "Close and reclaim $6,800".
  - "Waiting on your call" "AGENT WAS NOT SURE": "@MARA.REELS · YOUTUBE", "Month-end, but make it quick", amber stamp "NEEDS HUMAN CONF 0.58", agent note, orange "Approve", "Reject".
  - "On-chain disputes" "CHALLENGE CREDITS BEFORE THEY RELEASE": text "DISPUTES DID NOT LOAD: FAILED TO FETCH" (this is a visible error in demo, because the API is blocked).
  - "Agent Pass activity: Fieldnotes: why we stopped using slides" "DEMO IDENTITY (FAKE HUMAN)": "PROPOSED BY THE AGENT Nothing proposed yet.", "AUDIT LOG No activity yet."
- Hierarchy: "New campaign" is clear and well placed. After that, every section has the same weight, so the urgent one ("Waiting on your call" — a decision the user must make) is buried at the bottom, 2000px down. The orange chart bar and orange "Ask the AI to propose" compete. Four buttons in a row for the split campaign (one orange, three outlined, one very long label) are crowded.
- Phone: Stats arrange 2 per row. Tables become stacked blocks (very long). "Waiting on your call" keeps Approve/Reject side by side next to a squeezed narrow text column, so the agent note wraps at about 12 characters per line; this is the worst phone layout I saw. Buttons stack. The campaign switcher becomes two full-width stacked rows. Horizontal scroll of 16px (406 vs 390).
- Night: Good, no unreadable text. Orange bar and button still strong.
- Visual problems:
  - (high) Decisions that need action ("Waiting on your call") are at the bottom.
  - (high) Phone: agent note squeezed into a narrow column beside buttons.
  - (medium) Button cluster on a campaign row is crowded and the labels are long and technical ("pro rata by clips", "Build it myself (1 of 2)").
  - (medium) Error text "DISPUTES DID NOT LOAD: FAILED TO FETCH" is small mono caps, not styled as an error.
  - (medium) The same campaign title is shown three times near each other (switcher, title, table).
  - (low) Slight horizontal scroll on phone.

### /desk/new (screenshots: desknew_paper.png, desknew_night.png, desknew_phone_paper.png, desknew_phone_night.png)
- First impression: A friendly one-question-at-a-time wizard. This is the clearest screen in the app: one question, one box, one button.
- Top to bottom: Kicker "DESK NEW CAMPAIGN". Headline "One question at a *time*". Sub "Nothing is charged until the last step. You can go back and change any answer." Left: "QUESTION 1 OF 8" with an 8-segment bar (first segment orange). Right: "Q01", "What are you promoting?", mono helper "ONE OR TWO SENTENCES. THE AGENT TURNS IT INTO A FULL BRIEF.", textarea with placeholder "Accounting software that closes the month in three minutes.", small hint "A few more words, please.", button "Write the brief →" (greyed out / disabled).
- Hierarchy: The big serif question is first. The disabled button is pale grey outline with low contrast; it is not clear why it is disabled except by the small hint "A few more words, please." (small, grey, easy to miss). Progress bar is thin and small.
- Phone: Left progress column moves above the question. All good; textarea full width; button easy to tap.
- Night: Fine; disabled button still faintly visible.
- Visual problems:
  - (medium) Disabled button looks broken; reason is in tiny text.
  - (low) "Write the brief" as the first button is a surprise (the user answered one question, the agent writes the brief).
  - (low) Progress bar is not labelled with step names.

### /desk/c-ledgerlane/fund (screenshots: deskfund_paper.png, deskfund_night.png, deskfund_phone_paper.png, deskfund_phone_night.png)
- First impression: The page is titled "Signed. Live now." It reads as a status page, not a "fund" page; the visitor is told the campaign is already live while the URL says "fund".
- Top to bottom: Kicker "DESK NO. 0042". Headline "Signed. *Live now.*" Sub "Creators can't see this campaign until an admin signs it. If it is rejected, the whole pool comes back to you." Four-step strip: "1 Fund — 5,000 USDC in escrow", "2 Admin review — In the queue. A person reads the brief.", "3 Open to creators — Live now" (highlighted, orange 3), "4 Close — Unspent USDC returns to you". Below: "Creators can join and submit clips." buttons orange "Go to the desk", outlined "See the wire". Right: "THE ARITHMETIC": "POOL 5,000.00", "GAS paid in USDC", box "FEE PREVIEW, FUNDING: Pool you send 5,000.00 / Platform fee, 0.25% -12.50 / Net pool for creators 4,987.50", note.
- Hierarchy: The step strip with the large number "3" in orange shows where you are, which is good. The receipt-style fee box is clear. Left half under the buttons is empty.
- Phone: Steps stack in a 1-column list; fee box under; buttons stacked and easy to tap.
- Night: Fine.
- Visual problems:
  - (medium) Headline is "Signed. Live now." on a funding URL; mismatch of title vs purpose.
  - (medium) "THE ARITHMETIC" and "GAS paid in USDC" are unclear labels.
  - (low) The "Admin review" step says "In the queue" but the state is "Live now".

### /hire (screenshots: hire_paper.png, hire_night.png, hire_phone_paper.png, hire_phone_night.png)
- First impression: A marketplace directory of creators with prices. It is clear what it is, but "hire" here sits next to "clip", "bounty" and "brief", so it is unclear how this differs from the Wire.
- Top to bottom: Kicker "HIRE CREATOR DIRECTORY". Headline "Creators *for hire*". Sub "Pick the people you want instead of opening a bounty. Rates are set by the creators, in USDC. Tiers come from approved clips and pass rate, never follower counts." Amber demo line. Left filter rail: "SEARCH" (placeholder "Handle, niche, a word from the bio"), "TIER" list "Elite 2 — 25+ approved clips, 85%+ pass rate", "Pro 4 — 10+ approved clips, 75%+ pass rate", "Rising 3 — 3+ approved clips, 60%+ pass rate", "New 1 — Verified, no track record yet"; "NICHE" (Any), "PLATFORM" (Any), "CHEAPEST RATE, UP TO" (placeholder "USDC, no cap"), link "Clear filters"; box "CLIPPED, 0 — Nothing clipped yet. Use "Clip this ad" on a listing to start a shortlist." Right: "Listings" "10 OF 10": cards "FOR HIRE NO. 0117 @mara.reels", tier tag "ELITE", "FINANCE", platform chips "YT IG", bio, price list ("Short clip, up to 60s ... $450", "Long-form video, 5 to 12 min ... $1,900", "Sponsored integration ... $1,100"), mono line "142 approved clips 97% pass World ID verified", button "Clip this ad", mono "USDC, SET BY THE CREATOR".
- Hierarchy: Creator handles in big italic serif are first. Prices in bold mono are strong. The button "Clip this ad" is outlined (not orange) and repeated 10 times, so the page has no single primary action. No orange is used at all on this page, so the page feels flat.
- Phone: The filter rail collapses to a "Filters" dropdown; "CLIPPED, 0" box is above the listings; cards stack, price rows readable. Good adaptation. Page is long (5000px).
- Night: Fine.
- Visual problems:
  - (high) "Clip this ad" is a confusing verb: "clip" means cut a video everywhere else, here it means "shortlist"; and the mono counter "CLIPPED, 0" repeats it.
  - (medium) The shortlist box lives in the left rail, and the path to "Write the brief" is not visible until you shortlist something.
  - (medium) Cards have stats line in mono that wraps ("0 approved clips no clips judged yet / World ID verified").
  - (low) Tier explanation is in the filter, not on cards.

### /hire/brief (screenshots: hirebrief_paper.png, hirebrief_night.png, hirebrief_phone_paper.png, hirebrief_phone_night.png)
- First impression: An empty state. It tells you to go back and shortlist; it is clear but a dead end for someone who typed or clicked here directly.
- Top to bottom: Kicker "HIRE BRIEF" ("HIRE" is a link). Headline "Write the *brief*". Sub "A brief needs creators to send it to." Dashed box: "Nobody is clipped yet." "Clip two or three listings first. The brief and the offers are written against that list." orange "Open the directory". Footer.
- Hierarchy: Orange button is the only action, clear. Everything else is quiet.
- Phone: Fine; button easy to hit.
- Night: Fine.
- Visual problems:
  - (medium) "Nobody is clipped yet" is odd phrasing.
  - (low) I did not see the filled state of this page (needs shortlisted creators, could not trigger without wallet and API).

### /bench (screenshots: bench_paper.png, bench_night.png, bench_phone_paper.png, bench_phone_night.png)
- First impression: An admin review queue with big orange approve buttons. For an admin it is clear what to do (approve or reject each item); for a normal visitor the name "The Bench" says nothing. Note: in demo mode it shows data without a wallet, so a real user would normally see a sign-in gate instead.
- Top to bottom: Kicker "THE BENCH ADMIN" (+ amber demo line). Headline "Read it, then *decide*". Sub "The assistant ranks the queue and summarises each dispute. It recommends. A person signs." Tab strip: "ALL | CAMPAIGNS TO SIGN | FLAGGED CLIPS | APPEALS | SPLITS TO APPROVE | VIEW PATTERNS | DISPUTE SUMMARIES | SUSPICIOUS GROWTH". Five numbered items: "1 CAMPAIGN ORCHARDLABS.ETH $10,000 USDC — Orchard Labs: sleep tracker, 10,000 USDC pool" with "ASSISTANT SUMMARY" italic text and buttons "Approve" (orange) / "Reject and refund"; "2 VIEW PATTERN HEXBOLT — Views on @quickdraw3 jumped 11x overnight" buttons "Release hold" / "Keep hold"; "3 APPEAL @MARA.REELS — Appeal: 'Spreadsheets vs this'" "Overturn" / "Uphold"; "4 FLAGGED CLIP @OAKLINE — Flagged: near-duplicate of an approved clip" "Clear" / "Reject clip"; "5 CAMPAIGN TIDEPOOL.ETH $1,200 USDC — Tidepool Coffee refill, 1,200 USDC pool" "Approve" / "Reject and refund".
- Hierarchy: Large grey numerals 1 to 5 and serif titles lead the eye; orange buttons on the right are the strongest elements. The same orange is used for different meanings: "Approve" (good), "Release hold", "Overturn", "Clear" — all primary orange, so the first button is not always the "safe" one. "Reject and refund" is the same outline as "Keep hold". Destructive actions have no red.
- Phone: Tab strip wraps into an uneven 2-column grid with some tabs sharing rows, a bit ragged but tappable. Buttons sit under each item, fine. No overflow. Summaries are readable.
- Night: Fine.
- Visual problems:
  - (high) Destructive actions (reject, refund, release hold) have no warning colour and the same visual weight as safe ones.
  - (medium) Eight tab labels in mono caps with overlapping meanings ("DISPUTE SUMMARIES" vs "APPEALS", "VIEW PATTERNS" vs "SUSPICIOUS GROWTH").
  - (medium) The name "Bench" and "assistant summary" are unexplained.
  - (low) Item numbers are dim grey and look like decoration, not rank.

### /profile (screenshots: profile_paper.png, profile_night.png, profile_phone_paper.png, profile_phone_night.png; module-on views: mod_profile_anon_paper.png, mod_profile_signed_paper.png, mod_profile_signed_night.png, mod_profile_signed_phone_paper.png)
- First impression, as the app renders it in plain demo mode: the **404 "Not on file" page**. With the module switched on (my stub) it is "Your record, on the record": an opt-in public profile.
- What is on screen (404 version, the real default): "NO. 404", headline "Not on *file*", "There is no page at this address.", rule, dashed box "Nothing here." "The link may be cut short, or this part of Clippo is switched off in this build." orange button "Browse the wire". Then the shared chrome.
- What is on screen (module on, stubbed): Kicker "PROFILE ON-CHAIN, NON-TRANSFERABLE". Headline "Your record, *on the record*". Sub "An opt-in public profile of your approved clips, views and earnings, tied to your wallet. It cannot be sold or moved, and there is no token." Section "What would be published": "TIER Rising / APPROVED CLIPS 7 / REJECTED CLIPS 2 / VERIFIED VIEWS 21K / EARNED, USDC 0.00". Right: "STATUS Off", "Nothing is published unless you opt in. You can opt out at any time.", orange "Opt in".
- Hierarchy: 404 page: headline then orange "Browse the wire", good. Module page: orange "Opt in" is clear.
- Phone: 404 fine. Module page stacks; the stat grid reflows.
- Night: Fine for both.
- Visual problems:
  - (high) The top-nav "Account" and the footer do not link here, so users find it only by URL; when the module is off the user sees a dead-end 404. The 404 text "switched off in this build" is developer language.
  - (medium) "Tier Rising" vs the nav item "Standing" vs the "Status" ladder with "Silver"; tier names differ between pages (Rising/Pro/Elite on Hire and Wire, Bronze/Silver/Gold/Platinum on Status).
  - (low) "On-chain, non-transferable" is jargon; "no token" appears in the intro (reads defensive).

### /referrals (screenshots: referrals_paper.png, referrals_night.png, referrals_phone_paper.png, referrals_phone_night.png; module-on views: mod_referrals_anon_paper.png, mod_referrals_signed_paper.png, mod_referrals_signed_night.png, mod_referrals_signed_phone_paper.png)
- First impression, in plain demo mode: the same **404 "Not on file"** page. With the module on (stub): "Bring a person, keep a cut", a clear referral-link page.
- What is on screen (module on, stubbed): Kicker "REFERRALS CREATOR". Headline "Bring a *person*, keep a cut". Sub "Share a campaign link. When someone verified joins through it, you earn 5% of their activity, up to $100, with 24 hours between credits." Left: "Make a link" with "CAMPAIGN" dropdown ("Ledgerlane: explain the 3-minute close") and orange "Make link"; "Your links" "LEDGERLANE: EXPLAIN THE 3-MINUTE CLOSE" and a link box "http://localhost:3310/slips/c-ledgerlane?ref=mara-7Q2" with a black "COPY" button. Right: "CREDITED SO FAR 12.50 USDC", "PEOPLE REFERRED 3", "ROOM UNDER THE CAP 87.50", "CUT 5.00%" with a bar.
- Hierarchy: Big mono "12.50" first; orange "Make link" is the action. The "COPY" button is black, a different button style from every other button.
- Phone: Stacks cleanly; the link box and COPY button need check but fit.
- Night: Fine.
- Visual problems:
  - (high) 404 when module is off, and no nav link to it.
  - (medium) "ROOM UNDER THE CAP" is unclear; "cap" is never defined next to the number.
  - (low) "COPY" uses a third button style (solid black small).

### /status (screenshots: status_paper.png, status_night.png, status_phone_paper.png, status_phone_night.png; module-on views: mod_status_anon_paper.png, mod_status_signed_paper.png, mod_status_signed_night.png, mod_status_signed_phone_paper.png)
- First impression, in plain demo mode: **404 "Not on file"**. With the module on (stub): a clear four-rung ladder, "Climb on approved work".
- What is on screen (module on, stubbed, signed in): Kicker "STATUS CREATOR LADDER". Headline "Climb on *approved work*". Sub "Tiers come from approved clips, approve rate and verified views. Followers are not counted. One fraud flag caps you at the first rung." Section "The rungs": "1 BRONZE — Verify as a human with World ID. HELD", "2 SILVER — 5 approved clips, 70% approve rate, 10K verified views. YOU ARE HERE" (highlighted, orange 2), "3 GOLD ... AHEAD", "4 PLATINUM ... AHEAD". Right panel: "YOUR TIER SILVER", "APPROVED CLIPS 7 / APPROVE RATE 78% / VERIFIED VIEWS 21,400 / FRAUD FLAGS 0", "TO REACH GOLD" with two progress bars and "78% / 80%". Signed out: dashed box "Sign in to see your rung. The ladder is public. Your place on it is not." orange "Go to the ledger".
- Hierarchy: Highlighted rung and big "SILVER" read well; progress bars give clear targets. The signed-out button says "Go to the ledger" which is not a sign-in action.
- Phone: Rungs list then the panel; fits.
- Night: Fine.
- Visual problems:
  - (high) 404 when module off; unreachable from nav.
  - (medium) Tier names here (Bronze to Platinum) do not match "Elite / Pro / Rising / New" shown on /wire, /hire, /desk.
  - (medium) "Sign in" box button reads "Go to the ledger".
  - (low) "rungs" and "fraud flag" wording.

### 404 page (/this-page-does-not-exist) (screenshots: notfound_paper.png, notfound_night.png, notfound_phone_paper.png, notfound_phone_night.png)
- First impression: A friendly, on-brand 404, short and clear. The wording "Not on file" fits the newspaper theme and the single orange button gives the way out.
- Top to bottom: shared chrome; "NO. 404" (mono caps); headline "Not on *file*"; "There is no page at this address."; rule; dashed box "Nothing here." "The link may be cut short, or this part of Clippo is switched off in this build." orange "Browse the wire"; footer.
- Hierarchy: Clear: headline then the one orange button.
- Phone: Fine, button easy to tap. Night: Fine.
- Visual problems:
  - (low) "switched off in this build" is developer language. It is also the screen users get for the three optional modules (profile, referrals, status), where it hides the cause.
  - (low) Button says "Browse the wire", which again needs the "wire" word to be understood.

---

## Cross-screen visual findings

- Buttons: There are at least four styles: orange solid with hard black shadow (primary), outlined with black border (secondary), black solid small ("COPY", the active filter chips, "NIGHT/PAPER" toggle is outlined), and plain underlined text links ("Start the wizard", "Verify and join", footer links). The header "Connect wallet" is NOT orange even though "Connect wallet" in the page body is. Pages without an orange button: /hire (10 repeated outlined "Clip this ad"), /join (no button at all).
- Primary action placement: Strong on /, /desk, /desk/new, /account. Weak or buried on /slips (join is last), /join (cards do not look clickable), /hire (no single primary), /bench (many equal-weight orange buttons).
- Headings: Very consistent and the best part of the design: big serif headline with one italic word on every page, thick black rule under it. It gives a strong identity. But headings are often poetic ("Who's signing", "Signed. Live now.", "Read it, then decide", "Your record, on the record", "Not on file") and say little about what the page does.
- Spacing and density: Generous in the hero and short pages; very dense on /ledger, /desk, /slips and /wire (tables, charts, many small stat blocks). Desktop pages with short content (/join, /account, /hire/brief, /status) leave the right half empty and look unfinished.
- Orange accent: Used well for money rates (wire cards, ticket) and primary buttons. But it is also used for: step numbers, chart peak bar, verified-check icons, the current-tab underline, "paid." in the headline, the "CREATOR" label on the connected wallet, progress bars. That is many meanings for one colour, so orange does not reliably mean "click me".
- Mono-caps micro labels: Everywhere. The kicker row, field labels, table headers, badges, captions, footer headings, ticker, and tab strips. Many are 11-12px with wide letter spacing and grey colour on beige. They are hard to scan and are used for both labels and real content (for example error text "DISPUTES DID NOT LOAD: FAILED TO FETCH", status values like "OPEN", the "USDC, SET BY THE CREATOR" line). Important text in mono caps does not stand out.
- Newspaper look: It helps brand memory and gives the screens a calm, trustworthy "ledger" feel; the stamp (APPROVED / REJECTED / NEEDS HUMAN) is an excellent, instantly clear idea and the receipt-style fee boxes are clear. It hurts clarity in navigation and labels: Wire, Desk, Slips, Ledger, Bench, Standing, Hire, "Clipping Bureau", "Clippo count", "rungs", "Arithmetic". The theme vocabulary replaces plain words a new user would search for (Campaigns, Earnings, Admin).
- Data fakeness: The landing "footage" reuses the same few stock images; wallet addresses stand in for creator names on Standing and Per creator tables.
- Phone: Menu is good and tap targets in the nav are large. Main weaknesses: tables become very long stacks (/ledger 5600px, /desk 5300px, /wire 4900px); 16px sideways scroll on /ledger and /desk (hidden table captions are 406px wide); the squeezed agent note beside buttons on /desk; chart labels too small on /slips; mono caps strip text clipped in the top bar.
- Night: Consistently good. Cream on near-black, orange brighter, stamps readable. The black top strip becomes cream. No unreadable area found. The only thing I would check is the thin dashed borders and the faint progress-bar ticks, which are low contrast in both themes.
- Demo/test text on screen: "DEMO BUILD (NEXT_PUBLIC_DEMO=1): FIGURES ON THIS PAGE ARE SAMPLE DATA" and "PROOF DEMO-NOT-A-REAL-TRANSACTION" show developer text in the kicker row; the real build will not show them but the kicker row must be designed for either.

## Top 10 visual fixes (ordered by impact)

1. Replace or explain the newspaper vocabulary in nav and headings: show plain labels (for example Campaigns, Earnings, Admin queue, Find creators, My campaigns) with the theme word as a small sub-label or tooltip. Biggest comprehension win.
2. Make a clear primary call to action on each screen, one orange button, one meaning. Add one to /join (cards as buttons with "Continue" arrow), to /hire (a "Write the brief" bar once creators are shortlisted), and a sticky "Join this campaign" on /slips.
3. Move decisions that need a person to the top: "Waiting on your call" on /desk, the claim panel on /ledger (phone), and the join action on /slips.
4. Raise the size and contrast of mono-caps labels (at least 12-13px, darker grey), and use sentence case for anything that is real content (errors, statuses, hints). Keep caps only for short tags.
5. Give destructive and safe actions different looks on /bench and /desk: neutral/green for approve, red outline for reject/refund/release hold, and stop using orange for every first button.
6. Fix the three optional-module pages (/profile, /referrals, /status): add them to navigation or Account, and replace the dead-end 404 with an explanation ("This feature is not turned on yet") when the module is off. Unify tier names (Elite/Pro/Rising/New vs Bronze to Platinum).
7. Phone tables: stop turning every table into long stacked blocks. Use compact cards showing 2 to 3 key fields, collapsible details, and fix the 16px sideways scroll (hide the sr-only table captions with clipping, or set overflow-x on the container). Fix the narrow agent-note column on /desk by stacking buttons under the text.
8. Reduce density on /ledger, /desk and /slips: split into tabs or collapsible sections (Overview, Settlements, Clips), remove the duplicate "CONFIRMED AND PENDING" note, and show the Chainlink/"Clippo count" explanation once, as a help link.
9. Fix small layout defects: "USDCSTATUS" header and "33.84OPEN" spacing on the Settlements table, the agent-note bracket overlapping text, the full progress bar on a "$2 left of $1,500" card, the wrapped thumbnail captions on the landing page, and the orphaned filter chips on phone.
10. Unify button styles and the header "Connect wallet" (make it the one orange button when signed out), make the disabled state obvious (reason shown near the button, not tiny text), and reserve orange for actions and money only (not step numbers, check marks, underlines).

## Terms a first-time visitor will not understand

| Term (as seen on screen) | Route(s) where seen | What I assumed before reading the code |
|---|---|---|
| Clipping Bureau (header caption), The Clipping Desk | all pages, / | A company or brand tagline; I thought it was a news agency |
| Wire / The Wire | nav, /, /wire, /slips | A news feed or live ticker of events, not a list of campaigns |
| Slip / "Every slip is a funded USDC pool" | /wire | A payslip or receipt; maybe a mistake (typo for "slide") |
| Desk | nav, /desk, /join ("Two desks"), footer "DESKS" | A help desk or a work area; I did not expect it to mean the campaigner (brand) area, and "Two desks" means the two roles |
| Pick your desk / I clip / I pay for clips | /, /join | Choosing a plan or role, unclear what happens next |
| Ledger / The Ledger | nav, /ledger | An accounting book for everything; I did not expect it to be the creator's earnings page |
| Bench / The Bench | nav, /bench | A waiting list or a backup list; not an admin review queue |
| Standing | /wire (section "Standing") | A leaderboard or my own status; I did not expect a ranking table of creators |
| Hire | nav, /hire | A job board for hiring staff; it is a directory of creators to pay |
| Clip this ad / CLIPPED, 0 / "Nobody is clipped yet" | /hire, /hire/brief | Cut a video clip; it actually means "shortlist" |
| Brief / Write the brief | /desk/new, /hire/brief | A short summary, or a legal brief; it is the campaign instructions for creators |
| Dateline (not on screen; "kicker" row such as "THE WIRE OPEN CAMPAIGNS") | all inner pages | The small caps line above each headline looked like breadcrumbs or a category label |
| Stamp / APPROVED CONF 0.94 / NEEDS HUMAN | /, /ledger, /desk | A postage or rubber stamp decoration; CONF I read as "confidence" only after thinking, not as a score out of 1 |
| Bounty NO. 0042 / No. 0042 | /, /wire, /slips | A bug or issue number; later realised it is a campaign number |
| Pool / Pool remaining / Pool share | /, /wire, /slips | A swimming pool or a shared pot; "POOL SHARE" as a rule is unclear |
| Rule: PER VIEW / SPLIT / POOL SHARE / HUMAN-APPROVED SPLIT / RANKED ONLY | /wire | Types of payment; I could not tell how they differ or who decides |
| Verified view / Confirmed vs Pending / Clippo count | /slips, /ledger, /desk | Page views; I did not know "Confirmed" is a separate count from "Pending", or what a "Clippo count" is |
| CHAINLINK CONFIRMED / CRE nodes / PROOF DEMO-NOT-A-REAL-TRANSACTION | /slips, /ledger, /desk | A blockchain badge for security; no idea what it proves or why I should care |
| Escrow | /, footer, /desk/.../fund | A bank service; did not know who holds the money |
| USDC / Arc / Arc testnet / faucet | top strip, footer | A cryptocurrency (USDC known by some); "Arc" and "faucet" were meaningless |
| Settle / Settlements / SETTLED / Claim / Claimable | /, /ledger | Banking terms; "settled" I took as "paid" but "claim" says I must do an extra step |
| Allocated / Left / Closes | /slips | Budget words; "allocated" means money already promised to creators, not obvious |
| Still earning / Still accruing, est. | /ledger | Ongoing income; not clear it is an estimate for unapproved or unsettled views |
| Reliability 80% | /ledger | A score for the platform; actually my own approval record |
| Agent / Agent note / Assistant summary | /, /ledger, /desk, /bench | A human sales agent; it is an AI |
| Waiting on your call | /desk | A phone call; it means "waiting for your decision" |
| Ask the AI to propose / Propose without AI (pro rata by clips) / Build it myself (1 of 2) | /desk | Several ways to make a payout plan; "pro rata" and "(1 of 2)" are unclear |
| Close and reclaim $1,740 | /desk | Delete the campaign; it ends it and returns the unspent money |
| On-chain disputes / Agent Pass activity / AUDIT LOG / DEMO IDENTITY (FAKE HUMAN) | /desk | Developer or legal terms; no idea what "Agent Pass" is |
| Campaigns to sign / Splits to approve / View patterns / Suspicious growth / Dispute summaries | /bench | Admin job types; "sign" and "split" are unclear to non-admins |
| Release hold / Keep hold / Overturn / Uphold / Clear | /bench | Legal or court words; the effect of each button is not stated |
| Elite / Pro / Rising / New vs Bronze / Silver / Gold / Platinum | /wire, /hire, /status | Two different tier systems; I thought they were the same ranks with different names |
| Rungs / Climb on approved work | /status | A ladder game; fine once seen but "rungs" is odd |
| On-chain profile, non-transferable / Opt in / Payload | /profile | A social profile; "non-transferable" and "on-chain" lost me |
| Room under the cap / Cut 5.00% | /referrals | A limit on something; not clear it means the maximum I can still earn |
| World ID / Human check / Verified human | /, /account, /ledger, /hire | A login method; I did not know it proves I am a real person |
| Who's signing / Identity / Your desk | /account | A signature or document signing page; it is the wallet and role page |
| Connect wallet | header, many pages | Needed crypto knowledge; I would not know which wallet to use or why |
| Not on file / switched off in this build | /404 and the 3 optional pages | A cute 404; "in this build" means nothing to a user |
| SAMPLE LEDGER / SAMPLE FOOTAGE / DEMO BUILD (NEXT_PUBLIC_DEMO=1) | /, all pages | Dev wording that only appears in the demo build |
