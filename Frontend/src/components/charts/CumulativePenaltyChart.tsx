import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";
import { formatINR } from "@/hooks/use-dashboard-data";
import type { ChartDataPoint } from "@/hooks/use-dashboard-data";

const chartConfig = {
  cumulative: {
    label: "Cumulative Penalty (₹)",
    color: "hsl(38 72% 52%)",
  },
  date: {
    label: "Date",
  },
} satisfies ChartConfig;

interface CumulativePenaltyChartProps {
  data: ChartDataPoint[];
}

export function CumulativePenaltyChart({ data }: CumulativePenaltyChartProps) {
  const cumulativeData = data
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .reduce<{ date: string; cumulative: number }[]>(
      (acc, d) => {
        const prev = acc.length > 0 ? acc[acc.length - 1].cumulative : 0;
        acc.push({ date: d.date, cumulative: prev + d.penalty });
        return acc;
      },
      []
    );

  if (cumulativeData.length === 0) return null;

  return (
    <ChartContainer config={chartConfig} className="h-[220px] w-full">
      <AreaChart
        data={cumulativeData}
        margin={{ left: 12, right: 12, top: 8, bottom: 0 }}
      >
        <defs>
          <linearGradient id="fillCumulative" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(38 72% 52%)" stopOpacity={0.25} />
            <stop offset="100%" stopColor="hsl(38 72% 52%)" stopOpacity={0} />
          </linearGradient>
        </defs>
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
        <Area
          type="monotone"
          dataKey="cumulative"
          name="Cumulative Penalty"
          stroke="hsl(38 72% 52%)"
          strokeWidth={2}
          fill="url(#fillCumulative)"
        />
      </AreaChart>
    </ChartContainer>
  );
}
