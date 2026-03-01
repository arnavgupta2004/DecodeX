import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Section } from "@/components/Section";
import { DataPanel, MetricCard } from "@/components/Cards";
import { ForecastChart } from "@/components/charts/ForecastChart";
import { PenaltyBarChart } from "@/components/charts/PenaltyBarChart";
<<<<<<< Updated upstream
=======
import { HourlyProfileChart } from "@/components/charts/HourlyProfileChart";
import { PeakBreakdownChart } from "@/components/charts/PeakBreakdownChart";
import { VolatilityChart } from "@/components/charts/VolatilityChart";
import { CumulativePenaltyChart } from "@/components/charts/CumulativePenaltyChart";
import { BiasChart } from "@/components/charts/BiasChart";
import { Stage2VsStage3PenaltyChart } from "@/components/charts/Stage2VsStage3PenaltyChart";
>>>>>>> Stashed changes
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
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="text-center max-w-md p-8 rounded-sm glass-card border border-border/50">
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-destructive font-medium mb-2">Failed to load dashboard data</p>
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
      <header className="sticky top-0 z-30 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-3 font-sans text-sm text-foreground/60 hover:text-gold transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Report</span>
          </Link>
          <Link to="/" className="flex items-center gap-2">
            <span className="font-mono text-[11px] tracking-[0.2em] uppercase text-gold/70">Decode</span>
            <span className="font-serif text-lg font-bold gold-text italic">X</span>
          </Link>
          <div className="w-24" aria-hidden />
        </div>
      </header>

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

<<<<<<< Updated upstream
=======
          {/* Cumulative penalty over time */}
          <DataPanel title="Cumulative Penalty Over Time">
            {stageChartData.length ? (
              <CumulativePenaltyChart data={stageChartData} />
            ) : (
              <div className="h-56 flex items-center justify-center border border-dashed border-border/40 rounded-sm bg-muted/20">
                <p className="text-foreground/40 text-sm">{isLoading ? "Loading..." : "No data for selection"}</p>
              </div>
            )}
            <p className="mt-3 text-[11px] text-foreground/40 leading-relaxed">
              Running total of daily deviation penalty for the selected stage and time window. Shows how financial exposure builds over the period.
            </p>
          </DataPanel>

          {/* Forecast bias (C3) — show for selected stage */}
          <DataPanel title="Daily Forecast Bias % — C3 Band (−2% to +3%)">
            {stageChartData.length ? (
              <BiasChart data={stageChartData} />
            ) : (
              <div className="h-56 flex items-center justify-center border border-dashed border-border/40 rounded-sm bg-muted/20">
                <p className="text-foreground/40 text-sm">{isLoading ? "Loading..." : "No data"}</p>
              </div>
            )}
            <p className="mt-3 text-[11px] text-foreground/40 leading-relaxed">
              Board constraint C3: bias must stay in the shaded band. Use Stage 3 + full window to show compliance.
            </p>
          </DataPanel>

          {/* Stage 2 vs 3 daily penalty — same period */}
          {chartData?.stage2?.length && chartData?.stage3?.length ? (
            <DataPanel title="Stage 2 vs Stage 3 — Daily Penalty (Same Period)">
              <Stage2VsStage3PenaltyChart stage2Data={chartData.stage2} stage3Data={chartData.stage3} />
              <p className="mt-3 text-[11px] text-foreground/40 leading-relaxed">
                Red dashed = Stage 2; green = Stage 3. Direct comparison of daily penalty after constrained optimization.
              </p>
            </DataPanel>
          ) : null}

          {/* ── Analytical Charts from EDA ── */}
          <div className="space-y-2">
            <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-foreground/40">
              Analytical Evidence
            </p>
          </div>
          <div className="grid lg:grid-cols-3 gap-8 items-start">
            {/* Hourly Load Profile */}
            <div className="lg:col-span-1">
              <DataPanel title="Avg Load by Hour — Peak Zone">
                {hourlyProfile.length ? (
                  <HourlyProfileChart data={hourlyProfile} />
                ) : (
                  <div className="h-56 flex items-center justify-center border border-dashed border-border/30 rounded-sm">
                    <p className="text-foreground/20 text-sm">No data</p>
                  </div>
                )}
                <p className="mt-3 text-[11px] text-foreground/40 leading-relaxed">
                  <span className="text-red-400/70">Red bars</span> = Peak hours (18:00–21:59, i.e. 6 PM–10 PM per ABT guidelines).
                  Load clearly spikes in the evening, justifying the asymmetric penalty
                  structure and newsvendor q*=0.667 / q*=0.750 strategy.
                </p>
              </DataPanel>
            </div>
            {/* Peak vs Off-Peak Breakdown */}
            <div className="lg:col-span-2">
              <DataPanel title="Peak vs Off-Peak Penalty by Stage">
                {peakBreakdown.length ? (
                  <PeakBreakdownChart data={peakBreakdown} />
                ) : (
                  <div className="h-56 flex items-center justify-center border border-dashed border-border/30 rounded-sm">
                    <p className="text-foreground/20 text-sm">No data</p>
                  </div>
                )}
                <p className="mt-3 text-[11px] text-foreground/40 leading-relaxed">
                  Stage 2 escalated peak under-forecast penalty from Rs.4 → Rs.6/kWh (+50%).
                  Stage 3 targeted buffer shifts penalty back toward off-peak by eliminating
                  97 peak violations — peak penalty drops from Rs.37K to Rs.28K.
                </p>
              </DataPanel>
            </div>
          </div>

          {/* Regime Shift Volatility */}
          <div className="grid lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2">
              <DataPanel title="Daily Load Volatility — Regime Shift Evidence">
                {volatilityData.length ? (
                  <VolatilityChart data={volatilityData} />
                ) : (
                  <div className="h-56 flex items-center justify-center border border-dashed border-border/30 rounded-sm">
                    <p className="text-foreground/20 text-sm">No data</p>
                  </div>
                )}
                <p className="mt-3 text-[11px] text-foreground/40 leading-relaxed">
                  Red line = daily load standard deviation (σ). The yellow dashed line marks
                  the regime shift boundary (May 1, 2021). Volatility visibly spikes in the
                  test period — this is why RMSE jumps 18× (6.4 kW → 116 kW), not the
                  regulatory rate change.
                </p>
              </DataPanel>
            </div>
            <DataPanel title="Regime Impact — Key Numbers">
              <div className="space-y-4 text-xs text-foreground/50 leading-relaxed">
                <div className="space-y-2">
                  <p className="font-mono text-[10px] uppercase text-gold/60">Accuracy Collapse</p>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>Stage 1 RMSE</span>
                      <span className="font-mono text-foreground/70">{summary?.stage1.rmse ?? "—"} kW</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Stage 2 RMSE</span>
                      <span className="font-mono text-red-400/80">{summary?.stage2.rmse ?? "—"} kW</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Multiplier</span>
                      <span className="font-mono text-red-400/80">
                        {summary ? `${(parseFloat(summary.stage2.rmse) / parseFloat(summary.stage1.rmse)).toFixed(0)}×` : "—"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="font-mono text-[10px] uppercase text-gold/60">Penalty per Interval</p>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>Stage 1</span>
                      <span className="font-mono text-foreground/70">
                        {summary ? `Rs.${(summary.stage1.totalPenalty / summary.stage1.intervals).toFixed(2)}` : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Stage 2</span>
                      <span className="font-mono text-red-400/80">
                        {summary ? `Rs.${(summary.stage2.totalPenalty / summary.stage2.intervals).toFixed(2)}` : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Stage 3</span>
                      <span className="font-mono text-green-400/80">
                        {summary ? `Rs.${(summary.stage3.totalPenalty / summary.stage3.intervals).toFixed(2)}` : "—"}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-foreground/30 leading-relaxed">
                  Cyclone Tauktae (May 25) accounts for the 3 remaining C2 violations —
                  classified force majeure, outside any 48h forecast horizon.
                </p>
              </div>
            </DataPanel>
          </div>

>>>>>>> Stashed changes
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

