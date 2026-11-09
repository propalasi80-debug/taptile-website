import { Link } from 'react-router-dom';
import Seo from '../components/Seo';
import Logo from '../site/Logo';
import WhooshHero from '../site/WhooshHero';
import { WaitlistForm } from '../site/Waitlist';
import './coming-soon.css';

/**
 * The live "coming soon" page (r25, 9 Nov 2026), built when VITE_SITE_MODE=soon.
 * Jenil: keep the full site off the public domain for now; show the first section of the
 * new site, then a waitlist. So: a quiet bar with the logo, the hero film exactly as on the
 * full site, and under it the waitlist instead of price + Buy. Signups go through the same
 * join_waitlist RPC as before (lib/waitlist.ts). No price, no ship date on this page.
 */
export default function ComingSoon() {
  return (
    <>
      <Seo
        title="Taptile Dialect · Coming soon"
        description="Taptile Dialect: a 9-key macropad with two aluminium dials, hot-swap MX-compatible switches and underglow. Coming soon. Join the waitlist."
        path="/"
        image="/og.jpg"
      />
      <header className="cs-bar">
        <Link to="/" className="cs-logo" aria-label="Taptile, home">
          <Logo size={20} variant="glyph" />
          <span>Taptile</span>
        </Link>
        <a className="cs-bar-cta" href="#waitlist">Join the waitlist</a>
      </header>
      <div className="wh-page cs-page" id="top">
        <WhooshHero
          below={
            <div className="wh-below-in cs-below" id="waitlist">
              <p className="cs-badge">
                <i aria-hidden="true" />
                Coming soon
              </p>
              <p className="wh-line">The macropad for your shortcuts.</p>
              <ul className="wh-feats">
                <li>9 hot-swap keys</li>
                <li>2 aluminium dials</li>
                <li>Underglow</li>
                <li>Mac · Windows · Linux</li>
              </ul>
              <div className="cs-form">
                <WaitlistForm place="soon-hero" note={false} />
              </div>
              <p className="cs-note">One email when the first batch opens. No payment to join.</p>
              <p className="wh-small">For business and commercial use. Designed and assembled in New Zealand.</p>
            </div>
          }
        />
      </div>
      <footer className="cs-foot">
        <span>© 2026 Taptile</span>
        <nav aria-label="Legal">
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
          <a href="mailto:taptile.admin@gmail.com">taptile.admin@gmail.com</a>
        </nav>
      </footer>
    </>
  );
}
