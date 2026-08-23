"""
constants.py
All PHC-specific fixed values in one place.
Change these here and every module picks them up automatically.
"""

# This file stores the fixed values used across the analytics module, such as thresholds, limits, and service categories.

# PHC-specific constants
MAX_ADULT_CUBICLES  = 5    # 1 room × 5 cubicles (default)
MAX_PEDIA_CUBICLES  = 5    # 1 room × 5 cubicles (default)

# OPD time targets (from scope of study)
OPD_TARGET_MINUTES  = 150   # 2 hrs 30 min total stay target

# Bottleneck severity tiers — per-stage average wait thresholds (minutes).
# Normal:      avg <= OVERWHELMED_MINUTES
# Elevated:    OVERWHELMED_MINUTES < avg <= CRITICAL_MINUTES
# Overwhelmed: avg > CRITICAL_MINUTES
OVERWHELMED_MINUTES = 30    # Normal -> Elevated threshold (unchanged, still used elsewhere)
CRITICAL_MINUTES    = 60    # Elevated -> Overwhelmed threshold (2x baseline)

# Forecasting defaults
EMA_ALPHA    = 0.3
WINDOW_SIZE  = 2  # Minimum 2 days for moving averages

# Backtesting — how often ARIMA re-estimates its parameters during
# evaluation, vs. reusing the existing fit and just feeding it new data.
ARIMA_REFIT_INTERVAL = 7  # days

# Service categories
CONSULTATION_SERVICE   = 'consultation'

SPECIALIZED_SERVICES = [
    'warfarin',
    'benzathine',
    'ecg',
    'opd_card',
    'opd_screening',
    'refill_prescription',
    'opd_reschedule',
]