"""
═══════════════════════════════════════════════════════════════════════════════
GRIDSHIELD | Stage 1 — Model Training, Backtesting & Penalty Evaluation
═══════════════════════════════════════════════════════════════════════════════
NLD Synapse 2026 | N.L. Dalmia Institute
Team: Forecast Risk Advisory Team

Description:
    Trains the cost-aware forecasting models and evaluates them on a
    temporal holdout validation set. Computes ABT deviation penalties
    for all model variants vs the naive baseline.

Key Design Choices:
    ① HistGradientBoostingRegressor — fast, handles missing values, 
       supports quantile loss natively
    ② Quantile q=0.667 — theoretically optimal for Rs.4/Rs.2 penalty ratio
    ③ Strict temporal split (80/20) — no data leakage
    ④ Hybrid strategy: Q67 during peak, Mean model off-peak

Input:
    - df_enriched.csv : Enriched dataset from 01_data_preprocessing.py

Output:
    - val_predictions.csv    : Validation set with all model predictions
    - val_with_penalties.csv : Above + penalty calculations
    - models.pkl             : Serialized trained models
═══════════════════════════════════════════════════════════════════════════════
"""

import pandas as pd
import numpy as np
import pickle
import warnings
warnings.filterwarnings('ignore')

from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.metrics import mean_squared_error, mean_absolute_error


# ─────────────────────────────────────────────────────────────────────────────
# FEATURE COLUMNS (see 01_data_preprocessing.py for full documentation)
# ─────────────────────────────────────────────────────────────────────────────

FEATURE_COLS = [
    'HOUR', 'MINUTE', 'MONTH', 'DAY', 'YEAR',
    'hour_sin', 'hour_cos', 'day_sin', 'day_cos',
    'month_sin', 'month_cos', 'interval_sin', 'interval_cos',
    'interval_of_day', 'is_monday',
    'ACT_TEMP', 'ACT_HEAT_INDEX', 'ACT_HUMIDITY', 'ACT_RAIN', 'COOL_FACTOR',
    'temp_x_peak', 'heat_index_x_peak', 'temp_x_weekend',
    'Holiday_Ind', 'Is Weekend', 'PEAK_Flag', 'Season_enc',
    'Lockdown', 'Partial Work From Home (WFH)',
    'Unlock 1.0/Mission Begin Again', 'Unlock 2.0/Mission Begin Again',
    'Unlock 3.0', 'Unlock 4.0', 'Unlock 5.0', 'Unlock 6.0',
    'Extremely Heavy Rainfall (>100 mm)',
    'load_t_192', 'load_t_672',
    'rolling_mean_1h', 'rolling_mean_6h', 'rolling_std_6h',
    'rolling_mean_24h', 'rolling_mean_7d',
    'diff_t_1', 'diff_1h',
]

TARGET_COL = 'LOAD'


# ─────────────────────────────────────────────────────────────────────────────
# PENALTY CALCULATION
# ─────────────────────────────────────────────────────────────────────────────

def compute_abt_penalty(actual: np.ndarray, forecast: np.ndarray) -> np.ndarray:
    """
    Compute ABT deviation penalties per interval.
    
    Penalty structure:
        Under-forecast (actual > forecast) : Rs. 4 per kWh deviation
        Over-forecast  (forecast > actual) : Rs. 2 per kWh deviation
    
    Each 15-min interval = 0.25 hours, so kW deviation → kWh by × 0.25
    
    Args:
        actual   : Array of actual load values (kW)
        forecast : Array of forecast values (kW)
    
    Returns:
        Array of penalties (Rs.) per interval
    """
    deviation = actual - forecast           # positive = under-forecast
    kwh_deviation = np.abs(deviation) * 0.25  # convert kW to kWh (15-min interval)
    penalty = np.where(deviation > 0, kwh_deviation * 4, kwh_deviation * 2)
    return penalty


# ─────────────────────────────────────────────────────────────────────────────
# MODEL TRAINING
# ─────────────────────────────────────────────────────────────────────────────

def train_models(X_train: np.ndarray, y_train: np.ndarray) -> dict:
    """
    Train three model variants:
    
    1. Mean Model     : Minimizes MSE → unbiased, minimum RMSE
    2. Q67 Model      : Quantile q=0.667 → optimal for Rs.4/Rs.2 cost ratio
    3. Q55 Model      : Quantile q=0.55  → mild upward bias for off-peak

    Theoretical justification for q=0.667:
        Under newsvendor loss with asymmetric costs c_u and c_o, the 
        optimal quantile is q* = c_u / (c_u + c_o) = 4/(4+2) = 0.667.
        Any model targeting the conditional mean (q=0.5) is solving 
        the wrong objective for this problem.
    
    Args:
        X_train : Feature matrix (n_samples, n_features)
        y_train : Target vector (n_samples,)
    
    Returns:
        Dictionary of trained model objects
    """
    base_params = dict(
        max_iter=600,
        learning_rate=0.05,
        max_depth=8,
        min_samples_leaf=20,
        l2_regularization=0.1,
        random_state=42,
        early_stopping=True,
        validation_fraction=0.1,
        n_iter_no_change=25,
    )

    models = {}

    # Mean model (MSE loss)
    print("Training Mean Model (MSE loss)...")
    models['mean'] = HistGradientBoostingRegressor(**base_params)
    models['mean'].fit(X_train, y_train)

    # Q67 quantile model (cost-optimal)
    print("Training Q67 Model (quantile loss, q=0.667)...")
    models['q67'] = HistGradientBoostingRegressor(
        loss='quantile', quantile=0.67, **base_params
    )
    models['q67'].fit(X_train, y_train)

    print("Model training complete.")
    return models


# ─────────────────────────────────────────────────────────────────────────────
# EVALUATION
# ─────────────────────────────────────────────────────────────────────────────

def evaluate_models(models: dict, X_val: np.ndarray, y_val: np.ndarray,
                    val_df: pd.DataFrame) -> pd.DataFrame:
    """
    Generate predictions and compute accuracy + penalty metrics.
    
    Returns DataFrame with predictions and penalties appended.
    """
    val_df = val_df.copy()
    actual = y_val

    # Predictions
    val_df['pred_mean']  = models['mean'].predict(X_val)
    val_df['pred_q67']   = models['q67'].predict(X_val)
    val_df['pred_naive'] = val_df['load_t_192'].values   # 2-day-ago same interval

    # Penalties
    val_df['pen_mean']   = compute_abt_penalty(actual, val_df['pred_mean'].values)
    val_df['pen_q67']    = compute_abt_penalty(actual, val_df['pred_q67'].values)
    val_df['pen_naive']  = compute_abt_penalty(actual, val_df['pred_naive'].values)

    # Hybrid: Q67 during peak, Mean off-peak
    val_df['pred_hybrid'] = np.where(
        val_df['PEAK_Flag'] == 1,
        val_df['pred_q67'],
        val_df['pred_mean']
    )
    val_df['pen_hybrid'] = compute_abt_penalty(actual, val_df['pred_hybrid'].values)

    return val_df


# ─────────────────────────────────────────────────────────────────────────────
# BACKTEST REPORT
# ─────────────────────────────────────────────────────────────────────────────

def print_backtest_report(val_df: pd.DataFrame) -> None:
    """Print the full mandatory backtest metrics report."""
    actual    = val_df['LOAD'].values
    peak_mask = val_df['PEAK_Flag'].values == 1

    print("\n" + "="*65)
    print("GRIDSHIELD — STAGE 1 BACKTEST METRICS REPORT")
    print("="*65)
    print(f"Validation period : {val_df['DATETIME_PARSED'].min().date()} → "
          f"{val_df['DATETIME_PARSED'].max().date()}")
    print(f"Total intervals   : {len(val_df):,}")
    print(f"Peak intervals    : {peak_mask.sum():,}")
    print()

    configs = [
        ('Naive Baseline (2-day lag)',   'pred_naive', 'pen_naive'),
        ('Mean Model (MSE)',             'pred_mean',  'pen_mean'),
        ('Q67 Model (cost-optimal)',     'pred_q67',   'pen_q67'),
        ('Hybrid (Q67 peak / Mean off)', 'pred_hybrid','pen_hybrid'),
    ]

    for name, pred_col, pen_col in configs:
        forecast = val_df[pred_col].values
        penalty  = val_df[pen_col].values

        total_pen   = penalty.sum()
        peak_pen    = penalty[peak_mask].sum()
        offpeak_pen = penalty[~peak_mask].sum()
        bias        = (forecast - actual).mean()
        bias_pct    = bias / actual.mean() * 100
        p95_dev     = np.percentile(np.abs(actual - forecast), 95)
        rmse        = np.sqrt(mean_squared_error(actual, forecast))
        mae         = mean_absolute_error(actual, forecast)
        mape        = np.mean(np.abs((actual - forecast) / actual)) * 100

        print(f"  [{name}]")
        print(f"    Total Deviation Penalty   : Rs. {total_pen:>12,.0f}")
        print(f"    Peak-Hour Penalty         : Rs. {peak_pen:>12,.0f}")
        print(f"    Off-Peak Penalty          : Rs. {offpeak_pen:>12,.0f}")
        print(f"    Forecast Bias             : {bias:+.3f} kW ({bias_pct:+.4f}%)")
        print(f"    95th Pct Abs Deviation    : {p95_dev:.1f} kW")
        print(f"    RMSE                      : {rmse:.2f} kW")
        print(f"    MAE                       : {mae:.2f} kW")
        print(f"    MAPE                      : {mape:.3f}%")

        naive_pen = val_df['pen_naive'].sum()
        if pen_col != 'pen_naive':
            reduction = (1 - total_pen / naive_pen) * 100
            saved     = naive_pen - total_pen
            print(f"    Penalty Reduction vs Naive: {reduction:.1f}%  (Rs. {saved:,.0f} saved)")
        print()

    print("="*65)


# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    INPUT_CSV = 'df_enriched.csv'
    
    print("Loading enriched dataset...")
    df = pd.read_csv(INPUT_CSV, low_memory=False)
    df['DATETIME_PARSED'] = pd.to_datetime(df['DATETIME_PARSED'])
    df = df.sort_values('DATETIME_PARSED').reset_index(drop=True)

    # ── Train / validation split (temporal, no shuffling) ──
    n = len(df)
    train_end = int(n * 0.80)

    X = df[FEATURE_COLS].values
    y = df[TARGET_COL].values

    X_train, X_val = X[:train_end], X[train_end:]
    y_train, y_val = y[:train_end], y[train_end:]
    val_df = df.iloc[train_end:].reset_index(drop=True)

    print(f"\nTrain set: {train_end:,} rows | "
          f"{df['DATETIME_PARSED'].iloc[0].date()} → {df['DATETIME_PARSED'].iloc[train_end-1].date()}")
    print(f"Val set  : {n-train_end:,} rows | "
          f"{df['DATETIME_PARSED'].iloc[train_end].date()} → {df['DATETIME_PARSED'].iloc[-1].date()}")

    # ── Train ──
    models = train_models(X_train, y_train)

    # ── Evaluate ──
    val_df = evaluate_models(models, X_val, y_val, val_df)

    # ── Report ──
    print_backtest_report(val_df)

    # ── Save outputs ──
    val_df.to_csv('val_with_penalties.csv', index=False)
    print("Saved: val_with_penalties.csv")

    with open('models.pkl', 'wb') as f:
        pickle.dump({'mean': models['mean'], 'q67': models['q67'],
                     'features': FEATURE_COLS}, f)
    print("Saved: models.pkl")
