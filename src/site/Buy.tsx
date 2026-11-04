import { Link } from 'react-router-dom';
import { BUY_LABEL, BUY_URL, IS_TEST_CHECKOUT, PRICE_LABEL, SALE_MODE, SALE_STATE } from './launch';

/**
 * The one Buy button. Every buy call-to-action on the site renders this, so the
 * three states are decided in one place:
 *
 *  - open:     a plain link to the Stripe Payment Link, same tab
 *  - sold out: a disabled "Sold out" button with no link
 *  - waitlist: no link configured yet, so it scrolls to the waitlist as before
 */
export function BuyButton({ className = 'btn btn-white' }: { className?: string }) {
  if (SALE_STATE === 'soldout') {
    return (
      <button type="button" className={`${className} btn-sold`} disabled>
        Sold out
      </button>
    );
  }
  if (SALE_STATE === 'open' && BUY_URL) {
    return (
      <a href={BUY_URL} className={className}>
        {BUY_LABEL}
      </a>
    );
  }
  return (
    <Link to="/#waitlist" className={className}>
      Join the waitlist
    </Link>
  );
}

/**
 * Shown under the button while it reads "Pre-order". Paying for something that
 * can't ship yet is a pre-order under the Fair Trading Act, and the buyer has
 * to know that before they pay, not after.
 */
export function PreorderLines() {
  return (
    <ul className="buy-terms" aria-label="Pre-order terms">
      <li>This is a pre-order. You pay now, and orders ship in the order they were paid.</li>
      <li>There's no ship date yet. We'll email you as soon as there is one.</li>
      <li>Cancel any time before it ships for a full refund.</li>
      <li>Your rights under the Consumer Guarantees Act aren't affected.</li>
    </ul>
  );
}

/** The buy block on the landing page: price, button, and the small print. */
export function BuyPanel() {
  return (
    <div className="buy">
      <p className="buy-price">
        <b>{PRICE_LABEL}</b>
        <span>+ NZ Post shipping, shown at checkout</span>
      </p>
      <BuyButton className="btn btn-white buy-btn" />
      {SALE_MODE === 'preorder' && <PreorderLines />}
      <p className="wl-note">
        Checkout by Stripe. Ships within New Zealand only.{' '}
        <Link to="/shipping">Shipping</Link> · <Link to="/returns">Returns</Link>
      </p>
      {IS_TEST_CHECKOUT && (
        <p className="buy-test" role="note">
          Test checkout, no real charge. Card 4242 4242 4242 4242, any future date, any CVC.
        </p>
      )}
    </div>
  );
}
