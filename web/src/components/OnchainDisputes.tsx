"use client";

import { useCallback, useEffect, useState } from "react";
import { disputeCredits, listChainDisputes, resolveDispute, type ChainDispute } from "@/lib/chain/client";

const short = (w: string) => `${w.slice(0, 6)}…${w.slice(-4)}`;
const when = (d: string | null) => (d ? new Date(d).toLocaleString() : "");

/**
 * On-chain disputes of per-view credits. The campaigner can challenge credits still in their retention window; an admin settles.
 * If nobody settles in time, the contract releases the credits to the creator on its own.
 */
export function OnchainDisputes({ role }: { role: "campaigner" | "admin" }) {
  const [rows, setRows] = useState<ChainDispute[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setRows((await listChainDisputes()).disputes);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    let live = true;
    listChainDisputes()
      .then((r) => { if (live) setRows(r.disputes); })
      .catch((e: Error) => { if (live) setError(e.message); });
    return () => { live = false; };
  }, []);

  async function act(r: ChainDispute, what: "dispute" | "uphold" | "deny") {
    setBusy(r.payoutId);
    setNotice(null);
    try {
      if (what === "dispute") await disputeCredits(r.onchainId, r.creatorWallet);
      else await resolveDispute(r.onchainId, r.creatorWallet, what === "uphold");
      setNotice(what === "dispute" ? "Dispute opened on-chain. These credits can't be claimed until it's settled." : what === "uphold" ? "Dispute upheld. The credits left the creator's balance." : "Dispute denied. The credits release on schedule.");
      await load();
    } catch (e) {
      setNotice(`Nothing changed. ${(e as Error).message.split("\n")[0]}`);
    } finally {
      setBusy(null);
    }
  }

  const visible = (rows ?? []).filter((r) => (role === "admin" ? r.open : true));
  return (
    <section className="section" aria-labelledby={`chain-disputes-${role}`}>
      <div className="section-title">
        <h2 id={`chain-disputes-${role}`}>On-chain disputes</h2>
        <span className="micro">{role === "admin" ? "Refunds go to the brand, never to an admin" : "Challenge credits before they release"}</span>
      </div>
      {notice && <div className="notice" role="status" style={{ marginBottom: 16 }}>{notice}</div>}
      {error && <p className="micro" role="alert">Disputes did not load: {error}</p>}
      {!error && rows && visible.length === 0 && <p className="micro">{role === "admin" ? "No open disputes." : "No credits in their retention window."}</p>}
      {visible.length > 0 && (
        <ul>
          {visible.map((r) => (
            <li key={r.payoutId} className="row" style={{ justifyContent: "space-between", padding: "14px 0", borderBottom: "1px solid var(--rule-soft)" }}>
              <span className="stack" style={{ gap: 4 }}>
                <b>{r.title}</b>
                <span className="micro">{short(r.creatorWallet)} · {r.amount} USDC · {r.open ? `open until ${when(r.resolveBy)}` : `releases ${when(r.releaseAt)}`}</span>
              </span>
              <span className="row">
                {role === "campaigner" && !r.open && <button className="btn ghost sm" disabled={busy === r.payoutId} onClick={() => act(r, "dispute")}>Dispute</button>}
                {role === "campaigner" && r.open && <span className="micro">Under dispute</span>}
                {role === "admin" && (
                  <>
                    <button className="btn sm" disabled={busy === r.payoutId} onClick={() => act(r, "uphold")}>Uphold</button>
                    <button className="btn ghost sm" disabled={busy === r.payoutId} onClick={() => act(r, "deny")}>Deny</button>
                  </>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
