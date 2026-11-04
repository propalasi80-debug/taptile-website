import Seo from '../components/Seo';
import { WaitlistForm } from '../site/Waitlist';
import { BuyButton, BuyPanel } from '../site/Buy';
import { PRICE_LABEL, SALE_MODE, SALE_STATE } from '../site/launch';

const TAG = {
  waitlist: 'Coming soon',
  open: SALE_MODE === 'preorder' ? 'Pre-orders open' : 'On sale now',
  soldout: 'First batch sold out',
} as const;

/**
 * Landing page: one screen. The board, its name, and either the waitlist or
 * the buy button, depending on SALE_STATE in src/site/launch.ts. With no
 * Payment Link set, this renders exactly the waitlist page it always was.
 *
 * Copy rules (checked by scripts/check-copy.sh): the 13 LEDs are underglow
 * only and the keys stay dark; MX-compatible; designed in New Zealand,
 * final assembly in New Zealand (the PCBs are assembled by JLCPCB). The price
 * only appears when it can actually be paid. No ship date, no counters.
 */
export default function Landing() {
  const open = SALE_STATE === 'open';
  return (
    <>
      <Seo
        title={open ? 'Taptile Dialect' : 'Taptile Dialect — join the waitlist'}
        description={
          open
            ? `Taptile Dialect: nine keys, two knobs and underglow. Designed in New Zealand. ${PRICE_LABEL}, shipped within New Zealand.`
            : 'Taptile Dialect: nine keys, two knobs and underglow. Designed in New Zealand. Join the waitlist for the first batch.'
        }
        path="/"
        image="/og.jpg"
      />
      <section className="land" id={open ? 'buy' : 'waitlist'}>
        <div className="land-copy">
          <span className="land-tag">{TAG[SALE_STATE]}</span>
          <h1>Taptile Dialect</h1>
          <p className="lede">Nine keys. Two knobs. Underglow.</p>
        </div>
        <picture className="land-img">
          <source media="(max-width: 860px)" srcSet="/media/hero-sm.webp" />
          <img src="/media/hero.webp" width={1830} height={1600} alt="The Taptile Dialect macro pad with white underglow" fetchPriority="high" decoding="async" />
        </picture>
        <div className="land-form">
          {open ? (
            <BuyPanel />
          ) : (
            <>
              {SALE_STATE === 'soldout' && (
                <div className="buy buy-sold">
                  <BuyButton className="btn btn-white buy-btn" />
                </div>
              )}
              <WaitlistForm place="hero" note={false} />
              <p className="wl-note">
                {SALE_STATE === 'soldout'
                  ? 'Join the waitlist. One email when the next batch is ready. No payment.'
                  : 'Join the waitlist. One email when the first batch is ready. No payment.'}
              </p>
            </>
          )}
        </div>
      </section>
    </>
  );
}
