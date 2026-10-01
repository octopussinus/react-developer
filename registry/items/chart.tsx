import { useId, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { cn } from '@/lib/cn';

/**
 * Chart — a molecule. Composes atoms and carries no domain knowledge.
 *
 * The visual rules here are not preferences; they are the ones that make a
 * chart readable, and each is load-bearing:
 *
 *  - Series colours come from `--chart-1..5` in FIXED ORDER, never cycled. The
 *    palette passed the computable colourblind-separation checks only in that
 *    order, so a 6th series folds into "Other" rather than inventing a hue.
 *  - A legend is always present for 2+ series; a single series has none (the
 *    title already names it).
 *  - A TABLE VIEW is mandatory, not a nicety: three light-mode hues sit below
 *    3:1 contrast on the surface, and the table is the documented relief.
 *  - Text never wears the series colour — identity comes from the swatch beside
 *    it. Light hues like yellow and aqua are illegible as text.
 *  - One y-axis. Never two. Two measures of different scale = two charts.
 */

export interface ChartSeries {
  /** Key in each datum. */
  key: string;
  /** Human label for legend, tooltip and table header. */
  label: string;
}

export interface ChartProps<T extends Record<string, unknown>> {
  data: readonly T[];
  series: readonly ChartSeries[];
  /** Key holding the category / time value for the x axis. */
  xKey: keyof T & string;
  type?: 'line' | 'bar' | 'area';
  /** Accessible description of what the chart shows. Required — it is the alt text. */
  title: string;
  height?: number;
  /** Formats y-axis ticks, tooltip values and table cells. */
  formatValue?: (value: number) => string;
  className?: string;
}

const MAX_SERIES = 5;

/** Fixed order. Index 0 is always chart-1. */
const SERIES_COLORS = [
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
  'var(--color-chart-4)',
  'var(--color-chart-5)',
] as const;

const defaultFormat = (value: number) => value.toLocaleString();

export function Chart<T extends Record<string, unknown>>({
  data,
  series,
  xKey,
  type = 'line',
  title,
  height = 280,
  formatValue = defaultFormat,
  className,
}: ChartProps<T>) {
  const [showTable, setShowTable] = useState(false);
  const tableId = useId();

  if (series.length > MAX_SERIES) {
    throw new Error(
      `Chart supports ${MAX_SERIES} series; got ${series.length}. ` +
        'Fold the remainder into an "Other" series or use small multiples — ' +
        'past five, the palette can no longer guarantee colourblind separation.',
    );
  }

  /*
   * recharts types `dataKey` as `TypedDataKey<DataPointType, DataValueType>`
   * (recharts/types/util/typedDataKey.d.ts). That type is a conditional with
   * three branches; the first two resolve to the loose `string | number | fn`,
   * the third to a mapped type over `keyof DataPointType`.
   *
   * Passing `keyof T & string` makes TS infer `DataPointType = T`. Because T is
   * an unresolved generic, the conditional cannot be evaluated, so it stays
   * deferred and nothing is assignable to it -- hence TS2322.
   *
   * Handing it a plain `string` instead lets `DataPointType` fall back to its
   * default, which takes the loose branch. The public `xKey` prop stays
   * `keyof T & string`, so callers still get key checking and autocomplete;
   * only the value crossing into recharts is widened. No cast, no ts-ignore.
   */
  const xDataKey: string = xKey;
  const rows = useMemo(() => [...data], [data]);

  const coloured = useMemo(
    () => series.map((s, i) => ({ ...s, color: SERIES_COLORS[i] ?? SERIES_COLORS[0] })),
    [series],
  );

  const axisProps = {
    stroke: 'var(--color-border)',
    tick: { fill: 'var(--color-muted-foreground)', fontSize: 12 },
    tickLine: false,
  } as const;

  /* Recessive: hairline, solid, never dashed, horizontal only. */
  const grid = <CartesianGrid stroke="var(--color-border)" strokeWidth={1} vertical={false} />;

  const tooltip = (
    <Tooltip
      formatter={(value) => formatValue(Number(value))}
      contentStyle={{
        background: 'var(--color-popover)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        color: 'var(--color-popover-foreground)',
        fontSize: 12,
      }}
    />
  );

  /* Legend for 2+ series only; a single series is named by the title. */
  const legend =
    coloured.length > 1 ? (
      <Legend
        verticalAlign="bottom"
        height={28}
        formatter={(value) => (
          <span style={{ color: 'var(--color-muted-foreground)', fontSize: 12 }}>{value}</span>
        )}
      />
    ) : null;

  return (
    <figure className={cn('rounded-lg border border-border bg-card p-4', className)}>
      <figcaption className="mb-3 flex items-center justify-between gap-4">
        <span className="text-sm font-medium text-card-foreground">{title}</span>
        <button
          type="button"
          onClick={() => setShowTable((open) => !open)}
          aria-expanded={showTable}
          aria-controls={tableId}
          className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        >
          {showTable ? 'Show chart' : 'Show table'}
        </button>
      </figcaption>

      {showTable ? (
        <DataTableView
          id={tableId}
          data={data}
          series={coloured}
          xKey={xKey}
          formatValue={formatValue}
        />
      ) : (
        <div style={{ height }} role="img" aria-label={title}>
          <ResponsiveContainer width="100%" height="100%">
            {type === 'bar' ? (
              <BarChart data={rows} barGap={2} barCategoryGap="20%">
                {grid}
                <XAxis dataKey={xDataKey} {...axisProps} />
                <YAxis tickFormatter={(v: number) => formatValue(v)} {...axisProps} />
                {tooltip}
                {legend}
                {coloured.map((s) => (
                  /* <=24px thick, 4px rounded cap, square at the baseline. */
                  <Bar
                    key={s.key}
                    dataKey={s.key}
                    name={s.label}
                    fill={s.color}
                    maxBarSize={24}
                    radius={[4, 4, 0, 0]}
                  />
                ))}
              </BarChart>
            ) : type === 'area' ? (
              <AreaChart data={rows}>
                {grid}
                <XAxis dataKey={xDataKey} {...axisProps} />
                <YAxis tickFormatter={(v: number) => formatValue(v)} {...axisProps} />
                {tooltip}
                {legend}
                {coloured.map((s) => (
                  /* Wash, not a saturated block. */
                  <Area
                    key={s.key}
                    dataKey={s.key}
                    name={s.label}
                    stroke={s.color}
                    strokeWidth={2}
                    fill={s.color}
                    fillOpacity={0.1}
                  />
                ))}
              </AreaChart>
            ) : (
              <LineChart data={rows}>
                {grid}
                <XAxis dataKey={xDataKey} {...axisProps} />
                <YAxis tickFormatter={(v: number) => formatValue(v)} {...axisProps} />
                {tooltip}
                {legend}
                {coloured.map((s) => (
                  <Line
                    key={s.key}
                    dataKey={s.key}
                    name={s.label}
                    stroke={s.color}
                    strokeWidth={2}
                    /* >=8px marker with a 2px surface ring so it stays legible
                       where lines cross. */
                    dot={{ r: 4, fill: s.color, stroke: 'var(--color-card)', strokeWidth: 2 }}
                    activeDot={{ r: 5, stroke: 'var(--color-card)', strokeWidth: 2 }}
                  />
                ))}
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </figure>
  );
}

/** The table view. Always available, so no value is gated behind colour. */
function DataTableView<T extends Record<string, unknown>>({
  id,
  data,
  series,
  xKey,
  formatValue,
}: {
  id: string;
  data: readonly T[];
  series: readonly (ChartSeries & { color: string })[];
  xKey: keyof T & string;
  formatValue: (value: number) => string;
}) {
  return (
    <div id={id} className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-muted-foreground">
            <th scope="col" className="py-2 pr-4 font-medium">
              {xKey}
            </th>
            {series.map((s) => (
              <th scope="col" key={s.key} className="py-2 pr-4 font-medium">
                <span className="flex items-center gap-2">
                  {/* Identity via a swatch beside the text, never coloured text. */}
                  <span
                    aria-hidden="true"
                    className="size-2 shrink-0 rounded-full"
                    style={{ background: s.color }}
                  />
                  {s.label}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="border-b border-border/50 last:border-0">
              <th scope="row" className="py-2 pr-4 font-normal text-muted-foreground">
                {String(row[xKey])}
              </th>
              {series.map((s) => (
                <td key={s.key} className="py-2 pr-4 tabular-nums text-card-foreground">
                  {formatValue(Number(row[s.key]))}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
