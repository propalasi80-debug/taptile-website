/**
 * Inventory.
 *
 * Two tables: `inventory_items` holds what exists and how many, and
 * `inventory_movements` is the ledger of every change to that count. The count
 * is never written directly — a movement is inserted and a trigger in Postgres
 * applies it, so the number on screen always has a history behind it and can
 * be undone by recording the opposite movement.
 *
 * Both tables are admin-only through the same is_admin() policy the waitlist
 * uses. A non-admin who reaches this code gets empty arrays back.
 */

import { supabase } from './supabase';

export type Category = 'part' | 'case' | 'packaging' | 'finished';
export type Reason = 'received' | 'used' | 'adjusted' | 'damaged';

export const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'part', label: 'Parts' },
  { value: 'case', label: 'Case & caps' },
  { value: 'packaging', label: 'Packaging' },
  { value: 'finished', label: 'Finished' },
];

/** Plain-language reasons, and which way each one moves the count. */
export const REASONS: { value: Reason; label: string; sign: 1 | -1 | 0 }[] = [
  { value: 'received', label: 'Received', sign: 1 },
  { value: 'used', label: 'Used in a build', sign: -1 },
  { value: 'damaged', label: 'Damaged or lost', sign: -1 },
  { value: 'adjusted', label: 'Recount', sign: 0 },
];

export interface InventoryItem {
  id: string;
  name: string;
  category: Category;
  sku: string;
  supplier: string;
  on_hand: number;
  /** How many go into one finished Taptile. 0 means it is not in the build. */
  per_unit: number;
  /** Warn at or below this. 0 turns the warning off. */
  reorder_at: number;
  unit_cost: number | null;
  notes: string;
  updated_at: string;
}

export interface Movement {
  id: string;
  item_id: string;
  delta: number;
  reason: Reason;
  note: string;
  created_at: string;
}

export type ItemDraft = Omit<InventoryItem, 'id' | 'on_hand' | 'updated_at'> & { id?: string };

const ITEM_COLUMNS =
  'id, name, category, sku, supplier, on_hand, per_unit, reorder_at, unit_cost, notes, updated_at';

export async function fetchInventory(): Promise<{
  items: InventoryItem[];
  movements: Movement[];
  error?: string;
}> {
  if (!supabase) return { items: [], movements: [], error: 'Not connected to Supabase.' };

  const [items, movements] = await Promise.all([
    supabase.from('inventory_items').select(ITEM_COLUMNS).order('name'),
    supabase
      .from('inventory_movements')
      .select('id, item_id, delta, reason, note, created_at')
      .order('created_at', { ascending: false })
      .limit(30),
  ]);

  if (items.error || movements.error) {
    return { items: [], movements: [], error: 'Could not load inventory.' };
  }
  return {
    items: (items.data ?? []) as InventoryItem[],
    movements: (movements.data ?? []) as Movement[],
  };
}

export async function saveItem(draft: ItemDraft): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: 'Not connected to Supabase.' };

  const row = {
    name: draft.name.trim(),
    category: draft.category,
    sku: draft.sku.trim(),
    supplier: draft.supplier.trim(),
    per_unit: draft.per_unit,
    reorder_at: draft.reorder_at,
    unit_cost: draft.unit_cost,
    notes: draft.notes.trim(),
  };

  const { error } = draft.id
    ? await supabase.from('inventory_items').update(row).eq('id', draft.id)
    : await supabase.from('inventory_items').insert(row);

  if (!error) return { ok: true };
  if (error.code === '23505') return { ok: false, error: 'An item with that name already exists.' };
  return { ok: false, error: 'Could not save. You may not have admin access.' };
}

export async function deleteItem(id: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from('inventory_items').delete().eq('id', id);
  return !error;
}

/**
 * Record a change to the count. The trigger applies it; the check constraint
 * on on_hand refuses anything that would take stock below zero, and that
 * refusal is turned into a sentence here rather than a constraint name.
 */
export async function recordMovement(
  itemId: string,
  delta: number,
  reason: Reason,
  note = '',
): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: 'Not connected to Supabase.' };
  if (!Number.isInteger(delta) || delta === 0) {
    return { ok: false, error: 'Enter a whole number other than zero.' };
  }

  const { error } = await supabase
    .from('inventory_movements')
    .insert({ item_id: itemId, delta, reason, note: note.trim() });

  if (!error) return { ok: true };
  if (error.message.includes('inventory_on_hand_not_negative')) {
    return { ok: false, error: 'That would take stock below zero. Check the count and try again.' };
  }
  return { ok: false, error: 'Could not record that. You may not have admin access.' };
}

/** Finished units the parts on hand can make. Null when nothing is in the build. */
export function buildable(items: InventoryItem[]): number | null {
  const bom = items.filter((item) => item.per_unit > 0);
  if (bom.length === 0) return null;
  return Math.min(...bom.map((item) => Math.floor(item.on_hand / item.per_unit)));
}

export type StockState = 'out' | 'low' | 'ok';

export function stockState(item: InventoryItem): StockState {
  if (item.on_hand === 0) return 'out';
  if (item.reorder_at > 0 && item.on_hand <= item.reorder_at) return 'low';
  return 'ok';
}
