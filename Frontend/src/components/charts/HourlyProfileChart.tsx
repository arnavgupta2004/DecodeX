import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from "recharts";
import type { HourlyProfilePoint } from "@/hooks/use-dashboard-data";

const chartConfig = {
  avgLoad: {
    label: "Avg Load (kW)",
    color: "hsl(40 65% 55%)",
  },
} satisfies ChartConfig;

interface HourlyProfileChartProps {
  data: HourlyProfilePoint[];
}

export function HourlyProfileChart({ data }: HourlyProfileChartProps) {
  return (
    <ChartContainer config={chartConfig} className="h-[220px] w-full">
      <BarChart data={data} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" vertical={false} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 9 }}
          interval={1}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${v}`}
          width={42}
          tick={{ fontSize: 10 }}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="avgLoad" name="Avg Load" radius={[2, 2, 0, 0]}>
          {data.map((entry) => (
            <Cell
              key={entry.hour}
              fill={
                entry.isPeak
                  ? "hsl(0 60% 52% / 0.85)"
                  : "hsl(40 65% 55% / 0.65)"
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
