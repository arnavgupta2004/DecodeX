import { useMemo, useState } from "react";
import { Section } from "@/components/Section";
import { DataPanel, MetricCard } from "@/components/Cards";
import { ForecastChart } from "@/components/charts/ForecastChart";
import { PenaltyBarChart } from "@/components/charts/PenaltyBarChart";
import { useDashboardData, formatINR, type DashboardSummary } from "@/hooks/use-dashboard-data";

type StageKey = "stage1" | "stage2" | "stage3";
type WindowKey = "14" | "30" | "all";

const STAGE_LABEL: Record<StageKey, string> = {
  stage1: "Stage 1 — Baseline",
  stage2: "Stage 2 — Regime Shift",
  stage3: "Stage 3 — Board Directive",
};

const WINDOW_LABEL: Record<WindowKey, string> = {
  "14": "Last 14 days",
  "30": "Last 30 days",
  all: "Full period",
};

const Dashboard = () => {
  const { data, isLoading, error } = useDashboardData();
  const [selectedStage, setSelectedStage] = useState<StageKey>("stage3");
  const [windowSize, setWindowSize] = useState<WindowKey>("30");

  const summary = data?.summary;
  const chartData = data?.chartData;
  const penaltyByStage = data?.penaltyByStage ?? [];

  const stageChartData = useMemo(() => {
    if (!chartData) return [];
    const base = chartData[selectedStage] ?? [];
    if (windowSize === "all") return base;
    const n = parseInt(windowSize, 10);
    return base.slice(-n);
  }, [chartData, selectedStage, windowSize]);

  const activeSummary = getStageSummary(summary, selectedStage);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-2">
          <p className="text-destructive font-medium">Failed to load dashboard data</p>
          <p className="text-sm text-foreground/50">
            Ensure CSV outputs exist and run{" "}
            <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">npm run build:data</code>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background text-foreground min-h-screen">
      <Section
        id="dashboard"
        eyebrow="Interactive Analytics"
        title="GRIDSHIELD Dashboard"
        subtitle="Filter by stage, time window, and metric to explore how penalties, load forecasts, and constraints evolve across the three Decode X stages."
      >
        <div className="space-y-10">
          {/* KPI Row */}
          <div className="grid lg:grid-cols-4 gap-4">
            <MetricCard
              value={
                activeSummary
                  ? formatINR(activeSummary.totalPenalty)
                  : "—"
              }
              label="Total Penalty"
              sublabel={STAGE_LABEL[selectedStage]}
              highlight
            />
            <MetricCard
              value={
                selectedStage === "stage1" && summary
                  ? `${summary.stage1.mape}%`
                  : selectedStage !== "stage1" && summary
                    ? `${summary.stage2.rmse} kW`
                    : "—"
              }
              label={selectedStage === "stage1" ? "MAPE" : "RMSE (Test)"}
              sublabel={selectedStage === "stage1" ? "Validation window" : "Out-of-time regime"}
            />
            <MetricCard
              value={summary ? `${summary.stage1.penaltyReductionPct}%` : "—"}
              label="Penalty Reduction vs Naive"
              sublabel="Stage 1 benchmark"
            />
            <MetricCard
              value={
                summary && selectedStage === "stage3"
                  ? `${summary.stage3.peakViolationsOver5Pct}/3`
                  : selectedStage === "stage2"
                    ? "100"
                    : "—"
              }
              label="Peak Violations >5%"
              sublabel={selectedStage === "stage3" ? "C2 board constraint" : "Stage 2 pre-buffer"}
            />
          </div>

          {/* Filters + Main Chart */}
          <div className="grid xl:grid-cols-3 gap-8 items-start">
            <DataPanel title="Controls">
              <div className="space-y-6">
                <div>
                  <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-foreground/40 mb-2">
                    Stage Selection
                  </p>
                  <div className="inline-flex rounded-sm border border-border/60 bg-secondary/40 overflow-hidden">
                    {(["stage1", "stage2", "stage3"] as StageKey[]).map((stage) => (
                      <button
                        key={stage}
                        type="button"
                        onClick={() => setSelectedStage(stage)}
                        className={`px-3 py-2 text-xs font-medium border-r border-border/40 last:border-r-0 transition-colors ${
                          selectedStage === stage
                            ? "bg-gold/10 text-gold"
                            : "text-foreground/60 hover:bg-secondary/60"
                        }`}
                      >
                        {STAGE_LABEL[stage].split("—")[0].trim()}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-foreground/40 mb-2">
                    Time Window
                  </p>
                  <div className="inline-flex rounded-sm border border-border/60 bg-secondary/40 overflow-hidden">
                    {(["14", "30", "all"] as WindowKey[]).map((w) => (
                      <button
                        key={w}
                        type="button"
                        onClick={() => setWindowSize(w)}
                        className={`px-3 py-2 text-xs font-medium border-r border-border/40 last:border-r-0 transition-colors ${
                          windowSize === w
                            ? "bg-gold/10 text-gold"
                            : "text-foreground/60 hover:bg-secondary/60"
                        }`}
                      >
                        {WINDOW_LABEL[w]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="text-xs text-foreground/45 leading-relaxed">
                  <p className="mb-1">
                    Use this control panel as you would in Tableau / Power BI:
                  </p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Switch between stages to compare penalty profiles.</li>
                    <li>Zoom into the last 14 or 30 days around the regime shift.</li>
                    <li>Hover on the chart to inspect exact values and outliers.</li>
                  </ul>
                </div>
              </div>
            </DataPanel>

            <div className="xl:col-span-2">
              <DataPanel title="Time Series — Actual vs Forecast & Daily Penalty">
                {stageChartData.length ? (
                  <ForecastChart data={stageChartData} showPenalty />
                ) : (
                  <div className="h-64 flex items-center justify-center border border-dashed border-border/30 rounded-sm">
                    <p className="text-foreground/20 text-sm">
                      {isLoading ? "Loading dashboard data..." : "No chart data for selection"}
                    </p>
                  </div>
                )}
                <p className="mt-4 text-[11px] text-foreground/40 leading-relaxed">
                  Each point aggregates 15-min intervals into a daily view for the selected stage.
                  The gold line tracks actual load (kW), the blue line tracks forecasted load, and
                  the red line (right axis) tracks daily penalty in ₹.
                </p>
              </DataPanel>
            </div>
          </div>

          {/* Comparative & Constraint Panels */}
          <div className="grid lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2 space-y-6">
              <DataPanel title="Penalty by Stage — Baseline vs Shock vs Constrained">
                {penaltyByStage.length ? (
                  <PenaltyBarChart data={penaltyByStage} />
                ) : (
                  <div className="h-56 flex items-center justify-center border border-dashed border-border/30 rounded-sm">
                    <p className="text-foreground/20 text-sm">
                      {isLoading ? "Loading dashboard data..." : "No comparative data"}
                    </p>
                  </div>
                )}
                <p className="mt-4 text-[11px] text-foreground/40 leading-relaxed">
                  This view mirrors a Power BI summary: Stage 1 establishes the penalty baseline,
                  Stage 2 captures the post-shock regime, and Stage 3 shows the cost of complying
                  with the board&apos;s constraints.
                </p>
              </DataPanel>
            </div>

            <DataPanel title="Constraint Health — Stage 3 Snapshot">
              <div className="space-y-4 text-sm text-foreground/45 leading-relaxed">
                <p>
                  The board imposed four constraints: report penalties (C1), cap peak
                  underestimation &gt;5% to 3 intervals (C2), keep forecast bias between -2% and
                  +3% (C3), and limit average uplift vs. unbiased model to 3% (C4).
                </p>
                <ul className="space-y-2 text-xs">
                  <li>
                    <span className="font-mono text-[10px] uppercase text-gold/70">C2</span>{" "}
                    {summary
                      ? `Peak violations >5%: ${summary.stage3.peakViolationsOver5Pct} of 3 allowed`
                      : "—"}
                  </li>
                  <li>
                    <span className="font-mono text-[10px] uppercase text-gold/70">Cost of Compliance</span>{" "}
                    {summary?.stage3?.stage2Penalty
                      ? `${(((summary.stage3.totalPenalty / summary.stage3.stage2Penalty) - 1) * 100).toFixed(1)}% vs Stage 2 — ${formatINR(summary.stage3.totalPenalty)} total`
                      : "—"}
                  </li>
                  <li>
                    <span className="font-mono text-[10px] uppercase text-gold/70">Risk View</span>{" "}
                    Stage 3 adaptive strategy (Forecast_S3_Adaptive) balances penalty vs C2 violations.
                    Current run: {summary ? summary.stage3.peakViolationsOver5Pct : "—"} peak violations &gt;5% (max 3 allowed). Extreme events (e.g. Cyclone Tauktae) may remain force majeure.
                  </li>
                </ul>
              </div>
            </DataPanel>
          </div>
        </div>
      </Section>
    </div>
  );
};

function getStageSummary(summary: DashboardSummary | undefined, stage: StageKey) {
  if (!summary) return undefined;
  if (stage === "stage1") {
    return { totalPenalty: summary.stage1.totalPenalty };
  }
  if (stage === "stage2") {
    return { totalPenalty: summary.stage2.totalPenalty };
  }
  return { totalPenalty: summary.stage3.totalPenalty };
}

export default Dashboard;

