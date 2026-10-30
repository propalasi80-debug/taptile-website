import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { SocialIcons } from './socials';

export function Brand() {
  return (
    <Link to="/" className="brand" aria-label="Taptile home">
      <img src="/logo-cut.png" alt="" aria-hidden="true" />
      Taptile
    </Link>
  );
}

const LINKS = [
  { to: '/updates', label: 'Updates' },
];

/** Floating pill. Clear over the hero, fills in behind a blur once you scroll. */
export function Nav() {
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setOpen(false), [location.pathname, location.hash]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      <header className={`nav ${solid || open ? 'solid' : ''}`}>
        <Brand />
        <nav className="nav-links" aria-label="Main">
          {LINKS.map((link) => (
            <Link key={link.to} to={link.to}>
              {link.label}
            </Link>
          ))}
        </nav>
        <span className="spacer" />
        {location.pathname !== '/' && (
          <Link to="/#waitlist" className="btn btn-white">
            Join the waitlist
          </Link>
        )}
        <button
          type="button"
          className="menu-btn"
          aria-expanded={open}
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((value) => !value)}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            {open ? <path d="M4 4l10 10M14 4L4 14" /> : <path d="M2 6h14M2 12h14" />}
          </svg>
        </button>
      </header>
      {open && (
        <div className="sheet" role="dialog" aria-modal="true" aria-label="Menu">
          {LINKS.map((link) => (
            <Link key={link.to} to={link.to}>
              {link.label}
            </Link>
          ))}
          <Link to="/#waitlist" className="btn btn-white">
            Join the waitlist
          </Link>
          <SocialIcons />
        </div>
      )}
    </>
  );
}

export function Footer() {
  const { user, signOut } = useAuth();
  return (
    <footer className="foot">
      <div className="shell">
        <div className="foot-row">
          <Brand />
          <div className="foot-links">
            <Link to="/#waitlist">Waitlist</Link>
            <Link to="/updates">Updates</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
            <a href="mailto:support@trytaptile.com">Support</a>
            {user ? (
              <>
                <Link to="/admin">Admin</Link>
                <button type="button" onClick={() => void signOut()}>
                  Sign out
                </button>
              </>
            ) : (
              <Link to="/login">Team sign in</Link>
            )}
          </div>
          <SocialIcons className="foot-social" />
        </div>
        <div className="foot-small">
          <span>Designed in New Zealand · Final assembly in New Zealand</span>
          <span>© {new Date().getFullYear()} Taptile</span>
        </div>
      </div>
    </footer>
  );
}

/** Fades and lifts children in the first time they scroll into view. */
export function Reveal({
  children,
  className = '',
  as: Tag = 'div',
  delay = 0,
  id,
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'span';
  delay?: 0 | 1 | 2 | 3;
  id?: string;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (!('IntersectionObserver' in window)) {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px -12% 0px' },
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      id={id}
      ref={ref as never}
      className={`rv ${delay ? `rv-d${delay}` : ''} ${inView ? 'in' : ''} ${className}`}
    >
      {children}
    </Tag>
  );
}

/** A line of words that rise up out of a mask, one after another. */
export function Rise({ text, className = '', step = 0.06, start = 0 }: { text: string; className?: string; step?: number; start?: number }) {
  return (
    <>
      {text.split(' ').map((word, i) => (
        <span key={`${word}-${i}`} className={`mask ${className}`}>
          <span style={{ transitionDelay: `${start + i * step}s` }}>{word}&nbsp;</span>
        </span>
      ))}
    </>
  );
}
