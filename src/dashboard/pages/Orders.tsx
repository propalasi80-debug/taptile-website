/**
 * Orders — real data.
 *
 * Rows arrive by themselves: Stripe calls the stripe-webhook function when a
 * checkout is paid, and the function writes the order (migration 0004). This
 * page is the shipping desk. See where each one goes, copy the address into
 * eShip (or export the to-ship CSV and import it there), then enter the
 * tracking number. "Mark shipped" goes through the order-shipped function,
 * which changes the status and emails the customer in one step, so neither
 * ever happens without the other.
 *
 * Nothing here invents a number: revenue is the sum of what Stripe said was
 * paid, test-mode orders are labelled, and refunds only come from Stripe.
 */

import { useEffect, useMemo, useState } from 'react';
import { PageBody, PageHeader } from '../layout/AppShell';
import {
  Button,
  Card,
  CardTitle,
  Chip,
  EmptyState,
  ErrorCard,
  Field,
  Kpi,
  Pill,
  SearchField,
  Skeleton,
  type Tone,
} from '../ui';
import { DataTable, type Column } from '../ui/DataTable';
import {
  DEFAULT_CARRIER,
  markShipped,
  money,
  saveOrderNote,
  shipToLines,
  STATUS_LABEL,
  toOrdersCsv,
  trackingUrlFor,
  type Order,
  type OrderStatus,
} from '../../lib/orders';
import { useOrders } from '../lib/useLiveData';
import { dateTime, relative } from '../lib/format';
import { Box, Download, Refresh, Truck } from '../icons';

const TONE: Record<OrderStatus, Tone> = {
  paid: 'blue',
  shipped: 'lime',
  refunded: 'rose',
  cancelled: 'grey',
};

type Filter = OrderStatus | 'all';
const FILTERS: Filter[] = ['all', 'paid', 'shipped', 'refunded'];

function download(name: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

export default function Orders() {
  const orders = useOrders();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return orders.data.filter((order) => {
      if (filter !== 'all' && order.status !== filter) return false;
      if (!needle) return true;
      return [order.order_number, order.email, order.name, order.ship_name, order.ship_city, order.tracking_number]
        .join(' ')
        .toLowerCase()
        .includes(needle);
    });
  }, [orders.data, query, filter]);

  const selected = orders.data.find((order) => order.id === selectedId) ?? null;

  const counts = useMemo(() => {
    const result: Record<Filter, number> = { all: orders.data.length, paid: 0, shipped: 0, refunded: 0, cancelled: 0 };
    for (const order of orders.data) result[order.status] += 1;
    return result;
  }, [orders.data]);

  const toShip = useMemo(() => orders.data.filter((order) => order.status === 'paid'), [orders.data]);
  const revenue = orders.data
    .filter((order) => order.status === 'paid' || order.status === 'shipped')
    .reduce((sum, order) => sum + order.amount_total, 0);
  const hasTest = orders.data.some((order) => !order.livemode);

  const columns: Column<Order>[] = [
    {
      key: 'order',
      label: 'Order',
      span: 2,
      render: (order) => (
        <div className="min-w-0">
          <p className="truncate text-[12.5px] font-semibold text-ink-1">{order.order_number}</p>
          <p className="truncate text-[10.5px] text-ink-4">
            {relative(order.paid_at)}
            {!order.livemode && ' · test'}
          </p>
        </div>
      ),
    },
    {
      key: 'customer',
      label: 'Customer',
      span: 5,
      render: (order) => (
        <div className="min-w-0">
          <p className="truncate text-[12.5px] text-ink-1">{order.name || order.ship_name || '—'}</p>
          <p className="truncate text-[10.5px] text-ink-4">{order.email}</p>
        </div>
      ),
    },
    {
      key: 'to',
      label: 'Ships to',
      span: 2,
      hideOnPhone: true,
      render: (order) => (
        <span className="truncate text-[12px] text-ink-2">
          {[order.ship_city, order.ship_postal_code].filter(Boolean).join(' ') || '—'}
        </span>
      ),
    },
    {
      key: 'total',
      label: 'Total',
      span: 1,
      align: 'right',
      render: (order) => <span className="text-[12px] text-ink-1">{money(order.amount_total, order.currency)}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      span: 2,
      align: 'right',
      render: (order) => <Pill tone={TONE[order.status]} label={STATUS_LABEL[order.status]} />,
    },
  ];

  return (
    <>
      <PageHeader
        title="Orders"
        live
        description="Every paid order, where it's going, and whether it has shipped. Stripe fills this in; you ship from it."
        actions={
          <>
            <Button icon={Refresh} onClick={orders.reload} loading={orders.loading}>
              Refresh
            </Button>
            <Button
              icon={Download}
              disabled={toShip.length === 0}
              onClick={() => download(`taptile-to-ship-${new Date().toISOString().slice(0, 10)}.csv`, toOrdersCsv(toShip))}
            >
              Export to-ship CSV
            </Button>
          </>
        }
      />

      <PageBody>
        <div className="grid grid-cols-2 gap-[14px] lg:grid-cols-4">
          <Kpi label="To ship" value={String(counts.paid)} sub={counts.paid === 1 ? 'order waiting' : 'orders waiting'} />
          <Kpi label="Shipped" value={String(counts.shipped)} />
          <Kpi label="Refunded" value={String(counts.refunded)} />
          <Kpi label="Paid" value={money(revenue)} sub={hasTest ? 'includes test orders' : 'from Stripe'} />
        </div>

        {orders.error && <ErrorCard message={orders.error} onRetry={orders.reload} />}

        <Card pad={16}>
          <div className="flex flex-wrap items-center justify-between gap-[10px]">
            <div className="flex flex-wrap gap-[6px]">
              {FILTERS.map((option) => (
                <Chip
                  key={option}
                  label={option === 'all' ? 'All' : STATUS_LABEL[option]}
                  count={counts[option]}
                  active={filter === option}
                  onClick={() => setFilter(filter === option && option !== 'all' ? 'all' : option)}
                />
              ))}
            </div>
            <div className="w-full sm:w-[260px]">
              <SearchField value={query} onChange={setQuery} placeholder="Order, name, email, tracking" label="Search orders" />
            </div>
          </div>

          <div className="mt-[14px]">
            {orders.loading ? (
              <div className="flex flex-col gap-[10px]">
                <Skeleton height={38} />
                <Skeleton height={38} />
                <Skeleton height={38} />
              </div>
            ) : (
              <DataTable
                columns={columns}
                rows={rows}
                rowKey={(order) => order.id}
                onRowClick={(order) => setSelectedId(order.id === selectedId ? null : order.id)}
                rowLabel={(order) => `Open order ${order.order_number} for ${order.name || order.email}`}
                isSelected={(order) => order.id === selectedId}
                empty={
                  <EmptyState
                    icon={Box}
                    title={orders.data.length === 0 ? 'No orders yet' : 'Nothing matches'}
                    body={
                      orders.data.length === 0
                        ? 'Orders appear here by themselves when Stripe takes a payment. If one is missing, check the stripe-webhook logs in Supabase.'
                        : 'Try another filter or a different search.'
                    }
                  />
                }
              />
            )}
          </div>
        </Card>

        {selected && <OrderDetail key={selected.id} order={selected} onChange={orders.patch} onClose={() => setSelectedId(null)} />}
      </PageBody>
    </>
  );
}

/* -------------------------------------------------------------- detail --- */

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="dash-eyebrow">{label}</p>
      <div className="mt-[4px] text-[12.5px] text-ink-1">{children}</div>
    </div>
  );
}

function OrderDetail({
  order,
  onChange,
  onClose,
}: {
  order: Order;
  onChange: (order: Order) => void;
  onClose: () => void;
}) {
  const [carrier, setCarrier] = useState(order.carrier || DEFAULT_CARRIER);
  const [tracking, setTracking] = useState(order.tracking_number);
  const [trackingUrl, setTrackingUrl] = useState(order.tracking_url);
  const [urlEdited, setUrlEdited] = useState(Boolean(order.tracking_url));
  const [note, setNote] = useState(order.note);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [flash, setFlash] = useState<string>();

  // The tracking link follows the number unless it has been typed by hand.
  useEffect(() => {
    if (!urlEdited) setTrackingUrl(trackingUrlFor(carrier, tracking));
  }, [carrier, tracking, urlEdited]);

  const address = shipToLines(order);
  const canShip = order.status === 'paid' || order.status === 'shipped';

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(address.join('\n'));
      setFlash('Address copied. Paste it into eShip.');
    } catch {
      setFlash('Could not copy automatically. Select the address and copy it by hand.');
    }
  }

  async function ship() {
    setBusy(true);
    setError(undefined);
    setFlash(undefined);
    const result = await markShipped({ orderId: order.id, carrier, trackingNumber: tracking, trackingUrl });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onChange(result.order);
    setFlash(
      result.emailed
        ? `Shipped. Tracking email sent to ${order.email}.`
        : 'Marked shipped, but the tracking email did not send. Press "Mark shipped" again to retry the email.',
    );
  }

  async function saveNote() {
    setBusy(true);
    setError(undefined);
    const ok = await saveOrderNote(order.id, note);
    setBusy(false);
    if (ok) {
      onChange({ ...order, note });
      setFlash('Note saved.');
    } else {
      setError('Could not save the note.');
    }
  }

  return (
    <Card pad={18}>
      <div className="flex flex-wrap items-start justify-between gap-[10px]">
        <div>
          <CardTitle>
            {order.order_number}
          </CardTitle>
          <div className="mt-[6px] flex flex-wrap items-center gap-[6px]">
            <Pill tone={TONE[order.status]} label={STATUS_LABEL[order.status]} />
            {!order.livemode && <Pill tone="grey" label="Test mode" />}
            <span className="text-[11px] text-ink-4">Paid {dateTime(order.paid_at)}</span>
          </div>
        </div>
        <Button size="sm" onClick={onClose}>
          Close
        </Button>
      </div>

      <div className="mt-[16px] grid gap-[14px] sm:grid-cols-2 lg:grid-cols-3">
        <Fact label="Ship to">
          <div className="whitespace-pre-line leading-[1.5]">{address.join('\n') || '—'}</div>
          <Button size="sm" className="mt-[8px]" onClick={() => void copyAddress()}>
            Copy address
          </Button>
        </Fact>
        <Fact label="Contact">
          <p className="truncate">
            <a href={`mailto:${order.email}`} className="underline decoration-line-strong underline-offset-2">
              {order.email}
            </a>
          </p>
          <p className="mt-[4px]">
            {order.phone ? (
              <a href={`tel:${order.phone}`} className="underline decoration-line-strong underline-offset-2">
                {order.phone}
              </a>
            ) : (
              <span className="text-ink-4">No phone given</span>
            )}
          </p>
        </Fact>
        <Fact label="Paid">
          <p>{money(order.amount_total, order.currency)}</p>
          <p className="mt-[2px] text-[11px] text-ink-4">
            {money(order.amount_subtotal, order.currency)} + {money(order.amount_shipping, order.currency)} shipping
            {' · '}
            {order.quantity} × Taptile Dialect
          </p>
          <p className="mt-[4px] truncate font-mono text-[10.5px] text-ink-5" title={order.stripe_session_id}>
            {order.stripe_session_id}
          </p>
        </Fact>
        {order.status === 'shipped' && (
          <Fact label="Tracking">
            <p>
              {order.carrier} · {order.tracking_number || '—'}
            </p>
            {order.tracking_url && (
              <a
                href={order.tracking_url}
                target="_blank"
                rel="noreferrer"
                className="mt-[4px] inline-block text-[11.5px] text-ink-3 underline decoration-line-strong underline-offset-2"
              >
                Open tracking
              </a>
            )}
            {order.shipped_at && <p className="mt-[4px] text-[11px] text-ink-4">Shipped {dateTime(order.shipped_at)}</p>}
          </Fact>
        )}
        {order.status === 'refunded' && (
          <Fact label="Refunded">
            <p>{order.refunded_at ? dateTime(order.refunded_at) : 'In Stripe'}</p>
            <p className="mt-[2px] text-[11px] text-ink-4">Refunds are issued in Stripe → Payments; this updates by itself.</p>
          </Fact>
        )}
      </div>

      {canShip && (
        <div className="mt-[18px] border-t border-line pt-[16px]">
          <p className="dash-eyebrow">{order.status === 'shipped' ? 'Update tracking' : 'Ship it'}</p>
          <p className="mt-[4px] text-[11.5px] text-ink-4">
            Print the label in eShip, then enter the tracking number. Marking it shipped emails the customer the tracking link.
          </p>
          <div className="mt-[12px] grid gap-[12px] sm:grid-cols-3">
            <Field label="Carrier" value={carrier} onChange={setCarrier} placeholder={DEFAULT_CARRIER} />
            <Field label="Tracking number" value={tracking} onChange={setTracking} placeholder="From the eShip label" />
            <Field
              label="Tracking link"
              value={trackingUrl}
              onChange={(next) => {
                setUrlEdited(true);
                setTrackingUrl(next);
              }}
              hint={urlEdited ? undefined : 'Filled in from the number for NZ Post.'}
            />
          </div>
          <div className="mt-[12px] flex flex-wrap items-center gap-[8px]">
            <Button variant="primary" icon={Truck} loading={busy} disabled={!tracking.trim()} onClick={() => void ship()}>
              {order.status === 'shipped' ? 'Save and re-send tracking' : 'Mark shipped and email tracking'}
            </Button>
          </div>
        </div>
      )}

      <div className="mt-[18px] border-t border-line pt-[16px]">
        <Field label="Note" value={note} onChange={setNote} multiline rows={2} hint="Private. Goes into the eShip export as delivery instructions." />
        <Button size="sm" className="mt-[8px]" loading={busy} disabled={note === order.note} onClick={() => void saveNote()}>
          Save note
        </Button>
      </div>

      {error && <p className="mt-[12px] text-[12px] font-semibold text-status-rose">{error}</p>}
      {flash && !error && (
        <p className="mt-[12px] text-[12px] text-ink-3" role="status">
          {flash}
        </p>
      )}
    </Card>
  );
}
