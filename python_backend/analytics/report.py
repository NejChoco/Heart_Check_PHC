"""
report.py
Master report generator — assembles all analytics modules
into the single payload served to the admin dashboard.
"""

import pandas as pd
import numpy as np
import math
from .preprocessing  import preprocess_queue_data
from .descriptive    import (
    daily_summary,
    hourly_pattern,
    bottleneck_report,
    service_distribution,
    phc_compliance_summary,
)
from .queue_metrics  import (
    registration_metrics,
    per_cubicle_metrics,
    specialized_metrics,
    system_time_report,
)
from .forecasting    import evaluate_forecasting_algorithms, get_lr_chart_data, get_arima_chart_data
from .staffing       import recommend_staff

def convert_to_native(obj):
    """
    Recursively convert numpy types to Python native types for JSON serialization.

    Also sanitizes NaN/Infinity floats to None. Standard JSON has no
    representation for NaN — Python's json.dumps will happily emit the
    literal token `NaN` by default, but that's not valid JSON and browsers'
    fetch()/JSON.parse() reject it outright, surfacing as a generic
    "Failed to fetch" on the frontend with no indication that the actual
    cause was a NaN deep in the payload (e.g. a stage average computed
    from a subset of patients who are all still in-progress).
    """
    if isinstance(obj, dict):
        return {key: convert_to_native(val) for key, val in obj.items()}
    elif isinstance(obj, (list, tuple)):
        return [convert_to_native(item) for item in obj]
    elif isinstance(obj, (np.integer, np.int64, np.int32)):
        return int(obj)
    elif isinstance(obj, (np.floating, np.float64, np.float32)):
        val = float(obj)
        return None if math.isnan(val) or math.isinf(val) else val
    elif isinstance(obj, float):
        return None if math.isnan(obj) or math.isinf(obj) else obj
    elif isinstance(obj, np.bool_):
        return bool(obj)
    elif obj is pd.NA:
        return None
    elif isinstance(obj, (np.ndarray, pd.Series)):
        return convert_to_native(obj.tolist())
    return obj


def generate_report(
    df         : pd.DataFrame,
    opd_hours  : float = 8.0,
    p_adult    : float = 0.50,
    p_pedia    : float = 0.50,
    p_consult  : float = 0.65,
) -> dict:
    """
    Entry point called by the FastAPI backend.

    Args:
        df        : raw dataframe pulled from Supabase
        opd_hours : operating hours per day
        p_adult   : proportion of consultation patients → adult clinic
        p_pedia   : proportion of consultation patients → pedia clinic
        p_consult : proportion of total patients routed to consultation
    """
    #  Handle empty database
    if df.empty:
        return _empty_report()
    
    df_clean = preprocess_queue_data(df)
    
    # Double-check after preprocessing 
    if df_clean.empty:
        return _empty_report()

    svc             = df_clean['service_consultation']
    avg_service_min = round(float(svc[svc > 0].mean()), 2) if not svc[svc > 0].empty else 15.0

    eval_data       = evaluate_forecasting_algorithms(df_clean)
    predicted_vol   = eval_data.get("next_day_forecast", 0)

    report = {
        # Descriptive 
        "daily_summary" : daily_summary(df_clean).to_dict(orient='records'),
        "hourly_pattern"       : hourly_pattern(df_clean).to_dict(orient='records'),
        "service_distribution" : service_distribution(df_clean).to_dict(orient='records'),

        # Bottleneck — computed over the requested range (df_clean), matching
        # every other section and the "Based on all historical patient
        # records" copy shown on the frontend. Per-year/per-month breakdown
        # is served separately via /api/monthly-breakdown/{year} rather than
        # being computed here on every dashboard-data call.
        "bottleneck_analysis" : bottleneck_report(df_clean),

        # PHC manual tracking-sheet parity summary (Waiting Time / Evaluate /
        # Examine & Treat / Carry Out Dr's Orders + summary stats) — lets
        # PHC MIS/UAT staff cross-check the dashboard against their own
        # paper form for the same date range.
        "phc_compliance" : phc_compliance_summary(df_clean, opd_hours),

        # Queue metrics
        "registration"    : registration_metrics(df_clean),
        "consultation"    : {
            "adult": per_cubicle_metrics(df_clean, clinic='adult'),
            "pedia": per_cubicle_metrics(df_clean, clinic='pedia'),
        },
        "specialized_services" : specialized_metrics(df_clean),

        # System time & Little's Law
        "system_time"     : system_time_report(df_clean),

        # Forecasting
        "computational_forecasting" : eval_data,
        "lr_chart_data"             : get_lr_chart_data(df_clean),
        "arima_chart_data"          : get_arima_chart_data(df_clean),

        # Staffing recommendation 
        "decision_support" : recommend_staff(
            forecasted_patients  = predicted_vol,
            opd_hours            = opd_hours,
            avg_service_time_min = avg_service_min,
            p_adult              = p_adult,
            p_pedia              = p_pedia,
            p_consultation       = p_consult,
        ),
    }
    
    return convert_to_native(report)


def _empty_report() -> dict:
    """
    Return zero-valued analytics when database is empty or has no data.
    Prevents frontend crashes with missing data.
    """
    return {
        "daily_summary": [],
        "hourly_pattern": [],
        "service_distribution" : [],
        "bottleneck_analysis": {
            "stages": [],
            "primary_bottleneck": None,
            "system_status": "No data",
            "bottleneck_stage": "N/A",
            "avg_wait_registration_min": 0.0,
            "avg_wait_consultation_min": 0.0,
        },
        "phc_compliance": {
            "waiting_time_le": 0,
            "waiting_time_gt": 0,
            "evaluate_le": 0,
            "evaluate_gt": 0,
            "examine_treat_le": 0,
            "examine_treat_gt": 0,
            "carryout_le": 0,
            "carryout_gt": 0,
            "avg_total_waiting_time_min": 0.0,
            "patients_seen": 0,
            "opd_hours": 8.0,
            "thresholds_min": {
                "waiting_time": 150,
                "evaluate": 30,
                "examine_treat": 105,
                "carryout": 15,
            },
        },
        "registration": {
            "patients_served": 0,
            "arrival_rate_lambda": 0.0,
            "service_rate_mu": 0.0,
            "metrics": {
                "model": "M/M/1",
                "utilization_rho": 0.0,
                "avg_in_queue_Lq": 0.0,
                "avg_wait_queue_Wq_min": 0.0,
                "avg_time_system_W_min": 0.0,
            },
        },
        "consultation": {
            "adult": {
                "clinic": "adult",
                "active_cubicles": 0,
                "max_cubicles": 20,
                "per_cubicle": {},
                "system_benchmark": {},
                "balance_metrics": {},
            },
            "pedia": {
                "clinic": "pedia",
                "active_cubicles": 0,
                "max_cubicles": 20,
                "per_cubicle": {},
                "system_benchmark": {},
                "balance_metrics": {},
            },
        },
        "specialized_services": {},
        "system_time": {
            "avg_wait_registration": 0.0,
            "avg_service_registration": 0.0,
            "avg_wait_consultation": 0.0,
            "avg_service_consultation": 0.0,
            "avg_total_time": 0.0,
            "littles_law_check": {
                "L_observed": 0.0,
                "L_theoretical": 0.0,
                "match_ratio": 0.0,
                "status": "N/A",
            },
        },
        "computational_forecasting": {
            "status": "Insufficient data for forecasting.",
            "next_day_forecast": 0,
        },
        "lr_chart_data": {
            "labels": [],
            "actual": [],
            "lr_line": [],
            "trend": "stable",
            "slope": 0.0,
            "r2": 0.0,
            "forecast_date": "",
            "forecast_value": 0.0,
        },
        "arima_chart_data": {
            "labels": [],
            "actual": [],
            "fitted": [],
            "forecast_date": "",
            "forecast_value": 0,
            "aic": None,
            "status": "No data",
        },
        "decision_support": {},
    }