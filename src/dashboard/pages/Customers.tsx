/**
 * Customers & waitlist (handoff §5.7) — real data.
 *
 * This is the old /admin waitlist page rebuilt in the new system. Everything
 * it could do, it still does: search, CSV export with the formula-injection
 * guard, and removing a signup.
 *
 * Four columns from the handoff have no column behind them. The `waitlist`
 * table stores email, source and created_at — there is no name, no country
 * and no pre-order flag, so "Converted", "Top country" and "Avg days to
 * convert" are not rendered rather than invented. Segments filter by source,
 * which is real, instead of by country, which is not.
 */

import { useMemo, useState } from 'react';
import { PageBody, PageHeader } from '../layout/AppShell';
import {
  Avatar,
  Bar,
  Button,
  Card,
  CardTitle,
  Chip,
  EmptyState,
  ErrorCard,
  Kpi,
  Row,
  SearchField,
  Skeleton,
} from '../ui';
import { DataTable, type Column } from '../ui/DataTable';
import { AreaChart } from '../ui/charts';
import { removeFromWaitlist, toCsv, type WaitlistEntry } from '../../lib/admin';
import { useWaitlist } from '../lib/useLiveData';
import { FIGURES } from '../mock';
import { dateTime, number, relative, shortDate } from '../lib/format';
import { Download, Refresh, Users } from '../icons';

const WEEK = 7 * 86_400_000;

export default function Customers() {
  const waitlist = useWaitlist();
  const [query, setQuery] = useState('');
  const [segment, setSegment] = useState<string>('all');
  const [removing, setRemoving] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string>();
  const [removed, setRemoved] = useState<string[]>([]);

  const entries = useMemo(
    () => waitlist.data.filter((entry) => !removed.includes(entry.id)),
    [waitlist.data, removed],
  );

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return entries.filter((entry) => {
      if (segment !== 'all' && (entry.source?.trim() || 'Unknown') !== segment) return false;
      if (!needle) return true;
      return entry.email.toLowerCase().includes(needle);
    });
  }, [entries, query, segment]);

  const signups = entries.length;
  const target = FIGURES.waitlistTarget;

  const thisWeek = entries.filter(
    (entry) => Date.now() - new Date(entry.created_at).getTime() < WEEK,
  ).length;

  const bySource = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of entries) {
      const key = entry.source?.trim() || 'Unknown';
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count);
  }, [entries]);

  const newest = entries[0];
  const topSource = bySource[0];
  const maxSource = bySource[0]?.count ?? 1;

  function downloadCsv() {
    const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `taptile-waitlist-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleRemove(entry: WaitlistEntry) {
    if (!window.confirm(`Remove ${entry.email} from the waitlist?`)) return;
    setRemoving(entry.id);
    setActionError(undefined);
    const ok = await removeFromWaitlist(entry.id);
    setRemoving(null);
    if (ok) setRemoved((current) => [...current, entry.id]);
    else setActionError('Could not remove that entry.');
  }

  const columns: Column<WaitlistEntry>[] = [
    {
      key: 'email',
      label: 'Email',
      span: 6,
      render: (entry) => (
        <span className="flex min-w-0 items-center gap-[8px]">
          <Avatar name={entry.email} size={24} />
          <span className="truncate font-semibold text-ink-1" title={entry.email}>
            {entry.email}
          </span>
        </span>
      ),
    },
    {
      key: 'source',
      label: 'Source',
      span: 2,
      render: (entry) => (
        <span className="truncate text-ink-2">{entry.source?.trim() || 'Unknown'}</span>
      ),
    },
    {
      key: 'joined',
      label: 'Joined',
      span: 2,
      render: (entry) => (
        <span className="text-ink-4" title={dateTime(entry.created_at)}>
          {shortDate(entry.created_at)}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      span: 2,
      align: 'right',
      render: (entry) => (
        <button
          type="button"
          onClick={() => void handleRemove(entry)}
          disabled={removing === entry.id}
          className="text-[11px] font-semibold text-ink-4 transition hover:text-alert-text disabled:opacity-50"
        >
          {removing === entry.id ? 'Removing…' : 'Remove'}
        </button>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Customers"
        live
        description="Everyone on the waitlist, straight from Supabase."
        actions={
          <>
            <Button icon={Refresh} onClick={waitlist.reload}>
              Refresh
            </Button>
            <Button icon={Download} variant="primary" onClick={downloadCsv} disabled={rows.length === 0}>
              Export CSV
            </Button>
          </>
        }
      />

      <PageBody
        rail={
          <>
            <Card pad={16}>
              <CardTitle>Sources</CardTitle>
              {waitlist.loading ? (
                <Skeleton height={90} />
              ) : bySource.length === 0 ? (
                <p className="text-[11.5px] text-ink-4">No signups yet.</p>
              ) : (
                <div className="flex flex-col gap-[12px]">
                  {bySource.map((item) => (
                    <Bar
                      key={item.source}
                      label={item.source}
                      value={number(item.count)}
                      pct={(item.count / maxSource) * 100}
                      active={segment === 'all' || segment === item.source}
                      pressed={segment === item.source}
                      onClick={() =>
                        setSegment(segment === item.source ? 'all' : item.source)
                      }
                    />
                  ))}
                </div>
              )}
            </Card>

            <Card pad={16}>
              <CardTitle>Newest signup</CardTitle>
              {newest ? (
                <Row
                  left={<Avatar name={newest.email} size={30} />}
                  name={newest.email}
                  sub={`${newest.source?.trim() || 'Unknown'} · ${relative(newest.created_at)}`}
                />
              ) : (
                <p className="text-[11.5px] text-ink-4">Nobody yet.</p>
              )}
            </Card>

            <Card pad={16}>
              <CardTitle>To the gate</CardTitle>
              <Bar
                label={`${number(signups)} of ${target}`}
                value={`${Math.min(100, Math.round((signups / target) * 100))}%`}
                pct={(signups / target) * 100}
              />
              <p className="mt-[9px] text-[11px] text-ink-4">
                {signups >= target
                  ? 'The waitlist gate on Launch is cleared.'
                  : `${target - signups} more signups clears launch gate 6.`}
              </p>
            </Card>
          </>
        }
      >
        {waitlist.error && <ErrorCard message={waitlist.error} onRetry={waitlist.reload} />}
        {actionError && <ErrorCard message={actionError} />}

        <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2 xl:grid-cols-4">
          <Kpi
            label="Waitlist"
            value={waitlist.loading ? '—' : number(signups)}
            delta={thisWeek > 0 ? `+${thisWeek}` : '—'}
            sub="this week"
          />
          <Kpi
            label="To the gate"
            value={waitlist.loading ? '—' : number(Math.max(0, target - signups))}
            sub={`of ${target} needed`}
          />
          <Kpi
            label="Top source"
            value={topSource?.source ?? '—'}
            sub={topSource ? `${number(topSource.count)} signups` : 'No signups yet'}
          />
          <Kpi
            label="Newest"
            value={newest ? relative(newest.created_at) : '—'}
            sub={newest?.source?.trim() || undefined}
          />
        </div>

        <Card pad={18}>
          <CardTitle>Growth</CardTitle>
          {waitlist.loading ? (
            <Skeleton height={170} />
          ) : (
            <AreaChart
              data={waitlist.growth}
              labels={waitlist.growth.map((_, index) => (index % 3 === 0 ? `w${index + 1}` : ''))}
              height={180}
              target={target}
              targetLabel={`${target}`}
              ariaLabel="Cumulative waitlist signups over the last twelve weeks"
            />
          )}
        </Card>

        <Card pad={18}>
          <div className="mb-[14px] flex flex-wrap items-center gap-[10px]">
            <div className="w-full sm:w-[220px]">
              <SearchField
                value={query}
                onChange={setQuery}
                label="Search signups by email"
                placeholder="Search by email"
                height={32}
              />
            </div>
            <Chip
              label={`All ${entries.length}`}
              active={segment === 'all'}
              onClick={() => setSegment('all')}
            />
            {bySource.slice(0, 4).map((item) => (
              <Chip
                key={item.source}
                label={item.source}
                count={item.count}
                active={segment === item.source}
                onClick={() => setSegment(segment === item.source ? 'all' : item.source)}
              />
            ))}
          </div>

          {waitlist.loading ? (
            <div className="flex flex-col gap-[10px]">
              {[0, 1, 2, 3, 4].map((index) => (
                <Skeleton key={index} height={38} />
              ))}
            </div>
          ) : (
            <DataTable
              columns={columns}
              rows={rows}
              rowKey={(entry) => entry.id}
              empty={
                <EmptyState
                  icon={Users}
                  title={entries.length === 0 ? 'No signups yet' : 'Nothing matches'}
                  body={
                    entries.length === 0
                      ? 'The waitlist form on the landing page writes straight into this table.'
                      : 'The search and segment filters are still on so you can undo them.'
                  }
                  cta={
                    entries.length > 0 ? (
                      <Button
                        onClick={() => {
                          setQuery('');
                          setSegment('all');
                        }}
                      >
                        Clear filters
                      </Button>
                    ) : undefined
                  }
                />
              }
            />
          )}

          <p className="mt-[14px] text-[11px] text-ink-4">
            Showing {rows.length} of {entries.length} signups
          </p>
        </Card>

        <p className="text-[11.5px] text-ink-4">
          Only accounts on the admin allowlist can load this data. The list is enforced in the
          database, not in this page — editing the page in your browser will not reveal anything.
        </p>
      </PageBody>
    </>
  );
}
