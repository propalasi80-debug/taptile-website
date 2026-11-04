/**
 * Launch switches for the public site. Everything that decides whether the
 * Dialect can be bought, and for how much, lives here.
 *
 * Checkout is a Stripe Payment Link: a hosted page on buy.stripe.com. There is
 * no server, no API key and no webhook. Payment Link URLs are public by design,
 * so they are safe in env files and in the bundle. A secret key (sk_ / rk_) is
 * never needed and must never be added anywhere in this repo; vite.config.ts
 * fails the build if one turns up in a VITE_ variable.
 *
 * Runbook (set up, test, go live, lower the price): docs/CHECKOUT.md.
 */

/**
 * Buy or Pre-order. If the 20 for-sale units aren't boxed with cables and
 * ready to post when the link goes live, it is legally a pre-order and the
 * page has to say so. Pre-order is the default because it's the safe one.
 * Switch to 'buy' only once every unit for sale can ship the day it's paid for.
 */
export type SaleMode = 'buy' | 'preorder';
export const SALE_MODE = 'preorder' as SaleMode;

/**
 * Set to true when the Payment Link sells out. Stripe deactivates the link by
 * itself after the payment limit; this only stops people landing on Stripe's
 * "no longer available" page. Never show how many are left.
 */
export const SOLD_OUT = false;

/** Support inbox. Must match Stripe → Settings → Business → Public details. */
export const SUPPORT_EMAIL = 'taptile.admin@gmail.com';

function read(name: string): string {
  const value = import.meta.env[name] as string | undefined;
  return value?.trim() ?? '';
}

/**
 * The Payment Link. Null until VITE_BUY_URL is set, and while it's null the
 * site stays a waitlist, exactly as it is today.
 *
 * Preview builds get the test link and production gets the live one. Both are
 * set in Vercel → Settings → Environment Variables, scoped per environment.
 */
export const BUY_URL: string | null = read('VITE_BUY_URL') || null;

/** True for a buy.stripe.com/test_… link. The page labels these so nobody mistakes one for the real checkout. */
export const IS_TEST_CHECKOUT = BUY_URL?.startsWith('https://buy.stripe.com/test_') ?? false;

/**
 * The price shown on the site, in NZD. Stripe charges whatever the Payment
 * Link's price is, so this must match it. Showing one price and charging
 * another breaches the Fair Trading Act.
 *
 * To lower it: make a new Payment Link at the new price, then change
 * VITE_BUY_URL and VITE_PRICE_NZD together in Vercel and redeploy. Stripe
 * can't change the price on an existing link. Steps in docs/CHECKOUT.md.
 */
export const PRICE_NZD = read('VITE_PRICE_NZD') || '99.99';

/** "NZ$99.99". Always two decimals, never "incl. GST" (Taptile isn't GST-registered). */
export const PRICE_LABEL = `NZ$${Number(PRICE_NZD).toFixed(2)}`;

export type SaleState = 'waitlist' | 'open' | 'soldout';

/** Sold out wins, then a live link opens the sale, otherwise it's the waitlist. */
export const SALE_STATE: SaleState = SOLD_OUT ? 'soldout' : BUY_URL ? 'open' : 'waitlist';

export const BUY_LABEL = SALE_MODE === 'buy' ? 'Buy' : 'Pre-order';
