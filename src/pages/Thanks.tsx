import { Link } from 'react-router-dom';
import Seo from '../components/Seo';
import { SUPPORT_EMAIL } from '../site/launch';

/**
 * Where the Stripe Payment Link sends people after paying:
 * /thanks?session_id={CHECKOUT_SESSION_ID}
 *
 * The session_id is accepted and deliberately ignored. Verifying it needs a
 * server with a secret key, and nothing here depends on it: Stripe sends the
 * receipt, and the order is in Stripe → Payments. No date, no upsell, no counter.
 */
export default function Thanks() {
  return (
    <section className="page thanks" style={{ background: 'var(--haze)' }}>
      <Seo title="Order received" description="Thanks for your order." path="/thanks" />
      <div className="shell article">
        <span className="eyebrow">Thank you</span>
        <h1>Order received.</h1>
        <p className="lede">
          Your receipt is on its way from Stripe. We'll email tracking when your Dialect ships.
        </p>
        <p className="lede">
          Questions about your order? Email{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: '#fff', textDecoration: 'underline', textUnderlineOffset: 3 }}>
            {SUPPORT_EMAIL}
          </a>{' '}
          with the receipt number from your Stripe email.
        </p>
        <div className="thanks-actions">
          <Link to="/" className="btn btn-white">
            Back to Taptile
          </Link>
          <Link to="/contact" className="btn btn-ghost">
            Contact us
          </Link>
        </div>
      </div>
    </section>
  );
}
