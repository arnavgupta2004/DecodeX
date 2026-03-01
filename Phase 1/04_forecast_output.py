"""
═══════════════════════════════════════════════════════════════════════════════
GRIDSHIELD | Stage 1 — Forecast Output Generation
═══════════════════════════════════════════════════════════════════════════════
NLD Synapse 2026 | N.L. Dalmia Institute
Team: Forecast Risk Advisory Team

Description:
    Generates the final forecast output CSV containing:
    - Actual vs forecast (Mean, Q67, Hybrid) for the validation period
    - Deviation (kW) and Penalty (Rs.) per interval
    - Forecast type label (peak vs off-peak strategy)

    Also produces a summary statistics printout.

Input:
    - val_with_penalties.csv : Validation predictions + penalties

Output:
    - GRIDSHIELD_Forecast_Output.csv : Final deliverable forecast file
═══════════════════════════════════════════════════════════════════════════════
"""

import pandas as pd
import numpy as np
import warnings
warnings.filterwarnings('ignore')


def generate_forecast_output(input_csv: str, output_csv: str) -> pd.DataFrame:
    """
    Build clean forecast output from model predictions.
    
    Applies the HYBRID strategy:
        - Peak hours (PEAK_Flag=1) → Q67 Model (cost-optimal upward bias)
        - Off-peak hours           → Mean Model (minimum RMSE)
    
    Args:
        input_csv  : Path to val_with_penalties.csv
        output_csv : Output path for final forecast CSV
    
    Returns:
        Forecast output DataFrame
    """
    print("Loading predictions...")
    val = pd.read_csv(input_csv, low_memory=False)
    val['DATETIME_PARSED'] = pd.to_datetime(val['DATETIME_PARSED'])

    # Build clean output dataframe
    out = val[['DATETIME_PARSED', 'HOUR', 'PEAK_Flag', 'LOAD',
               'pred_mean', 'pred_q67', 'pred_naive']].copy()
    out.columns = ['DateTime', 'Hour', 'Is_Peak',
                   'Actual_Load_kW', 'Forecast_Mean_kW',
                   'Forecast_Q67_kW', 'Forecast_Naive_kW']

    # ── Enforce guideline peak definition: 6PM–10PM = 18:00–21:59 (NOT including 22:00) ──
    out['Is_Peak'] = ((out['Hour'] >= 18) & (out['Hour'] < 22)).astype(int)

    # Hybrid strategy
    out['Forecast_Hybrid_kW'] = np.where(
        out['Is_Peak'] == 1,
        out['Forecast_Q67_kW'],
        out['Forecast_Mean_kW']
    )
    out['Forecast_Type'] = np.where(out['Is_Peak'] == 1, 'Q67 (Peak)', 'Mean (Off-Peak)')

    # Deviation and penalty on hybrid
    out['Deviation_kW'] = out['Actual_Load_kW'] - out['Forecast_Hybrid_kW']
    kwh_dev = np.abs(out['Deviation_kW']) * 0.25
    out['Penalty_INR'] = np.where(
        out['Deviation_kW'] > 0,  # under-forecast
        kwh_dev * 4,
        kwh_dev * 2               # over-forecast
    )
    out['Forecast_Direction'] = np.where(
        out['Deviation_kW'] > 0, 'Under-forecast', 'Over-forecast'
    )

    out.to_csv(output_csv, index=False)
    print(f"Saved: {output_csv}")
    return out


def print_forecast_summary(out: pd.DataFrame) -> None:
    """Print a clean summary of forecast performance (all 5 mandatory metrics)."""
    actual   = out['Actual_Load_kW'].values
    forecast = out['Forecast_Hybrid_kW'].values
    naive_fc = out['Forecast_Naive_kW'].values
    penalty  = out['Penalty_INR'].values
    is_peak  = out['Is_Peak'].values == 1

    rmse     = np.sqrt(np.mean((actual - forecast) ** 2))
    mae      = np.mean(np.abs(actual - forecast))
    mape     = np.mean(np.abs((actual - forecast) / actual)) * 100
    bias     = (forecast - actual).mean()
    bias_pct = bias / actual.mean() * 100
    p95_dev  = np.percentile(np.abs(actual - forecast), 95)

    # Naive baseline penalty (Rs.4 under / Rs.2 over, flat)
    naive_kwh = np.abs(actual - naive_fc) * 0.25
    naive_pen = np.where(actual > naive_fc, naive_kwh * 4, naive_kwh * 2).sum()
    pen_reduction_pct = (1 - penalty.sum() / naive_pen) * 100

    print("\n" + "="*60)
    print("GRIDSHIELD — STAGE 1 FORECAST OUTPUT SUMMARY")
    print("="*60)
    print(f"Forecast period      : {out['DateTime'].min()} → {out['DateTime'].max()}")
    print(f"Total intervals      : {len(out):,}")
    print(f"Peak intervals       : {is_peak.sum():,} ({is_peak.mean()*100:.1f}%)")
    print()
    print("── Mandatory Metrics (Hybrid Strategy) ──────────────────")
    print(f"Total ABT Penalty    : Rs. {penalty.sum():>12,.0f}")
    print(f"Peak-Hour Penalty    : Rs. {penalty[is_peak].sum():>12,.0f}")
    print(f"Off-Peak Penalty     : Rs. {penalty[~is_peak].sum():>12,.0f}")
    print(f"Forecast Bias        : {bias:+.3f} kW  ({bias_pct:+.4f}%)")
    print(f"95th Pct Abs Dev     : {p95_dev:.2f} kW")
    print()
    print("── Penalty Reduction vs Naive Baseline ──────────────────")
    print(f"Naive Baseline Total : Rs. {naive_pen:>12,.0f}")
    print(f"Hybrid Reduction     : {pen_reduction_pct:.1f}%  (Rs. {naive_pen - penalty.sum():,.0f} saved)")
    print()
    print("── Accuracy Metrics ──────────────────────────────────────")
    print(f"RMSE                 : {rmse:.2f} kW")
    print(f"MAE                  : {mae:.2f} kW")
    print(f"MAPE                 : {mape:.3f}%")
    print()
    print("── Forecast Direction Split ──────────────────────────────")
    direction = out['Forecast_Direction'].value_counts()
    for d, c in direction.items():
        print(f"  {d:<20}: {c:,} ({c/len(out)*100:.1f}%)")
    print("="*60)


if __name__ == '__main__':
    out = generate_forecast_output(
        input_csv='val_with_penalties.csv',
        output_csv='GRIDSHIELD_Forecast_Output.csv'
    )
    print_forecast_summary(out)
