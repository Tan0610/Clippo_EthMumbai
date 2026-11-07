"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Blades } from "./Icons";
import { useSession } from "./hooks";
import { useDemo } from "./api";
import { pctText, useFees } from "./FeePreview";
import { FAUCET_URL } from "./wallet";
import { WalletPicker } from "./WalletPicker";

/* Routes are unchanged; only the visible words are plain now. */
const NAV = [
  { href: "/wire", label: "Campaigns", glyph: "campaigns" },
  { href: "/hire", label: "Hire creators", glyph: "creators" },
  { href: "/desk", label: "My campaigns", glyph: "mine" },
  { href: "/ledger", label: "Earnings", glyph: "earnings" },
  { href: "/bench", label: "Admin review", glyph: "admin" },
  { href: "/account", label: "Account", glyph: "account" },
] as const;

/* 16px line glyphs for the dock. Decorative only (aria-hidden), the label carries the meaning. */
function Glyph({ k }: { k: (typeof NAV)[number]["glyph"] }) {
  const d: Record<string, React.ReactNode> = {
    campaigns: (
      <>
        <rect x="2.5" y="3" width="11" height="10" rx="2.4" />
        <path d="M6.7 6.1v3.8l3.2-1.9z" />
      </>
    ),
    creators: (
      <>
        <circle cx="6" cy="5.6" r="2.3" />
        <path d="M2 13c.3-2.2 1.9-3.5 4-3.5s3.7 1.3 4 3.5" />
        <path d="M11.3 4.2a2.1 2.1 0 0 1 0 3.9M13.8 12.8c-.1-1.5-.8-2.5-1.9-3" />
      </>
    ),
    mine: (
      <>
        <rect x="2.4" y="2.4" width="4.6" height="4.6" rx="1.3" />
        <rect x="9" y="2.4" width="4.6" height="4.6" rx="1.3" />
        <rect x="2.4" y="9" width="4.6" height="4.6" rx="1.3" />
        <rect x="9" y="9" width="4.6" height="4.6" rx="1.3" />
      </>
    ),
    earnings: (
      <>
        <circle cx="8" cy="8" r="5.6" />
        <path d="M8 5v6M9.7 6.4c-.4-.6-1-.9-1.7-.9-1 0-1.7.5-1.7 1.2 0 1.7 3.5.8 3.5 2.5 0 .7-.8 1.3-1.8 1.3-.8 0-1.5-.3-1.9-.9" />
      </>
    ),
    admin: (
      <>
        <path d="M8 2 13 4v3.6c0 3-2 5.2-5 6.4-3-1.2-5-3.4-5-6.4V4z" />
        <path d="m5.9 8 1.5 1.5 2.8-3" />
      </>
    ),
    account: (
      <>
        <circle cx="8" cy="5.6" r="2.6" />
        <path d="M2.9 13.4c.4-2.4 2.4-3.9 5.1-3.9s4.7 1.5 5.1 3.9" />
      </>
    ),
  };
  return (
    <svg className="gl" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {d[k]}
    </svg>
  );
}

/** Visible on the public test deployment only (NEXT_PUBLIC_TEST_DEPLOY=1 at build time). */
export const IS_TEST_DEPLOY = process.env.NEXT_PUBLIC_TEST_DEPLOY === "1";

export function TestnetBanner() {
  if (!IS_TEST_DEPLOY) return null;
  return (
    <div className="testnet-banner" role="note">
      <b>TESTNET</b> — test funds only. Arc testnet USDC has no value; this is a test deployment, so expect resets and please report anything odd.
    </div>
  );
}

export function Dateline() {
  const demo = useDemo();
  return (
    <div className="dateline">
      <div className="wrap">
        <span>Arc test network · USDC{demo ? " · Demo build, sample data" : ""}</span>
      </div>
    </div>
  );
}

export function Masthead() {
  const path = usePathname();
  const s = useSession();
  const [open, setOpen] = useState(false);
  const dockRef = useRef<HTMLDivElement>(null);
  const connect = () => s.connect().catch(() => {});
  useEffect(() => {
    const t = setTimeout(() => setOpen(false), 0);
    return () => clearTimeout(t);
  }, [path]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  /* Presentation only: a lit rim on the dock that turns toward the pointer. Fine pointers, no reduced motion. */
  useEffect(() => {
    const el = dockRef.current;
    if (!el) return;
    if (!window.matchMedia("(pointer: fine)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    let x = 0;
    let y = 0;
    const paint = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const dx = x - (r.left + r.width / 2);
      const dy = y - (r.top + r.height / 2);
      const out = Math.hypot(Math.max(Math.abs(dx) - r.width / 2, 0), Math.max(Math.abs(dy) - r.height / 2, 0));
      el.style.setProperty("--spec-angle", `${Math.atan2(dx, -dy) - 0.49}rad`);
      el.style.setProperty("--spec-bright", Math.max(0, 1 - out / 280).toFixed(3));
    };
    const move = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      if (!raf) raf = requestAnimationFrame(paint);
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => {
      window.removeEventListener("pointermove", move);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <header className="masthead">
      <div className="dock" ref={dockRef}>
        <Link href="/" className="wordmark" aria-label="Clippo, home">
          <span className="mark">
            <Blades />
          </span>
          <b>Clippo</b>
        </Link>
        <button
          type="button"
          className="menu-btn"
          aria-expanded={open}
          aria-controls="primary-nav"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? "Close" : "Menu"}
        </button>
        <nav id="primary-nav" className="nav" aria-label="Primary" data-open={open}>
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} aria-current={path === n.href || path.startsWith(n.href + "/") ? "page" : undefined}>
              <Glyph k={n.glyph} />
              <span>{n.label}</span>
            </Link>
          ))}
        </nav>
        <div className="masthead-tools" data-open={open}>
          {s.address ? (
            <button className="wallet" onClick={s.disconnect} title="Disconnect wallet" aria-label={`Signed in as ${s.role}, wallet ${s.address}. Activate to disconnect.`}>
              <span className="micro">{s.role === "campaigner" ? "brand" : s.role}</span> {s.address}
            </button>
          ) : (
            <button className="wallet" onClick={connect} disabled={s.connecting} aria-busy={s.connecting}>
              {s.connecting ? "Check your wallet" : "Connect wallet"}
            </button>
          )}
        </div>
      </div>
      {s.picker && <WalletPicker wallets={s.picker.wallets} onPick={s.pickWallet} onCancel={s.cancelPicker} />}
      {s.rolePrompt && (
        <div className="sheet-back" role="presentation">
          <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="role-t">
            <span className="micro">New wallet</span>
            <h2 id="role-t" className="display" style={{ fontSize: "2rem" }}>How will you use Clippo?</h2>
            <p className="muted">A wallet holds one role, and it cannot be changed later. You will sign once more to create the account.</p>
            <div className="stack" style={{ gap: 10 }}>
              <button className="btn" onClick={() => s.connect("creator").catch(() => {})}>I clip: creator</button>
              <button className="btn" onClick={() => s.connect("campaigner").catch(() => {})}>I pay for clips: campaigner</button>
              <button className="btn ghost sm" onClick={s.dismissRolePrompt}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      {(s.connectError || s.notice) && (
        <div className="sheet-back" role="presentation">
          <div className="sheet" role="alertdialog" aria-modal="true" aria-labelledby="cn-t">
            <span className="micro">Wallet</span>
            <h2 id="cn-t" className="display" style={{ fontSize: "2rem" }}>{s.connectError ? "Could not connect" : "Signed out"}</h2>
            <p className="muted">{s.connectError || s.notice}</p>
            <div className="row"><button className="btn" onClick={s.clearNotice}>Close</button></div>
          </div>
        </div>
      )}
    </header>
  );
}

export function Footer() {
  const fees = useFees();
  return (
    <footer className="foot">
      <div className="wrap">
        <div className="stack">
          <b className="display" style={{ fontSize: "1.6rem" }}>
            Clippo
          </b>
          <p>
            Brands fund a USDC pool. Verified humans post clips. An AI checks each clip against the brief and writes down why. The AI never releases
            money on its own.
          </p>
        </div>
        <div className="stack" style={{ gap: 6 }}>
          <span className="micro">Get started</span>
          <Link href="/wire">Browse campaigns</Link>
          <Link href="/desk/new">Start a campaign</Link>
          <Link href="/join">Join as a creator</Link>
        </div>
        <div className="stack" style={{ gap: 6 }}>
          <span className="micro">Fees and payouts</span>
          {IS_TEST_DEPLOY ? <p className="testnet-foot"><b>TESTNET — test funds only.</b> Never send real funds to this app.</p> : null}
          <p>
            {fees && fees !== "failed"
              ? `Platform fee: ${pctText(fees.campaignerBps)} from the campaigner and ${pctText(fees.creatorBps)} from the creator, deducted by the escrow.`
              : fees === "failed"
                ? "Platform fee: the fee schedule could not be read from the service."
                : "Platform fee: reading the schedule from the escrow."}{" "}
            Payouts are USDC on Arc, claimed by the creator.
          </p>
          <a href={FAUCET_URL} target="_blank" rel="noreferrer noopener">Arc testnet USDC faucet</a>
        </div>
      </div>
    </footer>
  );
}
