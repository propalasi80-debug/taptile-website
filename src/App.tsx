import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useEffect, type ReactNode } from 'react';
import './site/site.css';
import { Footer, Nav } from './site/chrome';
import { WaitlistProvider } from './site/Waitlist';
import ProtectedRoute from './components/ProtectedRoute';
// The old waitlist landing (pages/Landing.tsx) is kept in the repo but no longer routed.
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import AdminApp from './dashboard/AdminApp';
import Updates from './pages/Updates';
import Update from './pages/Update';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import Leave from './pages/Leave';
import ComingSoon from './pages/ComingSoon';

/** Jump to the top on navigation, or to the #anchor when there is one. */
function ScrollBehaviour() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      // Landing sections mount after the route change, so give them a frame.
      const id = window.setTimeout(() => {
        const target = document.querySelector(hash);
        if (target) target.scrollIntoView({ behavior: 'smooth' });
        else window.scrollTo(0, 0);
      }, 30);
      return () => window.clearTimeout(id);
    }
    window.scrollTo(0, 0);
    return undefined;
  }, [pathname, hash]);

  return null;
}

/** Team sign-in pages keep their own forms; this just seats them under the nav. */
function AuthFrame({ children }: { children: ReactNode }) {
  return <div className="auth-frame">{children}</div>;
}

/**
 * There is no shop. One board exists, it is not orderable yet, and every route
 * here ends at the waitlist or the devlog. Sign-in is kept because /admin is
 * how updates get published — not because visitors have accounts.
 */
const siteRoutes = (
  <Routes>
    <Route path="/" element={<ComingSoon />} />
    <Route path="/updates" element={<Updates />} />
    <Route path="/updates/:slug" element={<Update />} />
    <Route path="/privacy" element={<Privacy />} />
    <Route path="/terms" element={<Terms />} />
    <Route path="/login" element={<AuthFrame><Login /></AuthFrame>} />
    <Route path="/forgot-password" element={<AuthFrame><ForgotPassword /></AuthFrame>} />
    <Route path="/reset-password" element={<AuthFrame><ResetPassword /></AuthFrame>} />
    <Route path="/leave" element={<AuthFrame><Leave /></AuthFrame>} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

/**
 * The public site. The dashboard is deliberately not rendered inside this: it
 * owns the whole viewport and its own design, so /admin never sees `.tt`.
 */
function Site() {
  const { pathname } = useLocation();
  // the front page is the white coming-soon page with its own bar and footer (r25)
  if (pathname === '/') {
    return (
      <WaitlistProvider>
        <div className="tt tt-light">
          <main id="main">{siteRoutes}</main>
        </div>
      </WaitlistProvider>
    );
  }
  return (
    <WaitlistProvider>
      <div className="tt">
        <a href="#main" className="skip">
          Skip to content
        </a>
        <Nav />
        <main id="main">{siteRoutes}</main>
        <Footer />
      </div>
    </WaitlistProvider>
  );
}

export default function App() {
  return (
    <>
      <ScrollBehaviour />
      <Routes>
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute>
              <AdminApp />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Site />} />
      </Routes>
    </>
  );
}
