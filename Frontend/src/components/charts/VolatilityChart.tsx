import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from "@/components/ui/chart";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import type { VolatilityPoint } from "@/hooks/use-dashboard-data";

const chartConfig = {
  std: {
    label: "Volatility σ (kW)",
    color: "hsl(0 60% 52%)",
  },
  mean: {
    label: "Avg Load (kW)",
    color: "hsl(40 65% 55%)",
  },
} satisfies ChartConfig;

interface VolatilityChartProps {
  data: VolatilityPoint[];
}

export function VolatilityChart({ data }: VolatilityChartProps) {
  // Find the date where Stage 2 begins
  const regimeShiftDate =
    data.find((d) => d.stage === "Stage 2")?.date ?? "2021-05-01";

  return (
    <ChartContainer config={chartConfig} className="h-[220px] w-full">
      <LineChart data={data} margin={{ left: 4, right: 16, top: 8, bottom: 0 }}>
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
          tickFormatter={(v) => `${v}`}
          width={38}
          tick={{ fontSize: 9 }}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ReferenceLine
          x={regimeShiftDate}
          stroke="hsl(40 65% 55%)"
          strokeDasharray="5 3"
          label={{
            value: "Regime Shift ▶",
            position: "insideTopLeft",
            fontSize: 9,
            fill: "hsl(40 65% 55%)",
          }}
        />
        <Line
          type="monotone"
          dataKey="std"
          name="Volatility σ"
          stroke="hsl(0 60% 52%)"
          strokeWidth={1.5}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="mean"
          name="Avg Load"
          stroke="hsl(40 65% 55%)"
          strokeWidth={1}
          strokeOpacity={0.45}
          dot={false}
        />
      </LineChart>
    </ChartContainer>
  );
}
