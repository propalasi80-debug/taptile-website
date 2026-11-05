/**
 * Stripe webhook: every paid Checkout session becomes a row in public.orders.
 *
 * Stripe calls this directly, so there is no Supabase session to check;
 * config.toml sets verify_jwt = false and this function verifies Stripe's own
 * signature instead: HMAC-SHA256 over "<timestamp>.<raw body>" with the
 * endpoint's signing secret. No Stripe API key is needed, the event carries
 * everything the order needs. Rows are written with the service-role key,
 * which the platform injects and which never reaches the browser.
 *
 * Stripe retries any delivery that doesn't get a 2xx, for days. So:
 *   - the event id is recorded in stripe_events before any work, and a
 *     repeat is answered 200 without touching orders
 *   - bad data (a session with no email) is logged and answered 200, because
 *     a 500 would only make Stripe send the same bad data again
 *   - a database failure un-records the event and answers 500, so the retry
 *     is processed rather than skipped
 *
 * Setup (once per mode: test and live each have their own endpoint and secret):
 *   Stripe → Developers → Webhooks → Add endpoint
 *     https://jjndhbyawnbohobjwzue.supabase.co/functions/v1/stripe-webhook
 *     Events: checkout.session.completed
 *             checkout.session.async_payment_succeeded
 *             checkout.session.async_payment_failed
 *             charge.refunded
 *   Copy the signing secret, then:
 *     supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_... ORDER_NOTIFY_EMAIL=taptile.admin@gmail.com
 *     supabase functions deploy stripe-webhook --no-verify-jwt
 *   The secret is used exactly as Stripe shows it, whsec_ prefix included.
 */

import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.46.1';
import { BRAND } from '../_shared/email/layout.ts';
import { orderReceivedForTeam } from '../_shared/email/templates.ts';
import { sendEmail } from '../_shared/email/send.ts';

/** A delivery older or newer than this is replayed or clock-skewed: refuse it. */
const TOLERANCE_SECONDS = 300;
const ITEM_NAME = 'Taptile Dialect';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/* -------------------------------------------------------------- signature -- */

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}

function hexToBytes(hex: string): Uint8Array | null {
  if (hex.length === 0 || hex.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(hex)) return null;
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

/**
 * Stripe-Signature: t=<unix seconds>,v1=<hex>[,v1=<hex>] — more than one v1
 * while a secret is being rolled. Every candidate is compared; none short-circuits.
 */
async function verifySignature(header: string | null, body: string, secret: string): Promise<boolean> {
  if (!header) return false;

  let timestamp = '';
  const candidates: string[] = [];
  for (const part of header.split(',')) {
    const at = part.indexOf('=');
    if (at < 0) continue;
    const key = part.slice(0, at).trim();
    const value = part.slice(at + 1).trim();
    if (key === 't') timestamp = value;
    else if (key === 'v1' && value) candidates.push(value);
  }
  if (!/^\d+$/.test(timestamp) || candidates.length === 0) return false;

  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
  if (age > TOLERANCE_SECONDS) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const expected = new Uint8Array(
    await crypto.subtle.sign('HMAC', key, encoder.encode(`${timestamp}.${body}`)),
  );

  let ok = false;
  for (const candidate of candidates) {
    const given = hexToBytes(candidate);
    if (given && timingSafeEqual(given, expected)) ok = true;
  }
  return ok;
}

/* ------------------------------------------------------------------ shapes -- */
/* The parts of Stripe's objects this function reads. Everything is optional
 * because API versions move fields around; a missing one becomes ''. */

interface StripeAddress {
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
}

interface StripeShipping {
  name?: string | null;
  address?: StripeAddress | null;
}

interface CheckoutSession {
  id: string;
  created?: number;
  livemode?: boolean;
  payment_status?: string;
  payment_intent?: string | { id: string } | null;
  customer?: string | { id: string } | null;
  payment_link?: string | null;
  amount_subtotal?: number | null;
  amount_total?: number | null;
  currency?: string | null;
  customer_details?: { email?: string | null; name?: string | null; phone?: string | null } | null;
  /** Older API versions. */
  shipping_details?: StripeShipping | null;
  /** Newer API versions (2025+). */
  collected_information?: { shipping_details?: StripeShipping | null } | null;
  total_details?: { amount_shipping?: number | null } | null;
  shipping_cost?: { amount_total?: number | null } | null;
}

interface Charge {
  id: string;
  payment_intent?: string | { id: string } | null;
  refunded?: boolean;
  amount_refunded?: number | null;
  currency?: string | null;
}

interface StripeEvent {
  id: string;
  type: string;
  livemode?: boolean;
  data?: { object?: unknown };
}

/** Trimmed, length-capped string from anything Stripe might send. */
function str(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

/** Expanded objects arrive as { id }, unexpanded as the id string. */
function idOf(value: string | { id: string } | null | undefined): string {
  if (typeof value === 'string') return value.trim().slice(0, 100);
  if (value && typeof value === 'object' && typeof value.id === 'string') return value.id.trim().slice(0, 100);
  return '';
}

function cents(value: number | null | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
}

function money(amount: number, currency: string): string {
  const units = (amount / 100).toFixed(2);
  return currency.toLowerCase() === 'nzd' ? `NZ$${units}` : `${currency.toUpperCase()} ${units}`;
}

/* ------------------------------------------------------------------ events -- */

type Db = SupabaseClient;

/** A database failure after the event was recorded: forget the event so Stripe's retry is processed. */
async function unrecord(db: Db, eventId: string): Promise<void> {
  const { error } = await db.from('stripe_events').delete().eq('id', eventId);
  if (error) console.error('stripe-webhook: could not un-record event', eventId, error.message);
}

async function handlePaid(db: Db, event: StripeEvent, session: CheckoutSession): Promise<Response> {
  const tag = `${event.type} ${event.id} ${session.id}`;

  if (session.payment_status !== 'paid') {
    // Bank transfers and the like: async_payment_succeeded follows when the money lands.
    console.log(`stripe-webhook: ${tag} not paid yet (${session.payment_status ?? 'unknown'}), waiting`);
    return json({ ok: true, pending: true });
  }

  const details = session.customer_details ?? {};
  const email = str(details.email, 320).toLowerCase();
  if (!email) {
    console.error(`stripe-webhook: ${tag} has no customer email; skipped. Check the payment in Stripe.`);
    return json({ ok: true, skipped: 'no email' });
  }

  const shipping = session.collected_information?.shipping_details ?? session.shipping_details ?? null;
  const address = shipping?.address ?? {};
  const name = str(details.name, 200);
  const currency = (str(session.currency, 3) || 'nzd').toLowerCase();
  const createdSeconds = typeof session.created === 'number' ? session.created : Math.floor(Date.now() / 1000);

  const row = {
    stripe_session_id: session.id,
    stripe_payment_intent: idOf(session.payment_intent) || null,
    stripe_customer: idOf(session.customer) || null,
    stripe_payment_link: str(session.payment_link, 100) || null,
    livemode: session.livemode === true,
    amount_subtotal: cents(session.amount_subtotal),
    amount_total: cents(session.amount_total),
    amount_shipping: cents(session.total_details?.amount_shipping ?? session.shipping_cost?.amount_total),
    currency,
    quantity: 1, // the Payment Link fixes quantity at 1
    email,
    name,
    phone: str(details.phone, 40),
    ship_name: str(shipping?.name, 200) || name,
    ship_line1: str(address.line1, 200),
    ship_line2: str(address.line2, 200),
    ship_city: str(address.city, 120),
    ship_region: str(address.state, 120),
    ship_postal_code: str(address.postal_code, 20),
    ship_country: (str(address.country, 2) || 'NZ').toUpperCase(),
    paid_at: new Date(createdSeconds * 1000).toISOString(),
  };

  // ON CONFLICT DO NOTHING: a replayed session never overwrites an order that
  // has since been shipped or refunded. No row back means it already existed.
  const { data: inserted, error } = await db
    .from('orders')
    .upsert(row, { onConflict: 'stripe_session_id', ignoreDuplicates: true })
    .select('order_number')
    .maybeSingle();

  if (error) {
    console.error(`stripe-webhook: ${tag} order insert failed: ${error.message}`);
    await unrecord(db, event.id);
    return json({ error: 'unavailable' }, 500);
  }

  if (!inserted) {
    console.log(`stripe-webhook: ${tag} order already recorded, nothing to do`);
    return json({ ok: true, existing: true });
  }

  const orderNumber = String(inserted.order_number);
  console.log(`stripe-webhook: ${tag} -> ${orderNumber} ${money(row.amount_total, currency)}`);

  // Tell the team. A failed email must never fail the webhook: the order is
  // in the database, which is the part that matters, and Stripe has it too.
  const site = Deno.env.get('SITE_URL') ?? BRAND.site;
  const shipTo = [
    row.ship_name,
    row.ship_line1,
    row.ship_line2,
    [row.ship_city, row.ship_postal_code].filter(Boolean).join(' '),
  ]
    .filter(Boolean)
    .join(', ');

  const email_ = orderReceivedForTeam({
    orderNumber,
    item: ITEM_NAME,
    quantity: row.quantity,
    total: money(row.amount_total, currency),
    shipTo,
    email,
    phone: row.phone,
    adminUrl: `${site.replace(/\/$/, '')}/admin/orders`,
  });

  const result = await sendEmail({
    ...email_,
    subject: row.livemode ? email_.subject : `[Test] ${email_.subject}`,
    to: Deno.env.get('ORDER_NOTIFY_EMAIL') ?? BRAND.support,
    tag: 'order_new',
    idempotencyKey: `order-new-${session.id}`,
  });
  if (!result.ok) {
    console.error(`stripe-webhook: ${tag} team email failed: ${result.status ?? ''} ${result.error ?? ''}`);
  }

  return json({ ok: true, order: orderNumber });
}

async function handleRefund(db: Db, event: StripeEvent, charge: Charge): Promise<Response> {
  const tag = `${event.type} ${event.id} ${charge.id}`;
  const intent = idOf(charge.payment_intent);
  if (!intent) {
    console.log(`stripe-webhook: ${tag} has no payment intent, nothing to match`);
    return json({ ok: true });
  }

  if (charge.refunded === true) {
    const { error } = await db
      .from('orders')
      .update({ status: 'refunded', refunded_at: new Date().toISOString() })
      .eq('stripe_payment_intent', intent);
    if (error) {
      console.error(`stripe-webhook: ${tag} refund update failed: ${error.message}`);
      await unrecord(db, event.id);
      return json({ error: 'unavailable' }, 500);
    }
    console.log(`stripe-webhook: ${tag} full refund recorded`);
    return json({ ok: true });
  }

  // Partial: leave the status alone, note it on the order. amount_refunded is
  // Stripe's running total for the charge, so the line says "so far".
  const { data: order, error: findError } = await db
    .from('orders')
    .select('id, note')
    .eq('stripe_payment_intent', intent)
    .maybeSingle();
  if (findError) {
    console.error(`stripe-webhook: ${tag} order lookup failed: ${findError.message}`);
    await unrecord(db, event.id);
    return json({ error: 'unavailable' }, 500);
  }
  if (!order) {
    console.log(`stripe-webhook: ${tag} no order for ${intent}, nothing to note`);
    return json({ ok: true });
  }

  const line = `Partial refund on ${new Date().toISOString().slice(0, 10)}: ${money(
    cents(charge.amount_refunded),
    str(charge.currency, 3) || 'nzd',
  )} refunded so far`;
  const existing = typeof order.note === 'string' ? order.note : '';
  const note = (existing ? `${existing}\n${line}` : line).slice(0, 2000);

  const { error } = await db.from('orders').update({ note }).eq('id', order.id);
  if (error) {
    console.error(`stripe-webhook: ${tag} note update failed: ${error.message}`);
    await unrecord(db, event.id);
    return json({ error: 'unavailable' }, 500);
  }
  console.log(`stripe-webhook: ${tag} partial refund noted`);
  return json({ ok: true });
}

/* ------------------------------------------------------------------- serve -- */

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!secret || !url || !serviceKey) {
    console.error('stripe-webhook: environment is incomplete (STRIPE_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)');
    // Deliberately vague: never leak configuration state to a caller.
    return json({ error: 'unavailable' }, 500);
  }

  // The raw text is what was signed. Parse only after the signature checks out.
  const body = await req.text();
  if (!(await verifySignature(req.headers.get('stripe-signature'), body, secret))) {
    console.error('stripe-webhook: signature check failed');
    return json({ error: 'invalid signature' }, 401);
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(body) as StripeEvent;
  } catch {
    return json({ error: 'invalid body' }, 400);
  }
  if (!event || typeof event.id !== 'string' || typeof event.type !== 'string') {
    return json({ error: 'invalid event' }, 400);
  }

  const db = createClient(url, serviceKey, { auth: { persistSession: false } });

  // Record first. A unique violation means this delivery was already handled.
  const { error: seen } = await db.from('stripe_events').insert({ id: event.id, type: event.type });
  if (seen) {
    if (seen.code === '23505') {
      console.log(`stripe-webhook: ${event.type} ${event.id} duplicate delivery, skipped`);
      return json({ duplicate: true });
    }
    console.error(`stripe-webhook: could not record ${event.id}: ${seen.message}`);
    return json({ error: 'unavailable' }, 500);
  }

  const object = event.data?.object;
  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded':
      return handlePaid(db, event, object as CheckoutSession);
    case 'charge.refunded':
      return handleRefund(db, event, object as Charge);
    case 'checkout.session.async_payment_failed':
      console.log(`stripe-webhook: ${event.type} ${event.id} recorded; the customer's payment failed, no order`);
      return json({ ok: true });
    default:
      console.log(`stripe-webhook: ${event.type} ${event.id} recorded, nothing to do`);
      return json({ ok: true });
  }
});
