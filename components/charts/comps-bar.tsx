"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type CompPoint = { label: string; ppsqm: number };

const compact = (n: number) =>
  "₪" + new Intl.NumberFormat("he-IL", { notation: "compact", maximumFractionDigits: 1 }).format(n);
const full = (n: number) => "₪" + new Intl.NumberFormat("he-IL").format(Math.round(n));

/**
 * ₪/m² of each comparable deal, with the median (the estimate basis) and the
 * subject's asking ₪/m² as reference lines — bars above the asking line are
 * cheaper than what's being asked.
 */
export function CompsBar({
  data,
  median,
  subject,
}: {
  data: CompPoint[];
  median: number | null;
  subject: number | null;
}) {
  return (
    <div className="h-72 w-full" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="label" tick={false} stroke="var(--border)" height={6} />
          <YAxis
            tickFormatter={compact}
            width={56}
            tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
            stroke="var(--border)"
          />
          <Tooltip
            cursor={{ fill: "var(--muted)" }}
            contentStyle={{
              direction: "rtl",
              borderRadius: 12,
              border: "1px solid var(--border)",
              background: "var(--popover)",
              color: "var(--popover-foreground)",
              fontSize: 13,
            }}
            formatter={(v) => [full(Number(v)), 'מחיר למ"ר']}
          />
          {median != null && (
            <ReferenceLine
              y={median}
              stroke="var(--brand)"
              strokeDasharray="5 4"
              label={{ value: `חציון ${compact(median)}`, fontSize: 11, fill: "var(--brand)", position: "insideTopLeft" }}
            />
          )}
          {subject != null && (
            <ReferenceLine
              y={subject}
              stroke="var(--warning)"
              label={{ value: `מבוקש ${compact(subject)}`, fontSize: 11, fill: "var(--warning)", position: "insideBottomLeft" }}
            />
          )}
          <Bar dataKey="ppsqm" radius={[3, 3, 0, 0]} isAnimationActive={false}>
            {data.map((d, i) => (
              <Cell
                key={i}
                fill={subject != null && d.ppsqm > subject ? "var(--muted-foreground)" : "var(--brand)"}
                fillOpacity={0.85}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
