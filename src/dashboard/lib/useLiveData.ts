/**
 * The real data behind the dashboard.
 *
 * Real tables today: `waitlist`, `updates` and the two inventory tables.
 * Everything else on the dashboard is the reference set in `mock/`. These hooks are the only place the
 * dashboard talks to Supabase, so it stays obvious which pages are real.
 *
 * Both tables are read through the same admin functions the old admin pages
 * used, so row-level security still does the actual gating — a non-admin who
 * reaches this code gets empty arrays back from Postgres.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchWaitlist, type WaitlistEntry } from '../../lib/admin';
import { fetchAllUpdates, type Update } from '../../lib/updates';
import { fetchInventory, type InventoryItem, type Movement } from '../../lib/inventory';

export interface Loadable<T> {
  data: T;
  loading: boolean;
  error?: string;
  reload: () => void;
}

export function useWaitlist(): Loadable<WaitlistEntry[]> & {
  /** Signups grouped by the `source` column, biggest first. */
  bySource: { source: string; count: number }[];
  /** Cumulative signups per week for the last 12 weeks. */
  growth: number[];
} {
  const [data, setData] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const reload = useCallback(() => {
    setLoading(true);
    void fetchWaitlist().then((result) => {
      setData(result.entries);
      setError(result.error);
      setLoading(false);
    });
  }, []);

  useEffect(reload, [reload]);

  const bySource = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of data) {
      const key = entry.source?.trim() || 'Unknown';
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count);
  }, [data]);

  /**
   * Cumulative signups per week. Built from created_at rather than stored, so
   * it cannot drift from the table it describes.
   */
  const growth = useMemo(() => {
    const weeks = 12;
    const now = Date.now();
    const week = 7 * 86_400_000;
    const buckets = new Array<number>(weeks).fill(0);

    for (const entry of data) {
      const at = new Date(entry.created_at).getTime();
      if (Number.isNaN(at)) continue;
      const weeksAgo = Math.floor((now - at) / week);
      const index = weeks - 1 - weeksAgo;
      const slot = index >= 0 && index < weeks ? index : weeksAgo >= weeks ? 0 : -1;
      if (slot >= 0) buckets[slot] = (buckets[slot] ?? 0) + 1;
    }

    let running = 0;
    return buckets.map((count) => {
      running += count;
      return running;
    });
  }, [data]);

  return { data, loading, error, reload, bySource, growth };
}

export function useUpdates(): Loadable<Update[]> {
  const [data, setData] = useState<Update[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const reload = useCallback(() => {
    setLoading(true);
    void fetchAllUpdates().then((result) => {
      setData(result.updates);
      setError(result.error);
      setLoading(false);
    });
  }, []);

  useEffect(reload, [reload]);

  return { data, loading, error, reload };
}

export function useInventory(): Loadable<InventoryItem[]> & { movements: Movement[] } {
  const [data, setData] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const reload = useCallback(() => {
    setLoading(true);
    void fetchInventory().then((result) => {
      setData(result.items);
      setMovements(result.movements);
      setError(result.error);
      setLoading(false);
    });
  }, []);

  useEffect(reload, [reload]);

  return { data, movements, loading, error, reload };
}
