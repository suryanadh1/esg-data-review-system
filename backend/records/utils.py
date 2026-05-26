"""
records/utils.py
----------------
Contains two core business logic functions:

1. normalize_row()     — cleans and standardises a raw CSV row
2. detect_suspicious() — flags records that look wrong/anomalous

WHY SEPARATE FILE?
  Keeping business logic out of views keeps views thin and readable.
  It also makes this logic easy to unit-test independently.

WHY PANDAS?
  Pandas makes CSV parsing, type coercion, and NaN handling trivial
  compared to Python's built-in csv module.
"""

import pandas as pd
from datetime import datetime


# ── Constants for suspicious-detection thresholds ────────────────────────────
MAX_CARBON_EMISSIONS   = 1_000_000   # metric tons — above this is unrealistic
MAX_ENERGY_CONSUMPTION = 5_000_000   # MWh — above this is unrealistic
CURRENT_YEAR           = datetime.now().year
MIN_VALID_YEAR         = 2000


def normalize_row(row: dict) -> dict:
    """
    Cleans a single raw CSV row dictionary.

    Steps:
      1. Strip whitespace from all string fields
      2. Title-case company_name for consistency
      3. Convert numeric strings → float/int (NaN → None)
      4. Ensure 'year' is an integer
      5. Set default 'source' if missing

    Returns a clean dict ready for ESGRecord creation.
    """

    def safe_float(val):
        """Convert val to float; return None if invalid or missing."""
        try:
            result = float(str(val).strip())
            return None if pd.isna(result) else result
        except (ValueError, TypeError):
            return None

    def safe_int(val):
        """Convert val to int; return None if invalid or missing."""
        try:
            f = float(str(val).strip())
            return None if pd.isna(f) else int(f)
        except (ValueError, TypeError):
            return None

    # Strip and title-case company name
    company_name = str(row.get('company_name', '')).strip().title()

    # Normalise source — default to 'Unknown' if blank
    source = str(row.get('source', '')).strip() or 'Unknown'

    return {
        'company_name':      company_name,
        'source':            source,
        'year':              safe_int(row.get('year')),
        'carbon_emissions':  safe_float(row.get('carbon_emissions')),
        'energy_consumption': safe_float(row.get('energy_consumption')),
        'water_usage':       safe_float(row.get('water_usage')),
        'employee_count':    safe_int(row.get('employee_count')),
    }


def detect_suspicious(record_data: dict) -> tuple[bool, str]:
    """
    Analyses a normalised record dict and returns:
      (is_suspicious: bool, reason: str)

    Rules (any one triggers a flag):
      R1 — carbon_emissions > 1,000,000  (implausibly high)
      R2 — energy_consumption > 5,000,000 (implausibly high)
      R3 — Any numeric metric is negative
      R4 — employee_count < 1 (no employees → likely data error)
      R5 — year out of range [2000, current_year]
      R6 — Critical fields (carbon, energy, water) all missing
    """
    reasons = []

    carbon  = record_data.get('carbon_emissions')
    energy  = record_data.get('energy_consumption')
    water   = record_data.get('water_usage')
    emp     = record_data.get('employee_count')
    year    = record_data.get('year')

    # R1 — implausibly high carbon
    if carbon is not None and carbon > MAX_CARBON_EMISSIONS:
        reasons.append(
            f"Carbon emissions ({carbon:,.0f}) exceeds maximum threshold "
            f"of {MAX_CARBON_EMISSIONS:,} metric tons."
        )

    # R2 — implausibly high energy
    if energy is not None and energy > MAX_ENERGY_CONSUMPTION:
        reasons.append(
            f"Energy consumption ({energy:,.0f}) exceeds maximum threshold "
            f"of {MAX_ENERGY_CONSUMPTION:,} MWh."
        )

    # R3 — negative values
    for name, val in [('carbon_emissions', carbon),
                      ('energy_consumption', energy),
                      ('water_usage', water)]:
        if val is not None and val < 0:
            reasons.append(f"{name} is negative ({val}), which is physically impossible.")

    # R4 — zero or negative employees
    if emp is not None and emp < 1:
        reasons.append(
            f"Employee count ({emp}) is less than 1 — likely a data entry error."
        )

    # R5 — invalid year
    if year is not None:
        if year < MIN_VALID_YEAR or year > CURRENT_YEAR:
            reasons.append(
                f"Year ({year}) is outside valid range [{MIN_VALID_YEAR}–{CURRENT_YEAR}]."
            )
    else:
        reasons.append("Year is missing.")

    # R6 — all critical ESG fields missing
    if carbon is None and energy is None and water is None:
        reasons.append(
            "All three critical ESG metrics (carbon, energy, water) are missing."
        )

    is_suspicious   = len(reasons) > 0
    suspicious_reason = ' | '.join(reasons) if reasons else ''

    return is_suspicious, suspicious_reason


def parse_csv_to_records(file_obj) -> list[dict]:
    """
    Reads an uploaded CSV file object using pandas,
    normalises every row, and runs suspicious detection.

    Returns a list of clean record dicts ready to bulk-insert.

    WHY BULK INSERT? Inserting row-by-row would make N database
    calls for N rows. bulk_create() does it in one query — much faster.
    """
    try:
        df = pd.read_csv(file_obj)
    except Exception as e:
        raise ValueError(f"Could not read CSV: {e}")

    # Lowercase column names so 'Company_Name' == 'company_name'
    df.columns = [col.strip().lower().replace(' ', '_') for col in df.columns]

    required_columns = {'company_name', 'source', 'year'}
    missing = required_columns - set(df.columns)
    if missing:
        raise ValueError(
            f"CSV is missing required columns: {', '.join(missing)}. "
            f"Found columns: {', '.join(df.columns)}"
        )

    records = []
    for _, row in df.iterrows():
        clean = normalize_row(row.to_dict())
        is_suspicious, reason = detect_suspicious(clean)
        clean['is_suspicious']    = is_suspicious
        clean['suspicious_reason'] = reason
        records.append(clean)

    return records
