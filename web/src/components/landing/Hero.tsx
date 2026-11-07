import Link from "next/link";
import { Stamp } from "@/components/Stamp";
import { Arrow } from "@/components/Icons";
import { LoopClip } from "@/components/LoopClip";
import { PoolTicker } from "./PoolTicker";
import { ClipBand } from "./ClipBand";
import { HeroStage } from "./HeroStage";
import "./hero.css";
import "./clipband.css";

/* Sample content only. The figures and clips are labelled as sample on the page. */
export function Hero() {
  return (
    <>
      <HeroStage labelledBy="hx-h">
        <div className="hx-bg" aria-hidden="true">
          <i style={{ left: "25%" }} />
          <i style={{ left: "50%" }} />
          <i style={{ left: "75%" }} />
          <span className="hx-ghost">CLIPPO</span>
        </div>

        <div className="wrap hx-grid">
          <div className="hx-copy">
            <p className="hx-chip">
              <span className="dot" aria-hidden="true" />
              Pay per clip, settled on-chain
            </p>
            <h1 id="hx-h" className="display hx-h">
              <span>Pay only for</span>
              <span>
                clips that <em>pass.</em>
              </span>
            </h1>
            <p className="lead hx-lead">
              A brand puts USDC in a pool. Verified creators post clips. An AI checks each one against the brand&rsquo;s brief and writes down why. Approved
              views settle on-chain, and rejected creators see exactly why.
            </p>
            <div className="hx-cta">
              <Link href="/desk/new" className="btn">
                Start a campaign <Arrow size={18} />
              </Link>
              <Link href="/wire" className="btn ghost">
                Browse campaigns
              </Link>
            </div>
            <dl className="hx-stats">
              <div>
                <span className="gl" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="8.5" strokeDasharray="0.8 3.2" />
                    <path d="m8.6 12.3 2.4 2.4 4.4-5" />
                  </svg>
                </span>
                <dt>Every clip</dt>
                <dd>checked against the brief</dd>
              </div>
              <div>
                <span className="gl" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="4.5" y="10.5" width="15" height="9.5" rx="2.6" />
                    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
                  </svg>
                </span>
                <dt>Your money</dt>
                <dd>held in escrow until payout</dd>
              </div>
            </dl>
            <p className="micro hx-fine">Fee 0.1 to 0.5 per side, taken by the escrow. A person approves every campaign before a creator can join.</p>
          </div>

          <figure className="hx-media" aria-label="Sample: one campaign, two clips, one payout">
            <div className="hx-layer hx-phone-c" style={{ ["--d" as string]: 8, ["--rot" as string]: "-7deg" }}>
              <LoopClip n={7} caption="@fieldnotes" className="hx-phone" ratio="9 / 16" />
            </div>
            <div className="hx-layer hx-phone-a" style={{ ["--d" as string]: 22, ["--rot" as string]: "-3deg" }}>
              <LoopClip n={3} caption="@duskpilot" className="hx-phone" ratio="9 / 16" />
            </div>
            <div className="hx-layer hx-phone-b" style={{ ["--d" as string]: 14, ["--rot" as string]: "4deg" }}>
              <LoopClip n={4} caption="@numbers.nina" className="hx-phone" ratio="9 / 16" />
            </div>

            <div className="hx-layer hx-campaign" style={{ ["--d" as string]: 30 }}>
              <div className="hx-card hx-float">
                <span className="micro">Campaign · Ledgerlane</span>
                <b className="hx-card-t">Explain the 3-minute close</b>
                <span className="micro">Pool left, USDC</span>
                <span className="hx-pool fig">
                  <PoolTicker from={1816.2} to={1740} />
                </span>
                <div className="ticks sig" role="img" aria-label="58 percent of the pool allocated">
                  <i style={{ "--p": "58%" } as React.CSSProperties} />
                </div>
                <span className="micro">$2.40 per 1,000 views</span>
              </div>
            </div>

            <div className="hx-layer hx-verdict" style={{ ["--d" as string]: 34 }}>
              <div className="hx-card hx-float" style={{ ["--bd" as string]: "-2s" }}>
                <div className="hx-card-head">
                  <span className="fig">@duskpilot</span>
                  <Stamp verdict="approved" conf={0.94} />
                </div>
                <p className="hx-quote">&ldquo;Watch a real month-end close, start to finish, in three minutes.&rdquo;</p>
                <p className="note">On brief. Both required points said. #ad label at 0:02.</p>
              </div>
            </div>

            <div className="hx-layer hx-pay" style={{ ["--d" as string]: 26 }}>
              <div className="hx-chipcard hx-float" style={{ ["--bd" as string]: "-4s" }}>
                <span className="fig hx-amt">+76.20 USDC</span>
                <span className="micro">settled</span>
              </div>
            </div>

            <div className="hx-layer hx-reject" style={{ ["--d" as string]: 18 }}>
              <div className="hx-chipcard hx-float" style={{ ["--bd" as string]: "-1s" }}>
                <Stamp verdict="rejected" conf={0.88} />
                <span className="micro">Guaranteed savings claim</span>
              </div>
            </div>

            <figcaption className="micro hx-cap">Sample data and sample footage, not live. Rejected clips are never paid.</figcaption>
          </figure>
        </div>

        <a className="hx-scroll" href="#clips">
          Discover<span className="track" aria-hidden="true" />
        </a>
      </HeroStage>

      <div className="wrap" id="clips">
        <ClipBand />
      </div>
    </>
  );
}
