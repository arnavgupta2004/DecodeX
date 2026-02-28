# GRIDSHIELD — Stage 1 Code Submission
**NLD Synapse 2026 | N.L. Dalmia Institute | Forecast Risk Advisory Team**

---

## Overview

Cost-aware 2-day-ahead load forecasting for Lumina Energy (suburban Mumbai) under Maharashtra's ABT regulatory framework. The objective is **financial penalty minimization**, not RMSE minimization.

## Key Insight

Under the asymmetric ABT penalty structure (Rs. 4/kWh under-forecast vs Rs. 2/kWh over-forecast), the optimal forecast quantile is:

```
q* = c_under / (c_under + c_over) = 4 / (4 + 2) = 0.667
```

Teams minimizing RMSE are solving the wrong objective.

## Results

| Metric | Value |
|--------|-------|
| MAPE | 0.27% |
| RMSE | 6.43 kW |
| Total Penalty (Model) | Rs. 1.16 Lakhs |
| Total Penalty (Naive) | Rs. 32.5 Lakhs |
| **Penalty Reduction** | **96.4%** |

## Files

| File | Description |
|------|-------------|
| `01_data_preprocessing.py` | Data merge, feature engineering, quality checks |
| `02_eda_visualization.py` | 4 professional EDA dashboard figures |
| `03_model_training.py` | HistGBR training, validation, backtest report |
| `04_forecast_output.py` | Final forecast CSV generation |
| `requirements.txt` | Python package dependencies |

## Run Order

```bash
pip install -r requirements.txt

python 01_data_preprocessing.py   # → df_enriched.csv
python 03_model_training.py       # → val_with_penalties.csv, models.pkl
python 02_eda_visualization.py    # → 4 EDA PNG figures
python 04_forecast_output.py      # → GRIDSHIELD_Forecast_Output.csv
```

## Model Architecture

- **Algorithm**: scikit-learn HistGradientBoostingRegressor
- **Features**: 40 features across 6 categories
  - Temporal cyclicals (sin/cos encoding)
  - Lagged load (t-192, t-672 — safe for 2-day-ahead)
  - Rolling statistics (1h, 6h, 24h, 7d)
  - Weather & interaction features
  - COVID structural break indicators (8 one-hot flags)
  - Calendar/event flags
- **Leakage control**: All lag features use minimum 192-interval (48h) offset
- **Validation**: Strict temporal holdout (80/20), no shuffling

## Hybrid Forecast Strategy

| Period | Model | Rationale |
|--------|-------|-----------|
| Peak hours (6–10 PM) | Q67 Model | Higher risk; conservative upward bias |
| Off-peak hours | Mean Model | Tight accuracy; minimizes over-procurement |
| Holidays / Events | Q67 Model | Higher demand uncertainty |
