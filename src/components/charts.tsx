"use client";

import { useId, useState, type ReactNode } from "react";

/**
 * Charts for the command centre and performance views.
 * Single-series forms only (no dual axes); values and labels use text ink, the bar/line carries identity;
 * every chart has a hover read-out and a "View as table" alternative.
 */

function TableToggle({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} className="text-xs font-semibold text-brand hover:underline no-print">
      {open ? "View as chart" : "View as table"}
    </button>
  );
}

function DataTable({ rows, head }: { rows: ReactNode[][]; head: string[] }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>{head.map((h) => <th key={h}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export type BarDatum = { label: string; value: number; display?: string; sub?: string };

export function BarList({
  data,
  max,
  title,
  valueLabel = "Value",
  color = "var(--chart-1)",
  empty = "No data yet.",
}: {
  data: BarDatum[];
  max?: number;
  title: string;
  valueLabel?: string;
  color?: string;
  empty?: string;
}) {
  const [table, setTable] = useState(false);
  const [hover, setHover] = useState<number | null>(null);
  const top = max ?? Math.max(1, ...data.map((d) => d.value));
  if (!data.length) return <p className="text-sm text-muted py-6 text-center">{empty}</p>;
  return (
    <div>
      <div className="flex justify-end mb-2">
        <TableToggle open={table} onToggle={() => setTable(!table)} />
      </div>
      {table ? (
        <DataTable head={["Item", valueLabel]} rows={data.map((d) => [d.label, d.display ?? d.value])} />
      ) : (
        <ul className="space-y-2.5" role="img" aria-label={`${title}: ${data.map((d) => `${d.label} ${d.display ?? d.value}`).join(", ")}`}>
          {data.map((d, i) => (
            <li
              key={d.label}
              className="grid grid-cols-[minmax(0,9rem)_1fr_auto] sm:grid-cols-[minmax(0,13rem)_1fr_auto] items-center gap-3 rounded-md px-1 -mx-1 py-0.5"
              style={{ background: hover === i ? "var(--surface-2)" : undefined }}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              title={`${d.label}: ${d.display ?? d.value}${d.sub ? ` (${d.sub})` : ""}`}
            >
              <span className="text-sm text-ink-2 truncate">{d.label}</span>
              <span className="h-3 rounded-[4px] bg-surface-2 overflow-hidden" aria-hidden>
                <span
                  className="block h-full rounded-r-[4px] transition-[width] duration-500"
                  style={{ width: `${Math.max(d.value > 0 ? 2 : 0, (d.value / top) * 100)}%`, background: color, opacity: hover === null || hover === i ? 1 : 0.55 }}
                />
              </span>
              <span className="text-sm font-semibold text-ink tabular-nums text-right min-w-[3.5rem]">
                {d.display ?? d.value}
                {d.sub && <span className="block text-[0.7rem] font-normal text-muted">{d.sub}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export type Point = { x: string; y: number | null };

export function TrendChart({
  points,
  title,
  yMax = 100,
  unit = "%",
  color = "var(--chart-1)",
  height = 180,
}: {
  points: Point[];
  title: string;
  yMax?: number;
  unit?: string;
  color?: string;
  height?: number;
}) {
  const [table, setTable] = useState(false);
  const [hover, setHover] = useState<number | null>(null);
  const clip = useId();
  const W = 640;
  const H = height;
  const pad = { l: 36, r: 12, t: 12, b: 26 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const n = points.length;
  const x = (i: number) => pad.l + (n <= 1 ? iw / 2 : (i / (n - 1)) * iw);
  const y = (v: number) => pad.t + ih - (v / yMax) * ih;
  const defined = points.map((p, i) => ({ ...p, i })).filter((p) => p.y != null) as { x: string; y: number; i: number }[];
  const d = defined.map((p, k) => `${k === 0 ? "M" : "L"}${x(p.i).toFixed(1)},${y(p.y).toFixed(1)}`).join(" ");
  const ticks = [0, yMax / 2, yMax];
  const labelEvery = Math.max(1, Math.ceil(n / 7));
  if (!defined.length) return <p className="text-sm text-muted py-6 text-center">No data for this period.</p>;
  const hv = hover != null ? points[hover] : null;
  return (
    <div>
      <div className="flex justify-between items-center mb-1 min-h-5">
        <p className="text-xs text-muted" aria-live="polite">
          {hv ? (
            <>
              <span className="font-semibold text-ink">{hv.x}</span>: {hv.y == null ? "no data" : `${hv.y}${unit}`}
            </>
          ) : (
            "Hover the chart to read values"
          )}
        </p>
        <TableToggle open={table} onToggle={() => setTable(!table)} />
      </div>
      {table ? (
        <DataTable head={["Date", "Value"]} rows={points.map((p) => [p.x, p.y == null ? "—" : `${p.y}${unit}`])} />
      ) : (
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto"
          role="img"
          aria-label={`${title}. ${defined.map((p) => `${p.x}: ${p.y}${unit}`).join("; ")}`}
          onMouseLeave={() => setHover(null)}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const px = ((e.clientX - rect.left) / rect.width) * W;
            const i = Math.round(((px - pad.l) / iw) * (n - 1));
            setHover(Math.min(n - 1, Math.max(0, i)));
          }}
        >
          <defs>
            <clipPath id={clip}>
              <rect x={pad.l} y={pad.t - 4} width={iw} height={ih + 8} />
            </clipPath>
          </defs>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="var(--grid)" strokeWidth={1} />
              <text x={pad.l - 6} y={y(t) + 4} textAnchor="end" fontSize="10" fill="var(--muted)">
                {t}
                {unit}
              </text>
            </g>
          ))}
          {points.map((p, i) =>
            i % labelEvery === 0 || i === n - 1 ? (
              <text key={p.x} x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--muted)">
                {p.x}
              </text>
            ) : null,
          )}
          <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" clipPath={`url(#${clip})`} />
          {hover != null && (
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={pad.t + ih} stroke="var(--muted)" strokeWidth={1} strokeDasharray="3 3" />
          )}
          {defined.map((p) => (
            <circle key={p.i} cx={x(p.i)} cy={y(p.y)} r={hover === p.i ? 5 : 3} fill={color} stroke="var(--surface)" strokeWidth={2} />
          ))}
        </svg>
      )}
    </div>
  );
}
