"use client";

import {
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Point = { t: number; ppsqm: number; label: string };

const compact = (n: number) =>
  "₪" + new Intl.NumberFormat("he-IL", { notation: "compact", maximumFractionDigits: 1 }).format(n);
const month = (t: number) =>
  new Date(t).toLocaleDateString("he-IL", { month: "2-digit", year: "2-digit" });
const full = (n: number) => "₪" + new Intl.NumberFormat("he-IL").format(Math.round(n));

/** ₪/m² of each block transaction over time, with the median as a reference. */
export function PriceTrend({ data, median }: { data: Point[]; median: number | null }) {
  return (
    <div className="h-72 w-full" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            type="number"
            dataKey="t"
            domain={["dataMin", "dataMax"]}
            tickFormatter={month}
            tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
            stroke="var(--border)"
          />
          <YAxis
            type="number"
            dataKey="ppsqm"
            tickFormatter={compact}
            width={56}
            tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
            stroke="var(--border)"
          />
          {median != null && (
            <ReferenceLine
              y={median}
              stroke="var(--brand)"
              strokeDasharray="5 4"
              label={{ value: `חציון ${compact(median)}`, fontSize: 11, fill: "var(--brand)", position: "insideTopRight" }}
            />
          )}
          <Tooltip
            cursor={{ stroke: "var(--border)" }}
            contentStyle={{
              direction: "rtl",
              borderRadius: 12,
              border: "1px solid var(--border)",
              background: "var(--popover)",
              color: "var(--popover-foreground)",
              fontSize: 13,
            }}
            formatter={(v) => [full(Number(v)), 'מחיר למ"ר']}
            labelFormatter={(t) =>
              new Date(Number(t)).toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" })
            }
          />
          <Scatter data={data} fill="var(--brand)" isAnimationActive={false} fillOpacity={0.7} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
