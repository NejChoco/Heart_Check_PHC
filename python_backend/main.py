"""
main.py
FastAPI Backend for Heart Check PHC
Connects to Supabase and serves the analytics payload to the frontend.
"""

import os
import time
import traceback
from datetime import date, timedelta
import pandas as pd
import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from analytics import generate_report
from analytics.preprocessing import preprocess_queue_data
from analytics.descriptive import monthly_breakdown

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

# Shared client across all Supabase REST calls — avoids paying a fresh
# TCP/TLS handshake on every paginated page. Previously fetch_supabase_table
# opened a brand-new httpx.Client per 1000-row page, which meant ~26
# separate handshakes just to pull the full patients table.
_http_client = httpx.Client(timeout=30.0)

# Simple in-memory TTL cache for the per-year monthly breakdown and the
# available-years list. Historical years don't change once imported, so
# this mostly just avoids recomputing the same year repeatedly across
# page loads within the cache window. Not thread-safe / not persisted —
# fine for a single-process dev/thesis deployment.
CACHE_TTL_SECONDS = 300
_monthly_cache: dict[int, tuple[float, list[dict]]] = {}
_years_cache: tuple[float, list[int]] | None = None


def _supabase_headers() -> dict:
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise RuntimeError("Supabase URL/key are not configured.")
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
    }


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

        response = _http_client.get(
            url,
            headers={**_supabase_headers(), "Range": f"{start}-{end}"},
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


def fetch_supabase_edge(
    table_name: str,
    column: str,
    ascending: bool,
) -> dict | None:
    """
    Fetches a single row — either the earliest or latest by `column` —
    without pulling the rest of the table. Used to derive the available
    year range cheaply (2 tiny requests) instead of scanning all rows.
    """
    direction = "asc" if ascending else "desc"
    url = (
        f"{SUPABASE_URL}/rest/v1/{table_name}"
        f"?select={column}&order={column}.{direction}&limit=1"
    )
    response = _http_client.get(url, headers=_supabase_headers())
    response.raise_for_status()
    data = response.json()
    return data[0] if data else None


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


@app.get("/api/available-years")
def get_available_years():
    """
    Returns the list of years present in the patients table, derived from
    just the earliest and latest created_at rows (2 lightweight requests)
    rather than pulling and scanning the full table.

    Cached for CACHE_TTL_SECONDS since the year range only grows when new
    historical data is imported.
    """
    global _years_cache

    now = time.time()
    if _years_cache and (now - _years_cache[0]) < CACHE_TTL_SECONDS:
        return {"years": _years_cache[1]}

    try:
        earliest = fetch_supabase_edge("patients", "created_at", ascending=True)
        latest = fetch_supabase_edge("patients", "created_at", ascending=False)
    except Exception as e:
        print(f"available-years fetch error: {e}")
        return {"years": []}

    if not earliest or not latest:
        return {"years": []}

    start_year = pd.to_datetime(earliest["created_at"]).year
    end_year = pd.to_datetime(latest["created_at"]).year

    years = list(range(start_year, end_year + 1))
    _years_cache = (now, years)
    return {"years": years}


@app.get("/api/monthly-breakdown/{year}")
def get_monthly_breakdown_for_year(year: int, refresh: bool = False):
    """
    Returns the month-by-month bottleneck + avg total time breakdown for
    a single year only — fetches just that year's rows instead of the
    full historical table, and caches the computed result for
    CACHE_TTL_SECONDS. Pass ?refresh=true to bypass the cache (e.g. right
    after a data re-import).
    """
    now = time.time()
    cached = _monthly_cache.get(year)
    if cached and not refresh and (now - cached[0]) < CACHE_TTL_SECONDS:
        return {"year": year, "months": cached[1]}

    start = f"{year}-01-01"
    end = f"{year + 1}-01-01"

    try:
        data = fetch_supabase_table(
            "patients",
            select=(
                "id,created_at,patientNum,service,status,"
                "reg_start,reg_end,consult_start,consult_end,"
                "carryout_start,carryout_end,cubicleNum,is_historical"
            ),
            start_date=start,
            end_date=end,
        )
    except Exception as e:
        print(f"monthly-breakdown fetch error ({year}): {e}")
        raise HTTPException(status_code=502, detail="Failed to fetch data for that year.")

    if not data:
        _monthly_cache[year] = (now, [])
        return {"year": year, "months": []}

    df = pd.DataFrame(data)
    df = normalize_dataframe(df)

    if df.empty:
        _monthly_cache[year] = (now, [])
        return {"year": year, "months": []}

    try:
        df_clean = preprocess_queue_data(df)
        breakdown = monthly_breakdown(df_clean)
        months = breakdown.get(str(year), [])
    except Exception:
        print("=" * 60)
        print(f"MONTHLY BREAKDOWN ERROR ({year}) - FULL TRACEBACK:")
        traceback.print_exc()
        print("=" * 60)
        raise HTTPException(status_code=500, detail="Failed to compute breakdown for that year.")

    _monthly_cache[year] = (now, months)
    return {"year": year, "months": months}


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