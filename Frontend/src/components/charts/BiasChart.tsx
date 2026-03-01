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
  ReferenceArea,
} from "recharts";
import type { ChartDataPoint } from "@/hooks/use-dashboard-data";

const chartConfig = {
  biasPct: {
    label: "Forecast Bias (%)",
    color: "hsl(38 72% 52%)",
  },
  date: {
    label: "Date",
  },
} satisfies ChartConfig;

/** C3 board constraint: bias must stay within [-2%, +3%] */
const C3_LOW = -2;
const C3_HIGH = 3;

interface BiasChartProps {
  data: ChartDataPoint[];
}

export function BiasChart({ data }: BiasChartProps) {
  const series = data
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) => {
      const biasPct =
        d.actual != null && d.actual !== 0
          ? ((d.actual - d.forecast) / d.actual) * 100
          : 0;
      return { date: d.date, biasPct: Math.round(biasPct * 100) / 100 };
    });

  if (series.length === 0) return null;

  return (
    <ChartContainer config={chartConfig} className="h-[220px] w-full">
      <LineChart data={series} margin={{ left: 12, right: 12, top: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
        <ReferenceArea
          y1={C3_LOW}
          y2={C3_HIGH}
          fill="hsl(34 80% 45% / 0.08)"
          strokeOpacity={0}
        />
        <ReferenceLine
          y={C3_HIGH}
          stroke="hsl(38 72% 52% / 0.7)"
          strokeDasharray="4 3"
          strokeWidth={1}
        />
        <ReferenceLine
          y={C3_LOW}
          stroke="hsl(38 72% 52% / 0.7)"
          strokeDasharray="4 3"
          strokeWidth={1}
        />
        <ReferenceLine y={0} stroke="hsl(var(--foreground) / 0.2)" strokeWidth={1} />
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
          tickFormatter={(v) => `${v}%`}
          width={40}
          tick={{ fontSize: 9 }}
          domain={["auto", "auto"]}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => [`${Number(value).toFixed(2)}%`, "Bias"]}
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
          dataKey="biasPct"
          name="Forecast Bias %"
          stroke="hsl(38 72% 52%)"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ChartContainer>
  );
}
