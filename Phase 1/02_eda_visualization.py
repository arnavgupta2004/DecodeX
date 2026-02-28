"""
═══════════════════════════════════════════════════════════════════════════════
GRIDSHIELD | Stage 1 — Exploratory Data Analysis & Visualization
═══════════════════════════════════════════════════════════════════════════════
NLD Synapse 2026 | N.L. Dalmia Institute
Team: Forecast Risk Advisory Team

Description:
    Generates 4 professional analysis dashboards:
    - Fig 1: Load overview (time series, distributions, profiles)
    - Fig 2: Weather, seasonality, structural impact
    - Fig 3: Model performance & penalty backtest
    - Fig 4: Risk strategy, feature importance, cost analysis

Input:
    - df_enriched.csv        : Enriched modeling dataset (from 01_data_preprocessing.py)
    - val_with_penalties.csv : Validation predictions with penalty calculations
    
Output:
    - eda_fig1_overview.png
    - eda_fig2_weather.png
    - eda_fig3_model.png
    - eda_fig4_strategy.png
═══════════════════════════════════════════════════════════════════════════════
"""

import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec
from matplotlib.patches import Patch
import seaborn as sns
from sklearn.ensemble import RandomForestRegressor
import warnings
warnings.filterwarnings('ignore')

# ── Color palette ──
BLUE       = '#1B4F8A'
ORANGE     = '#E8732A'
GREEN      = '#2E7D32'
RED        = '#C62828'
PURPLE     = '#6A1B9A'
LIGHT_BLUE = '#E3EEF9'
NAVY       = '#0A1628'

plt.rcParams.update({
    'font.family'      : 'DejaVu Sans',
    'axes.spines.top'  : False,
    'axes.spines.right': False,
    'axes.grid'        : True,
    'grid.alpha'       : 0.3,
    'grid.color'       : '#CCCCCC',
    'figure.facecolor' : 'white',
    'axes.facecolor'   : 'white',
})


# ─────────────────────────────────────────────────────────────────────────────
# FIG 1: Load Overview Dashboard
# ─────────────────────────────────────────────────────────────────────────────

def plot_load_overview(df: pd.DataFrame, out_path: str = 'eda_fig1_overview.png') -> None:
    """
    6-panel dashboard showing load time series, distribution, hourly/monthly
    profiles, day-of-week pattern, peak vs off-peak, and holiday comparison.
    """
    fig = plt.figure(figsize=(20, 14))
    gs = gridspec.GridSpec(3, 3, figure=fig, hspace=0.45, wspace=0.35)

    # 1A: Full weekly average time series
    ax1 = fig.add_subplot(gs[0, :])
    weekly = df.set_index('DATETIME_PARSED')['LOAD'].resample('W').mean()
    ax1.fill_between(weekly.index, weekly.values, alpha=0.3, color=BLUE)
    ax1.plot(weekly.index, weekly.values, color=BLUE, linewidth=1.2)
    ax1.axvspan(pd.Timestamp('2020-03-25'), pd.Timestamp('2020-05-31'),
                alpha=0.25, color=RED, label='COVID Lockdown')
    ax1.axvspan(pd.Timestamp('2016-11-08'), pd.Timestamp('2016-12-31'),
                alpha=0.2, color=ORANGE, label='Demonetisation')
    ax1.set_title('Weekly Average Load (kW) — April 2013 to April 2021',
                  fontsize=14, fontweight='bold', pad=12)
    ax1.set_ylabel('Load (kW)', fontsize=11)
    ax1.legend(fontsize=10)

    # 1B: Load distribution
    ax2 = fig.add_subplot(gs[1, 0])
    ax2.hist(df['LOAD'], bins=80, color=BLUE, alpha=0.8, edgecolor='white', linewidth=0.3)
    ax2.axvline(df['LOAD'].mean(), color=ORANGE, linewidth=2, linestyle='--',
                label=f"Mean: {df['LOAD'].mean():.0f}")
    ax2.axvline(df['LOAD'].median(), color=GREEN, linewidth=2, linestyle='--',
                label=f"Median: {df['LOAD'].median():.0f}")
    ax2.set_title('Load Distribution', fontsize=12, fontweight='bold')
    ax2.set_xlabel('Load (kW)'); ax2.set_ylabel('Frequency'); ax2.legend(fontsize=9)

    # 1C: Average load by hour
    ax3 = fig.add_subplot(gs[1, 1])
    hourly_avg = df.groupby('HOUR')['LOAD'].mean()
    colors_bar = [RED if 18 <= h <= 21 else BLUE for h in hourly_avg.index]
    ax3.bar(hourly_avg.index, hourly_avg.values, color=colors_bar, alpha=0.85, edgecolor='white')
    ax3.set_title('Average Load by Hour of Day', fontsize=12, fontweight='bold')
    ax3.set_xlabel('Hour'); ax3.set_ylabel('Avg Load (kW)')
    ax3.axvspan(17.5, 22, alpha=0.1, color=RED)
    ax3.text(19.5, hourly_avg.max() * 0.95, 'Peak\nHours', ha='center', fontsize=8,
             color=RED, fontweight='bold')

    # 1D: Average load by month
    ax4 = fig.add_subplot(gs[1, 2])
    month_avg = df.groupby('MONTH')['LOAD'].mean()
    month_names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    ax4.bar(range(1, 13), month_avg.values, color=BLUE, alpha=0.85, edgecolor='white')
    ax4.set_xticks(range(1, 13)); ax4.set_xticklabels(month_names, fontsize=8)
    ax4.set_title('Average Load by Month', fontsize=12, fontweight='bold')
    ax4.set_ylabel('Avg Load (kW)')

    # 1E: Load by day of week
    ax5 = fig.add_subplot(gs[2, 0])
    day_order = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
    day_avg = df.groupby('DAY_NAME')['LOAD'].mean().reindex(day_order)
    colors_day = [ORANGE if d in ['Saturday','Sunday'] else BLUE for d in day_order]
    ax5.bar(range(7), day_avg.values, color=colors_day, alpha=0.85, edgecolor='white')
    ax5.set_xticks(range(7))
    ax5.set_xticklabels(['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], fontsize=9)
    ax5.set_title('Average Load by Day of Week', fontsize=12, fontweight='bold')
    ax5.set_ylabel('Avg Load (kW)')

    # 1F: Peak vs Off-peak distribution
    ax6 = fig.add_subplot(gs[2, 1])
    peak_load    = df[df['PEAK_Flag'] == 1]['LOAD']
    offpeak_load = df[df['PEAK_Flag'] == 0]['LOAD']
    ax6.hist(offpeak_load, bins=60, alpha=0.6, color=BLUE,
             label=f'Off-Peak (mean={offpeak_load.mean():.0f})', density=True)
    ax6.hist(peak_load, bins=60, alpha=0.6, color=RED,
             label=f'Peak (mean={peak_load.mean():.0f})', density=True)
    ax6.set_title('Peak vs Off-Peak Load Distribution', fontsize=12, fontweight='bold')
    ax6.set_xlabel('Load (kW)'); ax6.set_ylabel('Density'); ax6.legend(fontsize=9)

    # 1G: Holiday vs non-holiday
    ax7 = fig.add_subplot(gs[2, 2])
    hol     = df[df['Holiday_Ind'] == 1]['LOAD']
    non_hol = df[df['Holiday_Ind'] == 0]['LOAD']
    n_sample = min(5000, len(hol))
    ax7.boxplot([non_hol.sample(5000, random_state=42), hol.sample(n_sample, random_state=42)],
                labels=['Working Day', 'Holiday'], patch_artist=True,
                boxprops=dict(facecolor=LIGHT_BLUE, color=BLUE),
                medianprops=dict(color=ORANGE, linewidth=2))
    ax7.set_title('Load: Working Day vs Holiday', fontsize=12, fontweight='bold')
    ax7.set_ylabel('Load (kW)')

    plt.suptitle('GRIDSHIELD — Lumina Energy Load Analysis Dashboard',
                 fontsize=16, fontweight='bold', y=1.01, color=NAVY)
    plt.savefig(out_path, dpi=150, bbox_inches='tight', facecolor='white')
    plt.close()
    print(f"Saved: {out_path}")


# ─────────────────────────────────────────────────────────────────────────────
# FIG 2: Weather & Seasonality
# ─────────────────────────────────────────────────────────────────────────────

def plot_weather_seasonality(df: pd.DataFrame, out_path: str = 'eda_fig2_weather.png') -> None:
    """
    6-panel dashboard: load vs weather scatter, correlation heatmap,
    seasonal boxplots, COVID year-on-year impact, intraday profiles by season.
    """
    fig = plt.figure(figsize=(20, 12))
    gs = gridspec.GridSpec(2, 3, figure=fig, hspace=0.45, wspace=0.35)

    sample = df.sample(15000, random_state=42)

    # 2A: Load vs Temperature (colored by hour)
    ax1 = fig.add_subplot(gs[0, 0])
    sc = ax1.scatter(sample['ACT_TEMP'], sample['LOAD'], alpha=0.15, s=5,
                     c=sample['HOUR'], cmap='RdYlBu_r')
    plt.colorbar(sc, ax=ax1, label='Hour of Day', shrink=0.8)
    ax1.set_xlabel('Temperature (°C)'); ax1.set_ylabel('Load (kW)')
    ax1.set_title('Load vs Temperature\n(colored by Hour)', fontsize=12, fontweight='bold')

    # 2B: Load vs Humidity (colored by month)
    ax2 = fig.add_subplot(gs[0, 1])
    sc2 = ax2.scatter(sample['ACT_HUMIDITY'], sample['LOAD'], alpha=0.15, s=5,
                      c=sample['MONTH'], cmap='viridis')
    plt.colorbar(sc2, ax=ax2, label='Month', shrink=0.8)
    ax2.set_xlabel('Humidity (%)'); ax2.set_ylabel('Load (kW)')
    ax2.set_title('Load vs Humidity\n(colored by Month)', fontsize=12, fontweight='bold')

    # 2C: Correlation heatmap
    ax3 = fig.add_subplot(gs[0, 2])
    corr_cols = ['LOAD','ACT_TEMP','ACT_HEAT_INDEX','ACT_HUMIDITY','ACT_RAIN',
                 'COOL_FACTOR','HOUR','MONTH','Holiday_Ind','PEAK_Flag','Is Weekend','Lockdown']
    corr = df[corr_cols].corr()
    sns.heatmap(corr, ax=ax3, annot=True, fmt='.2f', cmap='RdBu_r', center=0,
                square=True, linewidths=0.5, annot_kws={'size': 7},
                cbar_kws={'shrink': 0.6})
    ax3.set_title('Feature Correlation Matrix', fontsize=12, fontweight='bold')
    ax3.tick_params(labelsize=7)
    plt.setp(ax3.get_xticklabels(), rotation=45, ha='right')

    # 2D: Load by season
    ax4 = fig.add_subplot(gs[1, 0])
    season_order = [s for s in ['Summer','Monsoon','Autumn','Winter','Spring']
                    if s in df['Season'].unique()]
    season_data = [df[df['Season'] == s]['LOAD'].values for s in season_order]
    ax4.boxplot(season_data, labels=season_order, patch_artist=True, notch=True,
                boxprops=dict(facecolor=LIGHT_BLUE, color=BLUE),
                medianprops=dict(color=ORANGE, linewidth=2.5))
    ax4.set_title('Load Distribution by Season', fontsize=12, fontweight='bold')
    ax4.set_ylabel('Load (kW)')

    # 2E: COVID year-on-year April comparison
    ax5 = fig.add_subplot(gs[1, 1])
    april_yearly = df[df['MONTH'] == 4].groupby('YEAR')['LOAD'].mean()
    colors_yr = [RED if y == 2020 else BLUE for y in april_yearly.index]
    bars = ax5.bar(april_yearly.index, april_yearly.values, color=colors_yr, alpha=0.85)
    ax5.bar_label(bars, labels=[f'{v:.0f}' for v in april_yearly.values], padding=3, fontsize=8)
    ax5.set_title('April Average Load by Year\n(COVID Impact Visible)', fontsize=12, fontweight='bold')
    ax5.set_xlabel('Year'); ax5.set_ylabel('Avg Load (kW)')
    ax5.set_xticks(april_yearly.index)

    # 2F: Intraday profile by season
    ax6 = fig.add_subplot(gs[1, 2])
    for season in season_order:
        hourly = df[df['Season'] == season].groupby('HOUR')['LOAD'].mean()
        ax6.plot(hourly.index, hourly.values, linewidth=2, label=season, alpha=0.85)
    ax6.axvspan(18, 22, alpha=0.15, color=RED, label='Peak Hours')
    ax6.set_title('Intraday Load Profile by Season', fontsize=12, fontweight='bold')
    ax6.set_xlabel('Hour of Day'); ax6.set_ylabel('Avg Load (kW)')
    ax6.legend(fontsize=8); ax6.set_xticks(range(0, 24, 2))

    plt.suptitle('GRIDSHIELD — Weather, Seasonality & Structural Impact Analysis',
                 fontsize=15, fontweight='bold', y=1.01, color=NAVY)
    plt.savefig(out_path, dpi=150, bbox_inches='tight', facecolor='white')
    plt.close()
    print(f"Saved: {out_path}")


# ─────────────────────────────────────────────────────────────────────────────
# FIG 3: Model Performance & Penalty Backtest
# ─────────────────────────────────────────────────────────────────────────────

def plot_model_performance(val_df: pd.DataFrame, out_path: str = 'eda_fig3_model.png') -> None:
    """
    6-panel dashboard: sample week forecast, residual distributions,
    penalty comparison, actual vs predicted scatter, hourly penalty, cumulative penalty.
    """
    actual     = val_df['LOAD'].values
    pred_mean  = val_df['pred_mean'].values
    pred_q67   = val_df['pred_q67'].values
    is_peak    = val_df['PEAK_Flag'].values

    fig = plt.figure(figsize=(20, 15))
    gs = gridspec.GridSpec(3, 3, figure=fig, hspace=0.45, wspace=0.35)

    # 3A: Sample week forecast vs actual
    ax1 = fig.add_subplot(gs[0, :])
    week = val_df[(val_df['DATETIME_PARSED'] >= '2019-10-07') &
                  (val_df['DATETIME_PARSED'] < '2019-10-14')]
    ax1.plot(week['DATETIME_PARSED'], week['LOAD'], color=BLUE, linewidth=1.8,
             label='Actual', zorder=3)
    ax1.plot(week['DATETIME_PARSED'], week['pred_mean'], color=ORANGE, linewidth=1.5,
             linestyle='--', label='Mean Forecast', zorder=2)
    ax1.plot(week['DATETIME_PARSED'], week['pred_q67'], color=GREEN, linewidth=1.5,
             linestyle=':', label='Q67 Forecast (Cost-Optimal)', zorder=2)
    for date in pd.date_range('2019-10-07', '2019-10-14', freq='D'):
        ax1.axvspan(date + pd.Timedelta(hours=18), date + pd.Timedelta(hours=22),
                    alpha=0.12, color=RED)
    ax1.set_title('Sample Week Forecast vs Actual (7–13 Oct 2019)', fontsize=13, fontweight='bold')
    ax1.set_ylabel('Load (kW)'); ax1.legend(fontsize=10)

    # 3B: Mean model residuals
    ax2 = fig.add_subplot(gs[1, 0])
    residuals = pred_mean - actual
    ax2.hist(residuals, bins=100, color=BLUE, alpha=0.8, edgecolor='white', linewidth=0.2)
    ax2.axvline(0, color=RED, linewidth=2, linestyle='--', label='Zero bias')
    ax2.axvline(residuals.mean(), color=ORANGE, linewidth=2,
                label=f'Mean: {residuals.mean():.2f}')
    ax2.set_title('Residual Distribution\n(Mean Model)', fontsize=12, fontweight='bold')
    ax2.set_xlabel('Forecast - Actual (kW)'); ax2.set_ylabel('Frequency'); ax2.legend(fontsize=9)

    # 3C: Q67 model residuals
    ax3 = fig.add_subplot(gs[1, 1])
    residuals_q67 = pred_q67 - actual
    ax3.hist(residuals_q67, bins=100, color=GREEN, alpha=0.8, edgecolor='white', linewidth=0.2)
    ax3.axvline(0, color=RED, linewidth=2, linestyle='--', label='Zero bias')
    ax3.axvline(residuals_q67.mean(), color=ORANGE, linewidth=2,
                label=f'Mean: {residuals_q67.mean():.2f}')
    ax3.set_title('Residual Distribution\n(Q67 Cost-Optimal Model)', fontsize=12, fontweight='bold')
    ax3.set_xlabel('Forecast - Actual (kW)'); ax3.set_ylabel('Frequency'); ax3.legend(fontsize=9)

    # 3D: Penalty comparison
    ax4 = fig.add_subplot(gs[1, 2])
    peak_m  = val_df[val_df['PEAK_Flag'] == 1]
    offp_m  = val_df[val_df['PEAK_Flag'] == 0]
    models_labels = ['Naive\nBaseline', 'Mean\nModel', 'Q67\nModel']
    total_pen = [val_df['pen_naive'].sum(), val_df['pen_mean'].sum(), val_df['pen_q67'].sum()]
    peak_pen  = [peak_m['pen_naive'].sum(), peak_m['pen_mean'].sum(), peak_m['pen_q67'].sum()]
    offpk_pen = [t - p for t, p in zip(total_pen, peak_pen)]
    x = np.arange(3); w = 0.35
    b1 = ax4.bar(x - w/2, offpk_pen, w, label='Off-Peak', color=BLUE, alpha=0.85)
    b2 = ax4.bar(x + w/2, peak_pen,  w, label='Peak',     color=RED,  alpha=0.85)
    ax4.set_xticks(x); ax4.set_xticklabels(models_labels, fontsize=9)
    ax4.set_title('Total Penalty Comparison (Rs.)', fontsize=12, fontweight='bold')
    ax4.set_ylabel('Penalty (Rs.)'); ax4.legend(fontsize=9)
    for bar in [*b1, *b2]:
        h = bar.get_height()
        if h > 10000:
            ax4.text(bar.get_x() + bar.get_width() / 2, h + 5000,
                     f'Rs.{h/1000:.0f}K', ha='center', va='bottom', fontsize=7, fontweight='bold')

    # 3E: Actual vs predicted scatter
    ax5 = fig.add_subplot(gs[2, 0])
    idx = np.random.choice(len(actual), 10000, replace=False)
    ax5.scatter(actual[idx], pred_mean[idx], alpha=0.2, s=3, color=BLUE, label='Mean')
    lims = [min(actual.min(), pred_mean.min()), max(actual.max(), pred_mean.max())]
    ax5.plot(lims, lims, 'r--', linewidth=1.5, label='Perfect Forecast')
    ax5.set_xlabel('Actual Load (kW)'); ax5.set_ylabel('Forecast (kW)')
    ax5.set_title('Actual vs Forecast\n(Mean Model, 10K sample)', fontsize=12, fontweight='bold')
    ax5.legend(fontsize=9)

    # 3F: Hourly penalty distribution
    ax6 = fig.add_subplot(gs[2, 1])
    hourly_pen = val_df.groupby('HOUR')['pen_mean'].mean()
    colors_h = [RED if 18 <= h <= 21 else BLUE for h in hourly_pen.index]
    ax6.bar(hourly_pen.index, hourly_pen.values, color=colors_h, alpha=0.85, edgecolor='white')
    ax6.set_title('Avg Penalty per Interval by Hour\n(Mean Model)', fontsize=12, fontweight='bold')
    ax6.set_xlabel('Hour'); ax6.set_ylabel('Avg Penalty (Rs./interval)')

    # 3G: Cumulative penalty over time
    ax7 = fig.add_subplot(gs[2, 2])
    ax7.plot(val_df['DATETIME_PARSED'], val_df['pen_naive'].cumsum() / 1e6,
             color=RED, linewidth=1.5, label=f'Naive (Rs.{val_df["pen_naive"].sum()/1e6:.2f}M)')
    ax7.plot(val_df['DATETIME_PARSED'], val_df['pen_mean'].cumsum() / 1e6,
             color=BLUE, linewidth=1.5, label=f'Mean (Rs.{val_df["pen_mean"].sum()/1e6:.2f}M)')
    ax7.plot(val_df['DATETIME_PARSED'], val_df['pen_q67'].cumsum() / 1e6,
             color=GREEN, linewidth=1.5, linestyle='--', label=f'Q67 (Rs.{val_df["pen_q67"].sum()/1e6:.2f}M)')
    ax7.set_title('Cumulative Penalty Over Time', fontsize=12, fontweight='bold')
    ax7.set_ylabel('Cumulative Penalty (Rs.M)'); ax7.legend(fontsize=9)

    plt.suptitle('GRIDSHIELD — Model Performance & Penalty Backtest Dashboard',
                 fontsize=15, fontweight='bold', y=1.01, color=NAVY)
    plt.savefig(out_path, dpi=150, bbox_inches='tight', facecolor='white')
    plt.close()
    print(f"Saved: {out_path}")


# ─────────────────────────────────────────────────────────────────────────────
# FIG 4: Risk Strategy & Feature Importance
# ─────────────────────────────────────────────────────────────────────────────

def plot_risk_strategy(df_full: pd.DataFrame, val_df: pd.DataFrame,
                       feature_cols: list, out_path: str = 'eda_fig4_strategy.png') -> None:
    """
    6-panel dashboard: feature importance, Q67 over/under split pie,
    asymmetric penalty illustration, error by hour, strategy text box.
    """
    # RF-based feature importance (proxy since HistGBR doesn't expose importances)
    sample = df_full.sample(30000, random_state=42)
    X_s = sample[feature_cols].values
    y_s = sample['LOAD'].values
    rf = RandomForestRegressor(n_estimators=100, max_depth=8, random_state=42, n_jobs=-1)
    rf.fit(X_s, y_s)
    imp = rf.feature_importances_
    feat_df = pd.DataFrame({'feature': feature_cols, 'importance': imp})
    feat_df = feat_df.sort_values('importance', ascending=True).tail(20)

    fig = plt.figure(figsize=(20, 14))
    gs = gridspec.GridSpec(2, 3, figure=fig, hspace=0.45, wspace=0.35)

    # 4A: Feature importance horizontal bar
    ax1 = fig.add_subplot(gs[0, :2])
    colors_fi = [RED    if any(x in f for x in ['load_t', 'rolling', 'diff']) else
                 ORANGE if any(x in f for x in ['TEMP', 'HEAT', 'HUMID', 'COOL', 'RAIN']) else
                 GREEN  if any(x in f for x in ['hour', 'day', 'month', 'interval',
                                                 'HOUR', 'MONTH', 'DAY', 'sin', 'cos']) else
                 BLUE   for f in feat_df['feature']]
    ax1.barh(feat_df['feature'], feat_df['importance'], color=colors_fi, alpha=0.85, edgecolor='white')
    ax1.set_title('Top 20 Feature Importances (Random Forest)', fontsize=13, fontweight='bold')
    ax1.set_xlabel('Importance Score')
    legend_elements = [
        Patch(facecolor=RED,    label='Lag/Rolling Features'),
        Patch(facecolor=ORANGE, label='Weather Features'),
        Patch(facecolor=GREEN,  label='Time/Calendar Features'),
        Patch(facecolor=BLUE,   label='Other Features'),
    ]
    ax1.legend(handles=legend_elements, loc='lower right', fontsize=9)

    # 4B: Q67 over/under pie
    ax2 = fig.add_subplot(gs[0, 2])
    actual   = val_df['LOAD'].values
    pred_q67 = val_df['pred_q67'].values
    over_pct  = (pred_q67 > actual).mean() * 100
    under_pct = 100 - over_pct
    ax2.pie([over_pct, under_pct],
            labels=[f'Over-forecast\n({over_pct:.1f}%)', f'Under-forecast\n({under_pct:.1f}%)'],
            colors=[BLUE, RED], startangle=90,
            wedgeprops=dict(edgecolor='white', linewidth=2),
            textprops={'fontsize': 11})
    ax2.set_title('Q67 Model:\nOver vs Under Forecast Split', fontsize=12, fontweight='bold')

    # 4C: Asymmetric penalty illustration
    ax3 = fig.add_subplot(gs[1, 0])
    dev = np.linspace(-200, 200, 400)
    pen_u = np.where(dev < 0, np.abs(dev) * 0.25 * 4, 0)
    pen_o = np.where(dev > 0, np.abs(dev) * 0.25 * 2, 0)
    ax3.fill_between(dev, pen_u, alpha=0.4, color=RED, label='Under-forecast (Rs. 4/kWh)')
    ax3.fill_between(dev, pen_o, alpha=0.4, color=BLUE, label='Over-forecast (Rs. 2/kWh)')
    ax3.plot(dev, pen_u + pen_o, color='black', linewidth=1.5, label='Total penalty')
    ax3.axvline(0, color='gray', linestyle='--')
    ax3.set_xlabel('Deviation (Actual-Forecast) kW')
    ax3.set_ylabel('Penalty (Rs./interval)')
    ax3.set_title('ABT Asymmetric Penalty Structure\n(per 15-min interval)', fontsize=12, fontweight='bold')
    ax3.legend(fontsize=9)

    # 4D: Error by hour
    ax4 = fig.add_subplot(gs[1, 1])
    val_df = val_df.copy()
    val_df['abs_error'] = np.abs(val_df['LOAD'] - val_df['pred_mean'])
    he = val_df.groupby('HOUR').agg(
        mae=('abs_error', 'mean'),
        p95=('abs_error', lambda x: np.percentile(x, 95))
    ).reset_index()
    ax4.bar(he['HOUR'], he['mae'], color=BLUE, alpha=0.7, label='Mean Abs Error')
    ax4.plot(he['HOUR'], he['p95'], color=RED, linewidth=2, marker='o', markersize=4,
             label='95th Pct Error')
    ax4.axvspan(18, 22, alpha=0.1, color=RED)
    ax4.set_xlabel('Hour'); ax4.set_ylabel('Absolute Error (kW)')
    ax4.set_title('Forecast Error by Hour of Day\n(Mean Model)', fontsize=12, fontweight='bold')
    ax4.legend(fontsize=9)

    # 4E: Strategy text box
    ax5 = fig.add_subplot(gs[1, 2])
    ax5.axis('off')
    txt = (
        "RISK STRATEGY SUMMARY\n\n"
        "Penalty Structure (ABT):\n"
        "  Under-forecast: Rs.4/kWh  (2x costlier)\n"
        "  Over-forecast:  Rs.2/kWh\n\n"
        "Optimal Bias Quantile:\n"
        "  q* = 4/(4+2) = 0.667\n\n"
        "Hybrid Strategy:\n"
        "  Peak hrs (6-10 PM) -> Q67 Model\n"
        "  Off-Peak hrs       -> Mean Model\n"
        "  Holiday/COVID      -> Q67 Model\n\n"
        "Backtest Results (Validation):\n"
        "  Naive Baseline:  Rs.32.5 Lakhs\n"
        "  Mean Model:      Rs.1.16 Lakhs\n"
        "  Q67 Model:       Rs.1.32 Lakhs\n\n"
        "  96.4% penalty reduction achieved!\n\n"
        "Peak Hour Results:\n"
        "  Naive:  Rs.6.1 Lakhs\n"
        "  Model:  Rs.0.25 Lakhs  (96% down)\n\n"
        "Recommendation:\n"
        "  Use Q67 for peak hours, Mean model\n"
        "  for off-peak. Monitor event/holiday\n"
        "  periods with conservative buffer."
    )
    ax5.text(0.03, 0.97, txt, transform=ax5.transAxes, fontsize=9.5, va='top',
             fontfamily='monospace',
             bbox=dict(boxstyle='round', facecolor='#E3EEF9', alpha=0.9, edgecolor=BLUE))
    ax5.set_title('Cost-Minimizing Strategy', fontsize=12, fontweight='bold')

    plt.suptitle('GRIDSHIELD — Risk Strategy, Feature Importance & Cost Analysis',
                 fontsize=15, fontweight='bold', y=1.01, color=NAVY)
    plt.savefig(out_path, dpi=150, bbox_inches='tight', facecolor='white')
    plt.close()
    print(f"Saved: {out_path}")


# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    from code_01_data_preprocessing import FEATURE_COLS

    print("Loading data...")
    df = pd.read_csv('df_enriched.csv', low_memory=False)
    df['DATETIME_PARSED'] = pd.to_datetime(df['DATETIME_PARSED'])

    val_df = pd.read_csv('val_with_penalties.csv', low_memory=False)
    val_df['DATETIME_PARSED'] = pd.to_datetime(val_df['DATETIME_PARSED'])

    print("Generating figures...")
    plot_load_overview(df)
    plot_weather_seasonality(df)
    plot_model_performance(val_df)
    plot_risk_strategy(df, val_df, FEATURE_COLS)
    print("All figures saved.")
