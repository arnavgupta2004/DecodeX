import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { formatINR, type PenaltyByStage } from "@/hooks/use-dashboard-data";

const chartConfig = {
  penalty: {
    label: "Total Penalty (₹)",
    color: "hsl(40 65% 55%)",
  },
  stage: {
    label: "Stage",
  },
} satisfies ChartConfig;

interface PenaltyBarChartProps {
  data: PenaltyByStage[];
}

export function PenaltyBarChart({ data }: PenaltyBarChartProps) {
  return (
    <ChartContainer config={chartConfig} className="h-[220px] w-full">
      <BarChart data={data} layout="vertical" margin={{ left: 60, right: 12 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" horizontal={false} />
        <XAxis
          type="number"
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => formatINR(v)}
        />
        <YAxis
          type="category"
          dataKey="label"
          tickLine={false}
          axisLine={false}
          width={55}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => formatINR(Number(value))}
            />
          }
        />
        <Bar
          dataKey="penalty"
          fill="hsl(40 65% 55% / 0.8)"
          radius={[0, 4, 4, 0]}
        />
      </BarChart>
    </ChartContainer>
  );
}
