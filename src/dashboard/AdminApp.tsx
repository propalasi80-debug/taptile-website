/**
 * The admin dashboard, mounted at /admin/*.
 *
 * Route-level sign-in is handled by ProtectedRoute in App.tsx. This adds the
 * admin check the old /admin page carried: a signed-in non-admin gets a plain
 * "not your page" rather than an empty dashboard. As before this is only about
 * what to render — the real gate is the row-level security policy calling
 * is_admin() in Postgres, so faking the flag in a browser still returns
 * nothing.
 */

import { useEffect, useState } from 'react';
import { Link, Navigate, Route, Routes } from 'react-router-dom';
import Seo from '../components/Seo';
import { useAuth } from '../lib/auth';
import { checkIsAdmin } from '../lib/admin';
import AppShell from './layout/AppShell';
import Overview from './pages/Overview';
import Revenue from './pages/Revenue';
import Orders from './pages/Orders';
import Production from './pages/Production';
import Inventory from './pages/Inventory';
import Costs from './pages/Costs';
import Launch from './pages/Launch';
import Customers from './pages/Customers';
import Content from './pages/Content';
import Messages from './pages/Messages';
import Settings from './pages/Settings';
import Help from './pages/Help';
import More from './pages/More';

function Checking() {
  return (
    <div className="dash flex min-h-screen items-center justify-center">
      <p className="text-[12px] text-ink-4" role="status">
        Checking access…
      </p>
    </div>
  );
}

function NotAdmin({ email }: { email?: string }) {
  return (
    <div className="dash flex min-h-screen items-center justify-center px-5">
      <div className="max-w-md text-center">
        <Seo title="Admin" description="Taptile admin." />
        <h1 className="dash-page-title">Not your page</h1>
        <p className="mt-3 text-[12.5px] text-ink-4">
          {email
            ? `${email} is not an admin on this site.`
            : 'Sign in with an admin account to see this.'}
        </p>
        <Link
          to="/"
          className="mt-7 inline-flex h-[34px] items-center rounded-chip border border-line-strong bg-tile-grad px-[13px] text-[12px] font-semibold text-ink-2"
        >
          Back to the site
        </Link>
      </div>
    </div>
  );
}

export default function AdminApp() {
  const { user } = useAuth();
  const [allowed, setAllowed] = useState<boolean>();

  useEffect(() => {
    let live = true;
    void checkIsAdmin().then((isAdmin) => {
      if (live) setAllowed(isAdmin);
    });
    return () => {
      live = false;
    };
  }, []);

  if (allowed === undefined) return <Checking />;
  if (!allowed) return <NotAdmin email={user?.email} />;

  return (
    <AppShell>
      <Seo title="Dashboard — admin" description="Taptile admin." />
      <Routes>
        <Route index element={<Overview />} />
        <Route path="revenue" element={<Revenue />} />
        <Route path="orders" element={<Orders />} />
        <Route path="production" element={<Production />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="costs" element={<Costs />} />
        <Route path="launch" element={<Launch />} />
        <Route path="customers" element={<Customers />} />
        <Route path="content" element={<Content />} />
        <Route path="messages" element={<Messages />} />
        <Route path="settings" element={<Settings />} />
        <Route path="help" element={<Help />} />
        <Route path="more" element={<More />} />

        {/* The old admin URLs. /admin/updates was the devlog editor. */}
        <Route path="updates" element={<Navigate to="/admin/content" replace />} />
        <Route path="waitlist" element={<Navigate to="/admin/customers" replace />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </AppShell>
  );
}
