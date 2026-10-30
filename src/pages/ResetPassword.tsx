import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Seo from '../components/Seo';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';

/**
 * Landing page for the emailed reset link.
 *
 * Supabase puts the recovery session in the URL fragment and the client picks
 * it up automatically (detectSessionInUrl). Until that has happened there is no
 * session, so we wait rather than bouncing the user away.
 */
export default function ResetPassword() {
  const { updatePassword } = useAuth();
  const navigate = useNavigate();

  const [ready, setReady] = useState(false);
  const [valid, setValid] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setReady(true);
      return;
    }
    let active = true;

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === 'PASSWORD_RECOVERY' || session) {
        setValid(true);
        setReady(true);
      }
    });

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setValid(data.session !== null);
      setReady(true);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Use at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Those two passwords do not match.');
      return;
    }

    setBusy(true);
    const result = await updatePassword(password);
    setBusy(false);

    if (!result.ok) {
      setError(result.error ?? 'Could not update your password.');
      return;
    }
    navigate('/admin', { replace: true });
  }

  return (
    <div className="flex items-center justify-center px-5 py-16">
      <Seo title="Set a new password" description="Set a new Taptile password." />

      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-heading tracking-heading text-neutral-100">
          Set a new password
        </h1>

        {!ready ? (
          <p className="mt-6 text-sm text-neutral-500">Checking your link…</p>
        ) : !valid ? (
          <div className="mt-6 rounded-xl border border-hairline bg-surface px-5 py-4">
            <p className="font-semibold text-neutral-100">This link has expired</p>
            <p className="mt-1.5 text-sm text-neutral-400">
              Reset links last an hour and work once. Request a fresh one.
            </p>
            <Link to="/forgot-password" className="btn-secondary mt-4">
              Get a new link
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-7 space-y-4" noValidate>
            <div>
              <label htmlFor="new-password" className="label">
                New password
              </label>
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="field"
                placeholder="At least 8 characters"
                disabled={busy}
              />
            </div>

            <div>
              <label htmlFor="confirm-password" className="label">
                Confirm password
              </label>
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                className="field"
                disabled={busy}
              />
            </div>

            {error && (
              <p className="text-sm text-danger" role="alert">
                {error}
              </p>
            )}

            <button type="submit" className="btn-primary w-full" disabled={busy}>
              {busy ? 'Saving…' : 'Save new password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
