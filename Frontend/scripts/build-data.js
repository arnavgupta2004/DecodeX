/**
 * Build data JSON from GRIDSHIELD forecast CSVs
 * Run: node scripts/build-data.js
 * Reads from ../Phase 1, ../Phase 2, ../Phase 3
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");

function parseCSV(text) {
  const lines = text.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim());
    const row = {};
    headers.forEach((h, i) => {
      row[h] = values[i] ?? "";
    });
    return row;
  });
}

function num(v) {
  const n = parseFloat(String(v).replace(/[^0-9.-]/g, ""));
  return isNaN(n) ? 0 : n;
}

// Stage 1
const s1Path = path.join(ROOT, "Phase 1", "GRIDSHIELD_Forecast_Output.csv");
const s1Raw = fs.readFileSync(s1Path, "utf-8");
const s1 = parseCSV(s1Raw);

const s1Actual = s1.map((r) => num(r.Actual_Load_kW));
const s1Forecast = s1.map((r) => num(r.Forecast_Hybrid_kW));
const s1Penalty = s1.map((r) => num(r.Penalty_INR));
const s1Deviation = s1.map((r) => num(r.Deviation_kW));

const s1TotalPenalty = s1Penalty.reduce((a, b) => a + b, 0);

// Recompute naive penalty for Stage 1
let s1NaiveTotal = 0;
s1.forEach((r) => {
  const actual = num(r.Actual_Load_kW);
  const naive = num(r.Forecast_Naive_kW);
  const dev = actual - naive;
  const kwh = Math.abs(dev) * 0.25;
  const isPeak = num(r.Is_Peak) === 1;
  const rate = dev > 0 ? (isPeak ? 4 : 4) : 2;
  s1NaiveTotal += kwh * rate;
});

const s1RMSE = Math.sqrt(
  s1Deviation.reduce((a, d) => a + d * d, 0) / s1Deviation.length
);
const s1MAPE =
  (s1Actual.reduce((a, v, i) => a + Math.abs((v - s1Forecast[i]) / (v || 1)), 0) /
    s1.length) *
  100;

// Stage 2
const s2Path = path.join(ROOT, "Phase 2", "GRIDSHIELD_Stage2_Forecast.csv");
const s2Raw = fs.readFileSync(s2Path, "utf-8");
const s2 = parseCSV(s2Raw);

const s2Penalty = s2.map((r) => num(r.Penalty_Stage2_INR));
const s2TotalPenalty = s2Penalty.reduce((a, b) => a + b, 0);
const s2Actual = s2.map((r) => num(r.Actual_Load_kW));
const s2Forecast = s2.map((r) => num(r.Forecast_Hybrid_kW));
const s2Deviation = s2.map((r) => num(r.Deviation_kW));
const s2RMSE = Math.sqrt(
  s2Deviation.reduce((a, d) => a + d * d, 0) / s2Deviation.length
);

// Stage 3
const s3Path = path.join(ROOT, "Phase 3", "GRIDSHIELD_Stage3_Forecast.csv");
const s3Raw = fs.readFileSync(s3Path, "utf-8");
const s3 = parseCSV(s3Raw);

const s3Penalty = s3.map((r) => num(r.Penalty_Stage3_INR));
const s3TotalPenalty = s3Penalty.reduce((a, b) => a + b, 0);
const s3PenaltyS2 = s3.map((r) => num(r.Penalty_Stage2_INR));
const s3TotalPenaltyS2 = s3PenaltyS2.reduce((a, b) => a + b, 0);
const s3Naive = s3.map((r) => num(r.Penalty_Naive_INR));
const s3NaiveTotal = s3Naive.reduce((a, b) => a + b, 0);

// Peak violations (Stage 3)
const s3Peak = s3.filter((r) => num(r.Is_Peak_Hour) === 1);
const s3PeakViolations = s3Peak.filter((r) => num(r.Peak_Underest_Pct) > 5).length;

// Aggregated chart data - sample by day for Stage 1 (too many points)
const s1ByDay = {};
s1.forEach((r) => {
  const dt = r.DateTime?.slice(0, 10) || "";
  if (!dt) return;
  if (!s1ByDay[dt]) {
    s1ByDay[dt] = { date: dt, actual: 0, forecast: 0, penalty: 0, count: 0 };
  }
  s1ByDay[dt].actual += num(r.Actual_Load_kW);
  s1ByDay[dt].forecast += num(r.Forecast_Hybrid_kW);
  s1ByDay[dt].penalty += num(r.Penalty_INR);
  s1ByDay[dt].count += 1;
});
const s1ChartData = Object.values(s1ByDay)
  .sort((a, b) => a.date.localeCompare(b.date))
  .map((d) => ({
    date: d.date,
    actual: Math.round(d.actual / d.count),
    forecast: Math.round(d.forecast / d.count),
    penalty: Math.round(d.penalty),
  }))
  .slice(-60); // last 60 days

// Stage 2 chart - by day
const s2ByDay = {};
s2.forEach((r) => {
  const dt = r.DateTime?.slice(0, 10) || "";
  if (!dt) return;
  if (!s2ByDay[dt]) {
    s2ByDay[dt] = { date: dt, actual: 0, forecast: 0, penalty: 0, count: 0 };
  }
  s2ByDay[dt].actual += num(r.Actual_Load_kW);
  s2ByDay[dt].forecast += num(r.Forecast_Hybrid_kW);
  s2ByDay[dt].penalty += num(r.Penalty_Stage2_INR);
  s2ByDay[dt].count += 1;
});
const s2ChartData = Object.values(s2ByDay)
  .sort((a, b) => a.date.localeCompare(b.date))
  .map((d) => ({
    date: d.date,
    actual: Math.round(d.actual / d.count),
    forecast: Math.round(d.forecast / d.count),
    penalty: Math.round(d.penalty),
  }));

// Stage 3 chart
const s3ByDay = {};
s3.forEach((r) => {
  const dt = r.DateTime?.slice(0, 10) || "";
  if (!dt) return;
  if (!s3ByDay[dt]) {
    s3ByDay[dt] = { date: dt, actual: 0, forecast: 0, penalty: 0, count: 0 };
  }
  s3ByDay[dt].actual += num(r.Actual_Load_kW);
  s3ByDay[dt].forecast += num(r.Forecast_Stage3_kW);
  s3ByDay[dt].penalty += num(r.Penalty_Stage3_INR);
  s3ByDay[dt].count += 1;
});
const s3ChartData = Object.values(s3ByDay)
  .sort((a, b) => a.date.localeCompare(b.date))
  .map((d) => ({
    date: d.date,
    actual: Math.round(d.actual / d.count),
    forecast: Math.round(d.forecast / d.count),
    penalty: Math.round(d.penalty),
  }));

// Stage 1 naive penalty - use actual formula
let naiveTotal = 0;
s1.forEach((r) => {
  const actual = num(r.Actual_Load_kW);
  const naive = num(r.Forecast_Naive_kW);
  const dev = actual - naive;
  const kwh = Math.abs(dev) * 0.25;
  const isPeak = num(r.Is_Peak) === 1;
  const rate = dev > 0 ? 4 : 2;
  naiveTotal += kwh * rate;
});

const penaltyReduction = ((1 - s1TotalPenalty / naiveTotal) * 100).toFixed(1);

// ─── Hourly load profile (Stage 1 — stable training baseline, 24 bars) ───────
const hourBuckets = {};
s1.forEach((r) => {
  const h = parseInt(r.Hour ?? "0", 10);
  if (!hourBuckets[h]) hourBuckets[h] = { sum: 0, count: 0 };
  hourBuckets[h].sum += num(r.Actual_Load_kW);
  hourBuckets[h].count += 1;
});
const hourlyProfile = Array.from({ length: 24 }, (_, h) => ({
  hour: h,
  label: `${String(h).padStart(2, "0")}:00`,
  avgLoad: Math.round((hourBuckets[h]?.sum ?? 0) / (hourBuckets[h]?.count || 1)),
  isPeak: h >= 18 && h <= 21 ? 1 : 0,
}));

// ─── Peak vs Off-Peak penalty breakdown per stage ─────────────────────────────
const s1PeakPen = s1.filter((r) => num(r.Is_Peak) === 1).reduce((a, r) => a + num(r.Penalty_INR), 0);
const s1OPPen   = s1.filter((r) => num(r.Is_Peak) !== 1).reduce((a, r) => a + num(r.Penalty_INR), 0);
const s2PeakPen = s2.filter((r) => num(r.Is_Peak_Hour) === 1).reduce((a, r) => a + num(r.Penalty_Stage2_INR), 0);
const s2OPPen   = s2.filter((r) => num(r.Is_Peak_Hour) !== 1).reduce((a, r) => a + num(r.Penalty_Stage2_INR), 0);
const s3PeakPen = s3.filter((r) => num(r.Is_Peak_Hour) === 1).reduce((a, r) => a + num(r.Penalty_Stage3_INR), 0);
const s3OPPen   = s3.filter((r) => num(r.Is_Peak_Hour) !== 1).reduce((a, r) => a + num(r.Penalty_Stage3_INR), 0);
const peakBreakdown = [
  { stage: "Stage 1", peak: Math.round(s1PeakPen), offPeak: Math.round(s1OPPen) },
  { stage: "Stage 2", peak: Math.round(s2PeakPen), offPeak: Math.round(s2OPPen) },
  { stage: "Stage 3", peak: Math.round(s3PeakPen), offPeak: Math.round(s3OPPen) },
];

// ─── Daily volatility — last 60 days Stage 1 + all Stage 2 (regime shift) ────
const dailyLoads = {};
s1.slice(-5760).forEach((r) => {            // 5760 = 60 days × 96 intervals
  const dt = r.DateTime?.slice(0, 10) ?? "";
  if (!dt) return;
  if (!dailyLoads[dt]) dailyLoads[dt] = { loads: [], stage: "Stage 1" };
  dailyLoads[dt].loads.push(num(r.Actual_Load_kW));
});
s2.forEach((r) => {
  const dt = r.DateTime?.slice(0, 10) ?? "";
  if (!dt) return;
  if (!dailyLoads[dt]) dailyLoads[dt] = { loads: [], stage: "Stage 2" };
  dailyLoads[dt].loads.push(num(r.Actual_Load_kW));
});
const volatilityData = Object.entries(dailyLoads)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([date, { loads, stage }]) => {
    const mean = loads.reduce((a, v) => a + v, 0) / loads.length;
    const std  = Math.sqrt(loads.reduce((a, v) => a + (v - mean) ** 2, 0) / loads.length);
    return { date, mean: Math.round(mean), std: Math.round(std), stage };
  });

const output = {
  summary: {
    stage1: {
      totalPenalty: Math.round(s1TotalPenalty),
      naivePenalty: Math.round(naiveTotal),
      penaltyReductionPct: parseFloat(penaltyReduction),
      mape: s1MAPE.toFixed(2),
      rmse: s1RMSE.toFixed(2),
      intervals: s1.length,
    },
    stage2: {
      totalPenalty: Math.round(s2TotalPenalty),
      rmse: s2RMSE.toFixed(2),
      intervals: s2.length,
    },
    stage3: {
      totalPenalty: Math.round(s3TotalPenalty),
      stage2Penalty: Math.round(s3TotalPenaltyS2),
      naivePenalty: Math.round(s3NaiveTotal),
      penaltyReductionVsNaive: (
        (1 - s3TotalPenalty / s3NaiveTotal) *
        100
      ).toFixed(1),
      peakViolationsOver5Pct: s3PeakViolations,
      intervals: s3.length,
    },
  },
  chartData: {
    stage1: s1ChartData,
    stage2: s2ChartData,
    stage3: s3ChartData,
  },
  penaltyByStage: [
    { stage: "Stage 1", penalty: Math.round(s1TotalPenalty), label: "Baseline" },
    { stage: "Stage 2", penalty: Math.round(s2TotalPenalty), label: "Post-Regime Shift" },
    { stage: "Stage 3", penalty: Math.round(s3TotalPenalty), label: "Constrained" },
  ],
  hourlyProfile,
  peakBreakdown,
  volatilityData,
};

const outDir = path.join(__dirname, "..", "public", "data");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  path.join(outDir, "dashboard.json"),
  JSON.stringify(output, null, 2),
  "utf-8"
);

console.log("Built dashboard.json successfully");
console.log("Stage 1 penalty:", output.summary.stage1.totalPenalty);
console.log("Stage 2 penalty:", output.summary.stage2.totalPenalty);
console.log("Stage 3 penalty:", output.summary.stage3.totalPenalty);
