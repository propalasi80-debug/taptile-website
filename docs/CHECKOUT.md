# Checkout: Stripe Payment Link

Checkout is a **Stripe Payment Link**, a page Stripe hosts on `buy.stripe.com`.
The site only links to it: no server and no API key in the site. One webhook
(an Edge Function) copies each paid order into Supabase so the admin Orders
page can ship it.

Every switch lives in `src/site/launch.ts`:

| Setting | Where | What it does |
|---|---|---|
| `VITE_BUY_URL` | Vercel env var | The Payment Link. Blank = the site stays a waitlist. |
| `VITE_PRICE_NZD` | Vercel env var | Price shown on the site. Defaults to `99.99`. Must match the link. |
| `SALE_MODE` | `launch.ts` | `'preorder'` (default) or `'buy'`. Changes the button label and the four pre-order lines under it. |
| `SOLD_OUT` | `launch.ts` | `true` = button reads "Sold out", disabled, no link. |

**Never add an `sk_` or `rk_` key anywhere.** None is needed. `vite.config.ts`
fails the build if one turns up in a `VITE_` variable, if `VITE_BUY_URL` isn't a
`https://buy.stripe.com/` link, or if Production points at a test link.

## Environments

Vercel builds previews **and** production in Vite's production mode, so the
committed `.env.development` only affects `npm run dev`. Set the link in
Vercel → Project → Settings → Environment Variables:

| Variable | Preview | Production |
|---|---|---|
| `VITE_BUY_URL` | `https://buy.stripe.com/test_…` | `https://buy.stripe.com/…` (live) |
| `VITE_PRICE_NZD` | `99.99` | `99.99` |

Env vars are baked in at build time, so **redeploy** after changing one.

## Stripe setup: one command

`scripts/stripe-setup.mjs` creates the product, the NZ$ price, the NZ Post
shipping rate, the Payment Link with every setting below, and (with
`--webhook`) the webhook that feeds orders into Supabase. Re-running is safe:
it reuses what exists. The key lives in your shell for that one command and
nowhere else. Test mode first, then live once Stripe has verified the account.

```bash
STRIPE_SECRET_KEY=sk_test_... node scripts/stripe-setup.mjs --shipping 7.50 \
  --webhook https://jjndhbyawnbohobjwzue.supabase.co/functions/v1/stripe-webhook
```

`--shipping` is the flat NZ Post rate in NZ$ and has no default: nobody has
confirmed it. Add `--dry-run` to see every request first. It prints the
Payment Link, the two Vercel variables, the webhook secret (once), and the
settings only the dashboard can change.

Live: the same command with the live key and `--live`. Where to get the key:
Stripe → Developers → API keys → **Create restricted key** with write access
to Products, Prices, Shipping rates, Payment Links, Checkout Sessions and
Webhook endpoints. Never the full secret key, and never paste it anywhere but
that one command line.

What the link gets, if you'd rather check it in the dashboard:
- quantity fixed at 1, customer can't adjust; promotion codes off
- **limit the number of payments: 20** (batch 1 is 25 built, 20 for sale)
- shipping address, New Zealand only, with the shipping rate; phone required
- terms acceptance required (needs the Terms URL in Settings → Business →
  Public details: `https://www.trytaptile.com/terms`; the script warns and
  skips this if the URL isn't set yet)
- after payment: redirect to
  `https://www.trytaptile.com/thanks?session_id={CHECKOUT_SESSION_ID}`

Dashboard-only, after the script:
1. **Settings → Business → Public details:** support email `taptile.admin@gmail.com`,
   website, Terms URL `/terms`, Privacy URL `/privacy`.
2. **Settings → Customer emails:** turn on successful payments and refunds.
3. **Settings → Branding:** logo, icon, colours.

## Orders pipeline (Supabase)

Stripe → `stripe-webhook` function → `orders` table → admin Orders page →
`order-shipped` function → customer's tracking email. Set up once:

```bash
supabase link --project-ref jjndhbyawnbohobjwzue
```
```bash
supabase db push
```
```bash
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_... ORDER_NOTIFY_EMAIL=taptile.admin@gmail.com SITE_URL=https://www.trytaptile.com
```
```bash
supabase functions deploy stripe-webhook --no-verify-jwt
```
```bash
supabase functions deploy order-shipped
```

`STRIPE_WEBHOOK_SECRET` is what `stripe-setup.mjs --webhook` printed. Test
and live mode have separate webhooks with separate secrets: the function
holds one at a time, so set the live one when you go live. The team gets an
email for every new order at `ORDER_NOTIFY_EMAIL`.

Nothing in the browser can write an order. The webhook checks Stripe's
signature, writes with the service role, and `orders` has no insert policy.

## Test gate (before the live link)

1. `npm run build` passes (typecheck, copy check, Vite build).
2. On the Vercel preview with the **test** link, pay with card `4242 4242 4242 4242`,
   any future expiry, any CVC. The page shows a yellow "Test checkout" note.
   - lands on `/thanks`
   - the test receipt email arrives
   - the shipping address and phone are on the payment in Stripe
3. Zero `[FILL IN]` on public pages. `npm run check:copy` prints how many are left.

## Going live

Only after Stripe shows the account as **verified** and Jenil says go:

1. Rebuild the product, shipping rate and Payment Link in **live** mode (test
   objects don't carry over).
2. Set the live link as `VITE_BUY_URL` for **Production** only. Redeploy.
3. Open the live site and click through to Stripe (don't pay).

## Selling out

Stripe deactivates the link by itself after 20 payments. Then set
`SOLD_OUT = true` in `launch.ts` and deploy, so nobody lands on Stripe's "no
longer available" page. Never show how many are left.

## Lowering the price

Stripe can't change the price on an existing Payment Link, so it's a new one:

```bash
STRIPE_SECRET_KEY=sk_live_... node scripts/stripe-setup.mjs --shipping 7.50 --price 89.99 --live
```

That adds the new price, counts what the old link already sold, creates a new
link capped at **20 minus that**, and deactivates the old link. Then in
Vercel change `VITE_BUY_URL` to the new link and `VITE_PRICE_NZD` to `89.99`,
together, and redeploy.

People who paid the higher price aren't owed the difference by law. Refunding
it from Stripe → Payments → Refund (partial) is cheap goodwill. Don't show a
"was / now" price unless the old price was genuinely charged for a fair time
(Fair Trading Act).

## After an order

1. The team email arrives, and the order is on **/admin/orders** with the
   address and phone.
2. Open it → **Copy address** → paste into NZ Post eShip → print the label.
   For a batch, **Export to-ship CSV** and import it in eShip (Settings → CSV
   File; it maps columns on import, weight is in kg).
3. Back on the order, enter the tracking number → **Mark shipped**. That
   changes the status and emails the customer their tracking link.
4. Drop the parcel at a PostShop.

Refunds: issue them in Stripe → Payments. The webhook marks the order
refunded by itself.
