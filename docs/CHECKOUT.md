# Checkout: Stripe Payment Link

Checkout is a **Stripe Payment Link**, a page Stripe hosts on `buy.stripe.com`.
There is no server, no API key and no webhook. The site only links to it.

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

## Stripe setup (dashboard, test mode first)

1. **Product:** `Taptile Dialect`, one-off price NZ$99.99 NZD.
2. **Shipping rate:** `NZ Post — tracked`, flat amount, no delivery estimate.
3. **Payment Link** for the product:
   - quantity fixed at 1, customer can't adjust
   - **limit the number of payments: 20** (batch 1 is 25 built, 20 for sale)
   - collect shipping address, New Zealand only, with the shipping rate
   - require phone number
   - require terms acceptance (needs the Terms URL in Settings → Business → Public details: `https://www.trytaptile.com/terms`)
   - after payment: don't show confirmation page, redirect to
     `https://www.trytaptile.com/thanks?session_id={CHECKOUT_SESSION_ID}`
4. **Settings → Business → Public details:** support email `taptile.admin@gmail.com`,
   website, Terms URL `/terms`, Privacy URL `/privacy`.
5. **Settings → Customer emails:** turn on successful payments and refunds.

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

Stripe can't change the price on an existing Payment Link. Make a new one:

1. Stripe → Product catalogue → Taptile Dialect → **Add another price** (e.g. NZ$89.99).
2. Payment Links → **New** with that price and the same settings as above.
   Set the payment limit to **20 minus what's already sold**, or you will oversell.
3. Vercel: change `VITE_BUY_URL` to the new link and `VITE_PRICE_NZD` to the new
   price, together, then redeploy.
4. Once the new deploy is live, **deactivate the old link** in Stripe.

People who paid the higher price aren't owed the difference by law. Refunding
it from Stripe → Payments → Refund (partial) is cheap goodwill. Don't show a
"was / now" price unless the old price was genuinely charged for a fair time
(Fair Trading Act).

## After an order

Stripe → Payments → open the order → copy the address and phone into NZ Post
eShip → print the label → drop it at a PostShop. eShip emails the tracking.

## Later, if it's ever needed

A webhook on `checkout.session.completed` (to write orders into Supabase for the
admin Orders page) needs a server endpoint with the secret key in the
**server's** environment only. It's not needed to take payments.
