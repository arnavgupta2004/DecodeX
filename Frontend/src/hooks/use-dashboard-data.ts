import { useQuery } from "@tanstack/react-query";

export interface DashboardSummary {
  stage1: {
    totalPenalty: number;
    naivePenalty: number;
    penaltyReductionPct: number;
    mape: string;
    rmse: string;
    intervals: number;
  };
  stage2: {
    totalPenalty: number;
    rmse: string;
    intervals: number;
  };
  stage3: {
    totalPenalty: number;
    stage2Penalty: number;
    naivePenalty: number;
    penaltyReductionVsNaive: string;
    peakViolationsOver5Pct: number;
    intervals: number;
  };
}

export interface ChartDataPoint {
  date: string;
  actual: number;
  forecast: number;
  penalty: number;
}

export interface PenaltyByStage {
  stage: string;
  penalty: number;
  label: string;
}

export interface DashboardData {
  summary: DashboardSummary;
  chartData: {
    stage1: ChartDataPoint[];
    stage2: ChartDataPoint[];
    stage3: ChartDataPoint[];
  };
  penaltyByStage: PenaltyByStage[];
}

async function fetchDashboard(): Promise<DashboardData> {
  const res = await fetch("/data/dashboard.json");
  if (!res.ok) throw new Error("Failed to load dashboard data");
  return res.json();
}

export function useDashboardData() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchDashboard,
    staleTime: 5 * 60 * 1000,
  });
}

export function formatINR(value: number): string {
  if (value >= 100000) {
    return `₹${(value / 100000).toFixed(2)}L`;
  }
  if (value >= 1000) {
    return `₹${(value / 1000).toFixed(1)}K`;
  }
  return `₹${value.toLocaleString()}`;
}
