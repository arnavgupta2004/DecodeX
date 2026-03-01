import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { formatINR, type PeakBreakdownPoint } from "@/hooks/use-dashboard-data";

const chartConfig = {
  peak: {
    label: "Peak Penalty",
    color: "hsl(0 60% 52%)",
  },
  offPeak: {
    label: "Off-Peak Penalty",
    color: "hsl(200 70% 55%)",
  },
} satisfies ChartConfig;

interface PeakBreakdownChartProps {
  data: PeakBreakdownPoint[];
}

export function PeakBreakdownChart({ data }: PeakBreakdownChartProps) {
  return (
    <ChartContainer config={chartConfig} className="h-[220px] w-full">
      <BarChart data={data} margin={{ left: 12, right: 12, top: 4, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" vertical={false} />
        <XAxis
          dataKey="stage"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 10 }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => formatINR(v)}
          width={52}
          tick={{ fontSize: 9 }}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => formatINR(Number(value))}
            />
          }
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="peak"    name="Peak"     fill="hsl(0 60% 52% / 0.85)"    radius={[2, 2, 0, 0]} />
        <Bar dataKey="offPeak" name="Off-Peak" fill="hsl(200 70% 55% / 0.75)"  radius={[2, 2, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}
