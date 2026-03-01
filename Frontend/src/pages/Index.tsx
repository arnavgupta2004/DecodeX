import { Hero } from "@/components/Hero";
import { Section } from "@/components/Section";
import {
  MetricCard,
  InsightRow,
  DataPanel,
  AlertBanner,
  ComparisonTable,
} from "@/components/Cards";
import { ForecastChart } from "@/components/charts/ForecastChart";
import { PenaltyBarChart } from "@/components/charts/PenaltyBarChart";
import { CumulativePenaltyChart } from "@/components/charts/CumulativePenaltyChart";
import { BiasChart } from "@/components/charts/BiasChart";
import { Stage2VsStage3PenaltyChart } from "@/components/charts/Stage2VsStage3PenaltyChart";
import { motion } from "framer-motion";
import { useDashboardData, formatINR } from "@/hooks/use-dashboard-data";

const Index = () => {
  const { data, isLoading, error } = useDashboardData();

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
            Run <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">npm run build:data</code> first
          </p>
        </div>
      </div>
    );
  }

  const summary = data?.summary;
  const chartData = data?.chartData;
  const penaltyByStage = data?.penaltyByStage ?? [];

  return (
    <div className="bg-background text-foreground min-h-screen">
      <Hero />

      <div className="section-divider" />

      {/* Overview */}
      <Section
        id="overview"
        eyebrow="Executive Summary"
        title="Business Context"
        subtitle="Cost-aware 2-day-ahead load forecasting for Lumina Energy (suburban Mumbai) under Maharashtra's ABT regulatory framework."
      >
        <div className="grid lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 space-y-6">
            <p className="text-foreground/50 leading-relaxed">
              GRIDSHIELD addresses the core business problem: <strong className="text-foreground/70">financial penalty minimization</strong> under asymmetric ABT tariffs, not RMSE minimization. Under Rs. 4/kWh under-forecast vs Rs. 2/kWh over-forecast, the optimal quantile is q* = 4/(4+2) = 0.667.
            </p>
            <p className="text-foreground/50 leading-relaxed">
              The analytical framework spans three stages: baseline hybrid (Q67 peak / Mean off-peak), regime-shift recalibration (Q75 peak post-escalation), and board-constrained optimization with a targeted per-interval minimum buffer on violating peak intervals.
            </p>
            <div className="gold-line w-full mt-8" />
          </div>
          <div className="lg:col-span-2 grid grid-cols-2 gap-4">
            <MetricCard
              value={summary ? formatINR(summary.stage1.totalPenalty) : "—"}
              label="Primary KPI"
              sublabel="Total Penalty"
              highlight
            />
            <MetricCard
              value={summary ? `${summary.stage1.penaltyReductionPct}%` : "—"}
              label="Penalty Reduction"
              sublabel="vs. Naive"
            />
            <MetricCard
              value="2-day"
              label="Time Horizon"
              sublabel="Forecast horizon"
            />
            <MetricCard
              value="≤3"
              label="Peak Violations"
              sublabel=">5% underestimation"
            />
          </div>
        </div>
      </Section>

      <div className="section-divider" />

      {/* Stage 1 */}
      <Section
        id="baseline"
        stageNumber="01"
        eyebrow="Stage 1"
        title="Baseline Diagnosis"
        subtitle="Historical performance analysis, key driver identification, and initial strategic positioning."
      >
        <div className="space-y-10">
          <div className="grid lg:grid-cols-4 gap-4">
            <MetricCard
              value={summary ? formatINR(summary.stage1.totalPenalty) : "—"}
              label="Model Penalty"
              sublabel="Hybrid strategy"
              highlight
            />
            <MetricCard
              value={summary ? `${summary.stage1.mape}%` : "—"}
              label="MAPE"
              sublabel="Mean absolute % error"
            />
            <MetricCard
              value={summary ? `${summary.stage1.rmse} kW` : "—"}
              label="RMSE"
              sublabel="Root mean squared"
            />
            <MetricCard
              value={summary ? `${summary.stage1.penaltyReductionPct}%` : "—"}
              label="vs. Naive"
              sublabel="Penalty reduction"
            />
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            <div>
              <InsightRow
                number="01"
                title="Performance Diagnosis"
                description="Historical validation (Sep 2019–Apr 2021) shows strong hybrid performance: Q67 for peak hours (conservative upward bias) and Mean for off-peak (tight accuracy). RMSE 6.56 kW, MAPE 0.28%."
              />
              <InsightRow
                number="02"
                title="Key Drivers Identified"
                description="Temporal cyclicals, lagged load (t-192, t-672), rolling statistics, weather interactions, and COVID structural break indicators. Optimal q* = 0.667 under asymmetric ABT."
              />
              <InsightRow
                number="03"
                title="Initial Strategy"
                description="Hybrid forecast: Q67 quantile during peak (6–10 PM) and holidays; Mean model otherwise. Achieved 96.4% penalty reduction vs. naive persistence."
              />
            </div>
            <DataPanel title="Baseline Forecast: Actual vs Hybrid">
              {chartData?.stage1?.length ? (
                <ForecastChart data={chartData.stage1} showPenalty />
              ) : (
                <div className="h-56 flex flex-col items-center justify-center gap-3 border border-dashed border-border/40 rounded-sm bg-muted/20">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <svg className="w-5 h-5 text-foreground/30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2z" /></svg>
                  </div>
                  <p className="text-foreground/40 text-sm font-medium">
                    {isLoading ? "Loading..." : "No chart data"}
                  </p>
                </div>
              )}
            </DataPanel>
          </div>
        </div>
      </Section>

      <div className="section-divider" />

      {/* Stage 2 */}
      <Section
        id="recalibration"
        stageNumber="02"
        eyebrow="Stage 2"
        title="Regime Shift & Recalibration"
        subtitle="Structural shock assessment, model recalibration, and quantified impact analysis."
      >
        <div className="space-y-10">
          <AlertBanner
            type="shock"
            title="Structural Shock Received"
            description="1) REGULATORY: Peak under-forecast penalty escalated from Rs. 4 → Rs. 6/kWh (+50%). New optimal peak quantile q* = 6/(6+2) = 0.750. 2) DATA: Out-of-time test set (May–Jun 2021) with elevated volatility; RMSE jumped from 6.56 kW to ~116 kW. Regime shift is the dominant penalty driver."
          />

          <ComparisonTable
            rows={[
              {
                metric: "Total Penalty (Validation)",
                before: summary ? formatINR(summary.stage1.totalPenalty) : "—",
                after: summary ? formatINR(summary.stage2.totalPenalty) : "—",
                delta: summary
                  ? `+${(((summary.stage2.totalPenalty / summary.stage1.totalPenalty) - 1) * 100).toFixed(0)}%`
                  : "—",
                positive: false,
              },
              {
                metric: "RMSE",
                before: summary ? `${summary.stage1.rmse} kW` : "—",
                after: summary ? `${summary.stage2.rmse} kW` : "—",
                delta: "Regime shift",
                positive: false,
              },
              {
                metric: "Peak Quantile",
                before: "Q67",
                after: "Q75",
                delta: "Recalibrated",
                positive: true,
              },
              {
                metric: "Test Period",
                before: "Sep 2019 – Apr 2021",
                after: "May – Jun 2021",
                delta: "Out-of-time",
                positive: false,
              },
            ]}
          />

          <div className="grid lg:grid-cols-2 gap-8">
            <DataPanel title="Recalibration Methodology">
              <div className="space-y-4">
                <p className="text-sm text-foreground/45 leading-relaxed">
                  Retrained on full training set with Q75 model for peak hours (replacing Q67). Proper lag context from training tail to test period. Stage 2 penalty structure: peak under = Rs. 6/kWh, over = Rs. 2/kWh; off-peak unchanged.
                </p>
                <div className="gold-line w-32" />
                <p className="text-sm text-foreground/45 leading-relaxed">
                  Trade-off: Higher quantile reduces under-forecast risk during peak but increases over-procurement cost. The out-of-time volatility (COVID recovery, weather) drove most of the penalty increase, not the regulatory change alone.
                </p>
              </div>
            </DataPanel>
            <DataPanel title="Penalty by Stage">
              {penaltyByStage.length ? (
                <PenaltyBarChart data={penaltyByStage} />
              ) : (
                <div className="h-48 flex flex-col items-center justify-center gap-2 border border-dashed border-border/40 rounded-sm bg-muted/20">
                  <p className="text-foreground/40 text-sm">{isLoading ? "Loading..." : "No data"}</p>
                </div>
              )}
            </DataPanel>
          </div>

          {chartData?.stage2?.length && (
            <DataPanel title="Stage 2 Forecast: Actual vs Hybrid (May–Jun 2021)">
              <ForecastChart data={chartData.stage2} showPenalty />
            </DataPanel>
          )}
        </div>
      </Section>

      <div className="section-divider" />

      {/* Stage 3 */}
      <Section
        id="optimization"
        stageNumber="03"
        eyebrow="Stage 3"
        title="Constrained Optimization"
        subtitle="Board directive integration, final optimization under binding constraints, and risk-adjusted recommendation."
      >
        <div className="space-y-10">
          <AlertBanner
            type="directive"
            title="Confidential Board Directive"
            description="C1: Report total, peak, off-peak deviation penalties. C2: Peak underestimation >5% of actual permitted for MAX 3 intervals. C3: Overall forecast bias within [-2%, +3%]. C4: Average forecast uplift vs unbiased model ≤3%. Stage 3 adaptive strategy (Forecast_S3_Adaptive) applies targeted buffers to satisfy constraints; C2 violations are counted from the C2_Violation flag in the output."
          />

          <div className="grid lg:grid-cols-3 gap-4">
            <MetricCard
              value={summary ? formatINR(summary.stage3.totalPenalty) : "—"}
              label="Optimized Penalty"
              sublabel="vs. Stage 2"
              highlight
            />
            <MetricCard
              value={summary ? `${summary.stage3.peakViolationsOver5Pct}/3` : "—"}
              label="C2 Constraint"
              sublabel="Peak violations ≤3"
              highlight
            />
            <MetricCard
              value={
                summary?.stage3?.stage2Penalty
                  ? `${(((summary.stage3.totalPenalty / summary.stage3.stage2Penalty) - 1) * 100).toFixed(1)}%`
                  : "—"
              }
              label="vs Stage 2"
              sublabel="Penalty change"
            />
          </div>

          <DataPanel title="Stage 3 Forecast & Penalty Trend">
            {chartData?.stage3?.length ? (
              <ForecastChart data={chartData.stage3} showPenalty />
            ) : (
              <div className="h-56 flex flex-col items-center justify-center gap-3 border border-dashed border-border/40 rounded-sm bg-muted/20">
                <p className="text-foreground/40 text-sm font-medium">{isLoading ? "Loading..." : "No chart data"}</p>
              </div>
            )}
          </DataPanel>

          {chartData?.stage3?.length ? (
            <>
              <DataPanel title="Stage 3 Cumulative Penalty">
                <CumulativePenaltyChart data={chartData.stage3} />
                <p className="mt-3 text-[11px] text-foreground/40 leading-relaxed">
                  Running total of daily deviation penalty — how financial exposure builds over the test period.
                </p>
              </DataPanel>

              <DataPanel title="Stage 3 Forecast Bias — C3 Compliance">
                <BiasChart data={chartData.stage3} />
                <p className="mt-3 text-[11px] text-foreground/40 leading-relaxed">
                  Board constraint C3: forecast bias must stay within <span className="text-gold/80">−2% to +3%</span>. Shaded band shows the allowed range; the line shows daily (actual − forecast) / actual.
                </p>
              </DataPanel>

              {chartData?.stage2?.length ? (
                <DataPanel title="Stage 2 vs Stage 3 — Daily Penalty Comparison">
                  <Stage2VsStage3PenaltyChart stage2Data={chartData.stage2} stage3Data={chartData.stage3} />
                  <p className="mt-3 text-[11px] text-foreground/40 leading-relaxed">
                    Same test period: red dashed = Stage 2 (post–regime shift); green = Stage 3 (constrained optimization). Shows where the targeted buffer reduced daily penalty.
                  </p>
                </DataPanel>
              ) : null}
            </>
          ) : null}
        </div>
      </Section>

      <div className="section-divider" />

      {/* Decision Memo */}
      <Section
        id="verdict"
        eyebrow="Decision Memo"
        title="Final Verdict"
        subtitle="The one-page strategic recommendation distilled from three stages of rigorous analysis."
      >
        <div className="grid lg:grid-cols-5 gap-12">
          <div className="lg:col-span-3 space-y-0">
            {[
              {
                q: "What fundamentally changed after the regime shift?",
                a: "Peak under-forecast penalty escalated 50% (Rs. 4→6/kWh), shifting optimal quantile from Q67 to Q75. Out-of-time test data (May–Jun 2021) introduced elevated volatility; RMSE jumped ~17×. The regime shift, not the regulatory change alone, drove penalty increase.",
              },
              {
                q: "What trade-offs were accepted?",
                a: "Stage 3 adaptive strategy (Q67 off-peak, Q75 + adaptive buffer at peak) trades penalty level against C2 compliance. Current run: total penalty and C2 violation count are driven by the Phase 3 output (Forecast_S3_Adaptive, Penalty_S3_INR, C2_Violation). Remaining violations in extreme events (e.g. Cyclone Tauktae) are force majeure at 48h horizon.",
              },
              {
                q: "What is the final recommendation?",
                a: "Deploy Stage 3 adaptive hybrid: Q67 off-peak, Q75 + adaptive buffer during peak (6–10 PM) per the GRIDSHIELD Stage 3 forecast. Strategy satisfies board directives to the extent reflected in the C2_Violation and penalty outputs. Maintain monitoring for extreme weather; consider force majeure clauses for cyclone-class outliers.",
              },
              {
                q: "What risks remain?",
                a: "Residual risk: extreme weather (cyclones, heat waves) can breach C2. Mitigation: real-time weather integration, dynamic buffer adjustment. Sensitivity: ±10% buffer change yields ~2% penalty variance. Confidence in recommendation: high given constraint compliance.",
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                className="py-7 border-b border-border/30 group"
              >
                <div className="flex gap-5">
                  <span className="font-serif text-lg text-gold/25 font-bold mt-0.5 shrink-0 group-hover:text-gold/50 transition-colors">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h4 className="font-serif text-lg font-semibold mb-2 text-foreground/90">
                      {item.q}
                    </h4>
                    <p className="text-sm text-foreground/40 leading-relaxed">{item.a}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="lg:col-span-2">
            <div className="glass-card-gold rounded-sm p-8 sticky top-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-2 h-2 rounded-full bg-gold" />
                <p className="font-mono text-[10px] tracking-[0.25em] uppercase text-gold/60">
                  Recommendation
                </p>
              </div>
              <p className="font-serif text-2xl font-bold text-foreground/90 mb-4 leading-snug">
                Q67 Off-Peak + Q75 + S3 Adaptive (Peak)
              </p>
              <p className="text-sm text-foreground/40 leading-relaxed mb-6">
                Final constrained strategy uses Forecast_S3_Adaptive. Total penalty{" "}
                {summary ? formatINR(summary.stage3.totalPenalty) : "—"}
                {summary?.stage3?.stage2Penalty != null && summary.stage3.stage2Penalty > 0
                  ? ` (${(((summary.stage3.totalPenalty / summary.stage3.stage2Penalty) - 1) * 100).toFixed(1)}% vs Stage 2)`
                  : ""}. C2 violations: {summary ? `${summary.stage3.peakViolationsOver5Pct} intervals` : "—"} (max 3 allowed).
              </p>
              <div className="gold-line w-full mb-6" />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="font-mono text-[9px] tracking-wider uppercase text-gold/40">
                    C2 Compliance
                  </p>
                  <p className="font-serif text-xl font-bold text-gold">
                    {summary ? `${summary.stage3.peakViolationsOver5Pct}/3` : "—"}
                  </p>
                </div>
                <div>
                  <p className="font-mono text-[9px] tracking-wider uppercase text-gold/40">
                    Total Penalty
                  </p>
                  <p className="font-serif text-xl font-bold text-foreground/70">
                    {summary ? formatINR(summary.stage3.totalPenalty) : "—"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* Footer */}
      <div className="section-divider" />
      <footer className="py-16 border-t border-border/30">
        <div className="container max-w-7xl mx-auto px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-4">
              <div className="w-8 h-[1px] bg-gold/40" />
              <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-foreground/40">
                Decode X 2026 — N. L. Dalmia Institute of Management Studies & Research
              </p>
            </div>
            <p className="font-mono text-[10px] text-foreground/30 tracking-wider">
              GRIDSHIELD | Forecast Risk Advisory Team
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
