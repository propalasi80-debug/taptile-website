/**
 * Orders.
 *
 * Rows are written only by the stripe-webhook Edge Function, with the service
 * role, when Stripe says a checkout was paid. Admins read them here, may edit
 * the note, and ship them through the order-shipped function, which changes
 * the status and emails the customer their tracking in one step. Refunds come
 * back from Stripe through the webhook; nobody types them in.
 *
 * Everything is admin-only through the same is_admin() policy the waitlist
 * uses. A non-admin who reaches this code gets an empty array back.
 */

import { supabase } from './supabase';

export type OrderStatus = 'paid' | 'shipped' | 'refunded' | 'cancelled';

export interface Order {
  id: string;
  order_number: string;
  stripe_session_id: string;
  stripe_payment_intent: string | null;
  livemode: boolean;
  status: OrderStatus;
  /** Cents, as Stripe sends them. NZ$99.99 is 9999. */
  amount_subtotal: number;
  amount_shipping: number;
  amount_total: number;
  currency: string;
  quantity: number;
  email: string;
  name: string;
  phone: string;
  ship_name: string;
  ship_line1: string;
  ship_line2: string;
  ship_city: string;
  ship_region: string;
  ship_postal_code: string;
  ship_country: string;
  carrier: string;
  tracking_number: string;
  tracking_url: string;
  shipped_at: string | null;
  refunded_at: string | null;
  note: string;
  paid_at: string;
  created_at: string;
  updated_at: string;
}

const COLUMNS =
  'id, order_number, stripe_session_id, stripe_payment_intent, livemode, status, ' +
  'amount_subtotal, amount_shipping, amount_total, currency, quantity, email, name, phone, ' +
  'ship_name, ship_line1, ship_line2, ship_city, ship_region, ship_postal_code, ship_country, ' +
  'carrier, tracking_number, tracking_url, shipped_at, refunded_at, note, paid_at, created_at, updated_at';

export const STATUS_LABEL: Record<OrderStatus, string> = {
  paid: 'To ship',
  shipped: 'Shipped',
  refunded: 'Refunded',
  cancelled: 'Cancelled',
};

export const DEFAULT_CARRIER = 'NZ Post';

export async function fetchOrders(): Promise<{ orders: Order[]; error?: string }> {
  if (!supabase) return { orders: [], error: 'Not connected to Supabase.' };

  const { data, error } = await supabase
    .from('orders')
    .select(COLUMNS)
    .order('paid_at', { ascending: false });

  if (error) return { orders: [], error: 'Could not load orders.' };
  return { orders: (data ?? []) as unknown as Order[] };
}

/** The one column admins may write directly (column-level grant in 0004). */
export async function saveOrderNote(id: string, note: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from('orders').update({ note: note.slice(0, 2000) }).eq('id', id);
  return !error;
}

export interface ShipInput {
  orderId: string;
  carrier: string;
  trackingNumber: string;
  trackingUrl: string;
}

export type ShipResult =
  | { ok: true; order: Order; emailed: boolean }
  | { ok: false; error: string };

/**
 * Mark an order shipped. Goes through the order-shipped Edge Function rather
 * than an UPDATE, so the row and the customer's tracking email can't drift:
 * the function does both, and it checks is_admin() itself before touching
 * anything with the service role.
 */
export async function markShipped(input: ShipInput): Promise<ShipResult> {
  if (!supabase) return { ok: false, error: 'Not connected to Supabase.' };

  const { data, error } = await supabase.functions.invoke<{
    ok?: boolean;
    emailed?: boolean;
    order?: Order;
    error?: string;
  }>('order-shipped', {
    body: {
      order_id: input.orderId,
      carrier: input.carrier.trim(),
      tracking_number: input.trackingNumber.trim(),
      tracking_url: input.trackingUrl.trim(),
    },
  });

  if (error) {
    // A non-2xx reply carries its reason in the body; read it if we can.
    let message = 'Could not mark it shipped.';
    try {
      const context = (error as { context?: Response }).context;
      const body = (await context?.json()) as { error?: string } | undefined;
      if (body?.error) message = body.error;
    } catch {
      /* keep the generic message */
    }
    return { ok: false, error: message };
  }

  if (!data?.ok || !data.order) return { ok: false, error: data?.error ?? 'Could not mark it shipped.' };
  return { ok: true, order: data.order, emailed: data.emailed === true };
}

/* -------------------------------------------------------------- helpers -- */

/** "NZ$99.99" from cents. Only NZD is sold, but don't assume it in the data. */
export function money(cents: number, currency = 'nzd'): string {
  const prefix = currency.toLowerCase() === 'nzd' ? 'NZ$' : `${currency.toUpperCase()} `;
  return `${prefix}${(cents / 100).toFixed(2)}`;
}

/** The address as the courier reads it, one line. */
export function shipToLine(o: Order): string {
  const name = o.ship_name || o.name;
  const parts = [name, o.ship_line1, o.ship_line2, [o.ship_city, o.ship_postal_code].filter(Boolean).join(' ')];
  return parts.filter((part) => part && part.trim()).join(', ');
}

/** The address as it goes on a label, one line per row. */
export function shipToLines(o: Order): string[] {
  const name = o.ship_name || o.name;
  return [
    name,
    o.ship_line1,
    o.ship_line2,
    [o.ship_city, o.ship_region].filter(Boolean).join(' '),
    [o.ship_postal_code, o.ship_country === 'NZ' ? 'New Zealand' : o.ship_country].filter(Boolean).join(', '),
  ].filter((line) => line && line.trim());
}

/**
 * Where a tracking number leads. NZ Post's public tracking page takes the
 * number straight in the path; anything else gets no link and the shipped
 * email says tracking will follow.
 */
export function trackingUrlFor(carrier: string, trackingNumber: string): string {
  const number = trackingNumber.trim().replace(/\s+/g, '');
  if (!number) return '';
  if (/nz ?post/i.test(carrier)) return `https://www.nzpost.co.nz/tools/tracking/item/${encodeURIComponent(number)}`;
  return '';
}

/**
 * CSV of the orders still to ship, for eShip's spreadsheet import (eShip maps
 * columns on import, so these are named plainly). Fields are quoted and a
 * leading =, +, - or @ is prefixed with a quote, so a crafted name or address
 * cannot become a live formula when the file is opened in Excel.
 */
export function toOrdersCsv(orders: Order[]): string {
  const escape = (value: string | number): string => {
    const text = String(value ?? '');
    const neutralised = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
    return `"${neutralised.replace(/"/g, '""')}"`;
  };

  const header = [
    'order_number',
    'name',
    'email',
    'phone',
    'address_line1',
    'address_line2',
    'city',
    'region',
    'postcode',
    'country',
    'item',
    'quantity',
    'instructions',
  ];

  const rows = orders.map((o) =>
    [
      o.order_number,
      o.ship_name || o.name,
      o.email,
      o.phone,
      o.ship_line1,
      o.ship_line2,
      o.ship_city,
      o.ship_region,
      o.ship_postal_code,
      o.ship_country,
      'Taptile Dialect',
      o.quantity,
      o.note,
    ]
      .map(escape)
      .join(','),
  );

  return [header.join(','), ...rows].join('\n');
}
