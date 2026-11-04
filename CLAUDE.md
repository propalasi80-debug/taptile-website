# Taptile website: rules for every change

Storefront for one product, the Taptile Dialect, sold in New Zealand through a
Stripe Payment Link. Sellers are two people under 18 trading in their own names.
Read this before redesigning anything. The rules below are legal and security
constraints, not style.

## Checks that must pass

`npm run build` runs all of them: `tsc`, `scripts/check-copy.sh`,
`scripts/check-policies.sh`, then the Vite build (which also validates checkout
env vars in `vite.config.ts`). Never weaken, skip or delete a check to get a
green build. Fix the page instead.

## Legal pages

- Policy **text** lives in `src/content/legal/` (terms, privacy, shipping,
  returns) as markdown. Redesigns restyle the page shell; they never rewrite,
  shorten or drop the text. Text changes need Jenil's explicit sign-off.
- Routes `/terms`, `/privacy`, `/shipping`, `/returns`, `/contact` and `/thanks`
  must always exist. The public site's `<footer>` must link to the first five.
- A new front page (e.g. the v25 design) keeps the existing footer or rebuilds
  it with the same links.
- `[FILL IN]` marks a fact only Jenil can confirm. Never invent the value.
  Production must have zero before the live Payment Link goes on.
- The privacy policy promises **no analytics or trackers**. Adding a pixel
  (TikTok, Meta, Google, Vercel Analytics, anything) needs the privacy policy
  updated first, and a CSP change in `vercel.json`. The policy check fails the
  build otherwise.

## Selling

- All switches are in `src/site/launch.ts`. Runbook: `docs/CHECKOUT.md`.
- Every buy call-to-action renders `<BuyButton />` from `src/site/Buy.tsx`.
  Never hard-code a Stripe URL or a price anywhere else.
- In pre-order mode, `<PreorderLines />` sits directly under the button, before
  the customer clicks. Don't hide it in a tooltip, accordion or footnote.
- The displayed price is `PRICE_LABEL` only, and must equal the Payment Link's
  price. No "was/now" prices, no "incl. GST" (not GST-registered).

## Copy rules (checked by `scripts/check-copy.sh`)

- Never "backlit", "backlight" or "per-key RGB". The 13 LEDs are underglow only,
  and no image may show light coming through the keys.
- "MX-compatible", never "Cherry MX".
- "Designed in New Zealand" / "Final assembly in New Zealand". Never "Made in
  New Zealand" (the PCBs are made by JLCPCB).
- No ship date or window until Jenil sets one. No stock or sold counters ("only
  3 left"). No reviews, testimonials, press logos or "as seen in", real or
  placeholder.

## Security

- No secret keys anywhere in this repo or in any `VITE_` variable. Everything
  `VITE_` is public in the bundle. Checkout needs no keys at all.
- Keep the security headers in `vercel.json` (CSP, HSTS, frame, nosniff). A new
  third-party script, font or API host needs a deliberate CSP edit.
- Never render HTML from the database or from users (`dangerouslySetInnerHTML`,
  `rehype-raw`). Markdown goes through `react-markdown` as it does now.
- `/admin` hiding in the browser is convenience only. Real protection is
  Supabase Row Level Security; any new table gets RLS and policies in a
  migration in `supabase/migrations/`.
