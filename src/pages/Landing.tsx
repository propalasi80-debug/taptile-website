import Seo from '../components/Seo';
import { WaitlistForm } from '../site/Waitlist';

/**
 * Landing page: one screen. The board, its name, the signup. Nothing to scroll
 * past before you can join.
 *
 * Copy rules (checked by scripts/check-copy.sh): the 13 LEDs are underglow
 * only and the keys stay dark; MX-compatible; designed in New Zealand,
 * final assembly in New Zealand (the PCBs are assembled by JLCPCB); no price or ship date.
 */
export default function Landing() {
  return (
    <>
      <Seo
        title="Taptile Dialect — join the waitlist"
        description="Taptile Dialect: nine keys, two knobs and underglow. Designed in New Zealand. Join the waitlist for the first batch."
        path="/"
        image="/og.jpg"
      />
      <section className="land" id="waitlist">
        <div className="land-copy">
          <span className="land-tag">Coming soon</span>
          <h1>Taptile Dialect</h1>
          <p className="lede">Nine keys. Two knobs. Underglow.</p>
        </div>
        <picture className="land-img">
          <source media="(max-width: 860px)" srcSet="/media/hero-sm.webp" />
          <img src="/media/hero.webp" width={1830} height={1600} alt="The Taptile Dialect macro pad with white underglow" fetchPriority="high" decoding="async" />
        </picture>
        <div className="land-form">
          <WaitlistForm place="hero" note={false} />
          <p className="wl-note">Join the waitlist. One email when the first batch is ready. No payment.</p>
        </div>
      </section>
    </>
  );
}
