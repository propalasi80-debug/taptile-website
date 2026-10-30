/**
 * Launch (handoff §5.6) — the page the rest of the dashboard routes back to.
 *
 * One array of nine states drives the ring, the three counts, the verdict
 * sentence, the blocker list and the next-up card. Nothing below is stored a
 * second time; if a count ever disagreed with the ring it would mean someone
 * had duplicated this state.
 *
 * Gate 6 is the exception to the sample set: the waitlist count is real, so
 * that gate clears itself when the table passes 50 rather than when someone
 * clicks it.
 */

import { useEffect, useMemo, useState } from 'react';
import { PageBody, PageHeader } from '../layout/AppShell';
import { Button, Card, CardTitle, EmptyState, Pill } from '../ui';
import { AreaChart, Ring } from '../ui/charts';
import { FIGURES, FILL_IN, GATES, type GateState } from '../mock';
import { number } from '../lib/format';
import { cn } from '../lib/cn';
import { useWaitlist } from '../lib/useLiveData';
import { Check, Rocket } from '../icons';

const NEXT_STATE: Record<GateState, GateState> = {
  block: 'prog',
  prog: 'done',
  done: 'block',
};

const STATE_LABEL: Record<GateState, string> = {
  done: 'Cleared',
  prog: 'In progress',
  block: 'Blocked',
};

const STATE_TONE: Record<GateState, 'lime' | 'blue' | 'rose'> = {
  done: 'lime',
  prog: 'blue',
  block: 'rose',
};

/** The waitlist gate. Its index is fixed by the handoff's ordering. */
const WAITLIST_GATE = 5;

export default function Launch() {
  const waitlist = useWaitlist();
  const signups = waitlist.data.length;
  const target = FIGURES.waitlistTarget;

  const realStates = useMemo<GateState[]>(
    () =>
      GATES.map((gate, index) =>
        index === WAITLIST_GATE ? (signups >= target ? 'done' : 'prog') : gate.state,
      ),
    [signups, target],
  );

  const [states, setStates] = useState<GateState[]>(realStates);

  // Keep the waitlist gate honest while the real count is still loading.
  useEffect(() => {
    setStates(realStates);
  }, [realStates]);

  const cleared = states.filter((state) => state === 'done').length;
  const inProgress = states.filter((state) => state === 'prog').length;
  const blocked = states.filter((state) => state === 'block').length;

  const verdict =
    cleared === states.length
      ? 'All nine cleared. Pre-orders can open.'
      : blocked > 0
        ? 'Every blocker traces back to one decision: the price.'
        : 'Nothing blocked — finish what is in progress.';

  const blockers = GATES.map((gate, index) => ({ gate, index })).filter(
    (entry) => states[entry.index] === 'block',
  );
  const nextUp = GATES.map((gate, index) => ({ gate, index })).find(
    (entry) => states[entry.index] !== 'done',
  );

  function cycle(index: number) {
    setStates((current) =>
      current.map((state, i) => (i === index ? NEXT_STATE[state] : state)),
    );
  }

  return (
    <>
      <PageHeader
        title="Launch"
        description="Nine gates between today and taking money. Click a gate to cycle its state."
        actions={
          <Button onClick={() => setStates(realStates)}>Reset to the real state</Button>
        }
      />

      <PageBody
        rail={
          <>
            <Card pad={16}>
              <CardTitle>Blockers</CardTitle>
              {blockers.length === 0 ? (
                <EmptyState
                  icon={Check}
                  title="Nothing blocked"
                  body="Every gate is cleared or moving."
                />
              ) : (
                <div className="flex flex-col">
                  {blockers.map((entry) => (
                    <div
                      key={entry.gate.title}
                      className="border-t border-line-row py-[10px] first:border-t-0"
                    >
                      <p className="text-[12px] font-semibold text-ink-1">{entry.gate.title}</p>
                      <p className="mt-[2px] text-[10.5px] text-ink-4">{entry.gate.owner}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card pad={16}>
              <CardTitle>Next up</CardTitle>
              {nextUp ? (
                <>
                  <p className="text-[12.5px] font-bold text-ink-1">{nextUp.gate.title}</p>
                  <p className="mt-[3px] text-[11px] text-ink-4">{nextUp.gate.detail}</p>
                  <div className="mt-[10px]">
                    <Pill tone={STATE_TONE[states[nextUp.index]!]} label={nextUp.gate.owner} />
                  </div>
                </>
              ) : (
                <p className="text-[11.5px] text-ink-4">Nothing left. Open pre-orders.</p>
              )}
            </Card>

            <Card pad={16}>
              <CardTitle>Ship window</CardTitle>
              <p className="dash-metric-sm text-lime">{FILL_IN}</p>
              <p className="mt-[7px] text-[11px] text-ink-4">
                Do not publish a date until the 20 for sale are boxed with cables.
              </p>
            </Card>
          </>
        }
      >
        <div className="flex flex-col gap-[14px] lg:flex-row">
          <Card pad={18} className="flex-1">
            <CardTitle>Readiness</CardTitle>
            <div className="flex flex-wrap items-center gap-[18px]">
              <Ring
                pct={cleared / states.length}
                size={140}
                label={`${cleared}/${states.length}`}
                sub="Cleared"
                ariaLabel={`${cleared} of ${states.length} launch gates cleared`}
              />
              <div className="flex min-w-[130px] flex-1 flex-col gap-[10px]">
                {(
                  [
                    ['Cleared', cleared, 'lime'],
                    ['In progress', inProgress, 'blue'],
                    ['Blocked', blocked, 'rose'],
                  ] as const
                ).map(([label, count, tone]) => (
                  <div key={label} className="flex items-center justify-between gap-3">
                    <Pill tone={tone} label={label} />
                    <span className="dash-metric-sm">{count}</span>
                  </div>
                ))}
              </div>
            </div>
            <p className="mt-[14px] text-[12px] font-semibold text-ink-2">{verdict}</p>
          </Card>

          <Card pad={18} className="flex-[1.15]">
            <CardTitle
              action={
                <span className="text-[10.5px] font-semibold text-ink-4">
                  {number(signups)} of {target}
                </span>
              }
            >
              Waitlist growth
            </CardTitle>
            <AreaChart
              data={waitlist.growth}
              labels={waitlist.growth.map((_, index) => (index % 3 === 0 ? `w${index + 1}` : ''))}
              height={190}
              target={target}
              targetLabel={`${target}`}
              ariaLabel={`Cumulative waitlist signups over twelve weeks, against a target of ${target}`}
            />
          </Card>
        </div>

        <Card pad={18}>
          <CardTitle>The nine gates</CardTitle>
          <div className="flex flex-col">
            {GATES.map((gate, index) => {
              const state = states[index]!;
              const isWaitlistGate = index === WAITLIST_GATE;
              return (
                <button
                  key={gate.title}
                  type="button"
                  onClick={() => cycle(index)}
                  aria-label={`${gate.title}. Currently ${STATE_LABEL[state].toLowerCase()}. Activate to cycle.`}
                  className={cn(
                    'flex items-center gap-[12px] rounded-[8px] px-[10px] py-[13px] text-left transition-colors duration-100',
                    index < GATES.length - 1 && 'border-b border-line-row',
                    state === 'done' && 'bg-lime/[0.045]',
                    'hover:bg-white/[0.025]',
                  )}
                >
                  <span
                    className={cn(
                      'inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                      state === 'done' && 'bg-lime text-lime-ink',
                      state === 'prog' && 'bg-status-blue/[0.18] text-status-blue',
                      state === 'block' && 'bg-status-rose/[0.18] text-status-rose',
                    )}
                    aria-hidden="true"
                  >
                    {state === 'done' ? <Check size={12} /> : index + 1}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block text-[12.5px] font-bold text-ink-1">{gate.title}</span>
                    <span className="mt-[2px] block text-[11px] text-ink-4">
                      {isWaitlistGate
                        ? `${number(signups)} of ${target} · live count from the waitlist table`
                        : gate.detail}
                    </span>
                  </span>

                  <span className="hidden shrink-0 text-[10.5px] text-ink-4 sm:block">
                    {gate.owner}
                  </span>
                  <Pill tone={STATE_TONE[state]} label={STATE_LABEL[state]} />
                </button>
              );
            })}
          </div>
        </Card>

        {cleared === states.length && (
          <Card pad={18} className="border-lime/40">
            <div className="flex items-center gap-[12px]">
              <span className="inline-flex h-[34px] w-[34px] items-center justify-center rounded-tile bg-lime/[0.16] text-lime">
                <Rocket size={18} />
              </span>
              <p className="text-[12.5px] font-bold text-ink-1">
                All nine cleared. Pre-orders can open.
              </p>
            </div>
          </Card>
        )}
      </PageBody>
    </>
  );
}
