# A. Design system (as implemented)

Source: branch `docs/ui-guide` at `bb2fbec`. Paths are under `web/src/` unless shown. Plain CSS, no utility framework, no Tailwind.

Files read: `design/DESIGN.md` (intended), `app/globals.css` (644 lines), `app/landing.css`, `app/testdeploy.css`, `components/{ext,market,confirmed,service-state,LoopClip,wallet-picker}.css`, plus three more CSS files that carry real styles: `components/landing/hero.css`, `components/landing/clipband.css`, `components/workspace/workspace.css`. Also `app/layout.tsx`, `Icons.tsx`, `Marks.tsx`, `Stamp.tsx`, `Bits.tsx`, `format.ts`, `ServiceState.tsx`, `LoopClip.tsx`, `Shell.tsx`.

Short names: G = `app/globals.css`, WS = `components/workspace/workspace.css`, MK = `components/market.css`, EX = `components/ext.css`, HX = `components/landing/hero.css`, CB = `components/landing/clipband.css`.

Where each CSS file loads (Next bundles it globally once imported): G and testdeploy.css from `app/layout.tsx:4-5`; landing.css from `app/page.tsx:3`; market.css from Standing, FeePreview, LedgerDash, DeskAnalytics, WireView, Marks, ModulePages; ext.css from DealPanel, CreatorAssistant, AppealPanel, SourceStep, AdminAssistant; workspace.css from `workspace/parts.tsx:2`; hero.css and clipband.css from `landing/Hero.tsx:6-7`; confirmed.css from ConfirmedViews; service-state.css from ServiceState; LoopClip.css from LoopClip; wallet-picker.css from WalletPicker.

---

## 1. Fonts

### 1.1 Loading

All three fonts load with `next/font/google` in `app/layout.tsx`. The CSS variables are put on `<html>` (`layout.tsx:45`). The app tokens then wrap them with fallbacks (`G:20-22`).

| Role | Family | next/font variable | Loaded styles and weights | `display` | Subsets | layout.tsx |
|---|---|---|---|---|---|---|
| Display | Bodoni Moda | `--font-display` | normal + italic, weights 500, 600, 700 (static, six files) | swap | latin | 9-15 |
| Text | Schibsted Grotesk | `--font-text` | normal only, weights 400, 500, 700 | swap | latin | 16-21 |
| Mono | Martian Mono | `--font-mono` | normal only, weights 400, 500, 700 | swap | latin | 22-27 |

Facts about axes (checked in `node_modules/next/dist/compiled/@next/font/dist/google/font-data.json`):
- Bodoni Moda has an `opsz` axis (6 to 96, default 11). The layout passes explicit weight lists and no `axes` option, so next/font requests static weights and does **not** request `opsz`. `font-optical-sizing: auto` in `G:122` therefore has no effect. Large headlines use the default optical size.
- Schibsted Grotesk has italic in the family, but the layout loads `normal` only. Any `font-style: italic` on the text family is a browser-synthesized slant (faux italic).
- Martian Mono has a `wdth` axis (75 to 112.5). It is not requested. Only weights 400/500/700 load.
- Weight 600 is not loaded for Schibsted or Martian Mono. The browser picks the nearest file (700 for a 600 request). `testdeploy.css:8` asks for `font: 600 ...` on mono.
- Only the `latin` subset loads. Characters outside latin fall back to the system font.

### 1.2 Tokens and fallback stacks (`G:20-22`)

| Token | Value |
|---|---|
| `--f-display` | `var(--font-display), "Bodoni MT", "Didot", Georgia, serif` |
| `--f-text` | `var(--font-text), "Helvetica Neue", Arial, sans-serif` |
| `--f-mono` | `var(--font-mono), ui-monospace, "Cascadia Mono", Consolas, monospace` |

`next/font` also adds its own size-adjusted fallback face inside each `--font-*` variable (default `adjustFontFallback`). The exact generated names are not determined.

`testdeploy.css:8` bypasses the tokens: `var(--font-mono, monospace)`.

### 1.3 Roles and where they are used

| Role | Used for | Classes (CSS) |
|---|---|---|
| Display (Bodoni) | Headlines, big names, rank numbers, step numbers, card titles | `.display` (G:122), `.wordmark b` (G:180, italic 700), `.section-title h2` (G:160), `.ticket-body b` (G:269), `.slip h3` (G:299), `.ledger .rank` (G:329), `.empty b` (G:381), `.docket .n` (G:410), `.steps-strip h3` (G:432), `.wizard legend` (G:444), `.service-state b` (service-state.css:10), `.x-box > h3` and `.x-head` (EX:5), `.x-drop b` (EX:25), `.x-slate b` (EX:30, italic 500), `.x-docket b` (EX:41), `.x-match a.t` (EX:56), `.x-case .rk` (EX:88), `.x-track b` (EX:84), `.rung .n` and `.rung h3` (MK:81,85), `.ws-tiers button b` (WS:12), `.ad h3` (WS:24, 700), `.ws-brief > section > h2` (WS:58), `.ws-offer .who b` (WS:66), `.ws-ledger .name` (WS:81), `.ws-track-row .name` (WS:104), `.hx-quote` (HX:32). Four inline styles also use it (for example `Bits.tsx`, `Wizard.tsx`). |
| Text (Schibsted) | Body copy, buttons, hints, notes, inputs, table body text | `body` (G:83), `.btn` (G:229), `.pick button` (MK:50), `.field input` (inherits via `button, input... { font: inherit }` G:103). Everything not set to mono or display. |
| Mono (Martian) | All money, views, IDs, addresses, labels, nav, stamps, table headers, chips | `.mono`, `.fig`, `.fig-xl`, `.micro` (G:128-133), `.skip` (G:116), `.dateline` (G:173), `.wordmark small` (G:182), `.nav a` (G:185), `.menu-btn` (G:199), `.wallet` (G:214), `.toggle-theme` (G:218), `.field label` (G:246), number inputs (G:256), `.unit span` (G:258), `.idx` (G:268), `.slip .serial/.rate b/.rate span` (G:298,303,304), `.tag` (G:306), `.ledger th`, `td.n`, `.sub` (G:321,325,331), table reflow label `td::before` (G:341), `.stamp` (G:353), `.state-load` (G:375), `.kv dt/dd` (G:390-391), `.seg button` (G:396), `.ticker-track` (G:402), `.steps-strip .n` (G:431), `.chart text` (G:454), `.tier` (MK:5), `.heat` (MK:21), `.legend` (MK:38), `.vd` (MK:75), `.copyline` (MK:88-89), `.hash` (MK:91), `.x-label` (EX:8), `.x-mono-line` (EX:13), `.x-risk .k/.r` (EX:46,50), `.x-offer .who/.rate` (EX:62-63), `.x-match .fit` (EX:55), `.ad .niche/.facts` (WS:27,35), `.tier-mark` (WS:43), `.dec-btns button` (WS:83), `.track-labels` (WS:101), `.ws-track-row .stat` (WS:105), `.testnet-banner` (testdeploy.css:8). |

### 1.4 Type scale

The body base is `1rem` (16px), `line-height 1.55` (`G:84-85`). At 1024px and wider the body becomes `var(--fs-body)` = `clamp(1rem, 0.96rem + 0.2vw, 1.2rem)` (`G:539, 599`). Root font size grows on big screens (see section 3.4), so every rem value grows with it.

Fluid tokens (`G:534-541`): `--fs-micro: clamp(0.75rem, 0.72rem + 0.12vw, 0.85rem)`, `--fs-small: clamp(0.875rem, 0.85rem + 0.12vw, 1rem)`, `--fs-body` above. `--space-section` (G:536) and `--measure: 66ch` (G:540) are defined and never used.

| Class | Family | Size | Weight | Line height | Tracking | Case | File:line |
|---|---|---|---|---|---|---|---|
| `body` | text | 1rem; from 1024px `--fs-body` | 400 | 1.55 | normal | normal | G:78-89, 599 |
| `.display` | display | set by other class | 600 | 0.98 | -0.02em | normal | G:122 |
| `.display em` | display | inherit | 500 italic | inherit | inherit | normal | G:123 |
| `.h1` | display | clamp(2.6rem, 7.2vw, 6.2rem) | 600 | 0.98 | -0.02em | normal | G:124 (unused) |
| `.h2` | display | clamp(1.9rem, 3.6vw, 2.9rem) | 600 | 0.98 | -0.02em | normal | G:125 |
| `.h3` | display | 1.6rem | 600 | 1.05 | -0.02em | normal | G:126 |
| Page title (`PageHead` h1) | display | inline clamp(2.4rem, 5.5vw, 4.4rem) | 600 | 0.98 | -0.02em | normal | Bits.tsx:115 |
| Landing title `.hx-h` | display | clamp(2.9rem, 8.6vw, 7.4rem); phones clamp(2.9rem, 13.4vw, 5.2rem) | 600 | 0.88 | -0.035em | normal | HX:6, 53 |
| `.lead` | text | clamp(1.1rem, 1rem + 0.5vw, 1.5rem) (first set 1.2rem) | 400 | 1.5 | normal | normal | G:127, 545 |
| `.micro` | mono | var(--fs-micro) 12px to 13.6px (first set 0.75rem) | 400 | inherit | 0.09em | UPPER | G:129-131, 542 |
| `.mono` | mono | inherit | inherit | inherit | normal | normal | G:128 |
| `.fig` | mono | inherit | inherit | inherit | -0.02em | normal | G:132 |
| `.fig-xl` | mono | clamp(2rem, 5vw, 3.6rem) | 500 | 1 | -0.05em | normal | G:133 |
| `.muted` | inherit | inherit | inherit | inherit | inherit | normal | G:134 (color only) |
| `.prose` | text | inherit | inherit | inherit | inherit | normal | G:136-137 (max 64ch) |
| `.wordmark b` | display | 2.6rem (2.1rem at 860px and below, 1.8rem on short landscape) | 700 italic | 0.9 | -0.04em | normal | G:180, 196, 620 |
| `.wordmark small` | mono | 0.75rem | 400 | inherit | 0.1em | UPPER | G:182 |
| `.nav a` | mono | 0.75rem (0.85rem at 860px and below) | 400 | inherit | 0.08em (0.05em at 861-1180px) | UPPER | G:185, 204, 633 |
| `.dateline` | mono | 0.75rem | 400 | inherit | 0.09em | UPPER | G:173 |
| `.btn` | text | 0.95rem | 700 | inherit | 0.01em | normal | G:229 |
| `.btn.sm` | text | 0.9rem | 700 | inherit | 0.01em | normal | G:239 |
| `.linkbtn` | text | inherit | 700 | inherit | normal | normal | G:241 |
| `.field label`, `.field .lab` | mono | 0.75rem | 400 | inherit | 0.09em | UPPER | G:246 |
| `.field input/select` | text | 1.05rem (1rem at 860px and below) | 400 | inherit | normal | normal | G:248, 485 |
| `.field input[type=number]` | mono | 1.6rem | 400 | inherit | -0.04em | normal | G:256 |
| `.field .hint` | text | 0.875rem | 400 | inherit | normal | normal | G:253 |
| `.field .err` | text | 0.875rem | 700 | inherit | normal | normal | G:255 |
| `.ticket-body b` | display | 1.55rem (1.3rem at 340px and below) | bold (700) | 1.02 | -0.02em | normal | G:269, 500 |
| `.ticket-body .idx` | mono | 0.75rem | 400 | inherit | 0.1em | normal | G:268 |
| `.ticket-body span.d` | text | 0.875rem | 400 | inherit | normal | normal | G:270 |
| `.slip h3` | display | 1.7rem (2.3rem for 1st and 5th of every five; 1.5rem at 420px and below) | 600 | 1.02 | -0.02em | normal | G:299-300, 491 |
| `.slip .rate b` | mono | 2rem (1.7rem at 420px and below) | 500 | inherit | -0.06em | normal | G:303, 492 |
| `.slip .rate span` | mono | 0.75rem | 400 | inherit | 0.06em | UPPER | G:304 |
| `.slip .serial` | mono | 0.75rem | 400 | inherit | 0.1em | normal | G:298 |
| `.tag` | mono | 0.75rem | 400 | inherit | 0.08em | UPPER | G:306 |
| `table.ledger` body | text | 0.9rem | 400 | inherit | normal | normal | G:318 |
| `.ledger th` | mono | 0.75rem | 500 | inherit | 0.09em | UPPER | G:321 |
| `.ledger td.n` | mono | inherit | inherit | inherit | normal | normal | G:325 |
| `.ledger .rank` | display | 1.6rem | 600 | 1 | normal | normal | G:329 |
| `.ledger .sub` | mono | 0.75rem | 400 | inherit | normal | normal | G:331 |
| `.stamp` | mono | 0.8rem | 700 | 1.2 | 0.12em | UPPER | G:353 |
| `.stamp small` | mono | 0.75rem | 500 | inherit | 0.1em | UPPER | G:364 |
| `.stamp.xl` | mono | 1.9rem (1.35rem at 420px and below) | 700 | 1.2 | 0.12em | UPPER | G:365, 494 |
| `.note` | text (faux italic) | 0.875rem | 400 | 1.45 | normal | normal | G:370 |
| `.state-load` | mono | 0.8rem | 400 | inherit | 0.04em | normal | G:375 |
| `.empty b` | display | 1.6rem | 600 | 1.05 | -0.02em | normal | G:381 |
| `.correction b` | text | inherit | 700 | inherit | normal | normal | G:384 |
| `.service-state b` | display | 1.35rem | bold (700) | 1.15 | normal | normal | service-state.css:10-14 |
| `.kv dt` / `.kv dd` | mono | 0.75rem / inherit | 400 | inherit | 0.09em / normal | UPPER / normal | G:390-391 |
| `.seg button` | mono | 0.75rem | 400 | inherit | 0.08em | UPPER | G:396 |
| `.pick button` | text | 0.85rem | 700 | inherit | normal | normal | MK:50 |
| `.section-title h2` | display | 1.9rem | 600 | 1 | -0.02em | normal | G:160 |
| `.wizard legend` | display | clamp(2.1rem, 5vw, 3.6rem) | 600 | 1 | -0.025em | normal | G:444 |
| `.docket .n` | display | 2.2rem | 600 | 1 | normal | normal | G:410 |
| `.steps-strip .n` | mono | 0.75rem | 700 | inherit | 0.08em | normal | G:431 |
| `.steps-strip h3` / `p` | display / text | 1.35rem / 0.875rem | 600 / 400 | 1.05 / inherit | -0.01em / normal | normal | G:432-433 |
| `.foot p` | text | 0.875rem, then `--fs-small` | 400 | inherit | normal | normal | G:223, 590 |
| `.chart text`, `.daily text` | mono (SVG) | 10px (SVG units, scales with the viewBox) | 400 | n/a | normal | normal | G:454, MK:44 |
| `.testnet-banner` | mono | 0.78rem | 600 (renders 700) | 1.35 | 0.02em | normal | testdeploy.css:8-9 |
| `.track-labels` | mono | **0.55rem (8.8px)** | 400 | inherit | 0.04em | UPPER | WS:101 |
| `.hx-pool` | mono | clamp(1.7rem, 5.2vw, 3.4rem) | 500 | 1 | -0.05em | normal | HX:19 |

Inline sizes in TSX (289 `style={{}}` uses): `0.875rem` x21, `0.8rem` x17, `2rem` x6, `0.9rem` x6, `0.72rem` x6, `1.5rem` x4, `2.4rem` x3.

---

## 2. Colors

### 2.1 Token table

Light values are `:root` (`G:3-27`). Dark values apply in two cases and are identical: `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) }` (`G:29-48`) and `:root[data-theme="dark"]` (`G:49-66`).

| Token | Light | Dark | Role | Example classes |
|---|---|---|---|---|
| `--paper` | `#f1ece0` | `#12100d` | Page background. Also "hole" colour for notches. | `body` (G:81), `.skip` text, `.dateline` text, `.sheet` bg (G:451), `.slip` punch holes (G:293), `.ticket-body::after` (G:275), `.lc::before` (LoopClip.css:6), `.hx-entry` (HX:28), `.progress-steps li` separator (G:416) |
| `--paper-2` | `#f8f5ec` | `#1a1713` | Raised surface: slips, boxes, chips, textarea | `.wallet` (G:215), `.ticket-body` (G:266), `.slip` (G:292), `.empty` (G:380), `.correction` (G:382), `.notice` (G:385), `.service-state`, `.ticker` (G:401), `.x-box` (EX:4), `.receipt` (MK:56), `.hx-slip` (HX:16), `.lc` (LoopClip.css:2), `.ws-total` (WS:91), `.copyline` (MK:87), `.field textarea` (G:250), `.nav a[aria-current]` (G:190) |
| `--paper-3` | `#e7e0d0` | `#221e18` | Hover wash, table band, disabled fill, "now" row fill | `.nav a:hover` (G:189), `.ledger tbody tr:hover` (G:327), `.slip:hover` (G:297), `.ticket:hover` (G:271), `.seg button:hover` (G:399), `.btn[disabled]` (G:235), `.btn.ghost:hover` (G:237), `.x-docket li[data-s=now]` (EX:39), `.x-drop:hover` (EX:22) |
| `--ink` | `#15120e` | `#ede6d6` | Main text, strong borders, selected fills | `body` color (G:82), `.btn` border (G:230), `.dateline` bg (G:172), `.ticks > i` (G:311), `.tag.solid` (G:307), selected `.ticket-body`, `.seg`, `.pick`, `.ws-tiers` (fill), `.field` underline (G:248), `.lc-vid` bg (LoopClip.css:3) |
| `--ink-2` | `#4a443a` | `#b5ac99` | Secondary text | `.micro` (G:130), `.muted` (G:134), `.lead` (G:127), `.field label/.hint` (G:246,253), `.note` (G:370), `.tag` (G:306), `.kv dt` (G:390), `.ledger th` (G:321), `.foot p` (G:223), `.chart text` (G:454), `.ad p.blurb` (WS:28) |
| `--ink-3` | `#6b6455` | `#8f8775` | Tertiary text, dashed lines, disabled text | `.slip::before` dashed (G:296), `.tag` border (G:306), `.empty` border (G:380), `.note::before` (G:371), `.btn[disabled]` (G:235), `.stamp.pending` (G:363), `.docket .n` default (G:410), `.rung .n` (MK:81), `.x-docket li` (EX:35), `.hx-k-mid` (HX:5), `.ws-ledger` passed rows (WS:76), `.vd.pending` (MK:76) |
| `--rule` | `#15120e` | `#ede6d6` | Full-strength rules (always equal to `--ink`) | `.rule*` (G:155-157), `.page-head` (G:143), `.masthead` (G:177), `.foot` (G:221), `.ledger th` (G:322), `.section-title` (G:159) |
| `--rule-soft` | `#15120e26` (ink at 15%) | `#ede6d622` (ink at 13%) | Hairlines inside content | `.ledger td` (G:324), `.nav a + a` (G:188), `.ticks` empty (G:310), `.docket li` (G:407), `.x-list li` (EX:15), 35 uses in CSS and 7 in TSX inline styles |
| `--signal` | `#e8420c` | `#ff5a1f` | The one accent: action, money, "current" | `.btn` bg (G:230), `::selection` (G:106), focus ring (G:111), `.nav a[aria-current]` underline (G:190), `.slip .rate b` (G:303), `.docket li[data-s=now] .n` (G:412), `.progress-steps li[data-s=now]` (G:418), `.ticks.sig` (G:313), `.steps-strip .n` (G:431), `.vbadge` (G:400), `.heat b` (MK:22), `.tier[data-t="5"]` (MK:11), `.daily .col.peak` (MK:46), `.chart .dot` (G:457), `.hx-pool` (HX:19), `.track i.now` (WS:100), `.signal` utility (G:135) |
| `--signal-ink` | `#fff8ee` | `#12100d` | Text on signal | `.btn` text (G:230), `::selection` (G:106), `.tier[data-t="5"]` (MK:11), `.copyline button:hover` (MK:90), check stroke in `VerifiedMark` (Icons.tsx:131) |
| `--ok` | `#1d5c3a` | `#5dbb8a` | Approved, paid, settled | `.stamp.ok` (G:360), `.vd.ok` (MK:76), `.x-label.ok` (EX:12), `.x-track li[data-s=ok]` (EX:81), `.split-bar .ok` (MK:35), `.cv-badge` (confirmed.css:7), `.hx-pay` border and `.hx-amt` (HX:38,40), `.dec-btns .yes` pressed bg (WS:86) |
| `--no` | `#9b1c1c` | `#e2685f` | Rejected, error, over budget | `.stamp.no` (G:361), `.vd.no`, `.x-label.no`, `.field.bad` border and `.err` text (G:254-255), `.correction` border and heading (G:382-383), `.x-risk[data-l=block] .k` (EX:47), `.split-bar .no`, `.ws-total.over` (WS:93), `.hx-quote mark` wavy underline (HX:33), 9 inline uses in TSX |
| `--hold` | `#8a5a00` | `#d9a441` | Needs human, caution | `.stamp.hold` (G:362), `.vd.hold`, `.x-label.hold`, `.notice.warn` border (G:386), `.x-risk[data-l=warn] .k` (EX:48), `.split-bar .hold` hatch (MK:37), `DemoNote` text (Bits.tsx:127), 4 inline uses in TSX |
| `--press` | `4px 4px 0 var(--ink)` | `4px 4px 0 rgb(255 90 31 / 0.4)` | Hard shadow (not a color, but it carries one) | `.btn` (G:230), `.hx-slip` (HX:16). See section 4. |
| `--noise-opacity` | `0.05` | `0.04` | Paper noise strength | `body::before` (G:96) |
| `color-scheme` | `light` | `dark` | Native controls and scrollbars | `:root` (G:26, 46, 65) |

Defined but unused tokens: `--measure` (G:540), `--space-section` (G:536).

### 2.2 Semantic rules (as the CSS uses them)

| Color | Meaning on screen | Evidence |
|---|---|---|
| `signal` (orange) | Money and action and "you are here". Primary button fill, current nav item, current step, rate and pool figures, peak bars, focus ring, selection highlight, verified rosette, tier 5 plate. | `.btn` G:230; `.nav a[aria-current]` G:190; `.docket [data-s=now]` G:412; `.slip .rate b` G:303 |
| `ok` (green) | Approved, settled, confirmed on-chain, "yes" decision. Always with the word (APPROVED, SETTLED, Chainlink confirmed, YES). | `.stamp.ok`; `.hx-settled` HX:41; `.cv-badge`; `.dec-btns .yes` WS:86 |
| `no` (red) | Rejected, failed, invalid, over budget, blocked. Also the red "Correction" box. | `.stamp.no`; `.field.bad` G:254; `.correction` G:382; `.ws-total.over` WS:93 |
| `hold` (ochre) | Needs a human, or a caution. It is used for **two** meanings: the "Needs human" verdict, and the generic `.notice.warn` border that wraps most error and info messages. It is also the colour of the demo-data note. | `.stamp.hold`; `.notice.warn` G:386 (about 40 uses); `DemoNote` Bits.tsx:127 |
| `ink-3` dashed or dim | Pending, empty, off, not yet. `stamp.pending` and `vd.pending` use a dashed border. | G:363; MK:76 |

Rules the code follows: every status colour is paired with text (the verdict word, a label like "Cannot submit"), never colour alone. Exception: `.split-bar` segments and `.legend` rely on colour plus hatch for `hold` only (MK:33-40), and `.track i`/`.progress-steps li` are colour only (they have `role="img"` or `aria-hidden`).

The decision buttons break the pattern: pressed "No" is ink fill, not `no` red (WS:87).

### 2.3 Contrast ratios (WCAG 2.x formula, computed with a Python script)

Body text needs 4.5:1. Large text (24px, or 18.66px bold) and UI graphics need 3:1.

| Pair | Paper (light) | Night (dark) | Note |
|---|---|---|---|
| ink on paper | 15.84 | 15.28 | pass |
| ink on paper-2 | 17.13 | 14.36 | pass |
| ink on paper-3 | 14.20 | 13.33 | pass |
| ink-2 on paper | 8.18 | 8.43 | pass |
| ink-2 on paper-2 | 8.84 | 7.93 | pass |
| ink-2 on paper-3 | 7.33 | 7.36 | pass |
| ink-3 on paper | 4.98 | 5.33 | pass |
| ink-3 on paper-2 | 5.38 | 5.01 | pass |
| ink-3 on paper-3 | **4.46 FAIL** | 4.65 | light fails by 0.04. Hits hover rows with dim text (WS:76) |
| signal on paper | **3.42 FAIL** | 6.09 | light: large text and graphics only |
| signal on paper-2 | **3.69 FAIL** | 5.73 | same |
| signal on paper-3 | **3.06 FAIL** | 5.32 | same |
| signal-ink on signal | **3.82 FAIL** | 6.09 | this is the primary button label (15.2px bold) |
| ok on paper | 6.74 | 8.09 | pass |
| ok on paper-2 | 7.29 | 7.60 | pass |
| no on paper | 6.91 | 5.77 | pass |
| no on paper-2 | 7.48 | 5.42 | pass |
| hold on paper | 5.03 | 8.44 | pass |
| hold on paper-2 | 5.44 | 7.94 | pass |
| hold on paper-3 | 4.51 | 7.37 | pass, barely |
| paper on ink (dateline, selected chips, `.menu-btn` open) | 15.84 | 15.28 | pass |
| paper-2 on ok (`.dec-btns .yes` pressed) | 7.29 | n/a | WS:86 |
| `#12100d` on ok dark (same button, Night) | n/a | 8.09 | WS:88-89 |
| `#1a1400` on `#ffd84a` (TESTNET banner) | 13.26 | 13.26 | same in both themes |
| `#ede6d6` on `#15120e` (`.x-slate`) | 15.02 | 15.02 | same in both themes |
| paper at 80% on ink (checked ticket small text) | 10.30 | 8.98 | pass |
| signal vs paper as a UI line (focus ring, icon) | 3.42 | 6.09 | passes the 3:1 non-text rule |
| `--rule-soft` hairline vs paper (effective colour) | 1.36 | 1.45 | decorative separators only |
| `#8a8374` select chevron vs paper (WS:7) | 3.19 | 5.05 | UI graphic, passes 3:1 |
| `--press` dark shadow (signal 40% over paper) vs paper | n/a | 1.90 | decorative |

Not used as a text pair: ink on signal is 4.64 (light) and 2.51 (dark). No class puts ink text on signal.

Signal text under 24px on a light surface (all below 4.5:1):
- `.steps-strip .n` 12px bold (G:431)
- `.heat b` 12.8px bold (MK:22)
- `.linkbtn:hover` 16px bold (G:242)
- `.ws-brief > section > h2 .micro` 12px bold (WS:59)
- role label in the wallet chip, inline `color: var(--signal)` (Shell.tsx:127)
- `.signal` utility on small text (G:135)
- `.tier[data-t="5"]` and `.copyline button:hover` 12px with signal-ink on signal, 3.82:1 (MK:11, 90)

Large signal text that passes the 3:1 rule: `.slip .rate b` 32px (3.69 on paper-2), `.hx-pool`, `.docket .n`, `.rung .n`, `.signal` in the hero headline.

### 2.4 Hard-coded colors outside the tokens

CSS (all token definitions in `G:4-16, 31-45, 50-64` are excluded):

| File:line | Value | What it colors | Switches with theme? |
|---|---|---|---|
| G:44, 63 | `rgb(255 90 31 / 0.4)` | Dark `--press` shadow (copy of dark `--signal`) | dark only by design |
| G:97 | black noise (feColorMatrix `0 0 0 0 0`, alpha from turbulence) | Paper noise tile in `body::before` | no. Black at 4% on near-black paper is invisible |
| G:450 | `rgb(21 18 14 / 0.55)` | Modal scrim `.sheet-back` | no. Over Night paper it blends to about `#14110e`, so the scrim is nearly invisible |
| testdeploy.css:10 | `#ffd84a` | TESTNET banner bg | no (same both themes) |
| testdeploy.css:11-12 | `#1a1400` | TESTNET banner text and bottom border | no |
| EX:27 | `#15120e` | Video and slate bg (`.x-player video`, `.x-slate`) | no (intentionally dark) |
| EX:28 | `#ede6d6` | `.x-slate` text | no |
| EX:29 | `rgb(237 230 214 / 0.07)` | `.x-slate` diagonal stripes | no |
| WS:7 | `%238a8374` (`#8a8374`) | Chevron in the filter `<select>` | no |
| WS:88, 89 | `#12100d` | Text on the pressed "yes" button in Night | dark only |

TSX: no hex or rgb values anywhere in `components/` or `app/` (excluding API routes). Inline styles use tokens only. Counts of tokens inside inline styles: `--no` x9, `--rule-soft` x7, `--hold` x4, `--signal` x3, `--rule` x3, `--ok` x3, `--ink-3` x3, `--ink` x3, `--signal-ink`, `--paper-2` x1 each. SVG: `Icons.tsx:131` and `:143` use `var(--signal-ink)` and `var(--signal)`. No named colors in CSS.

---

## 3. Layout and spacing

### 3.1 Page frame

The body is a flex column (`G:87-88`): skip link, TESTNET banner (test builds only), hidden ink filter, dateline, masthead, `<main id="main" tabIndex=-1>`, footer (`layout.tsx:49-63`). `body > *` is pinned to `min-width:0; max-width:100%` (`G:526`) so a wide child cannot push the page.

| Class | What it does | CSS |
|---|---|---|
| `.wrap` | Centered container: `width:100%; max-width:var(--max); margin-inline:auto; padding-inline:var(--gutter)` | G:140. At 860px and below the padding is `max(var(--gutter), env(safe-area-inset-*))` (G:484) |
| `.page` | Page body: padding-block `clamp(24px, 2.5vw + 12px, 72px)` top, `clamp(64px, 5vw + 24px, 128px)` bottom | G:142 first, G:543 final |
| `.page-head` | Title block: 1-col grid, gap 12px, bottom 3px rule, padding-bottom `clamp(18px, 2vw, 36px)`, margin-bottom `clamp(24px, 2.4vw, 48px)`. Its `.micro` kicker is a wrapping flex row, gap 12px | G:143-144, 544 |
| `main` | `flex:1; min-height:50dvh; width:100%` | G:141, 519, 527 |

`--max` by viewport (later rules override earlier ones): 1280px base (G:25); 1560px from 1800px (G:550); `min(2080px, 82vw)` from 2200px (G:551); `min(2400px, 78vw)` from 3000px (G:552). The values 1440px and 1680px (G:505, 509) are overridden and never apply.

`--gutter` (effective): `clamp(16px, 4vw, 28px)` at 860px and below (G:546); `clamp(24px, 2.2vw, 48px)` from 861px (G:547). The earlier values 24px, 16px, 32px and `clamp(16px,1.2rem+1.2vw,40px)` (G:24, 163, 505, 535) are overridden.

### 3.2 Margin rail + main column

| Class | Rule | CSS |
|---|---|---|
| `.cols` | Grid `minmax(0,3fr) minmax(0,9fr)`, gap 40px, align start. Rail on the **left**, main on the right | G:145 |
| `.cols.flip` | Grid `minmax(0,8fr) minmax(0,4fr)`. Main on the left, rail on the **right** | G:146 |
| `.rail` | `position:sticky; top:16px; display:grid; gap:24px; align-content:start` | G:147, 582 |
| `.wizard` | Same 3fr/9fr split as `.cols`, gap 40px | G:441 |
| `.ws-cols .rail` | Rail moves **above** main at 860px and below (`order:-1`) | WS:118 |

Collapse: at 860px and below `.cols`, `.cols.flip` and `.wizard` become one column (gap 28px, wizard 20px) and the rail becomes `position:static` (G:162-167, 442). The rail is also static when the viewport is 640px tall or less (G:148) and 520px tall or less (G:615).

Pages using `.cols`: SlipDetail (rail left), Directory, Wizard (progress rail). Pages using `.cols.flip` (rail right): Fund, Ledger, ModulePages (3x), ListView, SharedView, WorkspaceView, landing rules section.

Other layout helpers: `.two` (auto-fit columns min 260px, gap 32px; G:149, 516), `.stack` (grid gap 16px; G:151), `.stack-lg` (gap 32px; G:152), `.row` (flex, gap 12px, center, wrap; G:153), `.row-between` (flex, space-between, baseline; G:154), `.slips` (12-col grid, gap 24px; G:282), `.stats` (auto-fit columns min 150px; MK:25), `.tickets` (auto-fit min 230px, gap 14px; G:261), `.suggest` (auto-fit min 200px; G:448), `.ws-ads` (auto-fill min 340px; WS:19).

Slip grid (G:282-289, 555-558): 12 columns. Items repeat in a cycle of five: span 7, 5, 5, 7, 12; all others span 4. At 960px and below every slip spans 12. From 1800px every slip spans 4 (three across).

### 3.3 Spacing values actually used

Counted from every `padding`, `margin` and `gap` declaration in the CSS files:

| Value | Count (all) | Value | Count (all) |
|---|---|---|---|
| 8px | 53 | 22px | 14 |
| 12px | 52 | 20px | 11 |
| 14px | 47 | 40px | 11 |
| 10px | 43 | 28px | 7 |
| 16px | 41 | 32px | 6 |
| 6px | 38 | 56px | 6 |
| 18px | 24 | 48px | 4 |
| 4px | 24 | 36 / 72 / 64px | 3 each |
| 2px | 23 | 96 / 128px | 1 each |
| 24px | 16 | | |

The documented scale is 4/8/12/16/24/32/48/72/112. In use, 6, 10, 14, 18 and 22px are very common; 112px is never used (see section 10).

Common fixed section values: `.section` padding-top 56px (G:158); `.hero` and `.hx` padding-block 20/56px (HX:2); `.ws-brief` gap 40px (WS:56); `.foot` margin-top 40px (G:221).

Border and rule widths used: 1px solid x69, 3px solid x28, 2px solid x24, 1.5px solid x8, 3px double x6, 1px dashed x5, 1px dotted x5, 2px dashed x3, 6px solid x2 (`.service-state` left edge, `.nav` mobile current marker), 2px dotted x1.

Min heights: 44px x19, 48px x2, 40px x2, 52px x1, 32px x1, 36px x1, 28px x1 (see section 11 for the small ones).

### 3.4 Section separators

| Separator | Look | Class and rule | Used? |
|---|---|---|---|
| Single rule | 1px ink | `.rule` G:155 | **unused** (no `className="rule"` anywhere) |
| Double rule | 5px tall, 1px ink top and bottom | `.rule-double` G:156 | **unused** |
| Thick rule | 3px ink | `.rule-thick` G:157 | **unused** |
| Section title rule | 3px ink above the title, 10px padding | `.section-title` G:159 | yes (12 uses) |
| Page head rule | 3px ink under the title block | `.page-head` G:143 | yes |
| Masthead rule | 3px under the masthead | `.masthead` G:177 | yes |
| Footer rule | 3px above the footer | `.foot` G:221 | yes |
| Table header rule | 3px under header cells | `.ledger th` G:322 | yes |
| Table total rule | `3px double` over the total row | `.ledger tfoot td` G:328 | yes |
| Hero top | `3px double` | `.hx` HX:2 | yes |
| List top rules | 3px on `.docket`, `.stats`, `.owed`, `.rungs`, `.ws-ads`, `.x-offers:first-child`, `.x-docket`, `.x-track`, `.ws-tray` | various | yes |
| Hairline between rows | 1px `--rule-soft` | `.ledger td` G:324, `.x-list li` EX:15 | yes |

The real separator pattern is "3px ink rule above a block", not the documented double rule.

### 3.5 Root font size and large screens

| Viewport | `html` font-size | Source |
|---|---|---|
| under 1800px | 100% (16px) | default |
| 1800 to 2199px | 112.5% | G:504 |
| 2200 to 2999px | 125% | G:507, 551 |
| 3000px and up | 150% | G:552 |

### 3.6 Every breakpoint and what it changes

Width breakpoints in use (distinct values): 340, 360, 420, 520, 560, 599/600, 640, 700, 720, 760, 820 (JS only), 860/861, 960/961, 1024, 1180, 1280, 1800, 2200, 2400, 3000. Height: 520, 640. The comment at G:529-533 says five bands (600/1024/1600/2200) but the real breakpoints do not match it.

| Query | Rules changed | File:line |
|---|---|---|
| `(max-height: 640px)` | `.rail` static | G:148 |
| `(max-width: 640px)` | `.two` one column, gap 20px | G:150 |
| `(max-width: 860px)` | `--gutter` clamp(16px,4vw,28px); `.cols`, `.cols.flip` one column gap 28px; `.rail` static; `.page` padding 24/72px | G:162-167, 546 |
| `(max-width: 860px)` | Masthead becomes mobile: `.menu-btn` shows (min 88x44px); `.nav` becomes a hidden drawer (`data-open="true"` shows it) with 48px rows and a 6px left marker; `.masthead-tools` wraps; wordmark 2.1rem | G:193-210, 561-568 |
| `(max-width: 860px)` | `.foot .wrap` one column | G:224 |
| `(max-width: 860px)` | `.wizard` one column gap 20px | G:442 |
| `(max-width: 860px)` | `.wrap` safe-area padding; inputs 1rem (16px); `.section-title` wraps; `.sheet` padding 18px and shadow 5px | G:483-488 |
| `(max-width: 860px)` | `.ws-cols .rail` first; `.ws-filters` hidden behind `.ws-fbtn` button (`data-open="true"` shows) | WS:118, 128-132 |
| `(min-width: 861px)` | `--gutter` clamp(24px,2.2vw,48px); `.ws-fbtn` hidden | G:547, WS:138 |
| `(min-width: 861px) and (max-width: 1180px)` | One-row masthead: wordmark subtitle hidden, `.nav a` padding-inline 10px, tracking 0.05em, `.toggle-theme` min-width 56px | G:630-636 |
| `(max-width: 960px)` | `.slip-wrap` all span 12; `.hero` one column (dead); `.steps-strip` 2 columns | G:289, 434-438 |
| `(min-width: 961px) and (max-width: 1280px)` | `.steps-strip` 3 columns x 2 rows | G:638-643 |
| `(max-width: 720px)` | **Table reflow** (see 3.7); `.docket` one column | G:333-347, 414 |
| `(max-width: 720px)` | `.ws-offer`, `.ws-track-row` one column; workspace ledger tweaks | WS:70, 106, 120-124 |
| `(max-width: 599px)` | Wordmark subtitle hidden; `.masthead-tools` hidden until menu open; dateline hides the date and keeps the network text | G:569-575, 603-606 |
| `(max-width: 599px), (max-height: 520px)` | Wizard page compaction: lead hidden, head tighter, h1 smaller | G:608-614 |
| `(max-height: 520px)` | Wizard h1 hidden; rail static | G:615 |
| `(max-height: 520px) and (orientation: landscape)` | Dateline hidden; wordmark 1.8rem; touch chrome min-height 40px; page padding 16/48px; lead hidden | G:617-627 |
| `(max-width: 640px)` | `.seg`, `.pick` become full-width flex rows; `.bench-row` 2 columns (`!important`) | G:470, 593-596 |
| `(max-width: 640px)` | `.stats` cells stack | MK:31 |
| `(max-width: 560px)` | `.owed` one column; `.rung` narrower | MK:72, 86 |
| `(max-width: 520px)` | `.steps-strip` one column | G:439 |
| `(max-width: 420px)` | `.slip` padding 18/14/14/30; slip title 1.5rem; rate 1.7rem; `.btn` padding-inline 16px; `.stamp.xl` 1.35rem; `.kv` one column | G:489-497 |
| `(max-width: 340px)` | Wordmark subtitle hidden; ticket title 1.3rem; `.tickets`, `.suggest` one column | G:498-502 |
| `(max-width: 760px)` | Extension screens: `.x-docket` 2 columns, `.x-offer`, `.x-sign`, `.x-vs`, `.x-case`, `.x-risk`, `.x-track` collapse | EX:97-112 |
| `(min-width: 1024px)` | Body font `--fs-body` | G:599 |
| `(min-width: 1280px)` | `.slips` gap `clamp(24px, 2vw, 40px)` | G:521 |
| `(min-width: 1800px)` | `html` 112.5%; `--max` 1560px; slips three across | G:503-506, 550, 555-558 |
| `(min-width: 2200px)` | `html` 125%; `--max` min(2080px, 82vw) | G:551 |
| `(min-width: 2400px)` | `html` 125%, `--max` 1680px (the max is overridden) | G:507-510 |
| `(min-width: 3000px)` | `html` 150%; `--max` min(2400px, 78vw) | G:552 |
| Landing hero | `(max-width: 960px)` one column; `(max-width: 700px)` smaller title; `(max-width: 520px)` stamp inline, slip stub hidden, CTA full width; `(max-width: 360px)` dotted leader hidden | HX:50-69 |
| Landing clips | `(max-width: 640px)` `.lp-clips` becomes a horizontal snap scroller (64% card width, max 240px); `.cb-row` third row hidden | landing.css:18, CB:24 |
| `@container (min-width: 300px)` | `.lc-cap` caption goes from stacked to one row | LoopClip.css:18 |
| `(prefers-color-scheme: dark)` | Night tokens | G:29; WS:89 |
| `(prefers-color-scheme: light)` | Stamp blend mode multiply | G:359 |
| `print` | Dateline, masthead and footer hidden | G:462 |

### 3.7 How tables reflow on phones (`G:333-347`)

Only tables with `ledger reflow` reflow (all 7 ledger tables use it). At 720px and below:
- `thead` is visually hidden (1px, clipped), still in the DOM.
- `table`, `tbody`, `tr`, `td`, `tfoot` become `display:block; width:100%`.
- Each `tr` becomes a card: padding 14px 0, `3px double` bottom rule.
- Each `td` becomes a flex row: label on the left, value on the right, gap 16px, dotted 1px bottom border, min-height 36px, text right-aligned (`!important`).
- The label is `td::before { content: attr(data-l) }` in mono 0.75rem caps ink-2, so every `td` needs a `data-l` attribute.
- `td.lead-cell` is a plain left-aligned block with no label.
- `.cell-actions` aligns to the start.
- Before 720px, `.ledger-wrap { overflow-x: auto }` (G:317) lets wide tables scroll sideways.
- The workspace ledger hides its total cells on phones (WS:120-124).

---

## 4. Surfaces and shape

### 4.1 Radius

Rule: `*, *::before, *::after { border-radius: 0 }` (`G:68-73`). Exceptions:

| Where | Radius | File:line |
|---|---|---|
| `.stamp` | 2px | G:354 |
| `.vd` (verdict chip) | 2px | MK:75 |
| `.tier-mark` | 2px | WS:43 |
| `.ticket-body::after` (right-edge notch) | 14px 0 0 14px | G:276 |
| `.lc::before/::after` (slip side notches) | 50% | LoopClip.css:6 |
| `.hx-slip-stub::before/::after` (perforation holes) | 50% | HX:24 |
| `.wp-item img`, `.wp-dot` (wallet icons) | 6px | wallet-picker.css:2-3 |
| `.x-check input` | explicitly 0 | EX:18 |

### 4.2 Borders and rules

| Border | Where |
|---|---|
| 1px solid `--rule` | `.wallet`, `.toggle-theme`, `.seg`, `.slip`, `.exhibit`, `.x-box`, `.receipt`, `.ticker` (top/bottom), `.ws-tiers`, `.pick`, `.dec-btns`, `.hx-entry` |
| 2px solid `--ink` | `.btn`, `.menu-btn`, `.ticket-body`, `.field input` (bottom only), `.field textarea`, `.sheet`, `.copyline`, `.clip-btn`, `.ws-total`, `.notice`, `.service-state` |
| 1.5px solid | `.lc`, `.hx-slip`, `.vd`, `.tier-mark` area, perforation holes |
| 3px solid `--rule` | block tops (see 3.4) |
| dashed 1px `--ink-3` | `.empty`, `.ws-share`, `.slip::before`, `.x-box.dashed` |
| dashed 2px `--ink` | `.x-drop`, `.lc-cap` top, `.hx-slip-stub` left |
| dotted | table reflow rows, `.receipt .line::after`, `.ad .rates li::after`, `.hx-dots`, `.ws-tray li` |
| 6px left bar | `.service-state` (border-left-width 8px, G/service-state.css:6) |
| wavy underline | `.hx-quote mark` (`text-decoration: underline wavy var(--no) 1.5px`, HX:33) |

### 4.3 Shadows

| Shadow | Value | Where |
|---|---|---|
| `--press` | light `4px 4px 0 var(--ink)`; Night `4px 4px 0 rgb(255 90 31 / 0.4)` | `.btn` (G:230), `.hx-slip` (HX:16) |
| Button hover | `5px 5px 0 var(--ink)` (hard-coded ink) | G:233 |
| Button pressed | `0 0 0 var(--ink)` plus `translate(3px, 3px)` | G:234 |
| Small button | `3px 3px 0 var(--ink)` | `.btn.sm` G:239 |
| Modal | `8px 8px 0 var(--ink)`; `5px 5px 0 var(--ink)` at 860px and below | `.sheet` G:451, 487 |
| Focus ring | `0 0 0 5px var(--signal)` | G:111 |
| Textarea focus | `4px 4px 0 var(--signal)` | G:252 |
| Input focus | `0 5px 0 -1px var(--signal)` (a 4px signal bar under the field) | G:251 |
| Tab "now" | `inset 0 -3px 0 var(--signal)` | `.x-docket`, `.x-track` EX:39,80 |
| Blur | none anywhere | |

In Night, `--press` is a dim orange block, but the hover state, `.btn.sm` and `.sheet` use `var(--ink)` which is cream. So in Night the button's shadow changes from dim orange to bright cream on hover. See section 11.

### 4.4 Paper-noise background (`G:90-98`)

`body::before` is `position:fixed; inset:0; z-index:-1; pointer-events:none; opacity: var(--noise-opacity)`. The image is an inline SVG data URI: a 160x160 `feTurbulence` (`fractalNoise`, baseFrequency .9, 2 octaves, `stitchTiles`) with a `feColorMatrix` that makes it **black** with noise alpha. Light opacity 0.05, Night 0.04. Because the noise is black, it is not visible on the Night paper.

### 4.5 Tear edges, notches, perforations

| Element | How it is made | File:line |
|---|---|---|
| Slip left perforation | Repeating `radial-gradient(circle at 0 50%, var(--paper) 6px, transparent 6.5px)`, 14x18px tile, `repeat-y`, plus a dashed line at `left:14px` | G:293-296 |
| Receipt zig-zag bottom | Two `linear-gradient` triangles (135deg and 225deg), 10x7px tile, in `::after`, 7px tall | MK:57 |
| Wallet chip corner cut | `clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)` (top-right corner) | G:216 |
| Ticket right-edge notch | 14x28px half-pill `::after`, paper-coloured, signal when checked | G:274-278 |
| Looping clip frame | Two 10px circles cut in half with `clip-path`, at the bottom sides; dashed top rule on the caption | LoopClip.css:3-8 |
| Hero slip stub | Dashed left edge; two 16px circles clipped in half at the top and bottom edge | HX:20-26 |
| Stamp | `outline: 1px solid` inset by 6px (9px for `.xl`) inside a 2px border to fake a double border; rotated; ink-bleed filter | G:354-355, 365 |
| Stamp ink bleed | SVG filter `#ink` (`feTurbulence` baseFrequency .9, `feDisplacementMap` scale 1.6), defined once by `InkFilter` | Stamp.tsx:4-12; applied G:355 |
| Tilted hero slip | `transform: rotate(-0.8deg)` | HX:16 |

---

## 5. Motion

### 5.1 Inventory

| Name | Where | Duration and easing | Trigger | File:line |
|---|---|---|---|---|
| Button press | `.btn` | `transform` and `box-shadow` 90ms `steps(2)` | hover (move -1px,-1px and shadow 5px), active (move 3px,3px and shadow 0) | G:231-234 |
| `thunk` | `.stamp` | 170ms `steps(3)`, `both` | on mount. From `rotate(-5deg) scale(1.3)`, opacity 0 to 1. `.stamp.pending` has `animation:none` | G:356, 363, 367 |
| `blink` | `.caret` | 1s `steps(1)` infinite, opacity 0 at 50% | always (loading caret) | G:378-379 |
| `drift` | `.ticker-track` | 60s `linear` infinite, `translateX(-50%)` | always; paused on hover and focus-within | G:402-405 |
| `rise` | `.wizard fieldset`, `.rise` | 160ms `cubic-bezier(0.2, 0.7, 0.2, 1)`, `both`; from opacity 0, `translateY(12px)` | on mount (each wizard step; `.rise` on 6 components) | G:443, 446-447 |
| `hx-in` | `.hx-pay`, `.hx-e2` | 400ms, delays 1300ms and 2200ms, `both`; from opacity 0, `translateY(8px)` | landing page load | HX:46-48 |
| Hero stamp delays | `.hx-e1 .stamp`, `.hx-e2 .stamp` | `animation-delay` 700ms and 2600ms on the 170ms `thunk` | landing page load | HX:44-45 |
| `lp-rise` | `.lp-reveal`, `.steps-strip li` | scroll-linked, `animation-timeline: view()`, range entry 0-45% (li: 0-50%); from opacity 0, `translate3d(0,36px,0)` | scrolling into view | landing.css:4, 7, 9 |
| `lp-from-l` / `lp-from-r` | `.lp-slide-l`, `.lp-slide-r` | scroll-linked, range entry 0-60%; from opacity 0, translateX -8% or +8% | scrolling into view | landing.css:5-6, 10-11 |
| `lp-land` | `.lp-stamps .stamp` | scroll-linked, range entry 30-90%; from opacity 0, `rotate(-5deg) scale(1.6)`, opacity 1 at 80% | scrolling into view | landing.css:8, 12 |
| `cb-slide` | `.cb-row` (landing clip band) | scroll-linked `view()`, range entry 0% to exit 100%; `translate3d` from -11% to +11% (times `--dir`) | scrolling | CB:10-17 |
| ClipBand fallback | `ClipBand.tsx` | JS `requestAnimationFrame` writes `--p`; static transform is `calc(var(--dir) * (var(--p) - 0.5) * 22%)` | browsers without scroll-driven animation and no reduced motion | CB:5-6; ClipBand.tsx:53-57 |
| Pool count-down | `PoolTicker` | JS rAF, ease-out cubic `1-(1-p)^3`, default delay 1400ms, duration 900ms | landing page load | PoolTicker.tsx |
| Filter chevron | `.ws-fbtn::after` | `transform` 120ms `steps(2)`; rotates 45deg to 225deg | filter button expanded | WS:136-137 |
| `wsrow` | `.ws-ledger tr.row-in` | 160ms, same easing as `rise`; from opacity 0, `translateY(4px)` | **never applied** (`row-in` is not in any TSX) | WS:79-80 |
| Smooth scroll | `html` | `scroll-behavior: smooth` | anchor and focus scroll | G:76 |
| Looping clips | `LoopClip` | video play and pause with `IntersectionObserver` (threshold 0.25) | scroll into view | LoopClip.tsx:45-61 |

Only `.btn` and `.ws-fbtn::after` use CSS `transition`. There are no hover fades on links, rows or cards (hover colours switch instantly).

### 5.2 Reduced motion

| Rule | Effect | File:line |
|---|---|---|
| Global | `*, *::before, *::after { animation: none !important; transition: none !important; scroll-behavior: auto !important }` | G:459-461 |
| Landing scroll effects only run inside `@media (prefers-reduced-motion: no-preference)` and `@supports (animation-timeline: view())` | static layout otherwise | landing.css:2-3; CB:10-11 |
| ClipBand | `.cb-row { transform: none; margin-left: 0 }` | CB:19-21 |
| Hero | `.hx-pay, .hx-e2 { animation: none }` | HX:64-66 |
| ClipBand JS | skips the scroll fallback | ClipBand.tsx:55 |
| PoolTicker JS | jumps to the final value (no delay, 1ms) | PoolTicker.tsx:10-13 |
| LoopClip JS | no autoplay under reduced motion or `saveData` | LoopClip.tsx:7-12 |
| Redundant | `.x-box *, .x-drop` and `.tier, .receipt` (those two have no animation) | EX:113; MK:93 |

Side effect: with the global rule, the `.ticker` stops drifting and shows only the first part of the tape. The overflow is hidden and there is no scroll, so reduced-motion users never see the rest. A screen-reader copy exists (`<ul class="sr">`, `app/page.tsx:37-41`).

DESIGN.md says the wizard step "cross-cut" also fades the old step out in 80ms. Only the slide-in exists.

---

## 6. Component style catalog

States columns: H = hover, F = focus-visible, A = active, D = disabled, L = loading, E = error. "none" means no CSS for it.

### 6.1 Global focus, links and helpers

| Class / selector | Looks like | Key CSS | States | Used in |
|---|---|---|---|---|
| `:focus-visible` | Orange-filled 3px band, then a 2px ink line, 3px away from the element | `outline:2px solid var(--ink); outline-offset:3px; box-shadow:0 0 0 5px var(--signal)` | the global focus style | everything (G:108-112) |
| `a` | Inherits colour, underlined 1px, offset 3px | `text-decoration-thickness:1px; underline-offset:3px` | H: 2px thick underline (G:102) | everywhere. No visited style, no link colour |
| `::selection` | Orange highlight with cream text | G:106 | | |
| `.skip` | Hidden above the page; slides to the top-left on focus | `position:absolute; top:-60px`, focus `top:8px`; bg ink, text paper, mono caps, min-height 44px | F: `top:8px` (G:118) | `layout.tsx:50` |
| `.sr` | Screen-reader only text | 1px clip | | 7+ components |
| `.display`, `.lead`, `.micro`, `.fig`, `.fig-xl`, `.mono`, `.muted`, `.signal`, `.prose` | Typography helpers (see 1.4) | | | everywhere |
| `.vbadge` | Small orange rosette beside a name | `display:inline-flex; vertical-align:-2px; color:var(--signal)` | none | `VerifiedMark` (Icons.tsx:128) |

### 6.2 Buttons

| Class | Looks like | Key CSS | States | Used in |
|---|---|---|---|---|
| `.btn` (primary) | Orange block, 2px ink border, offset ink shadow, bold label, square corners | `min-height:48px; padding:10px 22px; background:signal; color:signal-ink; border:2px solid ink; box-shadow:var(--press); font:700 .95rem text` (G:227-232) | H: nudges up-left 1px, shadow 5px (G:233). A: moves 3px down-right, shadow gone (G:234). D (`[disabled]` or `[aria-disabled=true]`): grey paper-3 fill, ink-3 text, no shadow, `cursor:not-allowed`, ink-3 border (G:235). F: only the 2px ink outline is visible, because `.btn` box-shadow replaces the signal ring. L: no spinner or class; the label text changes ("Sending", "Waiting for signature", "Check your wallet"). E: none | 29+ components; 63 uses |
| `.btn.ghost` | Transparent, ink text, ink border, no shadow | `background:transparent; color:ink; box-shadow:none` (G:236) | H: paper-3 fill, no move (G:237). **D: loses the disabled look** because `.btn.ghost` (same specificity, later) overrides `.btn[disabled]`. A disabled ghost button keeps ink text and a transparent fill; only the border turns ink-3. | 30 uses (Back, Cancel, secondary links) |
| `.btn.sm` | Smaller primary | `min-height:44px; padding:6px 14px; font-size:.9rem; box-shadow:3px 3px 0 var(--ink)` (G:239) | as `.btn` | 36 uses plus `btn sm ghost` 6, `btn ghost sm` 21 |
| `.btn.ghost.sm` | Small ghost | `box-shadow:none` (G:240) | | |
| `.btn.ink` | Ink fill, paper text | G:238 | | **unused** |
| `.hx-cta .btn` | Taller hero buttons | `min-height:52px`; full-width at 520px and below | | `landing/Hero.tsx` (HX:11, 59) |
| `.btn.wp-item` | Wallet row: icon plus name, left-aligned | `justify-content:flex-start; gap:12px` | | `WalletPicker.tsx:27` |
| `.linkbtn` | Bold underlined text, looks like a link | `background:none; border:0; padding:4px 0; font-weight:700; underline 2px, offset 4px; min-height:44px` (G:241, 481) | H: turns signal colour (G:242). D: no style (it is used with `disabled`). F: global | 26 uses; also on `<a>` and `<Link>` |
| `.menu-btn` | "Menu"/"Close" box, only at 860px and below | `min-height:44px; min-width:88px; border:2px solid ink; mono caps .75rem` (G:197-200) | pressed (`aria-expanded=true`): ink fill, paper text (G:201) | `Shell.tsx:107` |
| `.toggle-theme` | "Night"/"Paper" box in the masthead | `min-height:44px; min-width:64px; border:1px solid rule; mono caps` (G:218) | H: paper-3 (G:219) | `Shell.tsx:76` |
| `.wallet` | Mono "slip" chip with the top-right corner cut off. Shows role plus address, or "Connect wallet" | `min-height:44px; padding:6px 12px 6px 10px; bg paper-2; border 1px rule; clip-path corner 10px` (G:212-217) | H, A, D: none. **F: ring is clipped** by `clip-path` (G:216). L: label "Check your wallet" | `Shell.tsx:126, 130` |
| `.seg` (segmented control) | Row of mono-caps buttons in one box; selected is ink fill | `display:inline-flex; border:1px solid rule`; buttons `min-height:44px; padding:8px 14px` (G:395-399) | selected: `aria-pressed=true` or `aria-selected=true` (ink fill, paper text). H (not selected): paper-3. At 640px and below: full width rows (G:593-596) | WireView, Standing, BenchView (tablist), CreatorAssistant (tablist), WorkspaceView |
| `.pick` | Like `.seg` but with text-font bold labels, used to choose a campaign | `border:1px solid rule`; buttons `min-height:40px; font:700 .85rem text` (MK:49-53) | selected ink fill; H paper-3 | `DeskAnalytics.tsx:183` |
| `.ws-tiers` | Stack of full-width tier rows (title in display, small text below); selected ink fill | `min-height:44px` rows (WS:9-16) | selected, H | `Directory.tsx` |
| `.clip-btn` | Outline button "Clip this ad" with a scissors icon. After clipping it is ink-filled and says "Clipped" with a check | `min-height:44px; border:2px solid ink; font:700 .875rem` (WS:40-42) | H: paper-3; pressed (`aria-pressed`) ink fill via `.ad.is-clipped` | `workspace/parts.tsx:77` |
| `.dec-btns` | Yes/No pair (Approve/Pass) in a bordered box | buttons `min-height:44px; min-width:76px; mono caps 700` (WS:82-89) | pressed yes: `--ok` fill; pressed no: **ink fill** | `workspace/panels.tsx` |
| `.copyline` | Mono code box with a black "Copy" button on the right | `border:2px solid ink; bg paper-2`; button `min-height:44px; bg ink` (MK:87-90) | H on button: signal fill | `ModulePages.tsx` |
| `.ws-fbtn` | Full-width button "Filters" with a chevron on the right; only at 860px and below | `btn sm ghost ws-fbtn` plus `::after` chevron (WS:127-138) | expanded rotates the chevron | `Directory.tsx` |
| `.ws-tray li button`, `.ws-lines .ln button` | Tiny underlined mono "Remove" links | font .75rem caps underline; heights 28px and 44px (WS:50, 62) | none | tray, brief builder |
| `.cell-actions` | Right-aligned wrap of small buttons in table cells | G:332 | | `DeskView.tsx:178` |

### 6.3 Inputs and form fields

All field styles hang off `.field` (grid, gap 6px; G:245). `.field` appears in about 12 components.

| Element | Looks like | Key CSS | States | Used in |
|---|---|---|---|---|
| `.field label`, `.field .lab` | Small mono caps label above the control, grey (ink-2) | `0.75rem; letter-spacing .09em; uppercase; ink-2` (G:246) | | `.lab` only in `Directory.tsx:67`. Note: Wizard labels are full sentences (see 11) |
| `.field input`, `select` | Open line: no box, only a 2px ink underline; transparent bg | `width:100%; border:0; border-bottom:2px solid ink; padding:10px 2px; min-height:44px; font-size:1.05rem; outline:none` (G:247-249) | F: no outline; a 4px orange bar under the field (G:251). D: **no style**. E: `.field.bad` turns the underline red (G:254). Placeholder: **no style** (browser default; 13 placeholders) | Wizard, JoinView, BenchView, DealPanel, SlipDetail, BriefBuilder... |
| `.field textarea` | Boxed: 2px ink border, paper-2 fill, 120px min height, vertical resize | G:250 | F: orange hard shadow `4px 4px 0` (G:252). E: red border | Wizard, SourceStep, CreatorAssistant, AppealPanel |
| `.field input[type=number]` | Big mono figure | `font-family:mono; font-size:1.6rem; letter-spacing:-.04em` (G:256) | | pool, rate, target in Wizard |
| `.unit` | Input with a unit label beside it ("USDC", "views") | flex, baseline, gap 10px; `span` mono ink-2 nowrap (G:257-258) | | Wizard, DealPanel |
| `.field .hint` | Small grey help text under the control | 0.875rem ink-2 (G:253) | | 8 components |
| `.field .err` | Bold red error line | 0.875rem 700 `--no` (G:255). In BriefBuilder it also has a Cross icon (BriefBuilder.tsx:93) | | 6 components |
| `.field.bad` | Marks a field invalid | red border-color on `input`, `textarea` only (not `select`) (G:254) | | BriefBuilder only |
| `select` filter arrow | Custom chevron, no native arrow | `appearance:none`, data-URI chevron `#8a8374` (WS:6-8) | | `.ws-filters` only |
| `.x-check` | Checkbox plus sentence | grid 22px + text; checkbox 18x18, `accent-color: ink`, radius 0 (EX:17-18) | | `SourceStep.tsx:133` |
| `.x-drop` | Big dashed upload target; the real `<input type=file>` is invisible and covers it | `border:2px dashed ink; bg paper-2; padding 26/22` (EX:21-25) | H or `data-over=true`: paper-3. F (`:focus-within`): global ring | `SourceStep.tsx:71` |
| `.ticket` radio and checkbox cards | See 6.9 | | | |
| Date input, file input | Native look (no custom CSS) | | | BriefBuilder, SourceStep |
| Radio/checkbox outside tickets | `BriefBuilder` objective uses `.ticket` too. No bare native radios elsewhere. | | | |
| Sort `<select>` in Wire | Inline-styled one-off: transparent bg, 1px rule border, `min-height:40px`, mono **0.72rem** | WireView.tsx:58 | | |

Form semantics in markup: labels use `htmlFor`/`id`; `aria-invalid` appears 7 times (BriefBuilder); `aria-describedby` 6 times; two `fieldset/legend` groups (Wizard, BriefBuilder objective).

### 6.4 Tags, chips and badges

| Class | Looks like | Key CSS | Used in |
|---|---|---|---|
| `.tag` | Tiny mono caps box with a thin grey border | `0.75rem; uppercase; padding 2px 6px; border:1px solid ink-3; ink-2 text` (G:306) | `PlatformGlyph` (YT / X / IG; Icons.tsx:151), AgentPassPanel, ConfirmedViews |
| `.tag.solid` | Same, ink fill | G:307 | "Ranked only" (Bits.tsx:28), LedgerView, AdminAssistant, BenchView, SlipDetail |
| `.tier` plus `data-t` | Mono plate with a chevron stack. `data-t` 1: ink-2 text; 2: ink text; 3: ink text and 2px border; 4: ink fill; 5: signal fill | MK:5-11 | `TierMark` and `Byline` (Marks.tsx:30, 38) |
| `.tier-mark` (+ `.elite`) | Mono caps box with ink border and 2px radius; elite is ink-filled | WS:43-44 | `workspace/parts.tsx:41` (second, different tier mark) |
| `.vd` + `ok/no/hold/pending` | Small verdict chip: coloured text and a 1.5px coloured border, 2px radius; pending is dashed grey | MK:75-76 | LedgerDash table (LedgerDash.tsx:77) |
| `.x-label` (+ `ai`, `hold`, `no`, `ok`) | Mono caps bold label with a 2px border; `ai` is ink-filled ("AI-GENERATED") | EX:8-12 | SourceStep, Wizard review, DealPanel, AdminAssistant |
| `.cv-badge` (with `.tag`) | Green "Chainlink confirmed" chip with a check icon | confirmed.css:7 | ConfirmedViews |
| `.heat` | Mono caps annotation, number in orange | MK:21-22 | `WireView.tsx:90` |
| `VerifiedMark` | 16px orange rosette with a check, `title="Verified human"` | Icons.tsx:126-135 | Wire, Join, LedgerDash, Marks, Account |

### 6.5 Stamps (verdicts)

| Class | Looks like | Key CSS | States | Used in |
|---|---|---|---|---|
| `.stamp` | Rectangle in the verdict colour: 2px border, 1px inset line, mono caps bold, slightly tilted, rough edges. Optional small line "CONF 0.94" | `inline-flex column; padding 5px 12px; border:2px solid var(--c); outline:1px solid var(--c); outline-offset:-6px; radius 2px; rotate(-5deg); mix-blend-mode:multiply; filter:url(#ink); animation: thunk 170ms steps(3)` (G:350-357) | `.ok` green; `.no` red, rotate 4deg; `.hold` ochre, rotate -3deg; `.pending` grey dashed, rotate -2deg, no animation, no inner line (G:360-363). `.xl` 1.9rem (G:365). Night: blend mode `normal` (G:358-359). Reduced motion: no animation. | `Stamp.tsx:25`; SlipDetail, DeskView, landing page and Hero. Text labels: Approved, Rejected, Needs human, In the queue |

The component adds `role="status"` and an `aria-label` ("Verdict: Approved, confidence 0.94"). Each stamp is a live region, so a long list of stamps announces many statuses.

### 6.6 Tables and ledger rows

| Class | Looks like | Key CSS | Used in |
|---|---|---|---|
| `.ledger-wrap` | Horizontal scroll wrapper | `overflow-x:auto` (G:317) | 6 files |
| `table.ledger` | Full-width table, 0.9rem, collapsed borders | G:318 | 7 tables |
| `.ledger th` | Mono caps grey headers with a 3px ink rule under them | G:320-323 | |
| `.ledger td` | 14px vertical padding, 1px soft rule under each row | G:324 | |
| `td.n`, `th.n` | Right-aligned mono numbers, no wrap | G:325-326 | |
| `.ledger tbody tr:hover` | paper-3 band | G:327 | |
| `.ledger tfoot td` | Bold total with `3px double` top rule | G:328 | |
| `.rank`, `.handle`, `.sub`, `.cell-actions`, `.lead-cell` | Big display rank number; bold handle; small mono sub-line; action group; first cell on phone | G:329-332, 344-346 | Standing, DeskView, LedgerDash |
| `.reflow` | Opt-in phone reflow (see 3.7) | G:333-347 | all 7 |
| `.standing` + `.bar` | Standing table; 6px tick bar under the creator name | MK:15-18 | `Standing.tsx:34, 52` |
| `.ws-ledger` | Workspace ledger. Passed rows struck through in ink-3; `td.run` bold running total; `td.dec` holds the Yes/No buttons | WS:73-80, 119-124 | `workspace/panels.tsx:18` |
| `.stats` | Auto-fit row of figure cells; 3px top rule, 1px bottom rule | MK:25-31 | DeskAnalytics, LedgerDash, ModulePages |
| `.owed` | Three cells: owed / claimed / etc. | MK:67-72 | LedgerDash |
| `.kv` | Label-and-value list; mono caps labels, right-aligned mono values | G:389-391, 495 | 9 components |
| `.receipt` | Paper-2 slip with zig-zag bottom; `.line` rows with a dotted leader between label and value; `.line.total` bold with top rule | MK:56-64 | FeePreview, FundView, WorkspaceView |
| `.cv`, `.cv-*` | Confirmed-vs-pending value cells (right-aligned stack, big mono number, proof link) | confirmed.css:2-16 | ConfirmedViews |

Header cells use `<th scope="col">` (22 uses). No `scope="row"`.

### 6.7 Notes and margin notes

| Class | Looks like | Key CSS | Used in |
|---|---|---|---|
| `.note` | Italic grey sentence with a hand-bracket "[" on the left made from a border; may start with a `.micro` label ("Agent note", "Arithmetic", "Agreed") | `padding-left:18px; italic .875rem; ink-2; max 52ch`; `::before` is an 8px-wide bracket made of a 1.5px border without the right side (G:370-372) | 15 components |
| `.hx-margin` | Same idea, landing only | HX:35-36 | Hero |
| `.x-quote` | Quoted evidence with a 3px ink left bar | EX:90-91 | AdminAssistant |

### 6.8 Choice cards and tickets

| Class | Looks like | Key CSS | States | Used in |
|---|---|---|---|---|
| `.tickets` | Auto-fit grid of cards (min 230px), gap 14px | G:261 | one column at 340px and below | Wizard, JoinView, BriefBuilder |
| `.ticket` (label) | Wrapper. The real radio or checkbox is invisible and covers the whole card (`opacity:0; inset:0`) | G:262-263 | | |
| `.ticket-body` | Big rectangle: index (A/B/C, mono), title (display 1.55rem), one sentence. A half-circle notch on the right edge | `min-height:132px; padding:18px 44px 18px 18px; bg paper-2; border:2px solid ink` (G:264-267) | H: paper-3. Checked: ink fill, paper text, text at 80%, notch turns signal (G:272-278). F: ring around the whole card (G:279). D: none | 3 components |
| `.suggest` | Grid of the same cards as `<button aria-pressed>` (Wizard "size" step) | G:448, 464-469 | same look via `[aria-pressed=true]` | `Wizard.tsx:282` |

The radio and checkbox control itself is never drawn; only the fill shows the choice.

### 6.9 Ticker, tick bars, progress

| Class | Looks like | Key CSS | Used in |
|---|---|---|---|
| `.ticker`, `.ticker-track` | Thin ruled band of mono 12px items scrolling left | `border-block:1px solid rule; bg paper-2`; track `animation: drift 60s linear infinite`; items `padding 9px 22px` with a soft right rule (G:401-405) | landing only (`app/page.tsx:32`) |
| `.ticks` (via `TickBar`) | Row of vertical tick marks: ink ticks filled to a percentage, hairline ticks for the rest. 14px tall | `repeating-linear-gradient(90deg, ink 0 2px, transparent 2px 6px)`; fill width `var(--p)` (G:310-311) | `Bits.tsx:11` TickBar, 12 call sites |
| `.ticks.big` | 26px tall | G:312 | |
| `.ticks.sig` | Orange ticks, 3px on a 7px period | G:313-314 | upload, render, budget, pool progress |
| `.standing .bar` | 6px tick bar, ink | MK:17-18 | Standing |
| `.split-bar` + `.legend` | 18px bar with green / red / hatched ochre segments, and a legend with 10px squares | MK:33-40 | DeskAnalytics |
| `.daily` / `.chart` (SVG) | Column chart and line chart; mono 10px text; peak column orange | MK:42-47; G:453-457 | DeskAnalytics, SlipDetail, AdminAssistant, landing |
| `.x-bars` | Mini bar chart with a dashed baseline; hot bars orange | EX:92-95 | AdminAssistant |
| `.x-band` | Timeline strip with ticks and a signal marker | EX:68-72 | DealPanel |
| `.progress-steps` | Row of 10px blocks: done = ink, now = orange | G:415-418 | Wizard rail (`aria-hidden`) |
| `.docket` | 4-up step list with a big display number; done = ink, now = orange on paper-2 | G:406-414 | FundView (`aria-current="step"`) |
| `.x-docket` | Same idea, smaller, inset signal line under "now" | EX:34-41 | SourceStep |
| `.x-track` | 3-up appeal tracker; states done / now / ok / no | EX:75-84 | AppealPanel |
| `.rungs` / `.rung` | Vertical list with large number, title and action; now = orange number on paper-2 | MK:79-86 | ModulePages |
| `.track` / `.track-labels` | 4-step hiring stage bar, 10px blocks; labels at 8.8px | WS:96-101 | `StageTrack` in `workspace/parts.tsx` |
| `.steps-strip` | 6-up landing "how it works" strip with mono step numbers | G:427-439 | landing |

### 6.10 Slips and cards

| Class | Looks like | Key CSS | States | Used in |
|---|---|---|---|---|
| `.slip-wrap` + `.slip` | Paper-2 card, 1px ink border, left edge punched with half circles and a dashed line; serial "No. 0042" top right; mono rate in orange; tick bar; footer row | `padding:22px 22px 18px 34px; bg paper-2` (G:290-307) | H: paper-3 | `Slip` in Bits.tsx:20, WireView, DeskView |
| `.hx-slip` | Tilted hero slip with a stub, hard shadow | HX:16-26 | | Hero |
| `.lc` (LoopClip) | Small video in a slip frame with a mono caption; notches on the sides | LoopClip.css | `lc-side` (max 200px) used in Empty; `lc-wide` unused | landing, `Bits.tsx:85` |
| `.cb-slip` | Clip-band tile, 120-190px wide | CB:7-8 | | ClipBand |
| `.ad` | Classified ad card: "For hire" lead, name in display, rate rows with dotted leaders, facts, "Clip this ad". Elite tier: `.t-elite` has a double top rule, paper-2 fill, italic 2.1rem name | WS:19-45 | `.is-clipped` dashed outline | `workspace/parts.tsx:46` |
| `.x-box` | Bordered box with a display heading (1px rule, paper-2, padding 18/20/20) | EX:4-6 | | CreatorAssistant, DealPanel, SourceStep |
| `.exhibit` | Old landing card | G:423-427 | | **unused** |
| `.ws-total`, `.ws-share`, `.ws-readonly` | Budget box (red border when `.over`); dashed share box; read-only box | WS:52-53, 91-94, 108 | | workspace views |

### 6.11 Dateline, nav and tabs

| Class | Looks like | Key CSS | Used in |
|---|---|---|---|
| `.dateline` | Black strip on top: date left, "Arc testnet · USDC" right (mono caps) | `bg:ink; color:paper`; wrap padding-block 6px, nowrap (G:170-176) | `Shell.tsx:44` |
| `.masthead` | Brand row with 3px bottom rule. Wordmark "Clippo" (display italic 700) + blade glyph + "Clipping bureau" | G:177-182 | Shell |
| `.nav a` | Mono caps links with 1px vertical dividers; current page has a 3px orange underline and paper-2 fill | `min-height:44px; padding:12px 14px 10px; border-bottom:3px solid transparent` (G:183-190) | six links: Wire, Hire, Desk, Ledger, Bench, Account (`Shell.tsx:12-19`) |
| `.nav` mobile | Vertical list, 48px rows, 6px left bar for the current page | G:202-206 | |
| `.masthead-tools` | Theme button plus wallet chip | G:191, 207-208, 564-573 | |
| `.foot` | Three columns (5fr / 3fr / 4fr) with 3px top rule; links 44px high | G:221-224, 585-590 | `Shell.tsx:165` |
| `.seg role="tablist"` | Tab strip; tabs are `.seg` buttons with `role="tab"` and `aria-selected` | | BenchView, CreatorAssistant |
| `.ws-tabs` | `.seg` with 8px bottom margin | WS:116 | WorkspaceView |
| `.page-head` kicker | Mono caps breadcrumb above the page title | G:143-144 | `PageHead` in Bits.tsx:111 |

### 6.12 Banners and notices

| Class | Looks like | Key CSS | Used in |
|---|---|---|---|
| `.testnet-banner` | Bright yellow sticky strip on top with bold "TESTNET" and a one-sentence warning; only when `NEXT_PUBLIC_TEST_DEPLOY=1` | `position:sticky; top:0; z-index:60; bg #ffd84a; color #1a1400; border-bottom 2px; padding 6px 16px; centered; mono .78rem 600` (testdeploy.css:2-13) | `Shell.tsx:24` |
| `.testnet-foot` | Footer line, weight 600 | testdeploy.css:14 | Footer |
| `DemoNote` | Mono caps line in ochre, only when `NEXT_PUBLIC_DEMO=1` | inline `color: var(--hold)` | Bits.tsx:123, 14 components |
| `.notice` | Box with a 2px ink border and paper-2 fill; bold lead line plus text | G:385 | 18+ components |
| `.notice.warn` | Same with an ochre border. Used for **errors** and for cautions | G:386 | about 40 uses |
| Hero footnote `hx-fine` | Small mono note under the CTAs | HX:12 | |

### 6.13 Loading, empty and error ("Correction") patterns

| Pattern | Looks like | Key CSS and markup | Used in |
|---|---|---|---|
| Loading (`Loading`, `.state-load`) | N empty ruled lines (38px each, 3px rule on top). First line shows mono text "Setting type" (default) plus a blinking square caret. No grey skeleton blobs | `role="status" aria-live="polite"`; `.ln` 38px with 1px soft bottom border; `.caret` 0.6ch x 1em ink block, blink 1s (G:374-379). `Bits.tsx:68-80` | about 30 call sites |
| Empty (`Empty`, `.empty`) | Dashed 1px box, display title (1.6rem), a muted sentence, then an action | `border:1px dashed ink-3; padding:32px 24px; bg paper-2` (G:380-381). Optional looping clip (`clip` prop) | 18 files; also 404 page |
| Error (`Correction`, `.correction`) | 2px **red** box. Small red mono "Correction" label, bold line saying what failed, optional fix line, "Try again" link | `border:2px solid var(--no); bg paper-2; max-width:64ch`; `role="alert"` (G:382-384; Bits.tsx:93-109) | 21 files |
| Service down or not configured (`ServiceState`) | 2px ink box with an 8px left bar. Mono label "Service unavailable" or "Not configured", display headline, explanation, `btn sm` "Try again". `Correction` switches to this automatically if a message starts with the service-down or not-configured text | `border:2px solid ink; border-left-width:8px; padding:22px 24px; max-width:62ch` (service-state.css:1-9; ServiceState.tsx) | via Correction |
| Inline error | `.err` red bold text, or `.notice.warn` with `role="alert"` | G:255, 386 | everywhere |
| 404 | `PageHead` "Not on file" plus an Empty box | `app/not-found.tsx` | |
| Skeleton | none | | |

Text baked into shared components: Loading default "Setting type" (`Bits.tsx:68`), Correction label "Correction" (`Bits.tsx:99`), Empty clip caption "Waiting on a clip" (`Bits.tsx:85`), Stamp "In the queue" (`Stamp.tsx:19`), wordmark subtitle "Clipping bureau" (`Shell.tsx:105`), slip serial "No. {serial}" (`Bits.tsx:24`), `LoopClip` caption "Sample footage".

### 6.14 Modals and sheets

| Class | Looks like | Key CSS | Used in |
|---|---|---|---|
| `.sheet-back` | Full-screen scrim; content centred | `position:fixed; inset:0; z-index:50; bg rgb(21 18 14 / .55); padding 16px; place-items:center` (G:450) | Shell (2 sheets), WalletPicker, WorldCheck (2) |
| `.sheet` | Paper box, 2px ink border, 8px hard ink shadow, padding 24px (18px and 5px shadow on phones) | `width:min(520px, 100%)` (G:451, 487) | same |
| World ID widget | Third-party `IDKitRequestWidget`; its own styling | not determined | `IDKitSheet.tsx` |

Behaviour: `role="dialog"` or `"alertdialog"`, `aria-modal`, `aria-labelledby` on all five. Escape closes WalletPicker (`WalletPicker.tsx:15`) and WorldCheck (`WorldCheck.tsx:38, 61`). The two Shell sheets (role prompt, connect error) have no Escape handling. No focus trap, no `inert` on the page behind, no return-focus. Initial focus is set only in WorldCheck (`WorldCheck.tsx:37, 60`).

The TESTNET banner (z-index 60) sits above the scrim (z-index 50).

### 6.15 Tooltips

No tooltip component. Only native `title` attributes: wallet "Disconnect wallet" (Shell.tsx:126), `VerifiedMark` "Verified human", `TierMark` "Tier: ...", `PlatformGlyph`, Standing views cell, ConfirmedViews badge and proof link.

### 6.16 Other reusable groups (extension screens)

| Class group | Looks like | File:line | Used in |
|---|---|---|---|
| `.x-cap` | Section caption with a 3px top rule | EX:7 | CreatorAssistant, DealPanel |
| `.x-list` | Ruled list (hairline between rows, 1px ink on top) | EX:14-16 | CreatorAssistant |
| `.x-risk` (`data-l`= block / warn / note) | Row: coloured mono key ("Cannot submit", "Warn") and a reason; stacks at 760px and below | EX:43-50 | CreatorAssistant, AppealPanel |
| `.x-match` | Fit score (big mono) plus linked title (display) | EX:52-56 | CreatorAssistant |
| `.x-offers`, `.x-offer` | Offer history rows: who (mono caps), text, rate; latest highlighted paper-3 | EX:58-64 | DealPanel |
| `.x-sign` | Two-sided signing box | EX:65-67 | DealPanel |
| `.x-case`, `.x-vs` | Admin case row with rank number; side-by-side compare | EX:86-89 | AdminAssistant |
| `.x-player`, `.x-slate` | 16:9 video box, always dark; slate has diagonal stripes and a display italic title | EX:26-30 | SourceStep |
| `.x-prog` | Progress wrapper (tick bar plus mono line) | EX:31 | SourceStep |
| `.bench-row` | Admin queue row; layout set by inline styles; on phones 2 columns with `!important` | G:470; BenchView.tsx:132 | BenchView |

---

## 7. Icons and marks

### 7.1 How icons are built

`Icons.tsx` has a `Base` wrapper (`Icons.tsx:6-26`): 24x24 viewBox, `fill:none`, `stroke:currentColor`, `strokeWidth 1.5`, `strokeLinecap square`, `strokeLinejoin miter`. Default size **20px**, set by the `size` prop in px. Color follows the surrounding text color (`currentColor`). With a `title` prop the SVG gets `role="img"` and `aria-label`; without it, `aria-hidden="true"` and `focusable="false"`. Icons sit bare next to text (never in circles). Global `img, svg { display:block; max-width:100% }` (G:105) means a bare icon is a block; callers put them inside flex rows (`.btn` is inline-flex with gap 10px).

### 7.2 Icon inventory

| Name | Depicts | Used? and where (size) |
|---|---|---|
| `Scissors` | Two crossing blades with square handles | `workspace/parts.tsx:78` (16) on "Clip this ad" |
| `Link` (imported as `LinkIcon`) | Two chain links | `SlipDetail.tsx:263` (16) on "Submit" |
| `Check` | Tick with a faint second stroke (scratched) | JoinView x3 (18), ConfirmedViews (12), `workspace/parts.tsx:78` (16) |
| `Cross` | X mark | `workspace/BriefBuilder.tsx:93` (14) before field errors |
| `Flag` | Flag on a pole | **unused** |
| `Coins` | Stack of three discs | FundView (18), LedgerView (18), WorkspaceView (18) on money buttons |
| `Bracket` | Square bracket | **unused** |
| `ArrowCorner` | Diagonal arrow to the upper right | **unused** |
| `Arrow` | Right arrow | Hero CTA, Wizard Next, JoinView (all 18) |
| `Eye` | Almond eye with pupil | WorldCheck heading (26) |
| `Clock` | Circle with hands | **unused** |
| `Notch` | Ticket with notches | **unused** |
| `Upload` | Arrow into a tray | SourceStep (20), SlipDetail "Download source" (16) |
| `Play` | Triangle | **unused** |
| `Wand` | Wand with spark | **unused** |
| `Wallet` | Wallet with flap | **unused** |
| `VerifiedMark` (size default 16) | Filled orange 12-point rosette with a signal-ink check; `title="Verified human"` | WireView, JoinView (18), LedgerDash (16), Marks/Byline (14), AccountView. Fill is `currentColor` set by `.vbadge{color:var(--signal)}` |
| `Blades` | Two crossing slashes plus two orange slit ticks. Wordmark glyph, 34x22 | `Shell.tsx:104`; sized by `.wordmark svg` 34x22 (G:181) |
| `PlatformGlyph` | Not an icon: a `.tag` chip with text "YT", "X" or "IG" | `Bits.tsx:56`, `workspace/parts.tsx` |
| `Rungs` (in Marks.tsx) | 12px chevron stack for tiers: level 0 is a short rule, levels 1-3 are 1-3 chevrons | inside `TierMark` |

Sizes seen at call sites: 12, 14, 16, 18, 20, 26. 8 of 16 named icons are never rendered.

---

## 8. Theme switching ("Paper" and "Night")

| Piece | What it does | File:line |
|---|---|---|
| Default | Light tokens on `:root`; `color-scheme: light` | G:3-27 |
| OS preference | `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { dark tokens } }` | G:29-48 |
| Manual choice | `:root[data-theme="dark"]` repeats the dark tokens; `data-theme="light"` stays on the base tokens and blocks the media query | G:49-66 |
| Bootstrap script | Inline `<script>` in `<head>` runs before paint: reads `localStorage['clippo-theme']`; if it is `dark` or `light`, sets `data-theme` on `<html>`; wrapped in try/catch | layout.tsx:41, 47 |
| Hydration | `<html suppressHydrationWarning>` | layout.tsx:45 |
| Toggle | Button in the masthead. Starts as "light"; after mount reads the attribute or `matchMedia`, shows "Night" (when light) or "Paper" (when dark). Click flips, sets the attribute and writes `localStorage` in try/catch. `aria-label` "Switch to night theme" or "Switch to paper theme" | Shell.tsx:55-80 |
| Stamp blend | Multiply in Paper, normal in Night, with three overlapping rules | G:355, 358-359 |
| Button label state | Initial render says "Night" even when the OS is dark; it corrects after a 0ms timeout | Shell.tsx:57-64 |

What does **not** follow the theme or behaves oddly:
- Noise tile is black in both themes, so it vanishes in Night (G:97).
- Modal scrim is a fixed dark colour (G:450); in Night it is almost invisible.
- Hard-coded: TESTNET banner yellow, `.x-slate` and video area, select chevron, "yes" text colour in Night (see 2.4). The video and banner are intentional.
- `.btn` hover, `.btn.sm` and `.sheet` shadows use `var(--ink)` instead of `--press`, so Night shows cream shadows on hover but dim-orange at rest (G:233, 239, 451).
- Loop-clip poster and video files (`/public/clips/c1..c12`) do not change.
- The World ID widget is not given a theme (no theme prop in `IDKitSheet.tsx`). Its look in Night is not determined.
- No `<meta name="theme-color">` is set (`layout.tsx:29` viewport has no `themeColor`), so the browser bar does not follow the theme.
- The toggle only flips between two states. Once chosen it is stored; there is no way back to "follow the system".
- SVG icons use `currentColor`, the Verified mark uses `--signal-ink` for the tick, and `Blades` uses `--signal`; all switch correctly.

---

## 9. Accessibility as implemented

| Area | What the code does | File:line |
|---|---|---|
| Focus ring | Global `:focus-visible`: 2px ink outline, 3px offset, 5px signal shadow. Reads as a 3px orange band inside and a 2px ink line outside. Inputs use a 4px orange bar instead; textarea a hard orange shadow; the whole ticket card gets the ring | G:108-112, 251-252, 279 |
| Focus ring problems | `.btn` and any element with its own `box-shadow` lose the orange band. `.wallet` has `clip-path`, which clips the ring completely | G:216, 230 |
| Skip link | "Skip to content" as first focusable; `main` has `id="main"` and `tabIndex={-1}`; focus outline on `main` and wizard legend is removed on purpose | layout.tsx:50, 59; G:578 |
| Landmarks | `header`, `nav aria-label="Primary"`, `main`, `footer`, 22 `aside` rails with `aria-label`, 59 landmark elements in total | |
| Language | `<html lang="en">` | layout.tsx:45 |
| Zoom | Viewport does not block zoom | layout.tsx:29 |
| Headings | Display classes are on `h1`/`h2`; `PageHead` renders one `h1` per page | Bits.tsx:115 |
| Touch targets | Most controls 44px or more; `.btn` 48px, hero CTA 52px; footer links 44px; `a` inside `.micro` get a 12px invisible padding (EX:116). Exceptions in section 11 | G:481-482 |
| Forms | `label`+`htmlFor`; `aria-invalid` x7; `aria-describedby` x6; `fieldset/legend` in Wizard (focus moves to the legend each step, Wizard.tsx:73) and BriefBuilder; radio groups wrapped in `role="radiogroup"` with a label; the platform checkbox group uses `role="group"` | |
| Inputs on phones | Inputs are 1rem (16px) at 860px and below, so iOS does not zoom | G:485 |
| Live regions | `Loading` (`role=status`, `aria-live=polite`), `Correction` and `ServiceState` (`role=alert`), `Stamp` (`role=status`), result lists with `aria-live="polite"` (Wire, Bench, Deal, Fund, Workspace, Ledger claimable amount) | |
| Tabs | `role=tablist/tab/tabpanel` with `aria-selected` in CreatorAssistant and BenchView (no arrow-key handling found in the code read); filter groups use `aria-pressed` buttons in `role=group` | |
| Modals | `role=dialog` / `alertdialog`, `aria-modal`, `aria-labelledby`; Escape on two of four components; no focus trap | section 6.14 |
| Tables | `<caption>` (class `sr` or `micro`) on every table; `th scope="col"`; reflow at 720px sets `display:block` on all table parts and adds no roles back | G:333-347 |
| Progress | Tick bars have `role="img"` with an `aria-label` of the percentage; step lists use `aria-current="step"` (FundView, ModulePages) | Bits.tsx:14 |
| Motion | Global reduced-motion rule, plus JS checks (section 5.2) | G:459-461 |
| Status without colour | Stamps, chips and notices always carry words | |
| Icons | Decorative icons are `aria-hidden`; meaningful ones need a `title` | Icons.tsx:17-19 |
| Print | Chrome hidden | G:462 |

Gaps seen in the code:
- No `forced-colors` or `prefers-contrast` rules.
- No `::placeholder` style, so placeholder contrast is whatever the browser gives.
- No `:disabled` style except for `.btn`.
- `aria-label` on the ticker `<div class="ticker">` without a role (`app/page.tsx:32`), so it is ignored.
- Scrollable regions without keyboard access: `.ledger-wrap` (G:317), `.copyline code` (MK:88), `.lp-clips` on phones (landing.css:18).
- `Stamp` uses `role="status"` on every stamp.
- `.hover` effects are not wrapped in `@media (hover: hover)`, so the hover shift of `.btn` can stick on touch screens.
- Truncated or clipped text on phones: the dateline (`overflow:hidden; white-space:nowrap`, G:175) and the wallet chip ellipsis (G:208).
- Several `title`-only explanations (no visible text) on touch screens.

---

## 10. Drift: `design/DESIGN.md` vs actual CSS

| # | DESIGN.md says | Actual | File:line |
|---|---|---|---|
| 1 | Noise 3% in light; inverted at 4% in dark | 5% in light (`--noise-opacity: 0.05`); 4% in dark; not inverted (black noise, invisible on dark paper) | G:18, 45, 64, 97 |
| 2 | Display: Bodoni Moda with `opsz` axis, weights 500 and 700 | Static 500, 600, 700, no `opsz` axis; `font-optical-sizing:auto` does nothing | layout.tsx:9-15; G:122 |
| 3 | Text: Schibsted Grotesk; margin note in Schibsted italic | Italic style is not loaded; `.note` uses a synthesized slant | layout.tsx:16-21; G:370 |
| 4 | Scale: micro 0.6875rem, small 0.8125rem, lead 1.25rem, h3 1.5rem, h2 2.25rem, h1 clamp(2.75, 7vw, 6.5)rem | micro 0.75rem (fluid to 0.85rem); small 0.875rem (fluid); lead fluid 1.1 to 1.5rem; h3 1.6rem; h2 clamp(1.9rem, 3.6vw, 2.9rem); h1 class clamp(2.6rem, 7.2vw, 6.2rem) but it is unused; real page titles use inline clamp(2.4rem, 5.5vw, 4.4rem) | G:124-130, 542, 545; Bits.tsx:115 |
| 5 | Body 1.0 / lh 1.55 | Same, but body grows to up to 1.2rem from 1024px | G:84-85, 539, 599 |
| 6 | Contrast of signal on paper "3.9:1" | 3.42:1 on paper, 3.69:1 on paper-2 | section 2.3 |
| 7 | Focus ring: 2px ink outline, 2px paper gap, signal outer line | Orange-filled 3px inner band, then 2px ink outer line; the gap is orange, not paper | G:108-112 |
| 8 | Layout: 12-col, 1280 max, 24px gutters (16 on phone) | Container max 1280px, but gutters are fluid (16 to 28px; 24 to 48px) and the max grows to 1560 / 2080 / 2400px on big screens; root font scales to 150% | G:546-552 |
| 9 | Spacing scale 4/8/12/16/24/32/48/72/112 | 6, 10, 14, 18, 22px are among the most used; 112px never | section 3.3 |
| 10 | Section separators: double rule (1+3+1) or 3px thick rule | 3px single rule above blocks; `.rule-double`/`.rule-thick` exist but are unused; `3px double` is used on table totals, hero, receipt | G:155-157 |
| 11 | Masthead dateline "MON 27 OCT 2026 · ARC TESTNET · POOLS OPEN 14 · USDC" | Date plus "Arc testnet · USDC" (plus demo note); no pool count | Shell.tsx:44-50 |
| 12 | Nav separated by slashes; wallet chip is a slip with a notch | 1px vertical dividers; chip has the notch via `clip-path` | G:188, 216 |
| 13 | Slip tear edge: zig-zag, CSS mask, 6px teeth, serial rotated in the corner | Semicircle punch holes via `radial-gradient` (no mask); serial is not rotated | G:293-298 |
| 14 | Tick bar of 40 tick marks | Gradient with a 6px period (count depends on width) | G:310-311 |
| 15 | Ledger on phone: stacked "receipt" with dotted leaders | Dotted bottom border per row; no leader between label and value | G:338 |
| 16 | Ledger has a running-balance column | Only in the workspace ledger (`td.run`) | WS:75 |
| 17 | Stamp: 2px double border, rotated -4 to -7deg, thunk 160ms scale 1.25 to 1, Night uses screen-ish opacity | 2px border plus inset 1px outline; rotations -5, +4, -3, -2deg; thunk 170ms `steps(3)` from scale 1.3; Night uses `normal` | G:354-367 |
| 18 | Margin note: SVG bracket linking to the clip row, prefixed "AGENT NOTE" | A CSS border-bracket; "Agent note" label used in some places only; no link to a row. `Bracket` icon exists but is unused | G:371; Icons.tsx:66 |
| 19 | Inputs: bottom-rule only; error with an "x-in-square" SVG | Textarea is boxed with paper-2 fill; error has red underline and red text; glyph is a plain X and only in BriefBuilder | G:250, 254-255; BriefBuilder.tsx:93 |
| 20 | Radius 0 except stamp (2px) | Also `.vd`, `.tier-mark` (2px), notches (50%), wallet icons (6px) | section 4.1 |
| 21 | Shadows: only hard shadow on primary buttons | Also `.btn.sm`, hover, `.sheet` (8px), `.hx-slip`, textarea focus | section 4.3 |
| 22 | Dark: shadows become signal at 40% | Only `--press` does; hover, `.btn.sm` and `.sheet` stay cream | G:233, 239, 451 |
| 23 | Icon set includes stamp, clock, flag, bracket, arrow-corner, notch | `Flag`, `Bracket`, `ArrowCorner`, `Clock`, `Notch` exist but none is rendered; no "stamp" icon; extra `Upload`, `Play`, `Wand`, `Wallet`, `Cross`, `Arrow` | Icons.tsx |
| 24 | Motion "Only: stamp thunk, ticker drift, ledger row insert, button press, wizard cross-cut" | Also scroll-driven landing effects, hero choreography with delays up to 2.6s, clip-band parallax, number count-down, chevron turn. Ledger row insert exists but is never used. Cross-cut has no fade-out | section 5.1 |
| 25 | Empty = blank slip with dashed outline | Same (with optional looping clip) | G:380 |
| 26 | Error = "CORRECTION" box with bold mono heading | The word "Correction" is a small mono label; the bold line is in the text font | G:382-384 |
| 27 | Buttons: primary signal fill, ink text-on-signal | Cream text on orange (`#fff8ee` on `#e8420c`) | G:12-13, 230 |
| 28 | Screens list | `/hire`, `/status`, `/referrals`, `/profile` exist in nav or links but are not in the DESIGN.md route map | not a CSS issue |

---

## 11. Design-system problems and suggestions

Severity: high = blocks or hurts many users; medium = hurts some users or causes visible bugs; low = polish or code health.

### High

| # | Problem | Where | Suggestion |
|---|---|---|---|
| H1 | Primary button text is 3.82:1 in Paper (needs 4.5:1) at 15px bold. This is the most used control. Same pair on tier 5 plate, copy button hover, text selection | G:12-13, 230; MK:11, 90 | Darken `--signal` (about `#c93509`) or use ink text on signal (4.64:1) in Paper |
| H2 | Keyboard focus ring is cut off on the wallet chip by `clip-path` | G:216 | Drop `clip-path`; draw the notch with a `::after` triangle |
| H3 | Text far too small: `.track-labels` is 0.55rem (8.8px). Six inline spots use 0.72rem (11.5px), including the Wire sort select | WS:101; WireView.tsx:58; AgentPassPanel.tsx:96; BriefBuilder.tsx:220; WorkspaceView.tsx:202; panels.tsx:95; DeskView.tsx:139 | Set a 12px floor; use `.micro` |
| H4 | Signal-coloured small text is below 4.5:1 in Paper (3.42:1): step numbers, "heat" numbers, hover text on links, brief section numbers, the role tag in the wallet chip | G:431, 242; MK:22; WS:59; Shell.tsx:127 | Use ink for text; keep signal for fills and large figures |
| H5 | Form labels are full sentences set as 12px mono caps grey. Hard to read and slow to scan | G:246; Wizard.tsx (labels like "One or two sentences. The agent turns it into a full brief.") | Use text font, sentence case, 14 to 16px for labels; keep caps only for short tags |

### Medium

| # | Problem | Where | Suggestion |
|---|---|---|---|
| M1 | Disabled ghost buttons look enabled: `.btn.ghost` overrides `.btn[disabled]` (same specificity, later) | G:235-236 | Add `.btn.ghost[disabled]` or move the disabled rule last |
| M2 | Only `.btn` has a disabled style. `.linkbtn`, `.wallet`, `.seg` buttons, `.clip-btn`, inputs and selects show no disabled look (43 `disabled=` attributes in TSX) | G:235 | Add a shared `:disabled` rule |
| M3 | No loading state for buttons or fields; busy state is only a label change. No spinner, no `aria-busy` | G:226-242 | Add `.btn[aria-busy=true]` with the caret or a bar |
| M4 | Night shadows are inconsistent: rest = dim orange, hover/small/modal = cream | G:233, 239, 451 | Use `var(--press)`-style tokens for all three |
| M5 | Touch targets under 44px: tray "Remove" buttons 28px; `.pick` 40px; Wire sort select 40px; checkbox 18px; chrome 40px on short landscape phones | WS:50; MK:50; WireView.tsx:58; EX:18; G:621 | Raise to 44px |
| M6 | Errors and warnings share one style: `.notice.warn` (ochre) carries ~40 error messages, while `.correction` is red. Users cannot tell "failed" from "careful". `hold` also means "Needs human" | G:382, 386 | One error style (red, with icon) and one caution style |
| M7 | Modals lack focus trap, `inert` background and Escape on the Shell sheets | Shell.tsx:137-160 | Use `<dialog>` or add a trap |
| M8 | Disabled ghost, ink-3 on paper-3 text (4.46:1) on hover rows of passed offers | WS:76 | Use ink-2 |
| M9 | Decision buttons: pressed "No" is ink, not red, so "No" looks like any selected tab | WS:87 | Use `--no` for pressed No |
| M10 | Table reflow strips table semantics on phones (`display:block` on all parts, no roles) | G:335-338 | Add `role` attributes or use a card layout |
| M11 | Scrollable regions are not keyboard reachable | G:317; MK:88; landing.css:18 | Add `tabindex="0"` and a label |
| M12 | Faux italic on Schibsted (`.note`, `.hx-margin`) and no `opsz` on Bodoni, so type looks different from the design | layout.tsx:9-21 | Load italic text; request `opsz` through `axes` with `weight: "variable"` |
| M13 | The Wire sort select ignores `.field` and is the only unstyled-by-system control | WireView.tsx:58 | Use a shared select style |
| M14 | TESTNET banner is sticky (z 60) and `.rail` is sticky at `top:16px`, so the rail slides under the banner on test builds | testdeploy.css:3-5; G:147 | Offset the rail by the banner height |

### Low

| # | Problem | Where | Suggestion |
|---|---|---|---|
| L1 | Dead CSS: `.rule`, `.rule-double`, `.rule-thick` (G:155-157), `.leaders` (G:392-394), `.h1` (G:124), `.hero` and `.hero h1` (G:421-422), `.exhibit`, `.exhibit-head`, `.exhibit .big-stamp`, `.exhibit .ledger*` (G:423-427, 471-472, 517-518), `.btn.ink` (G:238), `.lc-wide` (LoopClip.css:9), `.vbadge.lg` (MK:12), `.x-box.dashed` (EX:6), `.ws-ads.wide` (WS:20), `.ad.is-closed` (WS:39), `.ad .rates li.off` (WS:33-34), `.ws-ledger tr.row-in` and `@keyframes wsrow` (WS:79-80), tokens `--measure` and `--space-section` (G:536, 540) | | Delete |
| L2 | Near-duplicate classes: two tier marks (`.tier` MK:5 and `.tier-mark` WS:43); four verdict chips (`.stamp`, `.vd`, `.x-label`, `.tag`); seven step trackers (`.progress-steps`, `.docket`, `.x-docket`, `.x-track`, `.rungs`, `.track`, `.steps-strip`); four dotted-leader copies (`.leaders` G:392, `.receipt .line` MK:60, `.ad .rates li` WS:31, `.hx-dots` HX:39); two margin notes (`.note` G:370, `.hx-margin` HX:35); five segmented controls (`.seg`, `.pick`, `.ws-tiers`, `.dec-btns`, `.ws-tabs`); several text-button copies (`.linkbtn`, `.ws-tray li button`, `.ws-lines .ln button`) | | Merge into one each |
| L3 | Breakpoints are scattered (20+ widths) and the file has repeated override blocks (G:503-510 vs 550-552; gutters set 6 times) | G:162-643 | Fold into one token block |
| L4 | Off-scale spacing (6, 10, 14, 18, 22) | | Snap to the scale or update the scale |
| L5 | Ticker `aria-label` has no role; ticker shows only half the tape under reduced motion | app/page.tsx:32; G:459 | Add `role="region"`; allow scroll |
| L6 | `.hover` states not guarded by `(hover: hover)` | G:233 | Wrap |
| L7 | Theme toggle has no "system" option and flashes the wrong label on first paint | Shell.tsx:57-76 | Add a third state |
| L8 | No `theme-color` meta; World ID widget not themed | layout.tsx:29 | Add `themeColor` pair |
| L9 | Stamp filter blurs 12px text and every stamp is `role=status` | G:355; Stamp.tsx:25 | Apply the filter to the border only; drop the role in lists |
| L10 | `ink-3` placeholder/disabled and dashed grey borders: dashed `.empty` and `.tag` borders are 4.98:1 but `--rule-soft` row lines are 1.36:1 | G:324 | Fine for decoration; raise if rows must be told apart |
| L11 | `font-weight:600` is requested on mono and text families but not loaded; Schibsted 500 is loaded and not obviously used (not determined) | testdeploy.css:8; layout.tsx:19 | Trim unused weights |
| L12 | No hover/focus feedback on `.wallet`; no hover on table rows for touch | G:212-217 | Add `:hover` |
| L13 | The 404 and Loading strings use print vocabulary ("Not on file", "Setting type", "Correction", "Clip this ad", "For hire") | Bits.tsx:68, 99; not-found.tsx | Rewrite in plain words (copy task, not CSS) |
| L14 | `.page:has(.wizard)` rules depend on the `:has` selector | G:609-615 | Add a class on the page instead |
