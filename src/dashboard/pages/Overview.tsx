/**
 * Overview.
 *
 * Only what is true. The revenue, order-value and channel cards from the
 * handoff are gone with the rest of the sample set — nothing has sold, and a
 * KPI row of invented money was the most misleading thing on the dashboard.
 *
 * What is left reads from Supabase: the waitlist, the devlog, the team, and
 * the launch gates that those feed.
 */

import { Link } from 'react-router-dom';
import { PageBody, PageHeader } from '../layout/AppShell';
import { Bar, Card, CardTitle, Kpi, Pill, Skeleton } from '../ui';
import { Ring, Sparkline } from '../ui/charts';
import { FIGURES, GATES } from '../mock';
import { number } from '../lib/format';
import { useInventory, useUpdates, useWaitlist } from '../lib/useLiveData';
import { readyToShip, shipParts } from '../../lib/inventory';
import { ArrowRight } from '../icons';

export default function Overview() {
  const waitlist = useWaitlist();
  const updates = useUpdates();
  const inventory = useInventory();
  const canShip = readyToShip(inventory.data);
  // What stops the units for sale going out: anything that ships with them
  // and is short, net of what is already on order.
  const waitingOn = shipParts(inventory.data)
    .filter((item) => item.on_hand < item.per_unit * FIGURES.forSale)
    .map((item) => item.name)
    .join(', ');

  const signups = waitlist.data.length;
  const target = FIGURES.waitlistTarget;
  const waitlistPct = Math.min(100, Math.round((signups / target) * 100));

  // Gate 6 is the waitlist gate, and it is the one gate backed by real data.
  const states = GATES.map((gate, index) =>
    index === 5 ? (signups >= target ? 'done' : 'prog') : gate.state,
  );
  const cleared = states.filter((state) => state === 'done').length;
  const blocked = states.filter((state) => state === 'block').length;

  const published = updates.data.filter((update) => update.published).length;
  const drafts = updates.data.length - published;

  const thisWeek = waitlist.data.filter(
    (entry) => Date.now() - new Date(entry.created_at).getTime() < 7 * 86_400_000,
  ).length;

  return (
    <>
      <PageHeader
        title="Overview"
        live
        description="Can we open pre-orders yet, and what is stopping us?"
      />

      <PageBody
        rail={
          <>
            <Card pad={16}>
              <CardTitle>Launch readiness</CardTitle>
              <div className="flex flex-col items-center">
                <Ring
                  pct={cleared / GATES.length}
                  size={146}
                  label={`${cleared}/${GATES.length}`}
                  sub="Cleared"
                  ariaLabel={`Launch readiness: ${cleared} of ${GATES.length} gates cleared`}
                />
                <p className="mt-[12px] text-center text-[11.5px] text-ink-4">
                  {blocked > 0
                    ? 'Every blocker traces back to one decision: the price.'
                    : 'Nothing blocked — finish what is in progress.'}
                </p>
                <Link
                  to="/admin/launch"
                  className="on-lime mt-[12px] inline-flex h-[34px] w-full items-center justify-center gap-[7px] rounded-chip bg-lime-grad text-[12px] font-bold text-lime-ink shadow-lime transition hover:brightness-110"
                >
                  Open the launch gates
                  <ArrowRight size={14} />
                </Link>
              </div>
            </Card>

            <Card pad={16}>
              <CardTitle>Spec</CardTitle>
              <div className="flex flex-wrap gap-[6px]">
                <Pill tone="lime" label="13 underglow LEDs" />
                <Pill tone="grey" label="Underside only" />
                <Pill tone="grey" label="MX-compatible" />
              </div>
            </Card>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2 xl:grid-cols-4">
          <Kpi
            label="Waitlist"
            value={waitlist.loading ? '—' : number(signups)}
            delta={thisWeek > 0 ? `+${thisWeek}` : '—'}
            sub="this week"
            to="/admin/customers"
          />
          <Kpi
            label="To the gate"
            value={waitlist.loading ? '—' : number(Math.max(0, target - signups))}
            sub={`of ${target} needed`}
            to="/admin/launch"
          />
          <Kpi
            label="Gates cleared"
            value={`${cleared} of ${GATES.length}`}
            sub={blocked > 0 ? `${blocked} blocked` : 'none blocked'}
            to="/admin/launch"
          />
          <Kpi
            label="Devlog posts"
            value={updates.loading ? '—' : number(published)}
            sub={drafts > 0 ? `${drafts} draft${drafts === 1 ? '' : 's'}` : 'no drafts'}
            to="/admin/content"
          />
        </div>

        <Card pad={18}>
          <CardTitle
            action={
              <Link to="/admin/customers" className="text-[10.5px] font-semibold text-lime">
                View signups
              </Link>
            }
          >
            Waitlist growth
          </CardTitle>
          {waitlist.loading ? (
            <Skeleton height={80} />
          ) : signups === 0 ? (
            <p className="py-6 text-center text-[11.5px] text-ink-4">
              No signups yet. The form on the landing page writes straight into this table.
            </p>
          ) : (
            <>
              <p className="dash-metric">
                {number(signups)}{' '}
                <span className="text-[14px] font-semibold text-ink-4">of {target}</span>
              </p>
              <div className="mt-[12px]">
                <Sparkline
                  data={waitlist.growth}
                  height={56}
                  ariaLabel="Waitlist signups over the last twelve weeks"
                />
              </div>
              <div className="mt-[12px]">
                <Bar label="To the gate" value={`${waitlistPct}%`} pct={waitlistPct} />
              </div>
              <p className="mt-[9px] text-[10.5px] text-ink-4">
                {signups >= target
                  ? 'The waitlist gate is cleared.'
                  : `${target - signups} signups to the gate.`}
              </p>
            </>
          )}
        </Card>

        <Card pad={18}>
          <CardTitle
            action={
              <Link to="/admin/inventory" className="text-[12px] text-ink-3 hover:text-ink-1">
                Open inventory
              </Link>
            }
          >
            Batch 1
          </CardTitle>
          {inventory.loading && inventory.data.length === 0 ? (
            <Skeleton height={60} />
          ) : (
            <dl className="grid grid-cols-2 gap-y-[10px] text-[12.5px] sm:grid-cols-4">
              {[
                ['Built', number(FIGURES.runSize)],
                ['For sale', number(FIGURES.forSale)],
                ['Ready to ship', canShip === null ? '—' : number(Math.min(canShip, FIGURES.forSale))],
                ['Waiting on', waitingOn || 'Nothing'],
              ].map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <dt className="text-ink-4">{label}</dt>
                  <dd className="mt-[2px] truncate tabular-nums text-ink-1" title={value}>
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </Card>
      </PageBody>
    </>
  );
}
