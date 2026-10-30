-- Parts on order: bought, not here yet.
--
-- on_order sits beside on_hand and moves through the same ledger. A movement
-- now carries two changes — delta to on_hand and order_delta to on_order —
-- and the trigger applies both. That keeps every change reversible by
-- negating both numbers, which is what Undo does:
--
--   Ordered 20            delta  0, order_delta +20
--   Order cancelled 5     delta  0, order_delta  -5
--   Received 20 (15 due)  delta +20, order_delta -15
--
-- The client works out order_delta for a delivery (never more than is on
-- order), so the database only has to apply it and refuse negatives.

alter table public.inventory_items
  add column if not exists on_order integer not null default 0;

alter table public.inventory_items
  drop constraint if exists inventory_on_order_not_negative;
alter table public.inventory_items
  add constraint inventory_on_order_not_negative check (on_order >= 0);

alter table public.inventory_movements
  add column if not exists order_delta integer not null default 0;

alter table public.inventory_movements
  drop constraint if exists inventory_delta_nonzero;
alter table public.inventory_movements
  add constraint inventory_delta_nonzero check (delta <> 0 or order_delta <> 0);

alter table public.inventory_movements
  drop constraint if exists inventory_reason_allowed;
alter table public.inventory_movements
  add constraint inventory_reason_allowed
  check (reason in ('received', 'used', 'adjusted', 'damaged', 'ordered', 'cancelled'));

create or replace function public.apply_inventory_movement()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  update public.inventory_items
     set on_hand = on_hand + new.delta,
         on_order = on_order + new.order_delta,
         updated_at = now()
   where id = new.item_id;
  return new;
end;
$$;
