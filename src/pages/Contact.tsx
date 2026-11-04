import { Link } from 'react-router-dom';
import Seo from '../components/Seo';
import { SUPPORT_EMAIL } from '../site/launch';

/**
 * Contact and support. Stripe's account review looks for this page, and the
 * email has to match Stripe → Settings → Business → Public details.
 *
 * The region is enough to say who customers deal with. The town is left out
 * on purpose: the sellers are minors (see terms §1).
 */
export default function Contact() {
  return (
    <section className="page" style={{ background: 'var(--haze)' }}>
      <Seo title="Contact" description="How to reach Taptile about an order, a return or anything else." path="/contact" />
      <div className="shell article">
        <span className="eyebrow">Support</span>
        <h1>Contact</h1>
        <p className="lede" style={{ marginTop: 22 }}>
          Orders, returns, a fault, or a question about the Dialect: email us. A person reads every message.
        </p>
        <dl className="contact-card glass">
          <dt>Email</dt>
          <dd>
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
          </dd>
          <dt>Based in</dt>
          <dd>Manawatū, New Zealand</dd>
        </dl>
        <div className="prose">
          <p>
            <strong>About an order?</strong> Include the receipt number from your Stripe email so we can find it fast.
          </p>
          <p>
            <strong>Something wrong with it?</strong> A photo or short video helps. See{' '}
            <Link to="/returns">Returns and refunds</Link> for what happens next.
          </p>
          <p>
            Also: <Link to="/shipping">Shipping</Link> · <Link to="/terms">Terms</Link> ·{' '}
            <Link to="/privacy">Privacy</Link>
          </p>
        </div>
      </div>
    </section>
  );
}
