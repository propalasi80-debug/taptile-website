-- Inventory: what is on the shelf, and every change to it.
--
-- The count on inventory_items is never written by the client. Each change is
-- a row in inventory_movements, and a trigger applies it, so every number has
-- a history and a mistake is undone by recording the opposite movement.
--
-- Admin-only, through the same is_admin() the waitlist uses.
--
-- Apply with:  supabase db push
-- or paste into the SQL editor for project jjndhbyawnbohobjwzue.

create table if not exists public.inventory_items (
  id          uuid primary key default gen_random_uuid(),
  name        text          not null,
  category    text          not null default 'part',
  sku         text          not null default '',
  supplier    text          not null default '',
  on_hand     integer       not null default 0,
  per_unit    integer       not null default 0,
  reorder_at  integer       not null default 0,
  unit_cost   numeric(10,2),
  notes       text          not null default '',
  created_at  timestamptz   not null default now(),
  updated_at  timestamptz   not null default now(),
  constraint inventory_name_present       check (length(trim(name)) > 0),
  constraint inventory_name_unique        unique (name),
  constraint inventory_category_allowed   check (category in ('part', 'case', 'packaging', 'finished')),
  constraint inventory_on_hand_not_negative check (on_hand >= 0),
  constraint inventory_per_unit_not_negative check (per_unit >= 0),
  constraint inventory_reorder_not_negative  check (reorder_at >= 0),
  constraint inventory_cost_not_negative  check (unit_cost is null or unit_cost >= 0)
);

create table if not exists public.inventory_movements (
  id          uuid primary key default gen_random_uuid(),
  item_id     uuid        not null references public.inventory_items (id) on delete cascade,
  delta       integer     not null,
  reason      text        not null,
  note        text        not null default '',
  created_by  uuid        references auth.users (id) on delete set null default auth.uid(),
  created_at  timestamptz not null default now(),
  constraint inventory_delta_nonzero  check (delta <> 0),
  constraint inventory_reason_allowed check (reason in ('received', 'used', 'adjusted', 'damaged'))
);

create index if not exists inventory_movements_item_idx
  on public.inventory_movements (item_id, created_at desc);
create index if not exists inventory_movements_created_idx
  on public.inventory_movements (created_at desc);

-- Apply a movement to the count. If it would go below zero the check
-- constraint on inventory_items fails, and the movement insert fails with it.
create or replace function public.apply_inventory_movement()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  update public.inventory_items
     set on_hand = on_hand + new.delta,
         updated_at = now()
   where id = new.item_id;
  return new;
end;
$$;

drop trigger if exists on_inventory_movement on public.inventory_movements;
create trigger on_inventory_movement
  after insert on public.inventory_movements
  for each row execute function public.apply_inventory_movement();

create or replace function public.touch_inventory_item()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_inventory_item_update on public.inventory_items;
create trigger on_inventory_item_update
  before update on public.inventory_items
  for each row execute function public.touch_inventory_item();

alter table public.inventory_items     enable row level security;
alter table public.inventory_movements enable row level security;

drop policy if exists inventory_items_admin on public.inventory_items;
create policy inventory_items_admin on public.inventory_items
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Movements are a ledger: admins may read and add them, nobody edits history.
drop policy if exists inventory_movements_admin_select on public.inventory_movements;
create policy inventory_movements_admin_select on public.inventory_movements
  for select to authenticated using (public.is_admin());

drop policy if exists inventory_movements_admin_insert on public.inventory_movements;
create policy inventory_movements_admin_insert on public.inventory_movements
  for insert to authenticated with check (public.is_admin());

-- Seed the build list from hardware/BOM.md. Quantities per unit are the
-- design. Part counts start at zero because nobody has counted the shelf yet;
-- the one number that is known is the 25 finished boards of the first run,
-- recorded as a movement so it has a history like every other change.
-- Skipped entirely if the table already has rows.
do $$
begin
  if exists (select 1 from public.inventory_items) then
    return;
  end if;

  insert into public.inventory_items (name, category, per_unit, notes) values
    ('PCB, assembled by JLCPCB',    'part',      1, 'Arrives with the controller module, headers and hot-swap sockets already fitted. Bare boards, not finished Taptiles.'),
    ('Key switch (MX-compatible)',  'part',      9, '5-pin.'),
    ('Rotary encoder (EC11)',       'part',      2, 'Vertical, 20 mm shaft, with push switch.'),
    ('Printed case',                'case',      1, ''),
    ('Keycap',                      'case',      9, ''),
    ('Knob',                        'case',      2, ''),
    ('USB-C cable',                 'packaging', 1, 'One in every box.'),
    ('Box',                         'packaging', 1, 'Shipping package.'),
    ('Taptile Dialect, assembled',  'finished',  0, 'Built, tested and ready to pack.');

  insert into public.inventory_movements (item_id, delta, reason, note)
  select id, 25, 'received', 'First run, built before tracking started'
  from public.inventory_items
  where name = 'Taptile Dialect, assembled';
end;
$$;
