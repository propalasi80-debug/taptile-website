import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import Seo from '../components/Seo';
import { useAuth } from '../lib/auth';

export default function ForgotPassword() {
  const { requestPasswordReset, configured } = useAuth();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError('Enter a valid email address.');
      return;
    }

    setBusy(true);
    const result = await requestPasswordReset(email);
    setBusy(false);

    // Show the same confirmation either way — telling a stranger whether an
    // address has an account here is an account-enumeration leak.
    if (!result.ok && !configured) {
      setError(result.error ?? 'Something went wrong.');
      return;
    }
    setSent(true);
  }

  return (
    <div className="flex items-center justify-center px-5 py-16">
      <Seo title="Reset your password" description="Reset your Taptile password." path="/forgot-password" />

      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-heading tracking-heading text-neutral-100">
          Reset your password
        </h1>

        {sent ? (
          <div
            className="mt-6 rounded-xl border border-hairline bg-surface px-5 py-4"
            role="status"
            aria-live="polite"
          >
            <p className="font-semibold text-neutral-100">Check your inbox</p>
            <p className="mt-1.5 text-sm leading-relaxed text-neutral-400">
              If there&apos;s an account for {email}, a reset link is on its way. It expires
              in an hour.
            </p>
          </div>
        ) : (
          <>
            <p className="mt-2 text-sm text-neutral-400">
              We&apos;ll email you a link to set a new one.
            </p>

            <form onSubmit={handleSubmit} className="mt-7 space-y-4" noValidate>
              <div>
                <label htmlFor="reset-email" className="label">
                  Email
                </label>
                <input
                  id="reset-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="field"
                  placeholder="you@example.com"
                  disabled={busy}
                />
              </div>

              {error && (
                <p className="text-sm text-danger" role="alert">
                  {error}
                </p>
              )}

              <button type="submit" className="btn-primary w-full" disabled={busy}>
                {busy ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
          </>
        )}

        <p className="mt-7 text-center text-sm text-neutral-400">
          <Link to="/login" className="inline-flex min-h-[24px] items-center font-semibold text-neutral-100 hover:text-white">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
