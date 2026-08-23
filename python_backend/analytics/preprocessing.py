"""
preprocessing.py
Converts raw Supabase dataframe into analytics-ready columns.
"""

import pandas as pd
from .helpers import to_utc


def preprocess_queue_data(df: pd.DataFrame) -> pd.DataFrame:
    """
    Renames Supabase columns, parses timestamps to UTC,
    fills NULL timestamps for live/ongoing patients,
    enforces chronological order, and computes all
    derived duration columns used by every other module.
    """
    # Rename Supabase columns to internal names
    df = df.rename(columns={k: v for k, v in {
        'id'        : 'patient_id',
        'created_at': 'kiosk_time',
        'service'   : 'purpose',
        'patientNum': 'queue_number',
    }.items() if k in df.columns and v not in df.columns})

    # Parse timestamps to UTC
    for col in ['kiosk_time', 'reg_start', 'reg_end', 'consult_start', 'consult_end']:
        if col in df.columns:
            df[col] = to_utc(df[col])

    # Capture which stage-boundary timestamps were ACTUALLY recorded,
    # before they get filled with `now()` below for ongoing patients.
    # Without this, a patient who hasn't reached registration yet gets
    # both reg_start AND reg_end filled to the same `now()` — making
    # service_registration = reg_end - reg_start compute as 0, which
    # silently counts them as "registered in 0 minutes" instead of
    # "hasn't reached registration yet". Same issue cascades into
    # wait_consultation and service_consultation.
    reg_end_reached     = df['reg_end'].notna()     if 'reg_end'     in df.columns else pd.Series(False, index=df.index)
    consult_end_reached = df['consult_end'].notna() if 'consult_end' in df.columns else pd.Series(False, index=df.index)

    # Fill NULLs with now (ongoing/live patients)
    now = pd.Timestamp.now(tz='UTC')
    for col in ['reg_start', 'reg_end', 'consult_start', 'consult_end']:
        if col in df.columns:
            df[col] = df[col].fillna(now)

    # Enforce chronological order
    df['reg_start']     = df[['kiosk_time',   'reg_start']].max(axis=1)
    df['reg_end']       = df[['reg_start',    'reg_end']].max(axis=1)
    df['consult_start'] = df[['reg_end',      'consult_start']].max(axis=1)
    df['consult_end']   = df[['consult_start','consult_end']].max(axis=1)

    # Derived durations (minutes) 
    # wait_registration is kept as-is even for ongoing patients: kiosk_time
    # is always real, and reg_start-filled-to-now correctly represents
    # "how long they've been waiting so far" — a genuinely meaningful
    # live signal, not a fake value.
    df['wait_registration']    = (df['reg_start']      - df['kiosk_time']).dt.total_seconds() / 60

    # These three, however, are only meaningful once their END boundary
    # actually happened — otherwise they're measuring the gap between
    # two now()-filled timestamps and will always come out ~0.
    df['service_registration'] = (df['reg_end']        - df['reg_start']).dt.total_seconds() / 60
    df.loc[~reg_end_reached, 'service_registration'] = pd.NA

    df['wait_consultation']    = (df['consult_start']  - df['reg_end']).dt.total_seconds() / 60
    df.loc[~reg_end_reached, 'wait_consultation'] = pd.NA

    df['service_consultation'] = (df['consult_end']    - df['consult_start']).dt.total_seconds() / 60
    df.loc[~consult_end_reached, 'service_consultation'] = pd.NA
    
    df['total_time']           = (df['consult_end']    - df['kiosk_time']).dt.total_seconds() / 60

    # Carryout stage — carryout_start/carryout_end were added to the schema
    # alongside is_historical. Only computed if the raw query actually
    # included these columns (guards against older FastAPI select() calls
    # that don't request them yet).
    #
    # Deliberately NOT filled with `now` like the other stages above:
    # carryout is optional per visit (not every patient goes through it,
    # and many "in progress" patients simply haven't reached it yet), so
    # a missing value should stay a genuine NULL rather than get treated
    # as "started right now" and pollute the stage average with a fake
    # near-zero duration.
    if 'carryout_start' in df.columns and 'carryout_end' in df.columns:
        df['carryout_start'] = to_utc(df['carryout_start'])
        df['carryout_end']   = to_utc(df['carryout_end'])

        has_both = df['carryout_start'].notna() & df['carryout_end'].notna()
        df.loc[has_both, 'carryout_end'] = df.loc[
            has_both, ['carryout_start', 'carryout_end']
        ].max(axis=1)

        df['service_carryout'] = (
            df['carryout_end'] - df['carryout_start']
        ).dt.total_seconds() / 60

    # Time grouping — computed in Asia/Manila local time, not UTC.
    # kiosk_time is stored in UTC (correct for duration math above),
    # but hour-of-day / calendar-date / day-of-week are meant to
    # describe the actual PHC business day as staff experience it.
    # Grouping by raw UTC hour here previously shifted every local
    # timestamp back 8 hours, making afternoon patients look like
    # early-morning ones and clipping the Hourly Wait Time chart
    # around local noon.
    manila_time        = df['kiosk_time'].dt.tz_convert('Asia/Manila')
    df['visit_date']   = manila_time.dt.date
    df['hour']         = manila_time.dt.hour
    df['day_of_week']  = manila_time.dt.day_name()

    # Normalize purpose to lowercase
    if 'purpose' in df.columns:
        df['purpose'] = df['purpose'].str.lower().str.strip()

    # Classify clinic type from cubicleNum prefix
    # Convention: cubicleNum starting with 'P' = pedia, else adult
    df['clinic_type'] = (
        df['cubicleNum'].apply(
            lambda x: 'pedia' if str(x).lower().startswith('p') else 'adult'
        ) if 'cubicleNum' in df.columns
        else 'adult'
    )

    return df