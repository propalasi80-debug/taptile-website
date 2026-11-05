/**
 * Marks an order shipped and emails the customer their tracking.
 *
 * One function does both, so the row and the email can't disagree: an order
 * is never "shipped" in the dashboard with the customer left in the dark, and
 * never emailed without the status changing.
 *
 * Only the service role may write to `orders` (migration 0004), which is why
 * this is a function and not an UPDATE from the browser. The caller's own JWT
 * is verified first and checked against is_admin(), exactly as team-invite
 * does; the service-role client is only touched after that passes.
 *
 * Deploy (JWT verification stays ON, the default):
 *   supabase functions deploy order-shipped
 *
 * SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are injected
 * by the platform. RESEND_API_KEY is the shared email secret.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.46.1';
import { orderShipped } from '../_shared/email/templates.ts';
import { sendEmail } from '../_shared/email/send.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function text(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !anonKey || !serviceKey) {
    console.error('order-shipped: Supabase environment is incomplete');
    return json({ error: 'unavailable' }, 500);
  }

  const authHeader = request.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) return json({ error: 'not signed in' }, 401);

  // Step 1: who is calling, and are they an admin? Runs as the caller.
  const caller = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data: userData, error: userError } = await caller.auth.getUser();
  if (userError || !userData?.user) return json({ error: 'not signed in' }, 401);
  const { data: isAdmin, error: adminError } = await caller.rpc('is_admin');
  if (adminError || isAdmin !== true) return json({ error: 'not an admin' }, 403);

  // Step 2: validate before touching the privileged client.
  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: 'invalid body' }, 400);
  }

  const orderId = text(payload['order_id'], 36);
  const carrier = text(payload['carrier'], 60) || 'NZ Post';
  const trackingNumber = text(payload['tracking_number'], 80);
  const trackingUrl = text(payload['tracking_url'], 500);

  if (!UUID.test(orderId)) return json({ error: 'Unknown order.' }, 400);
  if (!trackingNumber) return json({ error: 'Enter the tracking number first.' }, 400);
  if (trackingUrl && !/^https:\/\/[^\s]+$/i.test(trackingUrl)) {
    return json({ error: 'The tracking link must be an https:// address.' }, 400);
  }

  // Step 3: the write, as the service role.
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data: existing, error: loadError } = await admin
    .from('orders')
    .select('id, order_number, email, status, shipped_at')
    .eq('id', orderId)
    .maybeSingle();
  if (loadError) {
    console.error('order-shipped: load failed', loadError.message);
    return json({ error: 'Could not load that order.' }, 500);
  }
  if (!existing) return json({ error: 'Unknown order.' }, 404);
  if (existing.status === 'refunded' || existing.status === 'cancelled') {
    return json({ error: `That order is ${existing.status}. It can't be shipped.` }, 409);
  }

  const shippedAt = (existing.shipped_at as string | null) ?? new Date().toISOString();
  const { data: updated, error: updateError } = await admin
    .from('orders')
    .update({
      status: 'shipped',
      shipped_at: shippedAt,
      carrier,
      tracking_number: trackingNumber,
      tracking_url: trackingUrl,
    })
    .eq('id', orderId)
    .select('*')
    .single();
  if (updateError || !updated) {
    console.error('order-shipped: update failed', updateError?.message);
    return json({ error: 'Could not mark it shipped.' }, 500);
  }

  // Step 4: tell the customer. The row is already saved; a failed send is
  // reported, not fatal, and the dashboard offers a retry. Resend's
  // idempotency key means re-marking with the same tracking number inside
  // 24 hours doesn't send a second copy.
  const email = orderShipped({
    orderNumber: String(existing.order_number),
    carrier,
    trackingNumber,
    trackingUrl,
  });
  const sent = await sendEmail({
    ...email,
    to: String(existing.email),
    tag: 'order_shipped',
    idempotencyKey: `order-shipped-${orderId}-${trackingNumber}`,
  });
  if (!sent.ok) console.error('order-shipped: email failed', existing.order_number, sent.status, sent.error);
  else console.log('order-shipped: emailed', existing.order_number, sent.id);

  return json({ ok: true, emailed: sent.ok, order: updated });
});
