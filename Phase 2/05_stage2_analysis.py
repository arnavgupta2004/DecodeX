"""
═══════════════════════════════════════════════════════════════════════════════
GRIDSHIELD | Stage 2 — Regime Shift & Penalty Escalation
Complete Analysis: Feature Engineering → Model Recalibration → Backtest
═══════════════════════════════════════════════════════════════════════════════
NLD Synapse 2026 | N.L. Dalmia Institute
Team: Forecast Risk Advisory Team

Stage 2 Twist Summary:
    1. REGULATORY SHOCK: Peak under-forecast penalty Rs.4 → Rs.6/kWh (+50%)
       → New optimal peak quantile: q* = 6/(6+2) = 0.750 (was 0.667)
    2. DATA SHOCK: Out-of-time test set (May–Jun 2021) with elevated volatility
       → RMSE jumps from 6.43 kW (val) to ~116 kW (test)
       → Regime shift is the dominant penalty driver, not the regulatory change

Key Changes vs Stage 1:
    - New Q75 model for peak hours (replaces Q67)
    - Retrain on FULL training set (not 80% split)
    - Proper lag context from training tail → test period
    - Stage 1 vs Stage 2 penalty comparison

Inputs:
    - df_enriched.csv               : Full enriched training data
    - Electric_Load_Data_Test.csv   : Test set actual loads
    - External_Factor_Data_Test.csv : Test set weather variables

Outputs:
    - test_features.csv             : Test feature matrix
    - test_final_predictions.csv    : All predictions + penalties
    - GRIDSHIELD_Stage2_Forecast.csv: Clean submission file
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
# CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────

FEATURE_COLS = [
    # Raw temporal
    'HOUR', 'MINUTE', 'MONTH', 'DAY', 'YEAR',
    # Cyclical temporal (sin/cos encoding avoids ordinal distance artifacts)
    'hour_sin', 'hour_cos', 'day_sin', 'day_cos',
    'month_sin', 'month_cos', 'interval_sin', 'interval_cos',
    'interval_of_day', 'is_monday',
    # Weather
    'ACT_TEMP', 'ACT_HEAT_INDEX', 'ACT_HUMIDITY', 'ACT_RAIN', 'COOL_FACTOR',
    # Interaction features
    'temp_x_peak', 'heat_index_x_peak', 'temp_x_weekend',
    # Calendar flags
    'Holiday_Ind', 'Is Weekend', 'PEAK_Flag', 'Season_enc',
    # COVID structural break indicators
    'Lockdown', 'Partial Work From Home (WFH)',
    'Unlock 1.0/Mission Begin Again', 'Unlock 2.0/Mission Begin Again',
    'Unlock 3.0', 'Unlock 4.0', 'Unlock 5.0', 'Unlock 6.0',
    # Extreme weather
    'Extremely Heavy Rainfall (>100 mm)',
    # Lag features (minimum 192 intervals = 48h, safe for 2-day-ahead)
    'load_t_192', 'load_t_672',
    # Rolling statistics (computed from lagged series — no leakage)
    'rolling_mean_1h', 'rolling_mean_6h', 'rolling_std_6h',
    'rolling_mean_24h', 'rolling_mean_7d',
    # Difference features
    'diff_t_1', 'diff_1h',
]

# ── Stage 2 penalty parameters ──
# Peak hours (18:00–21:59): under-forecast escalated to Rs. 6/kWh
# Off-peak: unchanged (under=Rs.4, over=Rs.2)
PEAK_UNDER_RATE   = 6   # Rs. per kWh — CHANGED from Stage 1 (was 4)
PEAK_OVER_RATE    = 2   # Rs. per kWh — unchanged
OFFPEAK_UNDER_RATE = 4  # Rs. per kWh — unchanged
OFFPEAK_OVER_RATE  = 2  # Rs. per kWh — unchanged

# New optimal quantile for peak (newsvendor formula: q* = c_u / (c_u + c_o))
PEAK_OPTIMAL_Q    = 6 / (6 + 2)    # = 0.750  ← NEW (Stage 1 was 0.667)
OFFPEAK_OPTIMAL_Q = 4 / (4 + 2)    # = 0.667  ← unchanged


# ─────────────────────────────────────────────────────────────────────────────
# 1. LOAD & MERGE TEST DATA
# ─────────────────────────────────────────────────────────────────────────────

def load_test_data(load_csv: str, weather_csv: str) -> pd.DataFrame:
    """Load and merge test period load + weather data."""
    load = pd.read_csv(load_csv)
    weather = pd.read_csv(weather_csv)

    load['DATETIME']    = pd.to_datetime(load['DATETIME'],    format='%d%b%Y:%H:%M:%S')
    weather['DATETIME'] = pd.to_datetime(weather['DATETIME'], format='%d%b%Y:%H:%M:%S')

    test = load.merge(weather, on='DATETIME', how='left')
    test = test.sort_values('DATETIME').reset_index(drop=True)

    print(f"Test data loaded: {len(test):,} rows")
    print(f"Date range: {test['DATETIME'].min()} → {test['DATETIME'].max()}")
    print(f"Load stats: mean={test['LOAD'].mean():.1f}, std={test['LOAD'].std():.1f} kW")
    return test


# ─────────────────────────────────────────────────────────────────────────────
# 2. FEATURE ENGINEERING FOR TEST SET
# ─────────────────────────────────────────────────────────────────────────────

def build_test_features(test: pd.DataFrame, train: pd.DataFrame) -> pd.DataFrame:
    """
    Build the full feature matrix for the test period.

    CRITICAL: Lag features must be computed correctly.
    The test period starts May 1, 2021 — immediately after training end (Apr 30, 2021).
    We append the training tail (>=672 intervals = 7 days) to the test period,
    compute lags on the combined series, then extract test rows only.
    This ensures load_t_192 and load_t_672 correctly reference actual
    historical values — no leakage, no estimation.
    """
    from sklearn.preprocessing import LabelEncoder

    # ── Temporal features
    test['HOUR']   = test['DATETIME'].dt.hour
    test['MINUTE'] = test['DATETIME'].dt.minute
    test['DAY']    = test['DATETIME'].dt.day
    test['MONTH']  = test['DATETIME'].dt.month
    test['YEAR']   = test['DATETIME'].dt.year
    test['DAY_NAME'] = test['DATETIME'].dt.day_name()

    # Cyclical encoding
    test['day_of_year']   = test['DATETIME'].dt.dayofyear
    test['day_sin']       = np.sin(2*np.pi*test['day_of_year']/365.25)
    test['day_cos']       = np.cos(2*np.pi*test['day_of_year']/365.25)
    test['month_sin']     = np.sin(2*np.pi*test['MONTH']/12)
    test['month_cos']     = np.cos(2*np.pi*test['MONTH']/12)
    test['hour_sin']      = np.sin(2*np.pi*test['HOUR']/24)
    test['hour_cos']      = np.cos(2*np.pi*test['HOUR']/24)
    test['interval_of_day'] = test['HOUR']*4 + test['MINUTE']//15
    test['interval_sin']  = np.sin(2*np.pi*test['interval_of_day']/96)
    test['interval_cos']  = np.cos(2*np.pi*test['interval_of_day']/96)

    # Calendar flags
    test['Holiday_Ind']  = 0                  # No event data for test; assumed working
    test['Is Weekend']   = test['DAY_NAME'].isin(['Saturday','Sunday']).astype(int)
    test['is_monday']    = (test['DAY_NAME'] == 'Monday').astype(int)
    test['PEAK_Flag']    = ((test['HOUR'] >= 18) & (test['HOUR'] < 22)).astype(int)
    test['Season_enc']   = 1  # May–June = Summer/Monsoon onset

    # COVID phase flags — May/June 2021 falls under Unlock 6.0 / post-unlock recovery
    covid_cols = {
        'Lockdown': 0, 'Partial Work From Home (WFH)': 0,
        'Unlock 1.0/Mission Begin Again': 0, 'Unlock 2.0/Mission Begin Again': 0,
        'Unlock 3.0': 0, 'Unlock 4.0': 0, 'Unlock 5.0': 0, 'Unlock 6.0': 1,
    }
    for col, val in covid_cols.items():
        test[col] = val

    # Extreme rainfall
    test['Extremely Heavy Rainfall (>100 mm)'] = (test['ACT_RAIN'] > 100).astype(int)

    # Weather interactions
    test['temp_x_peak']       = test['ACT_TEMP']        * test['PEAK_Flag']
    test['heat_index_x_peak'] = test['ACT_HEAT_INDEX']  * test['PEAK_Flag']
    test['temp_x_weekend']    = test['ACT_TEMP']         * test['Is Weekend']

    # ── Lag features: use training tail as context
    # Need >=672 intervals (7 days) of training history before test starts
    print("Computing lag features from training tail...")
    train_tail = train[['DATETIME_PARSED','LOAD']].tail(700).copy()
    train_tail.columns = ['DATETIME', 'LOAD']

    combined = pd.concat([train_tail, test[['DATETIME','LOAD']]], ignore_index=True)
    combined = combined.sort_values('DATETIME').reset_index(drop=True)

    combined['load_t_192']       = combined['LOAD'].shift(192)
    combined['load_t_672']       = combined['LOAD'].shift(672)
    combined['rolling_mean_1h']  = combined['LOAD'].shift(192).rolling(4).mean()
    combined['rolling_mean_6h']  = combined['LOAD'].shift(192).rolling(24).mean()
    combined['rolling_std_6h']   = combined['LOAD'].shift(192).rolling(24).std()
    combined['rolling_mean_24h'] = combined['LOAD'].shift(192).rolling(96).mean()
    combined['rolling_mean_7d']  = combined['LOAD'].shift(672).rolling(672).mean()
    combined['diff_t_1']         = combined['LOAD'].diff(1)
    combined['diff_1h']          = combined['LOAD'].diff(4)
    combined = combined.ffill().bfill()

    # Extract test rows
    test_lags = combined.tail(len(test)).reset_index(drop=True)
    lag_cols = ['load_t_192','load_t_672','rolling_mean_1h','rolling_mean_6h',
                'rolling_std_6h','rolling_mean_24h','rolling_mean_7d','diff_t_1','diff_1h']
    for col in lag_cols:
        test[col] = test_lags[col].values

    test = test.ffill().bfill()
    print(f"Test features built: {test.shape[1]} columns, {test.isnull().sum().sum()} nulls")
    return test


# ─────────────────────────────────────────────────────────────────────────────
# 3. PENALTY FUNCTIONS
# ─────────────────────────────────────────────────────────────────────────────

def compute_stage2_penalty(actual: np.ndarray, forecast: np.ndarray,
                           is_peak: np.ndarray) -> np.ndarray:
    """
    Stage 2 ABT penalty with escalated peak under-forecast rate.

    Peak hours (6PM–10PM):
        Under-forecast: Rs. 6/kWh  (INCREASED from Rs. 4)
        Over-forecast:  Rs. 2/kWh  (unchanged)
    Off-peak:
        Under-forecast: Rs. 4/kWh  (unchanged)
        Over-forecast:  Rs. 2/kWh  (unchanged)

    kW → kWh conversion: × 0.25 (15-min intervals)
    """
    deviation     = actual - forecast
    kwh_deviation = np.abs(deviation) * 0.25
    under_rate    = np.where(is_peak, PEAK_UNDER_RATE, OFFPEAK_UNDER_RATE)
    penalty       = np.where(deviation > 0, kwh_deviation * under_rate, kwh_deviation * 2)
    return penalty


def compute_stage1_penalty(actual: np.ndarray, forecast: np.ndarray) -> np.ndarray:
    """Stage 1 penalty (for comparison): flat Rs.4 under, Rs.2 over."""
    deviation     = actual - forecast
    kwh_deviation = np.abs(deviation) * 0.25
    return np.where(deviation > 0, kwh_deviation * 4, kwh_deviation * 2)


# ─────────────────────────────────────────────────────────────────────────────
# 4. MODEL TRAINING (Full Training Set)
# ─────────────────────────────────────────────────────────────────────────────

def train_stage2_models(X_train: np.ndarray, y_train: np.ndarray) -> dict:
    """
    Train Stage 2 models on the FULL training dataset.

    Stage 2 change: We no longer reserve a validation split because:
    - The test set is genuinely out-of-time (not a random holdout)
    - Maximum training signal is needed to handle the regime shift
    - Early stopping still uses 10% internal validation within training data

    Models trained:
        mean : MSE loss   — minimum RMSE, unbiased
        q67  : q=0.667    — optimal for Rs.4/Rs.2 off-peak (unchanged from S1)
        q75  : q=0.750    — NEW: optimal for Rs.6/Rs.2 peak under Stage 2 rules
    """
    base_params = dict(
        max_iter=600, learning_rate=0.05, max_depth=8, min_samples_leaf=20,
        l2_regularization=0.1, random_state=42, early_stopping=True,
        validation_fraction=0.1, n_iter_no_change=25,
    )

    models = {}

    print("Training Mean model (full training set)...")
    models['mean'] = HistGradientBoostingRegressor(**base_params)
    models['mean'].fit(X_train, y_train)

    print("Training Q67 model (off-peak optimal, q*=0.667)...")
    models['q67'] = HistGradientBoostingRegressor(loss='quantile', quantile=0.67, **base_params)
    models['q67'].fit(X_train, y_train)

    print(f"Training Q75 model (peak optimal for Stage 2, q*={PEAK_OPTIMAL_Q:.3f})...")
    models['q75'] = HistGradientBoostingRegressor(loss='quantile', quantile=0.75, **base_params)
    models['q75'].fit(X_train, y_train)

    print("All Stage 2 models trained.")
    return models


# ─────────────────────────────────────────────────────────────────────────────
# 5. BACKTEST REPORT
# ─────────────────────────────────────────────────────────────────────────────

def print_stage2_backtest(test: pd.DataFrame, actual: np.ndarray,
                          models_preds: dict, is_peak: np.ndarray,
                          val_daily_penalty: float) -> None:
    """Print the full mandatory Stage 2 backtest metrics."""
    peak_m    = is_peak == 1
    offpeak_m = ~peak_m
    n_days    = len(test) / 96

    print("\n" + "="*65)
    print("GRIDSHIELD STAGE 2 — BACKTEST METRICS REPORT")
    print("="*65)
    print(f"Test period : {test['DATETIME'].min().date()} → {test['DATETIME'].max().date()}")
    print(f"Intervals   : {len(test):,} | Peak: {peak_m.sum():,} | Days: {n_days:.1f}")
    print()
    print("Revised penalty structure:")
    print(f"  Peak under-forecast: Rs.{PEAK_UNDER_RATE}/kWh (was Rs.4)")
    print(f"  Peak over-forecast:  Rs.{PEAK_OVER_RATE}/kWh (unchanged)")
    print(f"  Off-peak under:      Rs.{OFFPEAK_UNDER_RATE}/kWh (unchanged)")
    print(f"  Off-peak over:       Rs.{OFFPEAK_OVER_RATE}/kWh (unchanged)")
    print()

    for name, pred in models_preds.items():
        pen      = compute_stage2_penalty(actual, pred, is_peak)
        total    = pen.sum()
        peak_p   = pen[peak_m].sum()
        offpk_p  = pen[offpeak_m].sum()
        bias     = (pred - actual).mean()
        bias_pct = bias / actual.mean() * 100
        p95      = np.percentile(np.abs(actual - pred), 95)
        rmse     = np.sqrt(mean_squared_error(actual, pred))
        mape     = np.mean(np.abs((actual - pred) / actual)) * 100

        print(f"  [{name}]")
        print(f"    Total Penalty:     Rs. {total:>10,.0f}  (Rs.{total/n_days:,.0f}/day)")
        print(f"    Peak Penalty:      Rs. {peak_p:>10,.0f}")
        print(f"    Off-Peak Penalty:  Rs. {offpk_p:>10,.0f}")
        print(f"    Forecast Bias:     {bias:+.3f} kW ({bias_pct:+.4f}%)")
        print(f"    95th Pct Dev:      {p95:.1f} kW")
        print(f"    RMSE:              {rmse:.2f} kW | MAPE: {mape:.3f}%")
        print()

    print("─"*65)
    print("STAGE 1 vs STAGE 2 COMPARISON:")
    print(f"  Stage 1 historical avg daily penalty: Rs. {val_daily_penalty:,.0f}")
    best_s2 = min(compute_stage2_penalty(actual, pred, is_peak).sum() / n_days
                  for pred in models_preds.values())
    print(f"  Stage 2 best model avg daily penalty: Rs. {best_s2:,.0f}")
    print(f"  Daily penalty multiplier:             {best_s2/val_daily_penalty:.1f}×")
    print(f"  Primary driver: Regime shift (volatility), not regulatory change alone")
    print("="*65)


# ─────────────────────────────────────────────────────────────────────────────
# 6. GENERATE FORECAST OUTPUT CSV
# ─────────────────────────────────────────────────────────────────────────────

def generate_stage2_output(test: pd.DataFrame, actual: np.ndarray,
                           models_preds: dict, is_peak: np.ndarray,
                           output_path: str) -> None:
    """
    Generate the Stage 2 forecast submission CSV.
    Hybrid strategy: Q75 during peak hours, Q67 during off-peak.
    """
    out = test[['DATETIME','HOUR','PEAK_Flag','LOAD']].copy()
    out.columns = ['DateTime','Hour','Is_Peak','Actual_Load_kW']

    for model_name, pred in models_preds.items():
        out[f'Forecast_{model_name}_kW'] = pred

    # Stage 2 Hybrid
    out['Forecast_Hybrid_kW'] = np.where(
        is_peak,
        models_preds.get('Q75 (Peak Optimal)', models_preds['q75']),
        models_preds.get('Q67 (Off-Peak)', models_preds['q67'])
    )
    out['Forecast_Strategy'] = np.where(is_peak, 'Q75 (Peak-Stage2)', 'Q67 (Off-Peak)')

    # Compute deviation and penalty
    out['Deviation_kW'] = out['Actual_Load_kW'] - out['Forecast_Hybrid_kW']
    kwh = np.abs(out['Deviation_kW']) * 0.25
    under_rate = np.where(is_peak, PEAK_UNDER_RATE, OFFPEAK_UNDER_RATE)
    out['Penalty_INR'] = np.where(
        out['Deviation_kW'] > 0, kwh * under_rate, kwh * 2
    )
    out['Forecast_Direction'] = np.where(
        out['Deviation_kW'] > 0, 'Under-forecast', 'Over-forecast'
    )

    out.to_csv(output_path, index=False)
    print(f"\nStage 2 forecast saved to: {output_path}")
    print(f"  Rows: {len(out):,}")
    print(f"  Total Hybrid Penalty: Rs. {out['Penalty_INR'].sum():,.0f}")
    print(f"  MAPE: {(np.abs(out['Deviation_kW'])/out['Actual_Load_kW']).mean()*100:.3f}%")


# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == '__main__':

    # ── Load full training data
    print("Loading training data...")
    train = pd.read_csv('df_enriched.csv', low_memory=False)
    train['DATETIME_PARSED'] = pd.to_datetime(train['DATETIME_PARSED'])
    X_train = train[FEATURE_COLS].values
    y_train = train['LOAD'].values
    print(f"Training set: {len(train):,} rows")

    # ── Load and prepare test data
    print("\nLoading test data...")
    test_raw = load_test_data('Electric_Load_Data_Test.csv', 'External_Factor_Data_Test.csv')
    test = build_test_features(test_raw, train)
    test.to_csv('test_features.csv', index=False)

    X_test  = test[FEATURE_COLS].values
    actual  = test['LOAD'].values
    is_peak = test['PEAK_Flag'].values

    # ── Train Stage 2 models
    print("\nTraining Stage 2 models...")
    models = train_stage2_models(X_train, y_train)

    # ── Generate predictions
    preds = {
        'Naive (2-day lag)': test['load_t_192'].values,
        'Mean Model':        models['mean'].predict(X_test),
        'Q67 (Off-Peak)':    models['q67'].predict(X_test),
        'Q75 (Peak Optimal)':models['q75'].predict(X_test),
        'Hybrid (Q75 peak/Q67 off-peak)': np.where(
            is_peak, models['q75'].predict(X_test), models['q67'].predict(X_test)
        ),
    }

    # ── Stage 1 comparison value
    val = pd.read_csv('val_with_penalties.csv', low_memory=False)
    val_s1_pred = np.where(val['PEAK_Flag'].values==1, val['pred_q67'].values, val['pred_mean'].values)
    val_s1_pen  = compute_stage1_penalty(val['LOAD'].values, val_s1_pred)
    val_daily   = val_s1_pen.sum() / (len(val) / 96)

    # ── Backtest report
    print_stage2_backtest(test, actual, preds, is_peak, val_daily)

    # ── Save forecast output
    generate_stage2_output(test, actual, preds, is_peak, 'GRIDSHIELD_Stage2_Forecast.csv')

    # ── Save full predictions with penalties
    test_out = test[['DATETIME','HOUR','PEAK_Flag','LOAD']].copy()
    for name, pred in preds.items():
        col = name.replace(' ','_').replace('/','_').replace('(','').replace(')','')
        test_out[f'pred_{col}'] = pred
        test_out[f'pen_{col}']  = compute_stage2_penalty(actual, pred, is_peak)
    test_out.to_csv('test_final_predictions.csv', index=False)
    print("All Stage 2 outputs saved.")
