# G. UI transformation plan: "Sylva" look for all of Clippo

Status: **PLAN ONLY. Nothing has been built or changed in `web/`.** Waiting for owner review.
Scope: look, layout, motion, and plain words. **No functional change.** Routes, API, wallet, World ID, chain, data, state and handlers stay as they are.
Reference: ThreeUI "Sylva, Living Green" (`threeui.com/sylva--living-green`). Read in full: the canonical HTML (4,304 lines, 198 KB). Taken as **inspiration only**. Not copied. I have not checked ThreeUI's licence terms.
Current state read from: `docs/ui/01` to `06`, `globals.css` and 11 other CSS files, `layout.tsx`, `Shell.tsx`, 16 screenshots, `scripts/*` (tests that depend on UI text).

---

## 1. Honest verdict on today's UI

1. **The newspaper theme is a costume, not a product design.** Cream paper, Bodoni headlines, mono micro-labels, hard black boxes, offset shadows and rubber stamps tell a "clipping bureau" joke. The product is a money-and-video marketplace. A first-time creator or brand must decode the joke before doing the task.
2. **The words are the biggest usability bug.** From the glossary doc: "Desk" has five meanings. "Wire", "Ledger", "Bench", "Slip", "Standing", "Tray", "Dateline", "Docket" are print jargon. "Bench" (admin only) is in everyone's nav. The brand tagline says nothing about what Clippo does.
3. **Everything is the same size and weight.** The Desk page is a long wall of uppercase mono labels, rules and tables. There is no clear first action, no visual rest, no hierarchy beyond "big serif" and "tiny mono".
4. **The landing page has no focal point.** It is a grid of 22 identical sample-video tiles, three more tiles in the steps, then text. It reads as a contact sheet.
5. **Small type is overused.** Micro labels are 11 to 12 px. Contrast on `ink-3` at that size was never measured (doc 06 §6d).
6. **What is genuinely good and must survive:** the three verdicts (Approved / Rejected / Needs human) as an idea, the "Nothing was changed / no money moved" reassurance copy, real-money clarity (fee preview, escrow), error recovery text, skip link and focus rings.

## 2. What the Sylva reference really is (and what it is not)

It is **one hero screen**, not an app. Facts from the source:

| Part | How it is built |
|---|---|
| Layout | A fixed 1600 × 880 "stage". Every element is absolutely positioned in `calc(N * var(--u))`, where `--u = 100vw / 1600`. |
| Canvas | Flat dark ground `#4a4d44` plus a pale radial "light pool" at the bottom edge. Three.js moss scene on top. |
| Nav | A floating capsule "dock" of pills (46u tall, radius 14u, 1px 11% white border, 74% dark fill, lit top edge). The pill under the pointer magnifies. A conic-gradient rim follows the pointer. The current item wears the card paper colour. |
| Type | Lexend, weight 300 everywhere. Headline 63u / 65u line, tracking -0.4u (-0.006em). Body 16.5u. Labels 11u uppercase, 1.5u tracking. |
| Cards | Cream `#f2f3ef`, radius 46u, inner photo window radius 34u, soft 30u/70u shadow. Round white "knob" buttons with a leaf glyph. |
| Controls | Two WebGL2 "liquid metal" buttons (5-pass renderer) over a dark glass plate. |
| Motion | CSS transitions and keyframes plus about 150 lines of vanilla JS. **No Framer Motion.** |
| Motion values | Easings `cubic-bezier(.22,.61,.36,1)` and `cubic-bezier(.16,1,.3,1)`. Clip-path wipes 1.05 s with 80 to 120 ms stagger. Headline rises 16u while fading, 1.05 s / 1.25 s. Image zooms 1.08 to 1.13 over 1.25 s on hover. Pointer parallax by layer (`--pd`, `--pr`). Stepped "pixel" reveal on photos. Scroll cue "trickle" loop 2.6 s. Full `prefers-reduced-motion` fallback. |

**Critical points for us:**
- **We cannot copy the layout.** Absolute positioning in vw units is a poster. It cannot hold tables, forms, wizards or a dashboard. We take the *design language* (ground, light, glass dock, cream cards, round knobs, light type, mask reveals, parallax) and rebuild it on a normal responsive grid.
- **The reference's small text is too small.** At a 1280 px screen, 11u is 8.8 px and 13.5u is 10.8 px. We floor body at 14 px and labels at 12 px.
- **Weight 300 on dark is fine for a 63 px headline, poor for table text.** Display 300, UI and data 400.
- **We should not put WebGL on every page.** It costs battery on phones and adds a dependency. See §8.
- The reference dodges `backdrop-filter` over a moving canvas on purpose (it measured ~20 fps). We follow that rule.

## 3. Design direction

**Name: "Clippo Night Studio".** A dark, calm studio canvas, one soft light pool, floating glass dock, cream paper cards that hold the real content, round action knobs, light type, slow confident motion. Reads as modern social-video tooling, not newspaper.

**No green anywhere.** The Sylva olive ground, moss, leaf glyphs and `--ok` greens are removed.

### 3.1 Colour tokens (proposal, hex to be tuned on screen)

| Token | Dark canvas (default) | Use |
|---|---|---|
| `--bg` | `#14151a` | page ground (blue-black, not olive) |
| `--bg-2` | `#1b1d24` | raised bands, dock fill base |
| `--pool` | warm `rgba(255,232,210,.40)` radial at bottom | replaces the green light pool |
| `--ink` / `--ink-soft` / `--ink-faint` | `#fff` / `.66` / `.52` white | text on canvas. Reference `.44` is about 4.3:1 on this ground (my estimate, to be measured) and fails AA for small text, so I raise it. |
| `--rule` | `rgba(255,255,255,.07)` | hairlines, column guides |
| `--card` / `--card-ink` / `--card-label` | `#f3f1ec` / `#1e1f24` / `#6f727b` | cream cards (warm, not green-grey) |
| `--accent` | `#ff5a1f` (today's Clippo orange) | one accent: primary CTA hover, live dot, money emphasis, chart peak |
| Status | Approved: cream/white pill + check icon. Rejected: coral `#e5604f`. Needs review: amber `#e0a63a`. | **No green for approved** (see Decision D1) |

Light mode: kept as a toggle (decision D2). Canvas `#eceae4`, cards white, same accent.

### 3.2 Type

| Role | Font | Notes |
|---|---|---|
| Display | Lexend 300, tracking -0.006em, fluid `clamp(2.5rem, 5vw, 4.5rem)` | Matches the configured hero (63 px at 1600). Replaces Bodoni. |
| UI / body | Lexend 400, 15 to 16 px | Table and form text. Replaces Schibsted Grotesk. |
| Labels | Lexend 500, 12 px, uppercase, +0.08em | Replaces Martian Mono micro labels, but used sparingly. |
| Numbers | Lexend with tabular figures if available, else a mono **only** for wallet addresses, hashes, and aligned money columns | To verify: Lexend tabular figure support. |

Three Google fonts become one (plus an optional mono). Faster load. Italics (the "one italic word" device) are dropped.

### 3.3 Shape, depth, spacing

- Radius scale: controls 12, small cards 20, cards 32, hero cards up to 46, pills and knobs 999. (Today: radius 0 everywhere.)
- Shadows: soft, large, low-opacity (reference `0 30 70 rgba(16,21,13,.30)`). No hard offset shadows, no noise texture, no double rules.
- Grid: 12 columns, max width 1280, 24 px gutters (mobile 16). Section rhythm 96 / 64 / 40 px.
- Column guides: faint 1px vertical hairlines on the landing hero only (a reference signature).

## 4. Components (re-skinned, same names where possible)

**Key technique to protect function:** keep the existing class names (`.btn`, `.slip`, `.ledger`, `.stamp`, `.tag`, `.field`, `.seg`, `.kv`, `.empty` ...) and change only their CSS. Most pages then change look without their TSX being touched. TSX is edited only for the shell, landing, and copy.

| Component | New look |
|---|---|
| **Dock** (replaces masthead + dateline) | Floating glass capsule, centred. Mark tile at left (solid pale), nav pills with 16px line icons and plain labels, current page = cream pill. Right side: wallet pill and theme toggle. Pointer magnify + rim light on desktop (fine pointer only). Mobile: bottom dock, icon **and** label, 48 px targets. |
| **Button** | Three kinds: *Primary* (solid white pill, dark text, accent on hover), *Glass* (translucent pill with lit top edge and rim light), *Knob* (58 px round, cream, arrow glyph, scales 1.1 and rotates 8deg on hover). Replaces black boxes with hard shadow. |
| **Card** | Cream, radius 32, soft shadow that deepens on hover (.8 s). Holds content that needs high contrast: forms, tables, campaign cards. |
| **Stat tile** | On canvas: glyph + small label + semibold value, as the reference stats. |
| **Verdict** (was Stamp) | Pill with icon: Approved / Rejected / Needs your review. Keeps the confidence number as small text. The tilted rubber stamp goes. Keep `role="status"` behaviour as is. |
| **Table** | Rows on a cream card, 1px soft dividers, right-aligned numbers, no uppercase mono header row. Mobile reflow behaviour kept. |
| **Chart / bars / TickBar** | Same data and markup. Recoloured: ink bars, accent peak, no green or red-green pair (approved vs rejected uses cream vs coral). |
| **Field / inputs / seg / pick** | Dark glass inputs on canvas, white-on-cream inside cards, 48 px height, clear focus ring (2px white + 4px accent halo). |
| **Dialog / sheet** (wallet picker, World ID sheet, role chooser, step-up) | Cream card on dimmed canvas, mask-wipe in, knob close. Same `role`s and focus handling. |
| **Banner / notice / empty / service-state** | Slim glass pill (testnet), calm empty cards with one action. Error text unchanged. |
| **Media tile** (`LoopClip`) | Rounded portrait window (radius 24 to 34), poster first, slow zoom on hover, existing 2-at-a-time cap on small screens kept. |

## 5. Plain-words plan (copy only, owner must approve each row)

Rule: **URLs do not change** (`/wire`, `/slips/[id]` ... stay). Only visible labels and headings change. Chosen approach = doc 06's Option 2 (plain names), keeping the stamp idea only as the Verdict pill.

| Today | New visible word | Where |
|---|---|---|
| Wire / "The Wire" | **Campaigns** | nav, page title, links ("Browse the wire" to "Browse campaigns") |
| Hire | **Hire creators** | nav, page |
| Desk / "The Desk" (dashboard) | **My campaigns** | nav, page title |
| Desk (the role) | **Brand** / **Creator** | role chooser, account, footer |
| Ledger / "The Ledger" | **Earnings** | nav, page |
| Bench | **Admin review** | nav, page |
| Slip | **Campaign** | 3 places |
| Standing | **Top creators** (list) / **Your level** (own tier) | wire, ledger rail |
| Status ladder | **Creator levels** | page, links |
| Pool | **Budget** (everywhere, one word) | wizard, fund, cards |
| Tray | **Shortlist** (Hire) / **Clips to review** (Desk) | desk, hire |
| Needs human | **Needs your review** | verdict pill |
| Agent note / Correction | **AI reason** / **Problem** | desk, slips |
| Dateline strip | removed; "Test network" moves into the testnet banner | shell |
| "Clipping bureau" tagline | removed (see headline below) | shell |
| "Eight questions" | "Step N of M" | landing, wizard |
| Hero headline | **"Pay only for clips that pass."** (already the site title) + one-line lede | landing |

**Test-script dependency (important):** the e2e scripts look for exact text: `Connect wallet`, dialog `/Which desk/`, button `/I clip: creator/`, `Verify with World ID`, `Close`, `Get my new code`, `Confirmed`, `No wallet found`, plus `button.wallet`, `data-testid="wallet-picker"`, `.cb`, `video.lc-vid`, `#title`, `#pool`, `.suggest button`, `form button.btn:not(.ghost)`. Rule: those classes and ids stay. If an owner-approved word change touches one (for example "Which desk"), I update the script in the same change and say so.

## 6. Page by page

Six templates cover 18 screens plus the 404. Every page gets: dock, canvas, light pool, footer, same type and cards.

| Template | Pages | Treatment |
|---|---|---|
| **T1 Hero landing** | `/` | Full Sylva composition (see §7). |
| **T2 Browse** | `/wire`, `/hire`, `/hire/lists/[token]` | Big light headline, pill filter row, cream campaign cards in a responsive grid. Creator ranking ("Top creators") as a card with a leading rank knob. No invented thumbnails: cards use the brief and rate, because campaigns have no media. |
| **T3 Detail** | `/slips/[id]`, `/hire/w/[id]`, `/hire/share/[token]` | Two columns: sticky summary card (budget, rate, join button) + stacked content cards (brief, views, submissions). |
| **T4 Dashboard** | `/desk`, `/ledger`, `/bench`, `/status`, `/referrals`, `/profile` | Top row of stat tiles on canvas, content on cream cards, section headers in light type, soft row tables. `/bench` uses a compact density variant. |
| **T5 Flow** | `/join`, `/desk/new`, `/desk/[id]/fund`, `/hire/brief`, `/account` | One centred cream card, visible step progress, one large headline per step, primary pill pinned at the bottom of the card. |
| **T6 System** | `not-found`, banners, empty / loading / error, dialogs | One consistent set (see §4). |

## 7. Landing hero (the one place we copy the reference closely)

Layout on a 12-col grid (not absolute positioning). Same layers as Sylva:

1. Canvas with warm light pool and faint column guides.
2. Floating dock (shared with every page).
3. Headline "Pay only for clips that pass." in Lexend 300, two lines, rises in line by line.
4. Lede (about 20 words) and two actions: **Start a campaign** (glass pill, the liquid-glass look in CSS) and **Browse campaigns** (round play-style knob).
5. **The media layer, replacing the moss scene:** 3 to 4 tall rounded phone-shaped windows floating at different depths, playing the existing `public/clips/c1` to `c12` loops (muted, posters first). Pointer parallax by depth. Honest limit: these files are 360 × 640 and about 65 to 350 KB each. Fine at 200 to 320 px wide, soft if enlarged, so we never use them full-bleed. Every tile keeps its "Sample footage" caption (we must not pass stock clips off as real creators).
6. Two stat chips (as the reference): live pool and campaigns open, from the **same data source the page uses today** (`PoolTicker`).
7. Cream cards: "How it works" (the existing 6 steps as 3 + 3) and the verdict explainer.
8. Scroll cue "Discover" with trickle line.

Mobile: single column, hero clips become a horizontal row, dock moves to the bottom.

## 8. Motion system (one set, used everywhere)

| Moment | Motion | Source value |
|---|---|---|
| Page load (hero) | Mask wipe per element, stagger 80 to 120 ms. Headline lines rise 16 px + fade. | 1.05 s, `--ease-out` |
| Below-the-fold sections | Same wipe when they enter the viewport (one `IntersectionObserver` hook, runs once) | 0.9 s |
| Route change | Content fade + 12 px rise in `main`; dock stays | 0.35 s |
| Hover: card | Shadow deepens, inner media scales 1.08 to 1.13 | .8 s / 1.25 s |
| Hover: knob | scale 1.1, rotate 8deg | .5 s |
| Dock | Magnify by pointer distance, rim light follows pointer (desktop, fine pointer only) | reference JS |
| Pointer parallax | Hero layers only, plus card media on desktop | 1 to 22 px by depth |
| Press | Plate sinks, shadow shortens | .10 s |
| Dialog | Mask wipe from the trigger edge | .5 s |
| Reduced motion | All of the above off, content shown at once | as reference |

**Framer Motion:** the reference does not use it. I recommend CSS + 3 small hooks (`useReveal`, `usePointerParallax`, `useDockMagnify`), no new dependency, same feel. If you want Framer Motion (`motion` package) for route transitions, say so (D4).

**Not copied, by design:** the Three.js moss scene and the two WebGL2 liquid-metal buttons. A CSS-only "liquid glass" pill (layered gradients, lit top edge, specular conic rim) gives 80% of the look at 0 KB and no GPU cost. An optional WebGL hero scene is possible later (adds `three`, about 600 KB, needs a mobile and context-loss fallback). I recommend not doing it now.

## 9. The "no functional change" guard

**Allowed to edit:** `*.css`, `layout.tsx` (fonts, wrapper), `Shell.tsx`, `landing/*`, presentational parts of components (`className`, wrapper elements, icons/SVG, static copy), new files under `components/ui/` (CSS + the 3 motion hooks), copy in docs.
**Not touched:** `app/api/**`, `lib/**`, `prisma/**`, `contracts/`, `cre/`, `hooks.ts`, `api.ts`, `wallet.ts`, `format.ts` logic, click/submit handlers, state, effects, routes, props, data shapes, env handling, auth and role checks.
**Checks after every phase:** `npm run typecheck`, `npm run lint`, `npm test` (vitest), `npm run check:overflow`, a diff review that lists any non-presentational line touched, and Playwright screenshots of all screens at 1440, 820 and 390 px, before vs after.
**Not proven yet:** whether the e2e scripts (`e2e:wallet`, `e2e:world`, `scripts/e2e-confirmed-ui.mjs`) run on this machine. They need a DB and env. I will run them at the baseline first and report honestly. If they cannot run, I will say "not proven".

Known risks:
- Text-matching tests (§5) break if a word changes without updating the script.
- Stacking contexts: the reference's own comments warn that `clip-path` / `transform` on a card traps children. We use `intro-done` (drop the clip after reveal) as it does.
- `check:overflow` will fail on any new horizontal overflow, which protects mobile.
- Contrast and 44 px targets are to be measured, not assumed.

## 10. Phases (each is one reviewable commit with a build-log entry)

| # | Phase | Output | Your review |
|---|---|---|---|
| 0 | Baseline | Run typecheck/lint/test/overflow/e2e on the untouched code. Take "before" screenshots. | Numbers |
| 1 | Foundation | Tokens, Lexend, base CSS, buttons, cards, inputs, pills, verdict. Old class names kept. | Style sheet page |
| 2 | Shell | Dock, footer, banners, theme toggle, wallet pill, mobile dock. | Any page in the new shell |
| 3 | Landing | Hero, media layer, steps, verdict section. | Landing |
| 4 | Browse + Detail | `/wire`, `/hire*`, `/slips/[id]`, workspace pages | 5 screens |
| 5 | Dashboards | `/desk`, `/ledger`, `/bench`, `/status`, `/referrals`, `/profile` | 6 screens |
| 6 | Flows + dialogs | `/join`, wizard, fund, brief, account, wallet/World ID sheets, 404 | 8 screens |
| 7 | Polish | Motion consistency pass, contrast, reduced motion, mobile QA, update `docs/ui` and `BUILD_LOG.md` | Full walk-through |

## 11. Decisions I need from you (my default is in bold)

- **D1 Colour and green.** Default: dark blue-black ground, warm cream cards, orange as the one accent, **no green anywhere, including "Approved"** (approved = white pill with check). Alternative: keep one small green only for the Approved state because it is instantly read. Or swap orange for another accent. Tell me the hex if you have one.
- **D2 Modes.** Default: **dark by default, keep a light mode toggle.** Alternative: dark only (less work, removes the existing toggle).
- **D3 Hero.** Default: **CSS-only, with the existing `/clips` videos in floating phone windows.** Alternative: real WebGL hero scene later.
- **D4 Motion tool.** Default: **CSS + 3 small hooks, no new package.** Alternative: add Framer Motion (`motion`) for route transitions.
- **D5 Words.** Default: **Option 2 plain names from §5**, URLs unchanged. Alternative: keep print names with plain sublabels.
- **D6 Nav.** Default: **all 6 items stay visible** (hiding "Admin review" from non-admins is a behaviour change, so I suggest it only as a separate approved change later).
- **D7 Fonts.** Default: **Lexend only**, mono only for addresses and hashes.
- **D8 Git.** Default: commit per phase on this worktree's branch, **no push** until you say. (The repo rule says push to `feat/core-sponsor-integration`; this worktree is a different branch.)
- **D9 Licence.** Confirm we use ThreeUI only as inspiration. If you hold a licence and want its source used directly, tell me and I will plan that separately.
