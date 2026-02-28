# ⚡ GRIDSHIELD — Lumina Energy Load Forecasting
### NLD Synapse 2026 | DECODE X | N.L. Dalmia Institute of Management Studies & Research

> **Cost-aware 2-day-ahead load forecasting under Maharashtra's ABT regulatory framework.**  
> Objective: Minimize financial deviation penalties — not RMSE.

---

## 🏆 Results Summary

| Stage | Task | Key Metric | Penalty |
|-------|------|-----------|---------|
| **Stage 1** | Baseline Diagnostic & Cost-Aware Forecasting | MAPE: **0.28%** | Rs.1.16L (↓96.4% vs naive) |
| **Stage 2** | Regime Shift & Penalty Escalation | MAPE: **6.75%** | Rs.1.89L (regime shift dominated) |
| **Stage 3** | Board Directive — Constrained Re-Optimization | **All 4 constraints PASS** | Rs.2.00L (min-cost compliant) |

---

## 📁 Repository Structure

```
GRIDSHIELD/
│
├── Dataset/                        # Raw input data
│   ├── Electric_Load_Data_Train.csv    # Load (kW) at 15-min intervals, Apr 2013–Apr 2021
│   ├── External_Factor_Data_Train.csv  # Weather variables (Temp, Humidity, Rain, etc.)
│   ├── Events_Data.csv                 # Holiday indicators and event calendar
│   ├── Electric_Load_Data_Test.csv     # Stage 2/3 test set load (May–Jun 2021)
│   └── External_Factor_Data_Test.csv   # Stage 2/3 test set weather
│
├── Modified Dataset/               # Engineered feature datasets
│   └── final_csv.csv                   # Merged + feature-engineered training dataset (283K rows, 41 features)
│
├── Guidelines/                     # Competition problem statements
│   ├── Stage_1_Guidelines.pdf
│   ├── Stage_2_Guidelines.pdf
│   └── Stage_3_Guidelines.pdf
│
├── Phase 1/                        # Stage 1 deliverables
│   ├── 01_data_preprocessing.py        # Data merge, feature engineering, leakage controls
│   ├── 02_eda_visualization.py         # 4 professional EDA dashboards
│   ├── 03_model_training.py            # HistGBR training, quantile models, backtest
│   ├── 04_forecast_output.py           # Forecast CSV generation
│   ├── GRIDSHIELD_Forecast_Output.csv  # Stage 1 validation forecasts + penalties
│   ├── GRIDSHIELD_Stage1_Presentation.pptx
│   ├── GRIDSHIELD_Stage1_Report.docx
│   ├── eda_fig1_overview.png
│   ├── eda_fig2_weather.png
│   ├── eda_fig3_model.png
│   ├── eda_fig4_strategy.png
│   └── requirements.txt
│
├── Phase 2/                        # Stage 2 deliverables
│   ├── 05_stage2_analysis.py           # Regime shift analysis, Q75 recalibration, test forecast
│   ├── GRIDSHIELD_Stage2_Forecast.csv  # Stage 2 test forecasts + penalties
│   ├── GRIDSHIELD_Stage2_Presentation.pptx
│   ├── GRIDSHIELD_Stage2_Report.docx
│   ├── s2_fig1_overview.png
│   └── s2_fig2_penalty.png
│
├── Phase 3/                        # Stage 3 deliverables
│   ├── 06_stage3_board_directive.py    # Constrained optimization, buffer grid search
│   ├── GRIDSHIELD_Stage3_Forecast.csv  # Stage 3 compliant forecasts
│   ├── GRIDSHIELD_Stage3_Presentation.pptx
│   ├── GRIDSHIELD_Stage3_Report.docx   # Technical Appendix + Decision Memo
│   ├── s3_fig1_optimization.png
│   └── s3_fig2_risk.png
│
├── Graphs.ipynb                    # Exploratory notebooks
└── README.md
```

---

## 🧠 The Core Insight

> **This is not an accuracy problem. It is a financial exposure minimization problem.**

Under Maharashtra's Availability Based Tariff (ABT) framework, forecast errors carry **asymmetric penalties**:

| Condition | Stage 1 Penalty | Stage 2/3 Penalty |
|-----------|----------------|-------------------|
| Under-forecast (Actual > Forecast) — Off-Peak | Rs. 4/kWh | Rs. 4/kWh |
| Under-forecast (Actual > Forecast) — **Peak (6–10 PM)** | Rs. 4/kWh | **Rs. 6/kWh** |
| Over-forecast (Forecast > Actual) | Rs. 2/kWh | Rs. 2/kWh |

The optimal forecast is **not the mean** — it is the **conditional quantile** given by the newsvendor formula:

```
q* = c_under / (c_under + c_over)

Stage 1:  q* = 4/(4+2) = 0.667   → Q67 model
Stage 2+: q* = 6/(6+2) = 0.750   → Q75 model (peak hours only)
```

Teams minimizing RMSE are solving the wrong objective.

---

## 🔬 Methodology

### Model Architecture

- **Algorithm**: `HistGradientBoostingRegressor` (scikit-learn)
  - Native quantile loss support
  - Handles missing values natively
  - Fast training on 283K rows
- **Models trained**: Mean (MSE), Q67, Q75
- **Final strategy**: Hybrid — model selected by hour and stage

### Feature Engineering (40 features)

| Category | Features |
|----------|----------|
| Temporal cyclical | `hour_sin/cos`, `day_sin/cos`, `month_sin/cos`, `interval_sin/cos` |
| Raw temporal | `HOUR`, `MINUTE`, `MONTH`, `DAY`, `YEAR`, `interval_of_day`, `is_monday` |
| Weather | `ACT_TEMP`, `ACT_HEAT_INDEX`, `ACT_HUMIDITY`, `ACT_RAIN`, `COOL_FACTOR` |
| Weather interactions | `temp_x_peak`, `heat_index_x_peak`, `temp_x_weekend` |
| Calendar/event | `Holiday_Ind`, `Is Weekend`, `PEAK_Flag`, `Season_enc` |
| COVID structural breaks | `Lockdown`, `WFH`, `Unlock 1.0–6.0` (one-hot, 8 flags) |
| Lag features | `load_t_192` (48h), `load_t_672` (7d) — all ≥192 intervals |
| Rolling stats | `rolling_mean_1h/6h/24h/7d`, `rolling_std_6h` |
| Difference features | `diff_t_1`, `diff_1h` |

### Leakage Controls

All lag features use a **minimum 192-interval (48-hour) offset** — the minimum safe lag for a 2-day-ahead forecasting task. Features `load_t_1`, `load_t_4`, and `load_t_96` were explicitly excluded. Test set lags were seeded using the trailing 700 rows of training data.

### Validation

- **Stage 1**: Strict 80/20 temporal holdout (no shuffling, no leakage)
- **Stage 2/3**: Full out-of-time test period (May–Jun 2021, never seen in training)

---

## 📊 Stage-by-Stage Results

### Stage 1 — Baseline Diagnostic

Training period: Apr 2013 – Apr 2021 | Validation: Sep 2019 – Apr 2021

| Metric | Naive Baseline | Mean Model | **Hybrid (Q67/Mean)** |
|--------|---------------|------------|----------------------|
| MAPE | — | 0.27% | **0.28%** |
| RMSE | — | 6.43 kW | **6.56 kW** |
| Total Penalty | Rs. 32.5L | Rs. 1.16L | **Rs. 1.16L** |
| Penalty Reduction | — | 96.4% | **96.4%** |

### Stage 2 — Regime Shift

Test period: May 1 – Jun 1, 2021 | Three-layer structural shock:

1. **Break the Chain 2.0** (May 1–14): −11% weekday demand (−159 kW avg)
2. **Cyclone Tauktae** (May 17–18): 40% demand collapse, 879 kW minimum
3. **Mission Begin Again** (Jun 1+): +19.4% demand rebound

Result: RMSE jumped from 6.43 kW → 116 kW (18×). Per-interval penalty increased 31× (Rs.2.04 → Rs.63.50). The regime shift contributed ~85% of the increase; the regulatory change ~15%.

### Stage 3 — Board Directive (Constrained Optimization)

Four binding constraints issued by the board:

| Constraint | Requirement | Result | Status |
|------------|-------------|--------|--------|
| C1 | Report total/peak/off-peak penalties | Rs.2,00,349 / Rs.48,639 / Rs.1,51,709 | ✅ |
| C2 | Peak underestimation >5%: max 3 intervals | 3 intervals (all Cyclone Tauktae) | ✅ |
| C3 | Forecast bias within [−2%, +3%] | +2.76% | ✅ |
| C4 | Avg uplift vs unbiased model ≤ 3% | +2.53% | ✅ |

**Final strategy**: Q67 off-peak + Q75 + **180 kW additive peak buffer**

The +180 kW buffer is the minimum-cost feasible solution — identified via grid search over buffers ∈ [0, 210] kW. Going to +200 kW violates C3. The 3 remaining violations are all Cyclone Tauktae (force majeure, physically unavoidable at 48h horizon).

---

## 🚀 Running the Code

### Requirements

```bash
pip install -r Phase\ 1/requirements.txt
# pandas>=2.0.0, numpy>=1.24.0, scikit-learn>=1.3.0,
# matplotlib>=3.7.0, seaborn>=0.12.0, scipy>=1.11.0
```

### Execution Order

```bash
# Stage 1
python "Phase 1/01_data_preprocessing.py"   # → df_enriched.csv
python "Phase 1/03_model_training.py"        # → val_with_penalties.csv, models.pkl
python "Phase 1/02_eda_visualization.py"     # → 4 EDA figures
python "Phase 1/04_forecast_output.py"       # → GRIDSHIELD_Forecast_Output.csv

# Stage 2
python "Phase 2/05_stage2_analysis.py"       # → GRIDSHIELD_Stage2_Forecast.csv

# Stage 3
python "Phase 3/06_stage3_board_directive.py" # → GRIDSHIELD_Stage3_Forecast.csv
```

> **Note**: Stage 1 scripts require `Electric_Load_Data_Train.csv` and `final_csv.csv` in the working directory. Stage 2/3 additionally require `Electric_Load_Data_Test.csv` and `External_Factor_Data_Test.csv`.

---

## 📌 Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Quantile regression over MSE | Asymmetric penalty structure makes mean forecast suboptimal by design |
| q\* = 0.667 (off-peak) | Newsvendor formula: 4/(4+2) = 0.667 |
| q\* = 0.750 (peak, Stage 2+) | Newsvendor formula: 6/(6+2) = 0.750 after penalty escalation |
| +180 kW peak buffer (Stage 3) | Minimum buffer satisfying C2 (≤3 violations) within C3/C4 bounds |
| Lag ≥ 192 intervals | Strict 48h minimum for 2-day-ahead forecast — no leakage |
| COVID flags as one-hot | 8 distinct phases (Lockdown, WFH, Unlock 1–6) encode structural breaks |
| 3 violations classified as force majeure | Cyclone Tauktae caused 40% demand collapse in 4 hours — unpredictable at 48h horizon |

---

## ⚠️ Known Limitations

- Lag features anchor to a 2-day prior regime — during rapid structural shifts (lockdowns, unlocks), this introduces systematic bias that no statistical correction fully resolves without retraining
- Extreme weather events (cyclones) cannot be forecast 48 hours ahead with sufficient precision to prevent demand collapse signals
- The +180 kW buffer was calibrated on the test period post-hoc — in production, buffer recalibration should occur monthly using rolling out-of-sample evaluation

---

## 👥 Team

**Forecast Risk Advisory Team** — NLD Synapse 2026, DECODE X  
Case: GRIDSHIELD | Lumina Energy — Suburban Mumbai Distribution Zone  
Competition: N.L. Dalmia Institute of Management Studies & Research
