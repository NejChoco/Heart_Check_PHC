"""
descriptive.py
Daily summaries, hourly patterns, and bottleneck detection.
"""

# This files handle all the descriptive analytics functions, 
# #which are used to generate the data for the dashboard and reports. #
# This includes daily summaries, hourly patterns, and bottleneck detection.
# This file is basically the overview and data processing of the analytics module, 
# while the other files are more focused on specific types of \
# analysis (e.g. forecasting, queue metrics, staffing recommendations).

import pandas as pd
from .constants import OVERWHELMED_MINUTES, CRITICAL_MINUTES

# Calculate daily summaries such as patient counts and average wait times per day
def daily_summary(df: pd.DataFrame) -> pd.DataFrame:
    """Daily aggregation — last 5 days shown on dashboard."""
    return (
        df.groupby('visit_date').agg(
            total_patients        = ('patient_id',        'count'),
            avg_wait_registration = ('wait_registration', 'mean'),
            avg_wait_consultation = ('wait_consultation', 'mean'),
            avg_total_time        = ('total_time',        'mean'),
        )
        .reset_index()
        .round(2)
    )

# Shows which are the busiest hours of the day, and how wait times vary by hour. 
# This can help identify peak times and potential staffing needs.
def hourly_pattern(df: pd.DataFrame) -> pd.DataFrame:
    """Average patients and wait time per hour of day."""
    return (
        df.groupby('hour').agg(
            avg_patients          = ('patient_id',        'count'),
            avg_wait_consultation = ('wait_consultation', 'mean'),
        )
        .reset_index()
        .assign(time_label=lambda d: d['hour'].astype(int).apply(
            lambda h: f"{h:02d}:00–{h+1:02d}:00"
        ))
        .round(2)
    )


def _classify_level(avg_minutes: float) -> str:
    """3-level severity classification for a single stage's average wait/duration."""
    if avg_minutes > CRITICAL_MINUTES:
        return "Overwhelmed"
    elif avg_minutes > OVERWHELMED_MINUTES:
        return "Elevated"
    return "Normal"


def _stage_reason(stage_label: str, avg_minutes: float, level: str, patient_count: int) -> str:
    """Plain-language explanation of why a stage was classified at this level."""
    if level == "No Data":
        return f"No patients have reached {stage_label} yet in this range."

    if level == "Normal":
        return (
            f"{stage_label} is averaging {avg_minutes} min across {patient_count} patients — "
            f"within the {OVERWHELMED_MINUTES}-min target."
        )

    threshold = OVERWHELMED_MINUTES if level == "Elevated" else CRITICAL_MINUTES
    over_by   = round(avg_minutes - threshold, 2)
    multiple  = round(avg_minutes / OVERWHELMED_MINUTES, 1) if OVERWHELMED_MINUTES > 0 else 0

    return (
        f"{stage_label} is averaging {avg_minutes} min across {patient_count} patients — "
        f"{over_by} min over the {threshold}-min {level.lower()} threshold "
        f"({multiple}x the {OVERWHELMED_MINUTES}-min baseline)."
    )


# Identifies which specific stage of the kiosk-to-carryout flow is the
# bottleneck, classifies each stage independently into 3 severity levels
# (Normal / Elevated / Overwhelmed) plus a 4th "No Data" state for stages
# nobody has reached yet, and explains why in plain language.
#
# This replaces the old 2-stage version, which only ever compared
# registration vs. consultation and returned a single system-wide
# Normal/Overwhelmed flag with no explanation of which stage caused it.
def bottleneck_report(df: pd.DataFrame) -> dict:
    """
    Stage definitions (see preprocessing.py for column derivation):
      Kiosk → Registration wait   : wait_registration     (kiosk_time     → reg_start)
      Registration duration       : service_registration  (reg_start      → reg_end)
      Registration → Consult wait : wait_consultation      (reg_end        → consult_start)
      Consultation duration       : service_consultation   (consult_start  → consult_end)
      Carryout duration           : service_carryout       (carryout_start → carryout_end)

    All 5 stages are always returned, even with 0 qualifying patients —
    "No Data" is a distinct level from "Normal" (0 patients isn't the same
    claim as "0 patients and everything's fine"), so the dashboard table
    always shows the full framework rather than stages silently vanishing
    when live data is thin.
    """
    stage_defs = [
        ("kiosk_to_registration_wait",    "Kiosk → Registration wait",         'wait_registration'),
        ("registration_duration",         "Registration duration",             'service_registration'),
        ("registration_to_consult_wait",  "Registration → Consultation wait",  'wait_consultation'),
        ("consultation_duration",         "Consultation duration",             'service_consultation'),
        ("carryout_duration",             "Carryout duration",                 'service_carryout'),
    ]

    # These three stages only apply to patients who actually went through
    # registration — some services skip straight to a specialized station.
    registration_gated = {'wait_registration', 'service_registration', 'wait_consultation'}

    stages = []
    for key, label, col in stage_defs:
        if col not in df.columns:
            # Column not in df at all (e.g. carryout not selected upstream yet) —
            # still show the row so the table's shape stays consistent.
            stages.append({
                "stage_key"     : key,
                "stage_label"   : label,
                "avg_minutes"   : 0.0,
                "patient_count" : 0,
                "level"         : "No Data",
                "reason"        : _stage_reason(label, 0.0, "No Data", 0),
            })
            continue

        subset = df[df['reg_start'].notna()] if col in registration_gated else df

        values = subset[col].dropna()
        values = values[values >= 0]  # guard against any negative-duration edge cases

        if values.empty:
            stages.append({
                "stage_key"     : key,
                "stage_label"   : label,
                "avg_minutes"   : 0.0,
                "patient_count" : 0,
                "level"         : "No Data",
                "reason"        : _stage_reason(label, 0.0, "No Data", 0),
            })
            continue

        avg_minutes   = round(float(values.mean()), 2)
        patient_count = int(values.count())
        level         = _classify_level(avg_minutes)
        reason        = _stage_reason(label, avg_minutes, level, patient_count)

        stages.append({
            "stage_key"     : key,
            "stage_label"   : label,
            "avg_minutes"   : avg_minutes,
            "patient_count" : patient_count,
            "level"         : level,
            "reason"        : reason,
        })

    # Rank severity for picking the primary bottleneck: Overwhelmed > Elevated
    # > Normal > No Data. "No Data" ranks lowest on purpose — a stage nobody
    # has reached yet should never be reported as "the" bottleneck.
    severity_rank = {"Overwhelmed": 3, "Elevated": 2, "Normal": 1, "No Data": 0}
    stages_with_data = [s for s in stages if s["level"] != "No Data"]

    if not stages_with_data:
        return {
            "stages"                    : stages,
            "primary_bottleneck"        : None,
            "system_status"             : "No Data",
            "bottleneck_stage"          : "N/A",
            "avg_wait_registration_min" : 0.0,
            "avg_wait_consultation_min" : 0.0,
        }

    primary = max(stages_with_data, key=lambda s: (severity_rank[s["level"]], s["avg_minutes"]))

    return {
        # Full per-stage breakdown for the dashboard table — always 5 rows.
        "stages" : stages,

        "primary_bottleneck" : {
            "stage_key"   : primary["stage_key"],
            "stage_label" : primary["stage_label"],
            "avg_minutes" : primary["avg_minutes"],
            "level"       : primary["level"],
            "reason"      : primary["reason"],
        },

        # Overall system status reflects the worst stage that actually has data.
        "system_status" : primary["level"],

        # Legacy keys kept so any existing frontend code reading the old
        # 2-stage shape directly doesn't break during the transition.
        "bottleneck_stage"          : primary["stage_label"],
        "avg_wait_registration_min" : next(
            (s["avg_minutes"] for s in stages if s["stage_key"] == "kiosk_to_registration_wait"), 0.0
        ),
        "avg_wait_consultation_min" : next(
            (s["avg_minutes"] for s in stages if s["stage_key"] == "registration_to_consult_wait"), 0.0
        ),
    }

    
# Aggregates patient volume by service type across the full dataset —
# used as the historical baseline for the Service Distribution chart
# when there's no live "today" data to show.
def service_distribution(df: pd.DataFrame) -> pd.DataFrame:
    """Total patient count per service, across the full date range in df."""
    return (
        df.groupby('purpose').agg(
            total_patients = ('patient_id', 'count'),
        )
        .reset_index()
        .rename(columns={'purpose': 'service'})
        .sort_values('total_patients', ascending=False)
        .round(2)
    )