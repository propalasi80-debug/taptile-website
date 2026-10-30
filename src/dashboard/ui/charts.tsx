/**
 * Charts (handoff §12).
 *
 * Hand-rolled SVG rather than a charting library. The handoff names Recharts,
 * but §12 specifies the output at the level of gradient stops, stroke caps and
 * `vector-effect` — at that precision a library is something to fight rather
 * than use, and these five shapes are a few hundred lines of SVG. It also
 * keeps ~100kB out of a bundle already past the size warning.
 *
 * Every chart is `role="img"` with a summarising label plus a visually hidden
 * table of the underlying values, so the data is not locked inside a picture.
 */

import { useId } from 'react';
import { CHART } from '../lib/chart';
import { cn } from '../lib/cn';

/** The values behind a chart, for screen readers. §13. */
function DataTableFallback({
  caption,
  labels,
  values,
}: {
  caption: string;
  labels: string[];
  values: (string | number)[];
}) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <tbody>
        {values.map((value, index) => (
          <tr key={index}>
            <th scope="row">{labels[index] ?? String(index + 1)}</th>
            <td>{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ----------------------------------------------------------------- area --- */

export function AreaChart({
  data,
  labels,
  height = 180,
  ariaLabel,
  formatValue = (v) => String(v),
  /** Index of a dotted vertical event marker, e.g. "pre-orders opened". */
  marker,
  markerLabel,
  /** A horizontal dashed target line, in data units. */
  target,
  targetLabel,
}: {
  data: number[];
  labels: string[];
  height?: number;
  ariaLabel: string;
  formatValue?: (value: number) => string;
  marker?: number;
  markerLabel?: string;
  target?: number;
  targetLabel?: string;
}) {
  const uid = useId().replace(/:/g, '');
  const W = 1000;
  const H = 300;

  const max = Math.max(...data, target ?? 0, 1);
  const stepX = data.length > 1 ? W / (data.length - 1) : W;
  const y = (value: number) => H - (value / max) * (H - 18) - 6;
  const points = data.map((value, index) => [index * stepX, y(value)] as const);

  const line = points.map(([px, py]) => `${px.toFixed(1)},${py.toFixed(1)}`).join(' ');
  const area = `${line} ${W},${H} 0,${H}`;
  const last = points[points.length - 1];

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-[11.5px] text-ink-4"
        style={{ height }}
      >
        No data for this period
      </div>
    );
  }

  return (
    <figure className="m-0">
      <div className="relative w-full" style={{ height }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="h-full w-full"
          role="img"
          aria-label={ariaLabel}
        >
          <defs>
            <linearGradient id={`fill-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART.emeraldMid} stopOpacity="0.55" />
              <stop offset="52%" stopColor={CHART.emerald} stopOpacity="0.2" />
              <stop offset="100%" stopColor={CHART.emerald} stopOpacity="0" />
            </linearGradient>
            <linearGradient id={`stroke-${uid}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={CHART.emerald} />
              <stop offset="55%" stopColor={CHART.emeraldMid} />
              <stop offset="100%" stopColor={CHART.lime} />
            </linearGradient>
          </defs>

          {[0.25, 0.5, 0.75].map((fraction) => (
            <line
              key={fraction}
              x1="0"
              x2={W}
              y1={H * fraction}
              y2={H * fraction}
              stroke={CHART.grid}
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {target !== undefined && (
            <line
              x1="0"
              x2={W}
              y1={y(target)}
              y2={y(target)}
              stroke={CHART.lime}
              strokeWidth="1.5"
              strokeDasharray="5 4"
              opacity="0.55"
              vectorEffect="non-scaling-stroke"
            />
          )}

          <polygon points={area} fill={`url(#fill-${uid})`} />
          <polyline
            points={line}
            fill="none"
            stroke={`url(#stroke-${uid})`}
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />

          {marker !== undefined && points[marker] && (
            <line
              x1={points[marker]![0]}
              x2={points[marker]![0]}
              y1="0"
              y2={H}
              stroke={CHART.axis}
              strokeWidth="1"
              strokeDasharray="3 3"
              vectorEffect="non-scaling-stroke"
            />
          )}

          {last && (
            <>
              <circle cx={last[0]} cy={last[1]} r="10" fill={CHART.lime} opacity="0.16" />
              <circle cx={last[0]} cy={last[1]} r="3.6" fill={CHART.lime} />
            </>
          )}
        </svg>

        {marker !== undefined && markerLabel && (
          <span
            className="pointer-events-none absolute top-0 -translate-x-1/2 whitespace-nowrap text-[9.5px] font-semibold text-ink-4"
            style={{ left: `${((marker * stepX) / W) * 100}%` }}
          >
            {markerLabel}
          </span>
        )}
        {target !== undefined && targetLabel && (
          <span
            className="pointer-events-none absolute right-0 -translate-y-1/2 text-[9.5px] font-bold text-lime"
            style={{ top: `${(y(target) / H) * 100}%` }}
          >
            {targetLabel}
          </span>
        )}
      </div>

      <div className="mt-[9px] flex justify-between text-[9.5px] font-semibold text-ink-4">
        {labels.map((label, index) => (
          <span key={`${label}-${index}`}>{label}</span>
        ))}
      </div>

      <DataTableFallback caption={ariaLabel} labels={labels} values={data.map(formatValue)} />
    </figure>
  );
}

/* ---------------------------------------------------------------- donut --- */

export function Donut({
  segments,
  centerValue,
  centerLabel,
  size = 136,
  stroke = 18,
  ariaLabel,
}: {
  segments: { label: string; value: number; colour?: string }[];
  centerValue: string;
  centerLabel: string;
  size?: number;
  stroke?: number;
  ariaLabel: string;
}) {
  const uid = useId().replace(/:/g, '');
  const radius = (size - stroke) / 2 - 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((sum, segment) => sum + segment.value, 0) || 1;

  let offset = 0;

  return (
    <figure className="m-0 flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} role="img" aria-label={ariaLabel}>
          <defs>
            <linearGradient id={`lead-${uid}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={CHART.limeLight} />
              <stop offset="100%" stopColor={CHART.emeraldMid} />
            </linearGradient>
          </defs>
          <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={CHART.track}
              strokeWidth={stroke}
            />
            {segments.map((segment, index) => {
              const length = (segment.value / total) * circumference;
              const dash = `${length} ${circumference - length}`;
              const element = (
                <circle
                  key={segment.label}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={index === 0 ? `url(#lead-${uid})` : (segment.colour ?? CHART.series[index % CHART.series.length])}
                  strokeWidth={stroke}
                  strokeDasharray={dash}
                  strokeDashoffset={-offset}
                  strokeLinecap={index === 0 ? 'round' : 'butt'}
                />
              );
              offset += length;
              return element;
            })}
          </g>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-extrabold text-ink-1"
            style={{ fontSize: size * 0.195, letterSpacing: '-1.4px' }}
          >
            {centerValue}
          </span>
          <span className="mt-[1px] text-[9.5px] font-semibold uppercase tracking-[1.1px] text-ink-4">
            {centerLabel}
          </span>
        </div>
      </div>
      <DataTableFallback
        caption={ariaLabel}
        labels={segments.map((segment) => segment.label)}
        values={segments.map((segment) => segment.value)}
      />
    </figure>
  );
}

/* ----------------------------------------------------------------- ring --- */

export function Ring({
  pct,
  size = 146,
  stroke = 13,
  label,
  sub,
  ariaLabel,
}: {
  pct: number;
  size?: number;
  stroke?: number;
  label: string;
  sub?: string;
  ariaLabel: string;
}) {
  const uid = useId().replace(/:/g, '');
  const radius = (size - stroke) / 2 - 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, pct));

  // The glow goes on the progress stroke, never on the <svg>. A drop-shadow on
  // the root halos everything inside it, grey track included, which lights up
  // the whole circle instead of the arc and reads as glare.
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} role="img" aria-label={ariaLabel}>
        <defs>
          <linearGradient id={`ring-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={CHART.limeLight} />
            <stop offset="100%" stopColor={CHART.emerald} />
          </linearGradient>
        </defs>
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={CHART.track}
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={`url(#ring-${uid})`}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${circumference * clamped} ${circumference}`}
            className="transition-[stroke-dasharray] duration-500"
            style={{ filter: 'drop-shadow(0 0 10px rgba(201,169,110,0.35))' }}
          />
        </g>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-extrabold text-ink-1"
          style={{ fontSize: size * 0.21, letterSpacing: '-1.4px' }}
        >
          {label}
        </span>
        {sub && (
          <span className="mt-[1px] text-[9.5px] font-semibold uppercase tracking-[1.1px] text-ink-4">
            {sub}
          </span>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ sparkline --- */

export function Sparkline({
  data,
  width = 224,
  height = 42,
  ariaLabel,
}: {
  data: number[];
  width?: number;
  height?: number;
  ariaLabel: string;
}) {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const span = max - min || 1;
  const stepX = width / (data.length - 1);
  const points = data
    .map((value, index) => {
      const px = index * stepX;
      const py = height - 5 - ((value - min) / span) * (height - 10);
      return `${px.toFixed(1)},${py.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={ariaLabel}
    >
      <polyline
        points={points}
        fill="none"
        stroke={CHART.limeMid}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/* ------------------------------------------------------------ v. column --- */

/** Vertical bars. The highlighted column glows rather than changing hue. */
export function ColumnChart({
  data,
  labels,
  height = 150,
  highlight,
  ariaLabel,
  formatValue = (v) => String(v),
}: {
  data: number[];
  labels: string[];
  height?: number;
  highlight?: number;
  ariaLabel: string;
  formatValue?: (value: number) => string;
}) {
  const max = Math.max(...data, 1);

  return (
    <figure className="m-0">
      <div className="flex items-end gap-[6px]" style={{ height }} role="img" aria-label={ariaLabel}>
        {data.map((value, index) => (
          <div key={index} className="flex h-full flex-1 items-end">
            <div
              className={cn('w-full rounded-t-[7px] rounded-b-[3px] transition-[height] duration-300')}
              style={{
                height: `${Math.max(2, (value / max) * 100)}%`,
                background:
                  index === highlight
                    ? 'linear-gradient(180deg,#e7d3a3,#b08d4f)'
                    : CHART.track,
                filter:
                  index === highlight
                    ? 'drop-shadow(0 0 18px rgba(201,169,110,0.28))'
                    : undefined,
              }}
            />
          </div>
        ))}
      </div>
      <div className="mt-[9px] flex gap-[6px] text-[9.5px] font-semibold text-ink-4">
        {labels.map((label, index) => (
          <span key={`${label}-${index}`} className="flex-1 text-center">
            {label}
          </span>
        ))}
      </div>
      <DataTableFallback caption={ariaLabel} labels={labels} values={data.map(formatValue)} />
    </figure>
  );
}

/** Descending line with labelled points — the cost-per-unit-by-run-size chart. */
export function LinePlot({
  data,
  labels,
  height = 150,
  highlight,
  ariaLabel,
  formatValue = (v) => String(v),
}: {
  data: number[];
  labels: string[];
  height?: number;
  highlight?: number;
  ariaLabel: string;
  formatValue?: (value: number) => string;
}) {
  const W = 1000;
  const H = 300;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const span = max - min || 1;
  const stepX = data.length > 1 ? W / (data.length - 1) : W;
  const y = (value: number) => H - 20 - ((value - min) / span) * (H - 50);
  const points = data.map((value, index) => [index * stepX, y(value)] as const);

  return (
    <figure className="m-0">
      <div style={{ height }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="h-full w-full"
          role="img"
          aria-label={ariaLabel}
        >
          {[0.25, 0.5, 0.75].map((fraction) => (
            <line
              key={fraction}
              x1="0"
              x2={W}
              y1={H * fraction}
              y2={H * fraction}
              stroke={CHART.grid}
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          <polyline
            points={points.map(([px, py]) => `${px},${py}`).join(' ')}
            fill="none"
            stroke={CHART.limeMid}
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          {points.map(([px, py], index) => (
            <circle
              key={index}
              cx={px}
              cy={py}
              r={index === highlight ? 7 : 4.5}
              fill={index === highlight ? CHART.lime : CHART.track}
              stroke={CHART.limeMid}
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
      </div>
      <div className="mt-[9px] flex justify-between text-[9.5px] font-semibold text-ink-4">
        {labels.map((label, index) => (
          <span key={`${label}-${index}`}>{label}</span>
        ))}
      </div>
      <DataTableFallback caption={ariaLabel} labels={labels} values={data.map(formatValue)} />
    </figure>
  );
}
