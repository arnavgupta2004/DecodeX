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
  Legend,
} from "recharts";
import type { ChartDataPoint } from "@/hooks/use-dashboard-data";

const chartConfig = {
  actual: {
    label: "Actual Load (kW)",
    color: "hsl(40 65% 55%)",
  },
  forecast: {
    label: "Forecast (kW)",
    color: "hsl(200 70% 55%)",
  },
  penalty: {
    label: "Penalty (₹)",
    color: "hsl(0 60% 55%)",
  },
  date: {
    label: "Date",
  },
} satisfies ChartConfig;

interface ForecastChartProps {
  data: ChartDataPoint[];
  title?: string;
  showPenalty?: boolean;
}

export function ForecastChart({
  data,
  title = "Actual vs Forecast",
  showPenalty = false,
}: ForecastChartProps) {
  return (
    <ChartContainer config={chartConfig} className="h-[280px] w-full">
      <LineChart data={data} margin={{ left: 12, right: 12 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => {
            const d = new Date(v);
            return `${d.getDate()}/${d.getMonth() + 1}`;
          }}
        />
        <YAxis
          yAxisId="load"
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${v}`}
        />
        {showPenalty && (
          <YAxis
            yAxisId="penalty"
            orientation="right"
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
          />
        )}
        <ChartTooltip content={<ChartTooltipContent />} />
        <Legend />
        <Line
          yAxisId="load"
          type="monotone"
          dataKey="actual"
          name="Actual Load"
          stroke="hsl(40 65% 55%)"
          strokeWidth={2}
          dot={false}
        />
        <Line
          yAxisId="load"
          type="monotone"
          dataKey="forecast"
          name="Forecast"
          stroke="hsl(200 70% 55%)"
          strokeWidth={2}
          strokeDasharray="4 4"
          dot={false}
        />
        {showPenalty && (
          <Line
            yAxisId="penalty"
            type="monotone"
            dataKey="penalty"
            name="Daily Penalty (₹)"
            stroke="hsl(0 60% 55%)"
            strokeWidth={1.5}
            dot={false}
          />
        )}
      </LineChart>
    </ChartContainer>
  );
}
