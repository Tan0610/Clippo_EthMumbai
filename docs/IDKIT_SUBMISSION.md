# World ID — Best Use of IDKit (submission)

**Submitting for:** *Best Use of IDKit* ($2,500)
**Product:** Clippo — a clipping-campaign marketplace where brands fund USDC pools and creators earn by posting approved clips.

---

## 1. The trust moment, and why IDKit is the right tool

**The event that needs trust:** the moment a creator becomes **eligible to earn real money (USDC)** from a campaign — i.e., before their account can submit a clip that becomes payable and before any payout or split is credited to them.

**Why it needs trust:** payouts are real USDC drawn from a shared campaign pool. Without a personhood check, one person can spin up unlimited wallets/accounts and:
- farm a **PerView** pool across many fake "creators,"
- collect multiple shares of a **HumanSplit**, and
- crowd out real creators from a fixed pool.

This is a classic **sybil** problem, and it's exactly the "meaningful thing we must know about a person before we grant access / complete an action" the bounty describes: **is this one distinct human, counted once?**

**The credential we chose: Proof of Human — and why it's the *minimum sufficient* assurance.**
- Clippo does **not** need identity, legal name, age, or nationality. It only needs **uniqueness of personhood** — "this is a real human, and only one earning identity per human."
- **Proof of Human** gives exactly that: a privacy-preserving proof of unique personhood, nothing more. We deliberately did **not** use **Passport/NFC**, because collecting identity/age/nationality would be **over-collection** — we don't need who you are, only that you're a unique human. That keeps the flow privacy-preserving and proportionate.
- We considered the lighter **Selfie Check / Sybil score**, but because **real money moves** the instant a creator is verified, we want the strongest uniqueness guarantee available (Orb-class) as the gate, rather than a probabilistic score. Proof of Human is therefore the **minimum sufficient** credential: strong enough for a money-moving action, minimal enough to avoid collecting anything we don't need.

**Where the result is verified (not trusted client-side):**
- **Server-side:** `POST /api/worldid/verify` validates the proof with the World ID Developer Portal, stores the **unique `nullifier_hash`**, and sets the account's `verified` flag. The nullifier is unique per (action, human), so the same human cannot verify a second account.
- **Gated actions fail closed:** `POST /api/channels` and `POST /api/submissions` return **403 `NOT_VERIFIED`** until the account is verified — an unverified creator can browse but cannot earn.
- **On-chain reinforcement:** for high-value approvals and human-splits, the escrow additionally requires a World ID attestation bound to the exact action, so the human check is enforced at the contract, not just the app.

---

## 2. Demonstrated paths (success + a meaningful alternative)

| Path | What happens | Result |
|---|---|---|
| **Success** | Creator completes Proof of Human in World App → server verifies → `verified: true` | Creator can prove a channel, submit clips, and earn |
| **Cancellation** | Creator closes the World ID sheet without finishing | Stays **unverified**; `POST /api/submissions` → **403 `NOT_VERIFIED`**; nothing changes |
| **Reused identity (sybil attempt)** | The **same human** verifies on a **second** wallet/account | **409 `ALREADY_USED`** — the nullifier is already stored; the second account stays unverified. *This is the core anti-sybil win.* |
| **Credential unavailable / not configured** | Proof can't be produced (or World ID not configured) | Flow **fails closed** — account stays unverified, no action is granted |

Each alternative path **leaves the protected action undone** — the creator cannot submit or earn — which is the correct, safe default when trust can't be established.

---

## 3. Integration debrief

> *Fill the bracketed items with your own numbers before submitting — don't quote mine.*

- **Time to first success:** `[your number]` (Developer Portal app + action + RP signing key, then wiring the IDKit widget on the client and the server-side `verify` route). Our rough breakdown: Portal setup `[~X min]`, client widget `[~X min]`, server verify + nullifier storage `[~X min]`.
- **Friction encountered:**
  - Keeping verification **server-side** (not trusting the client proof) took the most care — storing and uniquely-indexing the `nullifier_hash`, and deciding the exact action string.
  - Testing without an Orb meant relying on the **staging simulator / World App staging**, which adds a step to every manual test.
  - *(Separate note: the `auth.world.org` step-up used by our optional agent flow required an **enterprise** account — a personal Google account got `account_not_eligible`. This did **not** affect the IDKit Proof-of-Human gate above, which worked on the standard staging app, but it blocked the OIDC step-up variant.)*
- **Missing capability / documentation gap:** clearer, copy-paste guidance for **binding a proof to an on-chain signal** (so the same proof that gates the app can be verified in a contract) would have saved time; we had to assemble this from several docs.
- **The one improvement with the greatest impact:** a **frictionless staging path that doesn't require the World App** for every developer test (e.g., a first-class simulator credential) — it's the single biggest drag on iteration speed when the gated action moves real money and must be tested end-to-end repeatedly.

---

## 4. Where to see it in the code
- Client IDKit widget + verify trigger: `web/src/components/*` (the "Verify with World ID (Proof of Human)" action on the creator account)
- Server verification + unique nullifier: `web/src/app/api/worldid/verify/route.ts`, `web/src/lib/worldid/`
- Gate enforcement: `POST /api/submissions`, `POST /api/channels` → 403 `NOT_VERIFIED` until verified
- On-chain binding (high-value / splits): the enforcing escrow's World ID attestation argument
