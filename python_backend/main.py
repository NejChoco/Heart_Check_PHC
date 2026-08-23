"""
main.py
FastAPI Backend for Heart Check PHC
Connects to Supabase and serves the analytics payload to the frontend.
"""

import os
import traceback
from datetime import date, timedelta
import pandas as pd
import httpx
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from analytics import generate_report

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(BASE_DIR, "..", ".env.local")
load_dotenv(env_path)
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

# Maps the frontend's range selector to a day count.
# "all" is handled separately below (skips filtering entirely).
RANGE_DAYS = {
    "90d":  90,
    "180d": 180,
    "365d": 365,
}
DEFAULT_RANGE = "90d"


def fetch_supabase_table(
    table_name: str,
    select: str = "*",
    start_date: str | None = None,
    end_date: str | None = None,
) -> list[dict]:
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise RuntimeError("Supabase URL/key are not configured.")

    date_filter = ""
    if start_date:
        date_filter += f"&created_at=gte.{start_date}"
    if end_date:
        date_filter += f"&created_at=lt.{end_date}"

    all_data = []
    page = 0
    page_size = 1000

    while True:
        start = page * page_size
        end = start + page_size - 1

        url = (
            f"{SUPABASE_URL}/rest/v1/{table_name}"
            f"?select={select}{date_filter}&order=created_at.asc"
        )

        with httpx.Client(timeout=30.0) as client:
            response = client.get(
                url,
                headers={
                    "apikey": SUPABASE_KEY,
                    "Authorization": f"Bearer {SUPABASE_KEY}",
                    "Range": f"{start}-{end}",
                },
            )

            if response.status_code == 416:
                break

            response.raise_for_status()
            data = response.json()

            if not data:
                break

            all_data.extend(data)

            if len(data) < page_size:
                break

            page += 1

    return all_data


def safe_to_datetime(series: pd.Series) -> pd.Series:
    series = pd.to_datetime(series, errors="coerce")
    if series.dt.tz is None:
        return series.dt.tz_localize('UTC')
    return series.dt.tz_convert('UTC')


def normalize_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    if "id" in df.columns and "patient_id" not in df.columns:
        df["patient_id"] = df["id"]
        df = df.drop(columns=["id"])
    elif "patientNum" in df.columns and "patient_id" not in df.columns:
        df = df.rename(columns={"patientNum": "patient_id"})

    if "kiosk_time" not in df.columns and "created_at" in df.columns:
        df["kiosk_time"] = df["created_at"]
        df = df.drop(columns=["created_at"])

    # carryout_start/carryout_end added alongside is_historical — parsed the
    # same way as the other timestamp columns below. Left out of the loop
    # is a no-op if a caller still passes the old select() list, since the
    # `if col in df.columns` guard in preprocess_queue_data() (analytics
    # module) skips the carryout stage entirely rather than erroring.
    for col in ["kiosk_time", "reg_start", "reg_end", "consult_start", "consult_end",
                "carryout_start", "carryout_end", "updated_at"]:
        if col in df.columns:
            df[col] = safe_to_datetime(df[col])

    if "visit_date" not in df.columns and "kiosk_time" in df.columns:
        df["visit_date"] = df["kiosk_time"].dt.date

    return df


def resolve_date_range(range_param: str) -> tuple[str | None, str | None]:
    """
    Converts the frontend's `range` selector into concrete start/end
    ISO date strings used to filter the Supabase query.
    "all" returns (None, None), which skips filtering entirely.
    """
    if range_param == "all":
        return None, None

    days = RANGE_DAYS.get(range_param, RANGE_DAYS[DEFAULT_RANGE])
    end_exclusive = date.today() + timedelta(days=1)  # include all of today
    start = date.today() - timedelta(days=days)
    return start.isoformat(), end_exclusive.isoformat()


@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {"status": "ok", "message": "Analytics backend is running"}


@app.get("/api/dashboard-data")
def get_dashboard_data(range: str = DEFAULT_RANGE):
    start_date, end_date = resolve_date_range(range)

    try:
        data = fetch_supabase_table(
            "patients",
            select=(
                "id,created_at,patientNum,service,status,"
                "reg_start,reg_end,consult_start,consult_end,"
                "carryout_start,carryout_end,cubicleNum,is_historical"
            ),
            start_date=start_date,
            end_date=end_date,
        )
    except Exception as patients_error:
        data = []
        print(f"patients fetch error: {patients_error}")

    if not data:
        return get_empty_data()

    df = pd.DataFrame(data)
    df = normalize_dataframe(df)

    if df.empty:
        return get_empty_data()

    try:
        report = generate_report(df)
        return report
    except Exception:
        print("=" * 60)
        print("ANALYTICS REPORT ERROR - FULL TRACEBACK:")
        traceback.print_exc()
        print("=" * 60)
        fallback = get_empty_data()
        fallback["bottleneck_analysis"]["system_status"] = "Error"
        fallback["_debug_error"] = True  # remove before thesis defense / production
        return fallback


def get_empty_data():
    """Return empty state data when database has no patient records"""
    return {
        "daily_summary": [],
        "hourly_pattern": [],
        "service_distribution": [],
        "bottleneck_analysis": {
            "stages": [],
            "primary_bottleneck": None,
            "system_status": "No Data",
            "bottleneck_stage": None,
            "avg_wait_registration_min": 0,
            "avg_wait_consultation_min": 0,
        },
        "queue_theory": {
            "arrival_rate_lambda": 0,
            "service_rate_mu": 0,
            "current_metrics": {
                "servers_c": 0,
                "utilization_rho": 0,
                "probability_of_wait": 0,
                "expected_wait_queue_min": 0
            }
        },
        "computational_forecasting": {
            "next_day_forecast": 0,
            "best_algorithm": "N/A",
            "algorithmic_conclusion": "Insufficient data for forecast.",
            "evaluation_metrics": {}
        },
        "lr_chart_data": {
            "labels": [],
            "actual": [],
            "lr_line": [],
            "forecast_date": "",
            "forecast_value": 0,
            "slope": 0,
            "trend": "stable",
            "r2": 0
        },
        "arima_chart_data": {
            "labels": [],
            "actual": [],
            "fitted": [],
            "forecast_date": "",
            "forecast_value": 0,
            "aic": None,
            "status": "No data"
        },
        "decision_support": {
            "forecasted_patients": 0,
            "recommended_doctors": 1,
            "expected_utilization": 0,
            "adult_clinic": {
                "recommended_doctors": 1,
                "max_cubicles": 5,
                "capacity_sufficient": True,
                "expected_utilization": 0,
                "warning": None,
            },
            "pedia_clinic": {
                "recommended_doctors": 1,
                "max_cubicles": 5,
                "capacity_sufficient": True,
                "expected_utilization": 0,
                "warning": None,
            }
        }
    }