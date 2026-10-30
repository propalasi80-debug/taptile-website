/**
 * Dashboard component library (handoff §4).
 *
 * No business logic lives here — these take props and render. Anything that
 * knows what an order or a gate is belongs in a page.
 *
 * Two rules the whole system rests on:
 *   - Lime is the UI accent and marks exactly one thing per view. Emerald is
 *     the ambient glow and chart fill, never a control colour.
 *   - Every interactive element is a real button, a, input or textarea. A div
 *     with onClick is unreachable by keyboard and is treated as a defect.
 */

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/cn';
import { AVATAR_TONES } from '../lib/chart';
import { hashIndex } from '../lib/hash';
import { ArrowRight, type Icon, Search } from '../icons';

export type Tone = 'lime' | 'blue' | 'rose' | 'grey';

/* ------------------------------------------------------------- surfaces --- */

export function Card({
  children,
  pad = 16,
  className,
  as: As = 'div',
}: {
  children: ReactNode;
  /** 0 is for cards that lay out their own padded regions, like a thread pane. */
  pad?: 0 | 14 | 16 | 18 | 20;
  className?: string;
  as?: 'div' | 'section';
}) {
  return (
    <As
      className={cn(
        'rounded-card border border-line bg-panel-grad shadow-card',
        pad === 0 && 'p-0',
        pad === 14 && 'p-[14px]',
        pad === 16 && 'p-4',
        pad === 18 && 'p-[18px]',
        pad === 20 && 'p-5',
        className,
      )}
    >
      {children}
    </As>
  );
}

/** Nested inside a Card only. A Tile on the page ground reads as a bug. */
export function Tile({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'rounded-tile border border-line-strong bg-tile-grad shadow-tile',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-[12px] flex items-center justify-between gap-3">
      <h2 className="dash-card-title">{children}</h2>
      {action}
    </div>
  );
}

/* ---------------------------------------------------------------- chips --- */

/**
 * A delta. Up is lime, down is rose, zero is a dash with no arrow.
 *
 * Never render a negative delta in lime — on this palette lime means good, and
 * a rising refund count in lime reads as a win.
 */
export function DeltaChip({
  value,
  down,
  label,
}: {
  value: string;
  down?: boolean;
  /** Overrides the arrow entirely, for "all time" and other non-deltas. */
  label?: boolean;
}) {
  const flat = label || value === '—';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-[3px] tabular-nums text-[11px]',
        flat && 'text-ink-4',
        !flat && down && 'text-status-rose',
        !flat && !down && 'text-lime',
      )}
    >
      {!flat && <span aria-hidden="true">{down ? '▼' : '▲'}</span>}
      {value}
    </span>
  );
}

const TONE_STYLE: Record<Tone, string> = {
  lime: 'border-lime/20 bg-lime/[0.08] text-lime',
  blue: 'border-status-blue/20 bg-status-blue/[0.07] text-status-blue',
  rose: 'border-status-rose/20 bg-status-rose/[0.08] text-status-rose',
  grey: 'border-white/[0.08] bg-white/[0.04] text-ink-2',
};


/** Status pill. The tone carries meaning — see §2.6, not a colour choice. */
export function Pill({ tone, label }: { tone: Tone; label: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-pill border px-[7px] py-[2px] text-[11.5px] font-medium',
        TONE_STYLE[tone],
      )}
    >
      {label}
    </span>
  );
}

/** Filter chip. Clicking an already-active chip clears the filter. */
export function Chip({
  label,
  active,
  count,
  onClick,
}: {
  label: string;
  active: boolean;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex h-[30px] items-center gap-[6px] rounded-chip px-[11px] text-[11.5px] transition-[background,color,box-shadow] duration-120',
        active
          ? 'bg-ink-1 font-bold text-deck'
          : 'border border-line-strong bg-tile-grad font-semibold text-ink-2 hover:text-ink-1',
      )}
    >
      {label}
      {count !== undefined && (
        <span className={cn('text-[10.5px]', active ? 'text-deck/60' : 'text-ink-4')}>
          {count}
        </span>
      )}
    </button>
  );
}

/** Section tab. Taller than a Chip and carries aria-current. */
export function Tab({
  label,
  icon: IconCmp,
  active,
  onClick,
}: {
  label: string;
  icon?: Icon;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'inline-flex h-[34px] items-center gap-[7px] rounded-chip px-[13px] text-[12px] transition-[background,color,box-shadow] duration-120',
        active
          ? 'bg-ink-1 font-bold text-deck'
          : 'border border-line-strong bg-tile-grad font-semibold text-ink-2 hover:text-ink-1',
      )}
    >
      {IconCmp && <IconCmp size={14} />}
      {label}
    </button>
  );
}

/* -------------------------------------------------------------- buttons --- */

type ButtonVariant = 'primary' | 'ghost' | 'danger';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  icon?: Icon;
  size?: 'sm' | 'md';
  loading?: boolean;
}

const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  primary: 'on-lime bg-lime-grad font-bold text-lime-ink shadow-lime hover:brightness-110',
  ghost:
    'border border-line-strong bg-tile-grad font-semibold text-ink-2 hover:text-ink-1 hover:brightness-110',
  danger: 'bg-alert-btn font-bold text-alert-ink hover:brightness-110',
};

export function Button({
  variant = 'ghost',
  icon: IconCmp,
  size = 'md',
  loading = false,
  disabled,
  children,
  className,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <button
      type="button"
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex shrink-0 items-center justify-center gap-[7px] rounded-chip transition duration-120 active:scale-[0.98]',
        size === 'sm' ? 'h-[30px] px-[11px] text-[11.5px]' : 'h-[34px] px-[13px] text-[12px]',
        isDisabled
          ? 'cursor-not-allowed border border-line-strong bg-tile-grad font-semibold text-ink-5 shadow-none'
          : BUTTON_VARIANT[variant],
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner /> : IconCmp ? <IconCmp size={14} /> : null}
      {children}
    </button>
  );
}

function Spinner() {
  return (
    <span
      className="h-[14px] w-[14px] animate-spin rounded-full border-2 border-current border-t-transparent"
      aria-hidden="true"
    />
  );
}

/** An icon-only button. The label is required because it is the only name. */
export function IconButton({
  icon: IconCmp,
  label,
  round = false,
  tone = 'ghost',
  onClick,
  disabled,
  size = 30,
}: {
  icon: Icon;
  label: string;
  round?: boolean;
  tone?: 'ghost' | 'primary' | 'bare';
  onClick?: () => void;
  disabled?: boolean;
  size?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex shrink-0 items-center justify-center transition duration-120 active:scale-[0.98] disabled:cursor-not-allowed disabled:text-ink-5',
        round ? 'rounded-full' : 'rounded-chip',
        tone === 'ghost' && 'border border-line-strong bg-tile-grad text-ink-2 hover:text-ink-1',
        tone === 'primary' && 'on-lime bg-lime-grad text-lime-ink shadow-lime',
        tone === 'bare' && 'text-ink-4 hover:text-ink-1',
      )}
      style={{ width: size, height: size }}
    >
      <IconCmp size={Math.round(size * 0.47)} />
    </button>
  );
}

/* --------------------------------------------------------------- people --- */

export function Avatar({
  name,
  size = 30,
  square = false,
  toneIndex,
}: {
  name: string;
  size?: number;
  square?: boolean;
  toneIndex?: number;
}) {
  const trimmed = name.trim();
  const tone = AVATAR_TONES[toneIndex ?? (trimmed ? hashIndex(trimmed, AVATAR_TONES.length) : 5)]!;
  const parts = trimmed.split(/\s+/).filter(Boolean);
  const text =
    parts.length === 0
      ? '?'
      : parts.length === 1
        ? parts[0]!.slice(0, 2).toUpperCase()
        : (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();

  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center font-bold',
        square ? 'rounded-tile' : 'rounded-[3px]',
      )}
      style={{
        width: size,
        height: size,
        background: tone[0],
        color: tone[1],
        fontSize: Math.max(9, Math.round(size * 0.37)),
        letterSpacing: '0.2px',
      }}
    >
      {text}
    </span>
  );
}

/** A tinted icon square. The background is the icon colour at 16%, never grey. */
export function IconTile({
  icon: IconCmp,
  size = 30,
  tone = 'lime',
}: {
  icon: Icon;
  size?: number;
  tone?: Tone;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-tile',
        tone === 'lime' && 'bg-lime/[0.16] text-lime',
        tone === 'blue' && 'bg-status-blue/[0.16] text-status-blue',
        tone === 'rose' && 'bg-status-rose/[0.16] text-status-rose',
        tone === 'grey' && 'bg-status-grey/[0.16] text-status-grey',
      )}
      style={{ width: size, height: size }}
    >
      <IconCmp size={Math.round(size * 0.53)} />
    </span>
  );
}

/* --------------------------------------------------------------- inputs --- */

export function Toggle({
  checked,
  onChange,
  title,
  description,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-[9px]">
      <div className="min-w-0">
        <p className="text-[12.5px] font-semibold text-ink-1">{title}</p>
        {description && <p className="mt-[2px] text-[11px] text-ink-4">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={title}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-[23px] w-[40px] shrink-0 rounded-pill transition-colors duration-120',
          checked ? 'on-lime bg-lime-grad shadow-lime-sm' : 'bg-toggle-track',
        )}
      >
        <span
          className={cn(
            'absolute top-[3px] h-[17px] w-[17px] rounded-full transition-transform',
            checked ? 'bg-lime-ink' : 'bg-toggle-knob',
          )}
          style={{
            left: 3,
            transform: checked ? 'translateX(17px)' : 'none',
            transitionDuration: '140ms',
            transitionTimingFunction: 'cubic-bezier(.34,1.3,.64,1)',
          }}
        />
      </button>
    </div>
  );
}

let fieldSeq = 0;

export function Field({
  label,
  value,
  onChange,
  hint,
  placeholder,
  type = 'text',
  error,
  readOnly,
  multiline,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange?: (next: string) => void;
  hint?: string;
  placeholder?: string;
  type?: string;
  error?: string;
  readOnly?: boolean;
  multiline?: boolean;
  rows?: number;
}) {
  fieldSeq += 1;
  const id = `dash-field-${label.replace(/\W+/g, '-').toLowerCase()}`;
  const hintId = hint || error ? `${id}-hint` : undefined;
  const shared = cn(
    'w-full rounded-chip border bg-tile-grad px-3 text-[12.5px] text-ink-1 placeholder:text-ink-5',
    'focus:border-lime focus:outline-none focus:ring-2 focus:ring-lime/20',
    error ? 'border-status-rose' : 'border-line-strong',
    readOnly && 'cursor-default text-ink-3',
  );

  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-[6px] block text-[10.5px] font-semibold text-ink-3">
        {label}
      </label>
      {multiline ? (
        <textarea
          id={id}
          rows={rows}
          value={value}
          readOnly={readOnly}
          placeholder={placeholder}
          aria-invalid={error ? true : undefined}
          aria-describedby={hintId}
          onChange={(event) => onChange?.(event.target.value)}
          className={cn(shared, 'resize-y py-[9px] leading-[1.6]')}
        />
      ) : (
        <input
          id={id}
          type={type}
          value={value}
          readOnly={readOnly}
          placeholder={placeholder}
          aria-invalid={error ? true : undefined}
          aria-describedby={hintId}
          onChange={(event) => onChange?.(event.target.value)}
          className={cn(shared, 'h-[38px]')}
        />
      )}
      {(hint || error) && (
        <p
          id={hintId}
          className={cn('mt-[5px] text-[10.5px]', error ? 'text-status-rose' : 'text-ink-4')}
        >
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

export function SearchField({
  value,
  onChange,
  placeholder = 'Search',
  label,
  width,
  kbd,
  height = 34,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  /** The accessible name. Required — the icon is not a label. */
  label: string;
  width?: number | string;
  kbd?: string;
  height?: number;
}) {
  return (
    <div
      className="relative flex items-center"
      style={{ width: width ?? '100%', maxWidth: '100%' }}
    >
      <span className="pointer-events-none absolute left-[10px] text-ink-4">
        <Search size={13} />
      </span>
      <input
        type="search"
        value={value}
        aria-label={label}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        style={{ height }}
        className={cn(
          'w-full rounded-chip border border-line-strong bg-tile-grad pl-[30px] text-[12px] text-ink-1',
          'placeholder:text-ink-5 focus:border-lime focus:outline-none focus:ring-2 focus:ring-lime/20',
          kbd ? 'pr-[38px]' : 'pr-3',
        )}
      />
      {kbd && (
        <kbd className="pointer-events-none absolute right-[8px] rounded-[3px] border border-line-strong bg-tile px-[5px] py-[1px] text-[9.5px] font-semibold text-ink-3">
          {kbd}
        </kbd>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------- data --- */

/**
 * The KPI card. With `to` the whole card becomes a link and grows an arrow —
 * a card that navigates should say so before it is clicked.
 */
export function Kpi({
  label,
  value,
  delta,
  deltaDown,
  sub,
  to,
}: {
  label: string;
  value: string;
  delta?: string;
  deltaDown?: boolean;
  sub?: string;
  to?: string;
}) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="dash-eyebrow truncate">{label}</span>
        {to && (
          <span className="text-ink-4 transition group-hover:text-lime">
            <ArrowRight size={13} />
          </span>
        )}
      </div>
      <p className="dash-metric mt-[12px] truncate" title={value}>
        {value}
      </p>
      <div className="mt-[7px] flex items-center gap-[7px]">
        {delta && <DeltaChip value={delta} down={deltaDown} />}
        {sub && <span className="truncate text-[11.5px] text-ink-4">{sub}</span>}
      </div>
    </>
  );

  const shell =
    'group flex flex-col rounded-card border border-line bg-panel-grad px-[18px] py-4 shadow-card';

  return to ? (
    <Link to={to} className={cn(shell, 'transition hover:border-line-strong')}>
      {body}
    </Link>
  ) : (
    <div className={shell}>{body}</div>
  );
}

/** Orders-page filter card. Active gets a lime ring rather than a lime fill. */
export function StatCard({
  label,
  value,
  tone,
  icon,
  active,
  onClick,
}: {
  label: string;
  value: number | string;
  tone: Tone;
  icon: Icon;
  active?: boolean;
  onClick?: () => void;
}) {
  const inner = (
    <>
      <IconTile icon={icon} tone={tone} size={30} />
      <div className="min-w-0 text-left">
        <p className="dash-metric-sm">{value}</p>
        <p className="mt-[1px] truncate text-[10.5px] font-semibold text-ink-4">{label}</p>
      </div>
    </>
  );

  const shell = cn(
    'flex w-full items-center gap-[11px] rounded-card border bg-panel-grad p-[14px] shadow-card-sm transition duration-120',
    active ? 'border-transparent shadow-[0_0_0_1px_theme(colors.lime.DEFAULT)]' : 'border-line',
  );

  if (!onClick) return <div className={shell}>{inner}</div>;
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={shell}>
      {inner}
    </button>
  );
}

/** The universal list row: mark, name, grey sub-line, right-aligned value. */
export function Row({
  left,
  name,
  sub,
  value,
  valueSub,
  to,
}: {
  left?: ReactNode;
  name: string;
  sub?: string;
  value?: string;
  valueSub?: string;
  to?: string;
}) {
  const body = (
    <>
      {left}
      <span className="min-w-0 flex-1 text-left">
        <span className="block truncate text-[12.5px] font-semibold text-ink-1" title={name}>
          {name}
        </span>
        {sub && <span className="mt-[1px] block truncate text-[10.5px] text-ink-4">{sub}</span>}
      </span>
      {value && (
        <span className="shrink-0 text-right">
          <span className="block text-[12.5px] font-bold text-ink-1">{value}</span>
          {valueSub && <span className="mt-[1px] block text-[10px] text-ink-4">{valueSub}</span>}
        </span>
      )}
    </>
  );

  const shell = 'flex w-full items-center gap-[10px] py-[9px]';
  return to ? (
    <Link to={to} className={cn(shell, 'rounded-chip transition hover:bg-white/[0.025]')}>
      {body}
    </Link>
  ) : (
    <div className={shell}>{body}</div>
  );
}

/** Horizontal bar: a label, a value and a thin progress rule. */
export function Bar({
  label,
  value,
  pct,
  colour,
  active = true,
  onClick,
  pressed,
}: {
  label: string;
  value: string;
  pct: number;
  colour?: string;
  active?: boolean;
  onClick?: () => void;
  pressed?: boolean;
}) {
  const body = (
    <>
      <div className="mb-[6px] flex items-baseline justify-between gap-3">
        <span className="truncate text-[12px] text-ink-2">{label}</span>
        <span className="shrink-0 tabular-nums text-[12px] text-ink-1">{value}</span>
      </div>
      <div className="h-[3px] w-full overflow-hidden rounded-[2px] bg-tile-track">
        <div
          className="h-full rounded-[2px] transition-[width] duration-300"
          style={{
            width: `${Math.max(0, Math.min(100, pct))}%`,
            background: colour ?? '#c9a96e',
            opacity: active ? 1 : 0.35,
          }}
        />
      </div>
    </>
  );

  if (!onClick) return <div className="w-full">{body}</div>;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      className="w-full rounded-chip text-left transition hover:brightness-110"
    >
      {body}
    </button>
  );
}

/** Segments are separated with a 3px gap — one welded strip loses the parts. */
export function StackedBar({
  segments,
}: {
  segments: { label: string; pct: number; colour: string; dim?: boolean }[];
}) {
  return (
    <div className="flex h-[12px] w-full gap-[3px]">
      {segments.map((segment) => (
        <div
          key={segment.label}
          className="h-full rounded-[2px] transition-[opacity,width] duration-200"
          style={{
            width: `${segment.pct}%`,
            background: segment.colour,
            opacity: segment.dim ? 0.28 : 1,
          }}
        />
      ))}
    </div>
  );
}

/* --------------------------------------------------------------- states --- */

export function EmptyState({
  icon: IconCmp,
  title,
  body,
  cta,
}: {
  icon: Icon;
  title: string;
  body: string;
  cta?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
      <span className="inline-flex h-[46px] w-[46px] items-center justify-center rounded-tile bg-tile text-ink-5">
        <IconCmp size={22} />
      </span>
      <p className="mt-[14px] text-[13.5px] font-bold text-ink-2">{title}</p>
      <p className="mt-[5px] max-w-[280px] text-[11.5px] text-ink-4">{body}</p>
      {cta && <div className="mt-[14px]">{cta}</div>}
    </div>
  );
}

export function Skeleton({
  width = '100%',
  height = 14,
  className,
}: {
  width?: number | string;
  height?: number;
  className?: string;
}) {
  return <div className={cn('dash-skeleton', className)} style={{ width, height }} />;
}

/** Card-level error. Other cards keep rendering — never blank the page. */
export function ErrorCard({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-card border border-alert-line bg-alert-grad p-4 shadow-card-sm">
      <p className="text-[12.5px] font-semibold text-alert-text">{message}</p>
      {onRetry && (
        <Button className="mt-3" size="sm" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}

/**
 * The SAMPLE DATA chip. Every page carries one until its numbers are real —
 * an unlabelled mock figure eventually gets quoted at someone as fact.
 */
export function SampleChip() {
  return (
    <span className="text-[12px] text-ink-4">Sample data</span>
  );
}

/** Marks a page (or card) whose figures come from Supabase, not the mock set. */
export function LiveChip() {
  return (
    <span className="inline-flex items-center gap-[6px] text-[12px] text-ink-4">
      <span className="h-[6px] w-[6px] rounded-full bg-lime" aria-hidden="true" />
      Live
    </span>
  );
}
