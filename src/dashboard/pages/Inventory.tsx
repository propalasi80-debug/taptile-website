/**
 * Inventory — real data.
 *
 * Every part in the build, how many are on the shelf, and how many finished
 * units that makes. Counts only change by recording a movement (received,
 * used, damaged, recount), so each number has a history and any change can be
 * undone by recording the opposite one.
 *
 * Built against Nielsen's ten heuristics, and the choices that follow from
 * them are deliberate:
 *   1. Status is visible — saving states, a confirmation line after every
 *      change, and "updated" times on each item.
 *   2. The words are the shelf's, not the database's: "Received", "Used in a
 *      build", "Recount", never "delta".
 *   3. Every change can be undone from the confirmation line, and every form
 *      has Cancel.
 *   4. Same cards, pills, tables and buttons as Customers and Content.
 *   5. Errors are prevented before they are reported: the form previews the
 *      new count, refuses to save one below zero, and deleting asks first.
 *   6. The adjust form shows the current count and per-unit figure, so
 *      nothing has to be remembered from the table.
 *   7. Quick +1 / −1 on each row beside Adjust, and "Record builds" takes every part down
 *      at once for experienced use.
 *   8. Columns are the ones that drive a decision; the rest is in Edit.
 *   9. Failures say what happened and what to do, in a sentence.
 *  10. A short "How this works" card in the rail.
 */

import { useMemo, useState } from 'react';
import { PageBody, PageHeader } from '../layout/AppShell';
import {
  Bar,
  Button,
  Card,
  CardTitle,
  Chip,
  EmptyState,
  ErrorCard,
  Field,
  IconButton,
  Kpi,
  Pill,
  Row,
  SearchField,
  Skeleton,
  type Tone,
} from '../ui';
import { DataTable, type Column } from '../ui/DataTable';
import { useInventory } from '../lib/useLiveData';
import { FIGURES } from '../mock';
import { currency, number, relative } from '../lib/format';
import { Close, Minus, Package, Plus, Refresh } from '../icons';
import {
  buildable,
  buildParts,
  readyToShip,
  shipParts,
  CATEGORIES,
  deleteItem,
  REASONS,
  recordMovement,
  saveItem,
  stockState,
  type Category,
  type InventoryItem,
  type ItemDraft,
  type Reason,
  type StockState,
} from '../../lib/inventory';

const STATE_PILL: Record<StockState, { tone: Tone; label: string }> = {
  out: { tone: 'rose', label: 'Out' },
  low: { tone: 'blue', label: 'Low' },
  ok: { tone: 'grey', label: 'In stock' },
};

const EMPTY_DRAFT: ItemDraft = {
  name: '',
  category: 'part',
  sku: '',
  supplier: '',
  per_unit: 0,
  reorder_at: 0,
  unit_cost: null,
  notes: '',
};

/** Whole, non-negative number from a text field, or undefined if it is not one. */
function wholeNumber(value: string): number | undefined {
  if (!/^\d+$/.test(value.trim())) return undefined;
  return Number(value.trim());
}

interface Flash {
  text: string;
  /** Present when the change can be reversed from the confirmation line. */
  undo?: { itemId: string; delta: number };
}

export default function Inventory() {
  const inventory = useInventory();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category | 'all'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<ItemDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string>();
  const [flash, setFlash] = useState<Flash>();

  const items = inventory.data;
  const selected = items.find((item) => item.id === selectedId) ?? null;
  const nameOf = (id: string) => items.find((item) => item.id === id)?.name ?? 'Removed item';

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter((item) => {
      if (category !== 'all' && item.category !== category) return false;
      if (!needle) return true;
      return [item.name, item.sku, item.supplier].some((field) =>
        field.toLowerCase().includes(needle),
      );
    });
  }, [items, query, category]);

  const canBuild = buildable(items);
  const needsAttention = items.filter(
    (item) => item.category !== 'finished' && item.per_unit > 0 && stockState(item) !== 'ok',
  );
  const costed = items.filter((item) => item.unit_cost !== null);
  const stockValue = costed.reduce((sum, item) => sum + item.on_hand * (item.unit_cost ?? 0), 0);
  const bom = buildParts(items);
  const kit = shipParts(items);
  const finishedUnits = items
    .filter((item) => item.category === 'finished')
    .reduce((sum, item) => sum + item.on_hand, 0);
  const canShip = readyToShip(items);
  // Batch 1: 25 built, of which 20 are for sale. Shipping targets the 20.
  const run = FIGURES.forSale;

  /* ------------------------------------------------------------ actions --- */

  async function move(item: InventoryItem, delta: number, reason: Reason, note = '') {
    setBusy(true);
    setActionError(undefined);
    const result = await recordMovement(item.id, delta, reason, note);
    setBusy(false);
    if (!result.ok) {
      setActionError(result.error);
      return false;
    }
    const sign = delta > 0 ? '+' : '−';
    setFlash({
      text: `${item.name}: ${sign}${number(Math.abs(delta))}, now ${number(item.on_hand + delta)}.`,
      undo: { itemId: item.id, delta },
    });
    inventory.reload();
    return true;
  }

  async function undo(target: NonNullable<Flash['undo']>) {
    setBusy(true);
    setActionError(undefined);
    const result = await recordMovement(target.itemId, -target.delta, 'adjusted', 'Undo');
    setBusy(false);
    if (!result.ok) {
      setActionError(result.error);
      return;
    }
    setFlash({ text: `Undone. ${nameOf(target.itemId)} is back where it was.` });
    inventory.reload();
  }

  async function recordBuilds(count: number) {
    // Checked up front so a build never half-applies: either every part has
    // enough, or nothing is touched.
    const short = bom.filter((item) => item.on_hand < item.per_unit * count);
    if (short.length > 0) {
      setActionError(
        `Not enough for ${count}: short on ${short.map((item) => item.name).join(', ')}.`,
      );
      return;
    }
    setBusy(true);
    setActionError(undefined);
    for (const item of bom) {
      const result = await recordMovement(
        item.id,
        -item.per_unit * count,
        'used',
        `${count} build${count === 1 ? '' : 's'}`,
      );
      if (!result.ok) {
        setBusy(false);
        setActionError(`Stopped at ${item.name}: ${result.error} Earlier parts were taken down.`);
        inventory.reload();
        return;
      }
    }
    const finished = items.find((item) => item.category === 'finished');
    if (finished) await recordMovement(finished.id, count, 'received', `${count} built`);
    setBusy(false);
    setFlash({
      text: `Recorded ${count} build${count === 1 ? '' : 's'}. Parts taken down${
        finished ? `, ${finished.name} up by ${count}` : ''
      }.`,
    });
    inventory.reload();
  }

  async function save(draft: ItemDraft) {
    setBusy(true);
    setActionError(undefined);
    const result = await saveItem(draft);
    setBusy(false);
    if (!result.ok) {
      setActionError(result.error);
      return;
    }
    setFlash({ text: draft.id ? `Saved ${draft.name.trim()}.` : `Added ${draft.name.trim()}.` });
    setEditing(null);
    inventory.reload();
  }

  async function remove(item: InventoryItem) {
    if (
      !window.confirm(
        `Delete ${item.name}? Its ${number(item.on_hand)} on hand and its whole history go with it. This cannot be undone.`,
      )
    )
      return;
    setBusy(true);
    const ok = await deleteItem(item.id);
    setBusy(false);
    if (!ok) {
      setActionError('Could not delete that item.');
      return;
    }
    setSelectedId(null);
    setEditing(null);
    setFlash({ text: `Deleted ${item.name}.` });
    inventory.reload();
  }

  /* ------------------------------------------------------------- table --- */

  const columns: Column<InventoryItem>[] = [
    {
      key: 'item',
      label: 'Item',
      span: 5,
      render: (item) => (
        <span className="min-w-0">
          <span className="block truncate font-semibold text-ink-1" title={item.name}>
            {item.name}
          </span>
          {/* The count is repeated here so it survives a phone-width table. */}
          <span className="block truncate text-[10.5px] text-ink-4">
            {[
              `${number(item.on_hand)} on hand`,
              item.per_unit > 0 ? `${item.per_unit} per unit` : '',
              item.supplier,
            ]
              .filter(Boolean)
              .join(' · ')}
          </span>
        </span>
      ),
    },
    {
      key: 'state',
      label: 'Status',
      span: 2,
      render: (item) => <Pill {...STATE_PILL[stockState(item)]} />,
    },
    {
      key: 'on_hand',
      label: 'On hand',
      span: 2,
      align: 'right',
      render: (item) => <span className="font-bold text-ink-1">{number(item.on_hand)}</span>,
    },
    {
      key: 'actions',
      label: 'Actions',
      span: 3,
      align: 'right',
      render: (item) => (
        <span className="flex items-center gap-[6px]">
          <Button
            size="sm"
            aria-pressed={selectedId === item.id}
            aria-label={`Adjust ${item.name}`}
            onClick={() => {
              setEditing(null);
              setSelectedId(selectedId === item.id ? null : item.id);
            }}
          >
            Adjust
          </Button>
          <IconButton
            icon={Minus}
            label={`Use one ${item.name}`}
            size={26}
            disabled={busy || item.on_hand === 0}
            onClick={() => void move(item, -1, 'used')}
          />
          <IconButton
            icon={Plus}
            label={`Receive one ${item.name}`}
            size={26}
            disabled={busy}
            onClick={() => void move(item, 1, 'received')}
          />
        </span>
      ),
    },
  ];

  const loadingFirst = inventory.loading && items.length === 0;

  return (
    <>
      <PageHeader
        title="Inventory"
        live
        description="Every part in the build, what is on the shelf, and how many units that makes."
        actions={
          <>
            <Button icon={Refresh} onClick={inventory.reload}>
              Refresh
            </Button>
            <Button
              icon={Plus}
              variant="primary"
              onClick={() => {
                setSelectedId(null);
                setEditing({ ...EMPTY_DRAFT });
              }}
            >
              Add item
            </Button>
          </>
        }
      />

      <PageBody
        rail={
          <>
            <Card pad={16}>
              <CardTitle>{`To ship batch 1 (${run} for sale)`}</CardTitle>
              <p className="-mt-[4px] mb-[12px] text-[11px] text-ink-4">
                {`${FIGURES.runSize} built: ${FIGURES.forSale} for sale · ${FIGURES.keptByFounders} kept · ${FIGURES.marketing} marketing`}
              </p>
              {loadingFirst ? (
                <Skeleton height={120} />
              ) : (
                <div className="flex flex-col gap-[12px]">
                  <Bar
                    label="Finished units"
                    value={`${number(Math.min(finishedUnits, run))} / ${number(run)}`}
                    pct={(finishedUnits / run) * 100}
                    active={finishedUnits < run}
                  />
                  {kit.map((item) => {
                    const need = item.per_unit * run;
                    return (
                      <Bar
                        key={item.id}
                        label={item.name}
                        value={`${number(item.on_hand)} / ${number(need)}`}
                        pct={(item.on_hand / need) * 100}
                        active={item.on_hand < need}
                      />
                    );
                  })}
                  {kit.length === 0 && (
                    <p className="text-[11.5px] text-ink-4">
                      Add the cable and box as "Ships with" items to see what is short.
                    </p>
                  )}
                  <p className="text-[11px] text-ink-4">
                    {kit
                      .filter((item) => item.on_hand < item.per_unit * run)
                      .map((item) => `${number(item.per_unit * run - item.on_hand)} more ${item.name}`)
                      .join(', ') || 'Nothing short for the units for sale.'}
                  </p>
                  <p className="text-[11px] text-ink-4">
                    {`The ${FIGURES.marketing} marketing units need one more of each if they go out boxed.`}
                  </p>
                </div>
              )}
            </Card>

            <BuildCard canBuild={canBuild} busy={busy} onRecord={recordBuilds} />

            <Card pad={16}>
              <CardTitle>Recent changes</CardTitle>
              {inventory.movements.length === 0 ? (
                <p className="text-[11.5px] text-ink-4">Nothing recorded yet.</p>
              ) : (
                <div className="flex flex-col">
                  {inventory.movements.slice(0, 8).map((movement) => (
                    <Row
                      key={movement.id}
                      name={nameOf(movement.item_id)}
                      sub={`${REASONS.find((reason) => reason.value === movement.reason)?.label ?? movement.reason}${
                        movement.note ? ` · ${movement.note}` : ''
                      } · ${relative(movement.created_at)}`}
                      value={`${movement.delta > 0 ? '+' : '−'}${number(Math.abs(movement.delta))}`}
                    />
                  ))}
                </div>
              )}
            </Card>

            <Card pad={16}>
              <CardTitle>How this works</CardTitle>
              <ul className="flex list-disc flex-col gap-[6px] pl-4 text-[11.5px] text-ink-4">
                <li>Counts only change by recording what happened, so each one has a history.</li>
                <li>"Per unit" is how many go into one Taptile. It drives "Can build".</li>
                <li>"Ships with" items (cable, box) are counted per shipped unit and drive "Ready to ship".</li>
                <li>"Low" shows at or below the reorder level. Set it to 0 to turn it off.</li>
                <li>Got it wrong? Use Undo on the confirmation line, or record a recount.</li>
              </ul>
            </Card>
          </>
        }
      >
        {inventory.error && <ErrorCard message={inventory.error} onRetry={inventory.reload} />}
        {actionError && <ErrorCard message={actionError} />}

        {flash && (
          <div
            role="status"
            className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-panel-grad px-4 py-[11px] shadow-card-sm"
          >
            <p className="text-[12.5px] font-semibold text-ink-1">{flash.text}</p>
            <span className="flex items-center gap-[6px]">
              {flash.undo && (
                <Button size="sm" disabled={busy} onClick={() => void undo(flash.undo!)}>
                  Undo
                </Button>
              )}
              <IconButton
                icon={Close}
                label="Dismiss"
                tone="bare"
                size={26}
                onClick={() => setFlash(undefined)}
              />
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-[14px] xl:grid-cols-4">
          <Kpi
            label="Can build"
            value={loadingFirst ? '—' : canBuild === null ? '—' : number(canBuild)}
            sub={canBuild === null ? 'No build list yet' : 'more, from parts on the shelf'}
          />
          <Kpi
            label="Needs attention"
            value={loadingFirst ? '—' : number(needsAttention.length)}
            sub={needsAttention.length === 0 ? 'Nothing out or low' : 'parts out or low'}
          />
          <Kpi
            label="Ready to ship"
            value={loadingFirst || canShip === null ? '—' : number(Math.min(canShip, run))}
            sub={
              canShip === null
                ? 'Nothing marked Finished'
                : `of ${number(run)} for sale`
            }
          />
          <Kpi
            label="Stock value"
            value={costed.length === 0 ? '—' : currency(stockValue)}
            sub={
              costed.length === 0
                ? 'Add unit costs to see this'
                : `${costed.length} of ${items.length} items costed`
            }
          />
        </div>

        {editing && (
          <ItemForm
            key={editing.id ?? 'new'}
            initial={editing}
            busy={busy}
            onCancel={() => setEditing(null)}
            onSave={(draft) => void save(draft)}
            onDelete={
              editing.id
                ? () => {
                    const item = items.find((candidate) => candidate.id === editing.id);
                    if (item) void remove(item);
                  }
                : undefined
            }
          />
        )}

        {selected && !editing && (
          <AdjustCard
            key={selected.id}
            item={selected}
            busy={busy}
            onClose={() => setSelectedId(null)}
            onEdit={() => setEditing({ ...selected })}
            onSubmit={async (delta, reason, note) => {
              if (await move(selected, delta, reason, note)) setSelectedId(null);
            }}
          />
        )}

        <Card pad={18}>
          <div className="mb-[14px] flex flex-wrap items-center gap-[10px]">
            <div className="w-full sm:w-[220px]">
              <SearchField
                value={query}
                onChange={setQuery}
                label="Search inventory by name, SKU or supplier"
                placeholder="Search name, SKU, supplier"
                height={32}
              />
            </div>
            <Chip
              label={`All ${items.length}`}
              active={category === 'all'}
              onClick={() => setCategory('all')}
            />
            {CATEGORIES.map((option) => {
              const count = items.filter((item) => item.category === option.value).length;
              if (count === 0) return null;
              return (
                <Chip
                  key={option.value}
                  label={option.label}
                  count={count}
                  active={category === option.value}
                  onClick={() => setCategory(category === option.value ? 'all' : option.value)}
                />
              );
            })}
          </div>

          {loadingFirst ? (
            <div className="flex flex-col gap-[10px]">
              {[0, 1, 2, 3, 4].map((index) => (
                <Skeleton key={index} height={38} />
              ))}
            </div>
          ) : (
            <DataTable
              columns={columns}
              rows={rows}
              rowKey={(item) => item.id}
              empty={
                <EmptyState
                  icon={Package}
                  title={items.length === 0 ? 'Nothing tracked yet' : 'Nothing matches'}
                  body={
                    items.length === 0
                      ? 'Add the parts you keep on the shelf. Give each one a "per unit" figure to see how many Taptiles you can build.'
                      : 'The search and category filters are still on so you can undo them.'
                  }
                  cta={
                    items.length === 0 ? (
                      <Button
                        icon={Plus}
                        onClick={() => setEditing({ ...EMPTY_DRAFT })}
                      >
                        Add item
                      </Button>
                    ) : (
                      <Button
                        onClick={() => {
                          setQuery('');
                          setCategory('all');
                        }}
                      >
                        Clear filters
                      </Button>
                    )
                  }
                />
              }
            />
          )}

          <p className="mt-[14px] text-[11px] text-ink-4">
            Showing {rows.length} of {items.length} items
          </p>
        </Card>
      </PageBody>
    </>
  );
}

/* ------------------------------------------------------------- pieces --- */

function AdjustCard({
  item,
  busy,
  onClose,
  onEdit,
  onSubmit,
}: {
  item: InventoryItem;
  busy: boolean;
  onClose: () => void;
  onEdit: () => void;
  onSubmit: (delta: number, reason: Reason, note: string) => void | Promise<void>;
}) {
  const [reason, setReason] = useState<Reason>('received');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const sign = REASONS.find((option) => option.value === reason)!.sign;
  const parsed = wholeNumber(amount);
  // A recount enters the new total; everything else enters how many moved.
  const delta = parsed === undefined ? undefined : sign === 0 ? parsed - item.on_hand : sign * parsed;
  const next = delta === undefined ? undefined : item.on_hand + delta;

  const problem =
    amount.trim() === ''
      ? undefined
      : parsed === undefined
        ? 'Enter a whole number.'
        : delta === 0
          ? sign === 0
            ? 'That is already the count.'
            : 'Enter more than zero.'
          : next! < 0
            ? `Only ${number(item.on_hand)} on hand.`
            : undefined;

  const canSave = delta !== undefined && delta !== 0 && next! >= 0 && !busy;

  return (
    <Card pad={18}>
      <div className="mb-[14px] flex items-start justify-between gap-3">
        <div className="min-w-0">
          <CardTitle>{`Adjust ${item.name}`}</CardTitle>
          <p className="text-[11.5px] text-ink-4">
            {number(item.on_hand)} on hand
            {item.per_unit > 0 ? ` · ${item.per_unit} per Taptile` : ''}
            {item.reorder_at > 0 ? ` · reorder at ${number(item.reorder_at)}` : ''}
          </p>
        </div>
        <IconButton icon={Close} label="Close" tone="bare" size={26} onClick={onClose} />
      </div>

      <div className="mb-[14px] flex flex-wrap gap-[8px]" role="group" aria-label="What happened">
        {REASONS.map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            active={reason === option.value}
            onClick={() => setReason(option.value)}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-[12px] sm:grid-cols-2">
        <Field
          label={sign === 0 ? 'Counted on the shelf' : 'How many'}
          type="number"
          value={amount}
          onChange={setAmount}
          error={problem}
          hint={
            next !== undefined && !problem
              ? `${number(item.on_hand)} → ${number(next)}`
              : sign === 0
                ? 'The total you counted, not the difference.'
                : undefined
          }
        />
        <Field
          label="Note (optional)"
          value={note}
          onChange={setNote}
          placeholder="e.g. order from supplier, PO number"
        />
      </div>

      <div className="mt-[16px] flex flex-wrap items-center justify-between gap-[8px]">
        <Button size="sm" onClick={onEdit}>
          Edit details
        </Button>
        <span className="flex gap-[8px]">
          <Button size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            variant="primary"
            loading={busy}
            disabled={!canSave}
            onClick={() => delta !== undefined && void onSubmit(delta, reason, note)}
          >
            {busy ? 'Saving…' : 'Record'}
          </Button>
        </span>
      </div>
    </Card>
  );
}

function ItemForm({
  initial,
  busy,
  onCancel,
  onSave,
  onDelete,
}: {
  initial: ItemDraft;
  busy: boolean;
  onCancel: () => void;
  onSave: (draft: ItemDraft) => void;
  onDelete?: () => void;
}) {
  const [name, setName] = useState(initial.name);
  const [itemCategory, setItemCategory] = useState<Category>(initial.category);
  const [sku, setSku] = useState(initial.sku);
  const [supplier, setSupplier] = useState(initial.supplier);
  const [perUnit, setPerUnit] = useState(String(initial.per_unit));
  const [reorderAt, setReorderAt] = useState(String(initial.reorder_at));
  const [cost, setCost] = useState(initial.unit_cost === null ? '' : String(initial.unit_cost));
  const [notes, setNotes] = useState(initial.notes);

  const perUnitValue = wholeNumber(perUnit);
  const reorderValue = wholeNumber(reorderAt);
  const costValue = cost.trim() === '' ? null : Number(cost);
  const costValid = costValue === null || (Number.isFinite(costValue) && costValue >= 0);

  const canSave =
    name.trim() !== '' && perUnitValue !== undefined && reorderValue !== undefined && costValid;

  return (
    <Card pad={18}>
      <div className="mb-[14px] flex items-start justify-between gap-3">
        <CardTitle>{initial.id ? `Edit ${initial.name}` : 'Add an item'}</CardTitle>
        <IconButton icon={Close} label="Close" tone="bare" size={26} onClick={onCancel} />
      </div>

      <div className="mb-[14px] flex flex-wrap gap-[8px]" role="group" aria-label="Category">
        {CATEGORIES.map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            active={itemCategory === option.value}
            onClick={() => setItemCategory(option.value)}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-[12px] sm:grid-cols-2">
        <Field
          label="Name"
          value={name}
          onChange={setName}
          placeholder="e.g. Rotary encoder (EC11)"
          error={name.trim() === '' && initial.id ? 'The item needs a name.' : undefined}
        />
        <Field label="SKU" value={sku} onChange={setSku} placeholder="Optional" />
        <Field
          label="Per Taptile"
          type="number"
          value={perUnit}
          onChange={setPerUnit}
          hint="How many go into one unit. 0 if it is not part of the build."
          error={perUnitValue === undefined ? 'Enter a whole number, 0 or more.' : undefined}
        />
        <Field
          label="Reorder at"
          type="number"
          value={reorderAt}
          onChange={setReorderAt}
          hint="Shows Low at or below this. 0 turns it off."
          error={reorderValue === undefined ? 'Enter a whole number, 0 or more.' : undefined}
        />
        <Field label="Supplier" value={supplier} onChange={setSupplier} placeholder="Optional" />
        <Field
          label="Unit cost (NZ$)"
          type="number"
          value={cost}
          onChange={setCost}
          placeholder="Optional"
          error={costValid ? undefined : 'Enter a cost of 0 or more, or leave it blank.'}
        />
      </div>
      <div className="mt-[12px]">
        <Field label="Notes" value={notes} onChange={setNotes} multiline rows={2} />
      </div>
      {!initial.id && (
        <p className="mt-[10px] text-[11px] text-ink-4">
          New items start at 0 on hand. Record what you have with Adjust → Received.
        </p>
      )}

      <div className="mt-[16px] flex flex-wrap items-center justify-between gap-[8px]">
        {onDelete ? (
          <Button size="sm" variant="danger" disabled={busy} onClick={onDelete}>
            Delete item
          </Button>
        ) : (
          <span />
        )}
        <span className="flex gap-[8px]">
          <Button size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            size="sm"
            variant="primary"
            loading={busy}
            disabled={!canSave || busy}
            onClick={() =>
              onSave({
                id: initial.id,
                name,
                category: itemCategory,
                sku,
                supplier,
                per_unit: perUnitValue ?? 0,
                reorder_at: reorderValue ?? 0,
                unit_cost: costValue,
                notes,
              })
            }
          >
            {busy ? 'Saving…' : initial.id ? 'Save changes' : 'Add item'}
          </Button>
        </span>
      </div>
    </Card>
  );
}

function BuildCard({
  canBuild,
  busy,
  onRecord,
}: {
  canBuild: number | null;
  busy: boolean;
  onRecord: (count: number) => void;
}) {
  const [count, setCount] = useState('1');
  const parsed = wholeNumber(count);
  const problem =
    parsed === undefined || parsed === 0 ? 'Enter 1 or more.' : undefined;
  // Not enough parts is a state, not a mistake: say it neutrally and disable
  // the button, rather than showing a red error before anything was typed.
  const tooMany = parsed !== undefined && canBuild !== null && parsed > canBuild;

  if (canBuild === null) return null;

  return (
    <Card pad={16}>
      <CardTitle>Record builds</CardTitle>
      <p className="mb-[10px] text-[11.5px] text-ink-4">
        Takes every part in the build down by its per-unit figure, and adds the units to Finished.
      </p>
      <Field
        label="Units built"
        type="number"
        value={count}
        onChange={setCount}
        error={count.trim() === '' ? undefined : problem}
        hint={problem ? undefined : `Parts on the shelf make ${number(canBuild)}.`}
      />
      <Button
        className="mt-[10px] w-full"
        size="sm"
        loading={busy}
        disabled={busy || problem !== undefined || tooMany}
        onClick={() => {
          if (
            parsed &&
            window.confirm(`Record ${parsed} build${parsed === 1 ? '' : 's'}? Every part is taken down.`)
          )
            onRecord(parsed);
        }}
      >
        Record {parsed && parsed > 0 ? parsed : ''} build{parsed === 1 ? '' : 's'}
      </Button>
    </Card>
  );
}
