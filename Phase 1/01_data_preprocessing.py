"""
═══════════════════════════════════════════════════════════════════════════════
GRIDSHIELD | Stage 1 — Data Preprocessing & Feature Engineering
═══════════════════════════════════════════════════════════════════════════════
NLD Synapse 2026 | N.L. Dalmia Institute of Management Studies & Research
Case: Lumina Energy — Suburban Mumbai Distribution Zone
Team: Forecast Risk Advisory Team

Description:
    Merges Electric Load, Weather, and Event data into a unified modeling
    dataset. Adds additional feature engineering beyond the base dataset.

Input Files:
    - Electric_Load_Data_Train.csv  : DateTime, LOAD (kW)
    - final_csv.csv                 : Pre-merged dataset with base features
    
Output:
    - df_enriched.csv               : Final modeling-ready dataset

Key Design Decisions:
    - All lag features use minimum 192-interval (48h) offset to prevent
      data leakage in a 2-day-ahead forecasting task
    - COVID structural breaks encoded as distinct one-hot flags
    - Cyclical time encoding (sin/cos) avoids ordinal distance artefacts
═══════════════════════════════════════════════════════════════════════════════
"""

import pandas as pd
import numpy as np
import warnings
warnings.filterwarnings('ignore')


# ─────────────────────────────────────────────────────────────────────────────
# 1. LOAD & MERGE DATA
# ─────────────────────────────────────────────────────────────────────────────

def load_and_merge(base_csv: str, load_csv: str) -> pd.DataFrame:
    """
    Merge the pre-engineered feature CSV with the Electric Load target column.
    
    Args:
        base_csv  : Path to final_csv.csv (features dataset)
        load_csv  : Path to Electric_Load_Data_Train.csv (target)
    
    Returns:
        Merged DataFrame with LOAD column added
    """
    print("Loading base feature dataset...")
    df = pd.read_csv(base_csv, low_memory=False)
    df['DATETIME_PARSED'] = pd.to_datetime(df['DATETIME_PARSED'])
    
    print("Loading electric load data...")
    load_df = pd.read_csv(load_csv)
    # Handle SAS-style datetime format: 01APR2013:00:15:00
    load_df['DATETIME'] = pd.to_datetime(load_df['DATETIME'], format='%d%b%Y:%H:%M:%S')
    
    print("Merging on datetime...")
    merged = df.merge(load_df, left_on='DATETIME_PARSED', right_on='DATETIME', how='left')
    
    # Validate merge
    null_load = merged['LOAD'].isnull().sum()
    print(f"Shape after merge: {merged.shape}")
    print(f"LOAD null values: {null_load}")
    assert null_load == 0, f"Merge failed: {null_load} unmatched rows!"
    
    return merged.sort_values('DATETIME_PARSED').reset_index(drop=True)


# ─────────────────────────────────────────────────────────────────────────────
# 2. ADDITIONAL FEATURE ENGINEERING
# ─────────────────────────────────────────────────────────────────────────────

def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Add advanced features beyond the base dataset.
    
    Features added:
        - day_of_year, day_sin, day_cos  : Annual seasonality (cyclical)
        - month_sin, month_cos           : Monthly seasonality (cyclical)
        - interval_of_day (0-95)         : 15-min interval index
        - interval_sin, interval_cos     : Intraday cyclical encoding
        - temp_x_peak                    : Temperature × peak hour interaction
        - heat_index_x_peak              : Heat Index × peak hour interaction
        - temp_x_weekend                 : Temperature × weekend interaction
        - is_monday                      : Monday flag (distinct demand pattern)
        - Season_enc                     : Label-encoded season
        - load_t_192                     : 2-day lag (safe for 2-day-ahead)
        - rolling_mean_24h               : 24h rolling mean (lagged)
        - rolling_mean_7d                : 7-day rolling mean (lagged)
    
    NOTE: All load-based features use minimum 192-interval lag to prevent
    data leakage in a genuine 2-day-ahead forecasting scenario.
    """
    from sklearn.preprocessing import LabelEncoder
    
    print("Engineering additional features...")
    
    # Annual cyclical encoding
    df['day_of_year'] = df['DATETIME_PARSED'].dt.dayofyear
    df['day_sin'] = np.sin(2 * np.pi * df['day_of_year'] / 365.25)
    df['day_cos'] = np.cos(2 * np.pi * df['day_of_year'] / 365.25)
    
    # Monthly cyclical encoding
    df['month_sin'] = np.sin(2 * np.pi * df['MONTH'] / 12)
    df['month_cos'] = np.cos(2 * np.pi * df['MONTH'] / 12)
    
    # Intraday interval encoding (0-95 → cyclical)
    df['interval_of_day'] = df['HOUR'] * 4 + df['MINUTE'] // 15
    df['interval_sin'] = np.sin(2 * np.pi * df['interval_of_day'] / 96)
    df['interval_cos'] = np.cos(2 * np.pi * df['interval_of_day'] / 96)

    # ── PEAK_Flag: enforce guideline definition 6:00 PM – 10:00 PM (18:00–21:59) ──
    # Source CSV may include hour 22 (10 PM) as peak — override to match guidelines
    df['PEAK_Flag'] = ((df['HOUR'] >= 18) & (df['HOUR'] < 22)).astype(int)

    # Weather interaction features
    df['temp_x_peak']        = df['ACT_TEMP']        * df['PEAK_Flag']
    df['heat_index_x_peak']  = df['ACT_HEAT_INDEX']  * df['PEAK_Flag']
    df['temp_x_weekend']     = df['ACT_TEMP']         * df['Is Weekend']
    
    # Calendar flags
    df['is_monday'] = (df['DAY_NAME'] == 'Monday').astype(int)
    
    # Season label encoding
    df['Season_enc'] = LabelEncoder().fit_transform(df['Season'])
    
    # Extended lag features (safe for 2-day-ahead)
    # load_t_192 = same time exactly 2 days ago = min valid lag for 2-day ahead
    df['load_t_192'] = df['LOAD'].shift(192)
    
    # Rolling features applied to lagged series (no leakage)
    df['rolling_mean_24h'] = df['LOAD'].shift(192).rolling(96).mean()
    df['rolling_mean_7d']  = df['LOAD'].shift(672).rolling(672).mean()
    
    # Forward/backward fill remaining NaN from rolling window warmup
    df = df.ffill().bfill()
    
    print(f"Feature engineering complete. Total features: {df.shape[1]}")
    return df


# ─────────────────────────────────────────────────────────────────────────────
# 3. DATA QUALITY CHECKS
# ─────────────────────────────────────────────────────────────────────────────

def run_quality_checks(df: pd.DataFrame) -> None:
    """Run basic data quality assertions."""
    print("\n── Data Quality Report ──")
    print(f"Shape              : {df.shape}")
    print(f"Date range         : {df['DATETIME_PARSED'].min()} → {df['DATETIME_PARSED'].max()}")
    print(f"Duplicate timestamps: {df['DATETIME_PARSED'].duplicated().sum()}")
    print(f"Total null values  : {df.isnull().sum().sum()}")
    print(f"\nLoad statistics:")
    print(df['LOAD'].describe().round(2))
    
    # Lockdown period check
    lockdown_rows = df[df['Lockdown'] == 1]
    if len(lockdown_rows) > 0:
        print(f"\nLockdown period    : {lockdown_rows['DATETIME_PARSED'].min().date()} → "
              f"{lockdown_rows['DATETIME_PARSED'].max().date()} ({len(lockdown_rows):,} rows)")


# ─────────────────────────────────────────────────────────────────────────────
# 4. FEATURE COLUMN LIST
# ─────────────────────────────────────────────────────────────────────────────

# All features used in modeling (excludes load_t_1, load_t_4 — data leakage risk)
# Also excludes load_t_96 (1-day lag) as strict 2-day-ahead requires >= 192 intervals
FEATURE_COLS = [
    # Raw temporal
    'HOUR', 'MINUTE', 'MONTH', 'DAY', 'YEAR',
    # Cyclical temporal
    'hour_sin', 'hour_cos',
    'day_sin', 'day_cos',
    'month_sin', 'month_cos',
    'interval_sin', 'interval_cos',
    'interval_of_day', 'is_monday',
    # Weather
    'ACT_TEMP', 'ACT_HEAT_INDEX', 'ACT_HUMIDITY', 'ACT_RAIN', 'COOL_FACTOR',
    # Weather interactions
    'temp_x_peak', 'heat_index_x_peak', 'temp_x_weekend',
    # Calendar flags
    'Holiday_Ind', 'Is Weekend', 'PEAK_Flag', 'Season_enc',
    # COVID structural break indicators
    'Lockdown', 'Partial Work From Home (WFH)',
    'Unlock 1.0/Mission Begin Again', 'Unlock 2.0/Mission Begin Again',
    'Unlock 3.0', 'Unlock 4.0', 'Unlock 5.0', 'Unlock 6.0',
    # Rainfall event
    'Extremely Heavy Rainfall (>100 mm)',
    # Lag features (all >= 192 intervals = 48h = safe for 2-day-ahead)
    'load_t_192', 'load_t_672',
    # Rolling statistics (computed from lagged series)
    'rolling_mean_1h', 'rolling_mean_6h', 'rolling_std_6h',
    'rolling_mean_24h', 'rolling_mean_7d',
    # Difference features
    'diff_t_1', 'diff_1h',
]

TARGET_COL = 'LOAD'


# ─────────────────────────────────────────────────────────────────────────────
# 5. MAIN
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    BASE_CSV = 'final_csv.csv'
    LOAD_CSV = 'Electric_Load_Data_Train.csv'
    OUTPUT_CSV = 'df_enriched.csv'
    
    df = load_and_merge(BASE_CSV, LOAD_CSV)
    df = engineer_features(df)
    run_quality_checks(df)
    
    df.to_csv(OUTPUT_CSV, index=False)
    print(f"\nSaved enriched dataset to: {OUTPUT_CSV}")
    print(f"Rows: {len(df):,} | Columns: {df.shape[1]}")
