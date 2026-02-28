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
    """Print a clean summary of forecast performance."""
    actual   = out['Actual_Load_kW'].values
    forecast = out['Forecast_Hybrid_kW'].values
    penalty  = out['Penalty_INR'].values
    is_peak  = out['Is_Peak'].values == 1

    rmse = np.sqrt(np.mean((actual - forecast) ** 2))
    mae  = np.mean(np.abs(actual - forecast))
    mape = np.mean(np.abs((actual - forecast) / actual)) * 100
    bias = (forecast - actual).mean()

    print("\n" + "="*55)
    print("GRIDSHIELD FORECAST OUTPUT SUMMARY")
    print("="*55)
    print(f"Forecast period   : {out['DateTime'].min()} → {out['DateTime'].max()}")
    print(f"Total intervals   : {len(out):,}")
    print(f"Peak intervals    : {is_peak.sum():,} ({is_peak.mean()*100:.1f}%)")
    print()
    print("── Accuracy Metrics (Hybrid Strategy) ──")
    print(f"RMSE              : {rmse:.2f} kW")
    print(f"MAE               : {mae:.2f} kW")
    print(f"MAPE              : {mape:.3f}%")
    print(f"Forecast Bias     : {bias:+.3f} kW")
    print()
    print("── ABT Penalty (Hybrid Strategy) ──")
    print(f"Total Penalty     : Rs. {penalty.sum():,.0f}")
    print(f"Peak Penalty      : Rs. {penalty[is_peak].sum():,.0f}")
    print(f"Off-Peak Penalty  : Rs. {penalty[~is_peak].sum():,.0f}")
    print()
    print("── Forecast Direction Split ──")
    direction = out['Forecast_Direction'].value_counts()
    for d, c in direction.items():
        print(f"  {d:<20}: {c:,} ({c/len(out)*100:.1f}%)")
    print("="*55)


if __name__ == '__main__':
    out = generate_forecast_output(
        input_csv='val_with_penalties.csv',
        output_csv='GRIDSHIELD_Forecast_Output.csv'
    )
    print_forecast_summary(out)
