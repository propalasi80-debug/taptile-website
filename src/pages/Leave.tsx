import { useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Seo from '../components/Seo';
import { SUPPORT_EMAIL } from '../site/launch';

/**
 * "Leave the list" — where the link at the bottom of every waitlist email lands.
 *
 * It asks for a click rather than acting on page load: email security scanners
 * open every link in a message, and a page that removed people on load would
 * quietly empty the list. The inbox's own Unsubscribe button skips this page
 * and POSTs to the function directly (RFC 8058), which is fine — that's a
 * deliberate click by the person.
 *
 * The token in the link is an HMAC of the address, checked server-side by the
 * waitlist-leave Edge Function, which then deletes the row.
 */

const SUPPORT = SUPPORT_EMAIL;
const STORE_KEY = 'taptile-waitlist-v1'; // the "you're already on the list" marker in Waitlist.tsx

type State = 'ready' | 'busy' | 'done' | 'gone' | 'bad' | 'error';

export default function Leave() {
  const [params] = useSearchParams();
  const email = params.get('e') ?? '';
  const token = params.get('t') ?? '';
  const [state, setState] = useState<State>(email && token ? 'ready' : 'bad');

  async function leave() {
    const projectUrl = import.meta.env['VITE_SUPABASE_URL'] as string | undefined;
    if (!projectUrl) {
      setState('error');
      return;
    }
    setState('busy');
    try {
      const res = await fetch(`${projectUrl.replace(/\/$/, '')}/functions/v1/waitlist-leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ e: email, t: token }),
      });
      const body = (await res.json().catch(() => ({}))) as { ok?: boolean; removed?: boolean };
      if (res.status === 400 || res.status === 403) {
        setState('bad');
        return;
      }
      if (!res.ok || !body.ok) {
        setState('error');
        return;
      }
      try {
        localStorage.removeItem(STORE_KEY);
      } catch {
        // Private mode or blocked storage: nothing to clear.
      }
      setState(body.removed ? 'done' : 'gone');
    } catch {
      setState('error');
    }
  }

  const mail = (
    <a href={`mailto:${SUPPORT}?subject=Leave%20the%20waitlist`} className="font-semibold text-neutral-100 hover:text-white">
      {SUPPORT}
    </a>
  );

  let heading: string;
  let body: ReactNode;
  switch (state) {
    case 'ready':
    case 'busy':
      heading = 'Leave the waitlist?';
      body = (
        <>
          We&apos;ll take <span className="text-neutral-100">{email}</span> off the Taptile list and delete it, and
          you won&apos;t hear from us again. No hard feelings.
        </>
      );
      break;
    case 'done':
      heading = "You're off the list.";
      body = (
        <>
          We&apos;ve deleted <span className="text-neutral-100">{email}</span>. Thanks for following along &mdash; if
          you ever want back in, the waitlist is on the home page.
        </>
      );
      break;
    case 'gone':
      heading = "You're already off the list.";
      body = (
        <>
          <span className="text-neutral-100">{email}</span> isn&apos;t on the waitlist any more, so there&apos;s
          nothing left to delete.
        </>
      );
      break;
    case 'bad':
      heading = "This link doesn't look right.";
      body = <>Your email app may have cut it off. Email {mail} from the address you want removed and we&apos;ll do it by hand.</>;
      break;
    default:
      heading = 'Something went wrong on our end.';
      body = <>Try again in a minute, or email {mail} and we&apos;ll take you off by hand.</>;
  }

  return (
    <div className="flex items-center justify-center px-5 py-16">
      <Seo title="Leave the waitlist" description="Take your address off the Taptile waitlist." path="/leave" />

      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-heading tracking-heading text-neutral-100">{heading}</h1>
        <p className="mt-3 text-sm leading-relaxed text-neutral-400" role="status" aria-live="polite">
          {body}
        </p>

        {(state === 'ready' || state === 'busy') && (
          <div className="mt-7 space-y-3">
            <button type="button" className="btn-primary w-full" onClick={() => void leave()} disabled={state === 'busy'}>
              {state === 'busy' ? 'Taking you off…' : 'Yes, take me off'}
            </button>
            <Link to="/" className="btn-secondary w-full">
              Actually, keep me on
            </Link>
          </div>
        )}

        {state === 'error' && (
          <button type="button" className="btn-primary mt-7 w-full" onClick={() => void leave()}>
            Try again
          </button>
        )}

        {(state === 'done' || state === 'gone') && (
          <p className="mt-7 text-center text-sm text-neutral-400">
            <Link to="/" className="font-semibold text-neutral-100 hover:text-white">
              Back to Taptile
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
