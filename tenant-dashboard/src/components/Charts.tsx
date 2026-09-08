import { useMemo, useState } from 'react';

/**
 * Small SVG chart primitives.
 *
 * Hand-rolled rather than pulling in a charting library: the dashboard has a
 * deliberately tiny dependency list, and these three shapes cover everything
 * the monitoring pages need.
 */

// ─── Sparkline ───────────────────────────────────────────────────────────────

interface SparklineProps {
  values: number[];
  className?: string;
  width?: number;
  height?: number;
  /** Tailwind stroke colour class, e.g. `stroke-indigo-500`. */
  stroke?: string;
}

export function Sparkline({
  values,
  width = 100,
  height = 28,
  stroke = 'stroke-indigo-500',
  className = '',
}: SparklineProps) {
  const path = useMemo(() => buildPath(values, width, height), [values, width, height]);

  if (values.length < 2) {
    return <div className={`h-[${height}px] ${className}`} />;
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      role="img"
      aria-label="Trend sparkline"
      preserveAspectRatio="none"
    >
      <path d={path} fill="none" className={stroke} strokeWidth={1.5} strokeLinejoin="round" />
    </svg>
  );
}

function buildPath(values: number[], width: number, height: number): string {
  if (values.length < 2) return '';
  const max = Math.max(...values);
  const min = Math.min(...values);
  // A flat series would divide by zero; draw it down the middle instead.
  const span = max - min || 1;
  const step = width / (values.length - 1);
  const pad = 2;
  const usable = height - pad * 2;

  return values
    .map((v, i) => {
      const x = i * step;
      const y = pad + usable - ((v - min) / span) * usable;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
}

// ─── Trend chart ─────────────────────────────────────────────────────────────

export interface TrendSeries {
  key: string;
  label: string;
  /** CSS colour, used for both the stroke and the legend swatch. */
  color: string;
  values: number[];
}

interface TrendChartProps {
  labels: string[];
  series: TrendSeries[];
  height?: number;
  /** Formats the value shown in the hover readout. */
  format?: (value: number) => string;
}

/**
 * Multi-series line chart with a shared crosshair readout.
 *
 * Uses a normalised 0-100 viewBox with `preserveAspectRatio="none"` so it
 * stretches to whatever width the grid gives it without any measurement.
 */
export function TrendChart({
  labels,
  series,
  height = 200,
  format = (v) => v.toLocaleString(),
}: TrendChartProps) {
  const [hover, setHover] = useState<number | null>(null);

  const max = useMemo(() => {
    const all = series.flatMap((s) => s.values);
    return Math.max(1, ...all);
  }, [series]);

  if (!labels.length) {
    return (
      <div className="flex items-center justify-center text-sm text-slate-400" style={{ height }}>
        No data for this range
      </div>
    );
  }

  const points = labels.length;
  const xAt = (i: number) => (points === 1 ? 50 : (i / (points - 1)) * 100);
  const yAt = (v: number) => 100 - (v / max) * 96 - 2;

  return (
    <div className="w-full">
      <div className="relative" style={{ height }}>
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="h-full w-full overflow-visible"
          onMouseLeave={() => setHover(null)}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const ratio = (e.clientX - rect.left) / rect.width;
            setHover(Math.max(0, Math.min(points - 1, Math.round(ratio * (points - 1)))));
          }}
          role="img"
          aria-label="Trend chart"
        >
          {/* Horizontal guides at 0 / 50 / 100% of max */}
          {[0, 50, 100].map((pct) => (
            <line
              key={pct}
              x1={0}
              x2={100}
              y1={yAt((max * pct) / 100)}
              y2={yAt((max * pct) / 100)}
              className="stroke-slate-200 dark:stroke-slate-700"
              strokeWidth={0.3}
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {series.map((s) => (
            <polyline
              key={s.key}
              points={s.values.map((v, i) => `${xAt(i)},${yAt(v)}`).join(' ')}
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {hover !== null && (
            <line
              x1={xAt(hover)}
              x2={xAt(hover)}
              y1={0}
              y2={100}
              className="stroke-slate-400 dark:stroke-slate-500"
              strokeWidth={1}
              strokeDasharray="3 3"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>

        {/* Y-axis max, floated over the plot so the SVG stays unscaled */}
        <span className="pointer-events-none absolute left-0 top-0 text-[10px] font-medium text-slate-400">
          {format(max)}
        </span>
      </div>

      {/* X-axis: first, middle and last label only — enough to orient without crowding */}
      <div className="mt-1 flex justify-between text-[10px] text-slate-400">
        <span>{labels[0]}</span>
        {points > 2 && <span>{labels[Math.floor(points / 2)]}</span>}
        <span>{labels[points - 1]}</span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
        {series.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {s.label}
            </span>
            {hover !== null && (
              <span className="text-[11px] font-bold tabular-nums text-slate-700 dark:text-slate-200">
                {format(s.values[hover] ?? 0)}
              </span>
            )}
          </div>
        ))}
        {hover !== null && (
          <span className="ml-auto text-[11px] font-medium text-slate-400">{labels[hover]}</span>
        )}
      </div>
    </div>
  );
}

// ─── Quota bar ───────────────────────────────────────────────────────────────

interface QuotaBarProps {
  label: string;
  used: number;
  limit: number;
  pct: number | null;
  exceeded: boolean;
  /** Rendered after the used/limit numbers, e.g. "MB". */
  unit?: string;
}

export function QuotaBar({ label, used, limit, pct, exceeded, unit }: QuotaBarProps) {
  // A tenant can be over 100%; the bar clamps but the number does not.
  const width = pct === null ? 0 : Math.min(100, pct);
  const tone = exceeded
    ? 'bg-red-500'
    : pct !== null && pct >= 80
      ? 'bg-amber-500'
      : 'bg-emerald-500';

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{label}</span>
        <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
          <span className={exceeded ? 'font-bold text-red-600 dark:text-red-400' : 'font-semibold'}>
            {used.toLocaleString()}
          </span>
          {' / '}
          {limit > 0 ? limit.toLocaleString() : '∞'}
          {unit ? ` ${unit}` : ''}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className={`h-full rounded-full transition-all duration-500 ${tone}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

// ─── Stacked share bar ───────────────────────────────────────────────────────

export interface ShareSegment {
  label: string;
  value: number;
  color: string;
}

/** Horizontal stacked bar with a legend — used for the order-origin split. */
export function ShareBar({ segments }: { segments: ShareSegment[] }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);

  if (total === 0) {
    return <p className="text-xs text-slate-400">No orders recorded yet</p>;
  }

  return (
    <div>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        {segments
          .filter((s) => s.value > 0)
          .map((s) => (
            <div
              key={s.label}
              className="h-full transition-all duration-700"
              style={{
                width: `${(s.value / total) * 100}%`,
                backgroundColor: s.color,
              }}
              title={`${s.label}: ${s.value.toLocaleString()}`}
            />
          ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="text-[11px] text-slate-500 dark:text-slate-400">{s.label}</span>
            <span className="text-[11px] font-semibold tabular-nums text-slate-700 dark:text-slate-200">
              {s.value.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-400">
              {Math.round((s.value / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
