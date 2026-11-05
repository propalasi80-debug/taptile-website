# Security: what's verified, what Jenil has to click

Reviewed 4 November 2026 against the code in this repo. The site is a static
React app on Vercel; the browser holds only Supabase's public anon key, so
anything the anon key can do, anyone on the internet can do. Real protection
is Row Level Security in Supabase plus the settings below. **Not a pen test.**

## Verified in the code (nothing to do)

- No secret of any kind in any commit on any branch (scanned the full history
  for `sk_`, `rk_`, `re_`, service-role JWTs, private keys). No `.env` file
  was ever committed. The build now fails if a Stripe secret appears in a
  `VITE_` variable.
- Checkout has no server and no keys: a Stripe Payment Link. Stripe sets the
  price, so the browser can't change it.
- Headers on every response (`vercel.json`): Content-Security-Policy
  (scripts only from this site; no frames; no plugins), HSTS, nosniff,
  X-Frame-Options, Referrer-Policy, Permissions-Policy. Checked in Chromium:
  no CSP violations on any page.
- No `dangerouslySetInnerHTML`, no raw HTML from the database; policy and
  devlog text goes through react-markdown, which escapes it.
- Sign-in redirect only ever goes to `/admin…` (no open redirect).
- Edge functions: `team-invite` checks the JWT and `is_admin()` before using
  the service role; `auth-email` verifies its webhook signature; the leave
  link is a 144-bit HMAC with constant-time compare and a fixed redirect.
  Every value in the email templates is escaped.
- Every `SECURITY DEFINER` function in the repo sets `search_path`.
- Orders (`0004_orders.sql`): written only by the service role from the
  `stripe-webhook` function, which verifies Stripe's signature (HMAC, constant
  time, 5-minute tolerance) and dedupes by event id. Browser gets select plus
  one column (`note`), admins only. "Shipped" goes through `order-shipped`,
  which re-checks `is_admin()` before using the service role.
- `scripts/stripe-setup.mjs` reads the Stripe key from the shell only. Use a
  restricted key, never the full secret.
- `npm audit`: Vite upgraded to 6.4.5 (patched). The one remaining advisory
  (React Router open redirect) needs an untested major upgrade and isn't
  reachable here: the only dynamic navigation target is validated.

## Do these in the Supabase dashboard (project `jjndhbyawnbohobjwzue`)

Each one is a real hole until it's done. Order matters.

1. **Authentication → Providers → Email → "Allow new users to sign up": OFF.**
   Today anyone can create an account. Accounts are for the team; the
   `team-invite` function still creates them.
2. **Authentication → Providers → Email → "Confirm email": ON.** `is_admin()`
   is an email allowlist. With confirmation off, a stranger could sign up as
   an allowlisted address that has no account yet and become admin.
3. **Authentication → URL Configuration:** Site URL
   `https://www.trytaptile.com`, redirect URLs `https://www.trytaptile.com/**`
   only. No `*.vercel.app` wildcard.
4. **Authentication → Passwords → leaked-password protection: ON.**
5. **Edge Functions → each function → Secrets:** `SITE_URL` set. And give
   `auth-email` its own Resend key, so a waitlist flood can't exhaust the key
   that sends password resets.
6. **Run this in the SQL editor** and send the output to the repo chat. These
   objects were made in the dashboard, so the repo can't verify them:

```sql
select relname, relrowsecurity from pg_class
 where relnamespace = 'public'::regnamespace and relkind = 'r';
select tablename, policyname, cmd, roles, qual, with_check
 from pg_policies where schemaname in ('public', 'storage') order by 1, 2;
select table_name, grantee, string_agg(privilege_type, ',')
 from information_schema.role_table_grants
 where table_schema = 'public' and grantee in ('anon', 'authenticated') group by 1, 2;
select proname, prosecdef, proconfig,
       has_function_privilege('anon', oid, 'execute') as anon_exec,
       pg_get_functiondef(oid)
 from pg_proc where pronamespace = 'public'::regnamespace;
select id, public from storage.buckets;
begin; set local role anon;
  select count(*) from public.waitlist;                    -- expect 0 or denied
  select count(*) from public.admins;                      -- expect 0 or denied
  select count(*) from public.updates where not published; -- expect 0
rollback;
```

   Expected: every table has `relrowsecurity = true`; `anon` can't read
   `waitlist` or `admins`; `is_admin()` and `join_waitlist` set
   `search_path`; `is_admin()` keys on `user_id`, not only on email.

## Known and accepted for now

- **Waitlist email abuse.** `join_waitlist` is callable with the anon key, so
  a script could put strangers' addresses on the list and trigger one
  confirmation email each. Capped at one email per address, but not per IP.
  Fix when it matters: Cloudflare Turnstile on the form, or double opt-in.
- **Inventory ledger.** Admins can edit `on_hand` directly and set any
  `created_by`, so the two founders could forge the ledger. Only admins.
- **Migration 0001 (messaging)** was never applied; its policies were
  hardened on 4 Nov so it's safe if it ever is.

## Elsewhere

- **Vercel:** env vars scoped per environment (test link on Preview only).
  Hobby plan is non-commercial; move to Pro before the live link.
- **Stripe:** 2FA on, Radar on (both already done).
- **GitHub:** protect `main` (require a PR), remove the stale collaborator
  from HANDOVER §5, turn on Dependabot alerts.
- **Gmail:** 2FA on `taptile.admin@gmail.com`. That inbox receives every
  Stripe and Supabase password reset.
