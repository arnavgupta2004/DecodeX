import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { formatINR } from "@/hooks/use-dashboard-data";
import type { ChartDataPoint } from "@/hooks/use-dashboard-data";

const chartConfig = {
  stage2: {
    label: "Stage 2 Daily Penalty (₹)",
    color: "hsl(0 60% 52%)",
  },
  stage3: {
    label: "Stage 3 Daily Penalty (₹)",
    color: "hsl(142 55% 45%)",
  },
  date: {
    label: "Date",
  },
} satisfies ChartConfig;

interface Stage2VsStage3PenaltyChartProps {
  stage2Data: ChartDataPoint[];
  stage3Data: ChartDataPoint[];
}

export function Stage2VsStage3PenaltyChart({
  stage2Data,
  stage3Data,
}: Stage2VsStage3PenaltyChartProps) {
  const byDate = new Map<string, { stage2: number; stage3: number }>();
  stage2Data.forEach((d) => byDate.set(d.date, { stage2: d.penalty, stage3: 0 }));
  stage3Data.forEach((d) => {
    const row = byDate.get(d.date) ?? { stage2: 0, stage3: 0 };
    row.stage3 = d.penalty;
    byDate.set(d.date, row);
  });
  const merged = Array.from(byDate.entries())
    .filter(([, v]) => v.stage2 > 0 || v.stage3 > 0)
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (merged.length === 0) return null;

  return (
    <ChartContainer config={chartConfig} className="h-[220px] w-full">
      <LineChart data={merged} margin={{ left: 12, right: 12, top: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 9 }}
          tickFormatter={(v) => {
            const d = new Date(v);
            return `${d.getDate()}/${d.getMonth() + 1}`;
          }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
          width={42}
          tick={{ fontSize: 9 }}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => formatINR(Number(value))}
              labelFormatter={(label) => {
                const d = new Date(label);
                return d.toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                });
              }}
            />
          }
        />
        <Line
          type="monotone"
          dataKey="stage2"
          name="Stage 2"
          stroke="hsl(0 60% 52%)"
          strokeWidth={2}
          strokeDasharray="4 3"
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="stage3"
          name="Stage 3"
          stroke="hsl(142 55% 45%)"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ChartContainer>
  );
}
