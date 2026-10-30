import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import Seo from '../components/Seo';

type Mode = 'signin' | 'signup';

interface LocationState {
  from?: string;
}

export default function Login() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [mode, setMode] = useState<Mode>(
    searchParams.get('mode') === 'signup' ? 'signup' : 'signin',
  );

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  const { user, loading, configured, signIn, signUp, signInWithGoogle, resendConfirmation } =
    useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const destination = (location.state as LocationState | null)?.from ?? '/account';

  // Already signed in? Skip the form entirely.
  useEffect(() => {
    if (!loading && user) navigate(destination, { replace: true });
  }, [loading, user, navigate, destination]);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setNotice(null);
    setAwaitingConfirmation(false);
    setSearchParams(next === 'signup' ? { mode: 'signup' } : {}, { replace: true });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError('Enter a valid email address.');
      return;
    }
    if (mode === 'signup' && password.length < 8) {
      setError('Use at least 8 characters for your password.');
      return;
    }
    if (!password) {
      setError('Enter your password.');
      return;
    }

    setBusy(true);
    const result = mode === 'signin' ? await signIn(email, password) : await signUp(email, password);
    setBusy(false);

    if (!result.ok) {
      setError(result.error ?? 'Something went wrong. Try again.');
      return;
    }

    if (result.alreadyRegistered) {
      // switchMode clears error and notice, so flip the mode FIRST and set the
      // message after -- the other order looks right and silently shows nothing.
      switchMode('signin');
      setError(
        'That address already has an account. Sign in instead — or use ' +
          'Continue with Google if that is how you set it up.',
      );
      return;
    }

    if (result.needsEmailConfirmation) {
      setNotice(`Check ${email} for a confirmation link, then sign in.`);
      setAwaitingConfirmation(true);
      return;
    }

    navigate(destination, { replace: true });
  }

  async function handleGoogle() {
    setError(null);
    setBusy(true);
    const result = await signInWithGoogle();
    setBusy(false);
    // On success the browser redirects away, so only failure lands here.
    if (!result.ok) setError(result.error ?? 'Google sign-in failed.');
  }

  return (
    <div className="flex items-center justify-center px-5 py-16">
      <Seo
        title={mode === 'signin' ? 'Sign in' : 'Create your account'}
        description="Sign in to your Taptile account."
        path="/login"
      />
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-heading tracking-heading text-neutral-100">
            {mode === 'signin' ? 'Sign in' : 'Create your account'}
          </h1>
          <p className="mt-2 text-sm text-neutral-400">
            {mode === 'signin'
              ? 'Pick up wherever you left off.'
              : 'Free forever. No card needed.'}
          </p>

          {!configured && (
            <div
              className="mt-6 rounded-none border border-amber-500/30 bg-amber-500/10 p-4 text-sm"
              role="alert"
            >
              <p className="font-semibold text-amber-300">Sign-in is not connected yet</p>
              <p className="mt-1.5 leading-relaxed text-amber-200/70">
                Add <code className="text-amber-200">VITE_SUPABASE_URL</code> and{' '}
                <code className="text-amber-200">VITE_SUPABASE_ANON_KEY</code> to{' '}
                <code className="text-amber-200">apps/web/.env.local</code>, then restart the
                dev server.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-7 space-y-4" noValidate>
            <div>
              <label htmlFor="email" className="label">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="field"
                placeholder="you@example.com"
                autoComplete="email"
                disabled={busy}
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-baseline justify-between gap-3">
                <label htmlFor="password" className="label mb-0">
                  Password
                </label>
                {mode === 'signin' && (
                  <Link
                    to="/forgot-password"
                    className="text-xs text-neutral-400 transition hover:text-neutral-100"
                  >
                    Forgot?
                  </Link>
                )}
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="field pr-16"
                  placeholder={mode === 'signup' ? 'At least 8 characters' : '••••••••'}
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  disabled={busy}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-pressed={showPassword}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2 top-1/2 inline-flex min-h-[28px] min-w-[36px] -translate-y-1/2 items-center justify-center text-xs font-medium
                             text-neutral-400 transition hover:text-neutral-100"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-rose-400" role="alert">
                {error}
              </p>
            )}
            {notice && (
              <div className="text-sm text-neutral-300" role="status" aria-live="polite">
                <p>{notice}</p>
                {awaitingConfirmation && (
                  <button
                    type="button"
                    onClick={async () => {
                      setNotice('Sending…');
                      const result = await resendConfirmation(email);
                      setNotice(
                        result.ok
                          ? `Sent again to ${email}.`
                          : (result.error ?? 'Could not resend just now.'),
                      );
                    }}
                    className="mt-1.5 text-xs text-neutral-400 underline underline-offset-2
                               transition hover:text-neutral-100"
                  >
                    Didn&apos;t arrive? Send it again
                  </button>
                )}
              </div>
            )}

            <button type="submit" className="btn-primary w-full py-2.5" disabled={busy}>
              {busy ? 'Working…' : mode === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-surface2" />
            <span className="text-xs uppercase tracking-wide text-neutral-600">or</span>
            <span className="h-px flex-1 bg-surface2" />
          </div>

          <button type="button" onClick={handleGoogle} className="btn-secondary w-full py-2.5" disabled={busy}>
            <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.46 14.97.5 12 .5A11 11 0 0 0 2.18 7.05l3.66 2.84c.87-2.6 3.3-4.14 6.16-4.14Z"
              />
            </svg>
            Continue with Google
          </button>

          <p className="mt-7 text-center text-sm text-neutral-400">
            {mode === 'signin' ? (
              <>
                No account?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  className="inline-flex min-h-[24px] items-center font-semibold text-accent hover:text-accent-pink"
                >
                  Create one
                </button>
              </>
            ) : (
              <>
                Already have one?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('signin')}
                  className="inline-flex min-h-[24px] items-center font-semibold text-accent hover:text-accent-pink"
                >
                  Sign in
                </button>
              </>
            )}
          </p>
      </div>
    </div>
  );
}
