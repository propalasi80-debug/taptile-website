-- Orders: every paid Stripe Checkout session, written by the stripe-webhook
-- Edge Function, read and shipped from the admin dashboard.
--
-- Only the service role writes here. Admins read, and may edit exactly one
-- column (note) directly. "Shipped" goes through the order-shipped function,
-- so the status change and the customer's tracking email happen together.
-- Refunds come back from Stripe through the webhook; nobody types them.
--
-- Apply with:  supabase db push
-- or paste into the SQL editor for project jjndhbyawnbohobjwzue.

create sequence if not exists public.order_number_seq start 1001;

create table if not exists public.orders (
  id                    uuid primary key default gen_random_uuid(),
  -- Short, human, in the shipped email: TT-1001, TT-1002, ...
  order_number          text not null unique default ('TT-' || nextval('public.order_number_seq')::text),
  stripe_session_id     text not null unique,
  stripe_payment_intent text,
  stripe_customer       text,
  stripe_payment_link   text,
  livemode              boolean not null default false,
  status                text not null default 'paid',
  -- Money in cents, as Stripe sends it. NZ$99.99 is 9999.
  amount_subtotal       integer not null default 0,
  amount_shipping       integer not null default 0,
  amount_total          integer not null default 0,
  currency              text not null default 'nzd',
  quantity              integer not null default 1,
  email                 text not null,
  name                  text not null default '',
  phone                 text not null default '',
  ship_name             text not null default '',
  ship_line1            text not null default '',
  ship_line2            text not null default '',
  ship_city             text not null default '',
  ship_region           text not null default '',
  ship_postal_code      text not null default '',
  ship_country          text not null default 'NZ',
  carrier               text not null default '',
  tracking_number       text not null default '',
  tracking_url          text not null default '',
  shipped_at            timestamptz,
  refunded_at           timestamptz,
  note                  text not null default '',
  paid_at               timestamptz not null default now(),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint orders_status_allowed      check (status in ('paid', 'shipped', 'refunded', 'cancelled')),
  constraint orders_amounts_not_negative check (amount_subtotal >= 0 and amount_shipping >= 0 and amount_total >= 0),
  constraint orders_quantity_positive   check (quantity > 0),
  constraint orders_email_present       check (length(trim(email)) > 0),
  constraint orders_note_length         check (length(note) <= 2000)
);

create index if not exists orders_status_idx on public.orders (status, paid_at desc);
create index if not exists orders_paid_idx   on public.orders (paid_at desc);

-- Every Stripe event already handled. Stripe retries deliveries, so the
-- webhook records the event id first and skips one it has seen.
create table if not exists public.stripe_events (
  id          text primary key,
  type        text not null,
  received_at timestamptz not null default now()
);

create or replace function public.orders_touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists orders_touch on public.orders;
create trigger orders_touch
  before update on public.orders
  for each row execute function public.orders_touch_updated_at();

alter table public.orders        enable row level security;
alter table public.stripe_events enable row level security;

-- Supabase's default privileges hand every new table to anon and
-- authenticated. Take them back, so the grants and policies below are the
-- whole story. The service role keeps full access and bypasses RLS.
revoke all on public.orders                  from anon, authenticated;
revoke all on public.stripe_events           from anon, authenticated;
revoke all on sequence public.order_number_seq from anon, authenticated;

grant select        on public.orders to authenticated;
grant update (note) on public.orders to authenticated;

drop policy if exists orders_admin_select on public.orders;
create policy orders_admin_select on public.orders
  for select to authenticated using (public.is_admin());

drop policy if exists orders_admin_note on public.orders;
create policy orders_admin_note on public.orders
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- No insert or delete policy on orders, and no policy at all on
-- stripe_events: only the webhook, with the service role, writes them.
