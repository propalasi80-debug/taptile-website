/**
 * The dashboard table.
 *
 * A 12-column grid rather than a <table>, because every artboard aligns
 * columns across cards that are not in the same table. Clickable rows are real
 * <button> elements with `display:grid` — a row that selects something has to
 * be reachable by keyboard, and a <tr onClick> is not.
 *
 * Because it is a grid and not a table, the header row is marked up with
 * role="row"/"columnheader" so screen readers still announce column names.
 */

import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

export interface Column<T> {
  key: string;
  label: string;
  /** Grid span out of 12. The spans in a table must total 12. */
  span: number;
  align?: 'left' | 'right' | 'center';
  /** Hide below 640px, for a column whose value is repeated elsewhere in the row. */
  hideOnPhone?: boolean;
  /** Span below 640px, to take up a hidden column's room. */
  phoneSpan?: 8;
  render: (row: T) => ReactNode;
}

const PHONE_SPAN: Record<number, string> = { 8: 'max-sm:col-span-8' };

const SPAN: Record<number, string> = {
  1: 'col-span-1',
  2: 'col-span-2',
  3: 'col-span-3',
  4: 'col-span-4',
  5: 'col-span-5',
  6: 'col-span-6',
  7: 'col-span-7',
  8: 'col-span-8',
  9: 'col-span-9',
  10: 'col-span-10',
  11: 'col-span-11',
  12: 'col-span-12',
};

function alignClass(align: Column<unknown>['align']): string {
  if (align === 'right') return 'text-right justify-end';
  if (align === 'center') return 'text-center justify-center';
  return 'text-left';
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  rowLabel,
  isSelected,
  empty,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  /** Accessible name for a clickable row, e.g. "Open order TD-0018 for M. Reid". */
  rowLabel?: (row: T) => string;
  isSelected?: (row: T) => boolean;
  empty?: ReactNode;
}) {
  if (rows.length === 0 && empty) return <>{empty}</>;

  return (
    <div role="table" className="w-full">
      <div
        role="row"
        className="grid grid-cols-12 gap-[10px] rounded-[3px] bg-white/[0.025] px-[12px] py-[9px]"
      >
        {columns.map((column) => (
          <div
            key={column.key}
            role="columnheader"
            className={cn(
              'dash-th flex items-center',
              SPAN[column.span],
              column.phoneSpan && PHONE_SPAN[column.phoneSpan],
              alignClass(column.align),
              column.hideOnPhone && 'max-sm:hidden',
            )}
          >
            {column.label}
          </div>
        ))}
      </div>

      {rows.map((row, index) => {
        const selected = isSelected?.(row) ?? false;
        const cells = columns.map((column) => (
          <div
            key={column.key}
            role="cell"
            className={cn(
              'flex min-w-0 items-center text-[12.5px] text-ink-2',
              SPAN[column.span],
              column.phoneSpan && PHONE_SPAN[column.phoneSpan],
              alignClass(column.align),
              column.hideOnPhone && 'max-sm:hidden',
            )}
          >
            {column.render(row)}
          </div>
        ));

        const shell = cn(
          'grid w-full grid-cols-12 items-center gap-[10px] px-[12px] py-[12px] text-left transition-colors duration-100 hover:bg-white/[0.02]',
          index < rows.length - 1 && 'border-b border-line-row',
          selected && 'bg-lime/[0.07]',
        );

        if (!onRowClick) {
          return (
            <div role="row" key={rowKey(row)} className={shell}>
              {cells}
            </div>
          );
        }

        return (
          <button
            type="button"
            role="row"
            key={rowKey(row)}
            onClick={() => onRowClick(row)}
            aria-label={rowLabel?.(row)}
            aria-current={selected ? 'true' : undefined}
            className={cn(shell, 'transition-colors duration-100 hover:bg-white/[0.025]')}
          >
            {cells}
          </button>
        );
      })}
    </div>
  );
}
