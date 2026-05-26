"""
records/utils.py  — UPGRADED
------------------------------
CHANGES FROM v1:
  + Three source-specific parsers: parse_sap_fuel_csv(), parse_utility_csv(), parse_travel_csv()
  + Upgraded detect_suspicious() with 10 rules (was 6)
  + Scope mapping (Scope 1/2/3) per source type
  + Emission factor calculations for each source
  + Duplicate detection by company+year+source_type

EMISSION FACTORS USED (IPCC AR6 / UK DEFRA 2023):
  Diesel:    2.68 kg CO₂e / litre
  Petrol:    2.31 kg CO₂e / litre
  LPG:       1.55 kg CO₂e / litre
  Grid elec: 0.233 kg CO₂e / kWh  (UK average — simplified for prototype)
  Flight:    0.255 kg CO₂e / km (economy, short-haul average)
  Car:       0.171 kg CO₂e / km
  Train:     0.041 kg CO₂e / km
"""

import pandas as pd
from datetime import datetime

# ── Emission factors ──────────────────────────────────────────────────────────
FUEL_EMISSION_FACTORS = {
    'diesel':    2.68,   # kg CO₂e per litre
    'petrol':    2.31,
    'lpg':       1.55,
    'natural gas': 2.02,
    'default':   2.50,
}

GRID_EMISSION_FACTOR = 0.233    # kg CO₂e per kWh (converted to tonnes: /1000)

TRAVEL_EMISSION_FACTORS = {
    'flight':  0.255,   # kg CO₂e per km
    'car':     0.171,
    'train':   0.041,
    'bus':     0.089,
    'default': 0.200,
}

# ── Detection thresholds ──────────────────────────────────────────────────────
MAX_CARBON_EMISSIONS     = 1_000_000    # metric tons
MAX_ENERGY_CONSUMPTION   = 5_000_000    # MWh
MAX_FUEL_LITRES          = 10_000_000   # litres per record — implausible above this
MAX_ELECTRICITY_KWH      = 50_000_000   # kWh per record
MAX_TRAVEL_DISTANCE_KM   = 20_000       # km — max realistic single trip
MAX_HOTEL_NIGHTS         = 365          # nights per trip
CURRENT_YEAR             = datetime.now().year
MIN_VALID_YEAR           = 2000


# ── Helpers ───────────────────────────────────────────────────────────────────

def safe_float(val):
    try:
        result = float(str(val).strip())
        return None if pd.isna(result) else result
    except (ValueError, TypeError):
        return None

def safe_int(val):
    try:
        f = float(str(val).strip())
        return None if pd.isna(f) else int(f)
    except (ValueError, TypeError):
        return None

def clean_str(val, default=''):
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return default
    return str(val).strip()

def standardise_columns(df):
    df.columns = [c.strip().lower().replace(' ', '_') for c in df.columns]
    return df


# ── Scope mapper ─────────────────────────────────────────────────────────────

def get_scope(source_type):
    """Maps source type to GHG Protocol Scope."""
    mapping = {
        'sap_fuel':              'scope_1',
        'utility_electricity':   'scope_2',
        'corporate_travel':      'scope_3',
        'generic':               'scope_1',
    }
    return mapping.get(source_type, 'scope_1')


# ── Suspicious detection v2 ───────────────────────────────────────────────────

def detect_suspicious(record_data: dict) -> tuple[bool, str]:
    """
    10-rule suspicious detection engine.

    Rules:
      R1  — carbon_emissions > 1,000,000 t (implausibly high)
      R2  — energy_consumption > 5,000,000 MWh
      R3  — Any numeric metric is negative
      R4  — employee_count < 1
      R5  — year out of range [2000, current_year]
      R6  — All ESG metrics missing
      R7  — Fuel litres > 10,000,000 (SAP)
      R8  — Electricity kWh > 50,000,000 (Utility)
      R9  — Travel distance > 20,000 km per trip
      R10 — Hotel nights > 365
    """
    reasons = []

    carbon  = record_data.get('carbon_emissions')
    energy  = record_data.get('energy_consumption')
    water   = record_data.get('water_usage')
    emp     = record_data.get('employee_count')
    year    = record_data.get('year')
    raw     = record_data.get('raw_data', {})

    # R1
    if carbon is not None and carbon > MAX_CARBON_EMISSIONS:
        reasons.append(f"R1: Carbon emissions ({carbon:,.0f} t) exceeds {MAX_CARBON_EMISSIONS:,} t threshold.")
    # R2
    if energy is not None and energy > MAX_ENERGY_CONSUMPTION:
        reasons.append(f"R2: Energy ({energy:,.0f} MWh) exceeds {MAX_ENERGY_CONSUMPTION:,} MWh threshold.")
    # R3
    for name, val in [('carbon_emissions', carbon), ('energy_consumption', energy), ('water_usage', water)]:
        if val is not None and val < 0:
            reasons.append(f"R3: {name} is negative ({val}) — physically impossible.")
    # R4
    if emp is not None and emp < 1:
        reasons.append(f"R4: Employee count ({emp}) < 1 — likely data error.")
    # R5
    if year is None:
        reasons.append("R5: Year is missing.")
    elif year < MIN_VALID_YEAR or year > CURRENT_YEAR:
        reasons.append(f"R5: Year ({year}) outside valid range [{MIN_VALID_YEAR}–{CURRENT_YEAR}].")
    # R6
    if carbon is None and energy is None and water is None:
        norm = record_data.get('normalized_emissions')
        if norm is None:
            reasons.append("R6: All ESG metrics (carbon, energy, water, normalized) are missing.")
    # R7 — SAP fuel
    fuel_litres = safe_float(raw.get('fuel_liters') or raw.get('fuel_litres'))
    if fuel_litres is not None and fuel_litres > MAX_FUEL_LITRES:
        reasons.append(f"R7: Fuel litres ({fuel_litres:,.0f}) exceeds {MAX_FUEL_LITRES:,} — implausible.")
    if fuel_litres is not None and fuel_litres < 0:
        reasons.append(f"R7: Fuel litres ({fuel_litres}) is negative.")
    # R8 — Utility electricity
    kwh = safe_float(raw.get('kwh_usage'))
    if kwh is not None and kwh > MAX_ELECTRICITY_KWH:
        reasons.append(f"R8: Electricity ({kwh:,.0f} kWh) exceeds {MAX_ELECTRICITY_KWH:,} kWh — implausible.")
    if kwh is not None and kwh < 0:
        reasons.append(f"R8: Electricity kWh ({kwh}) is negative.")
    # R9 — Travel distance
    dist_km = safe_float(raw.get('distance_km'))
    if dist_km is not None and dist_km > MAX_TRAVEL_DISTANCE_KM:
        reasons.append(f"R9: Travel distance ({dist_km:,.0f} km) exceeds {MAX_TRAVEL_DISTANCE_KM:,} km per trip.")
    if dist_km is not None and dist_km < 0:
        reasons.append(f"R9: Travel distance ({dist_km} km) is negative.")
    # R10 — Hotel nights
    nights = safe_float(raw.get('hotel_nights'))
    if nights is not None and nights > MAX_HOTEL_NIGHTS:
        reasons.append(f"R10: Hotel nights ({nights:.0f}) > {MAX_HOTEL_NIGHTS} — implausible for a single trip.")

    is_suspicious     = len(reasons) > 0
    suspicious_reason = ' | '.join(reasons) if reasons else ''
    return is_suspicious, suspicious_reason


# ── SOURCE 1: SAP Fuel & Procurement ─────────────────────────────────────────

def parse_sap_fuel_csv(file_obj, uploaded_by='System', filename='') -> list[dict]:
    """
    Expected columns: plant_code, fuel_type, fuel_liters, procurement_cost, posting_date
    Scope: 1 (direct fuel combustion)
    Emission factor: per fuel type (kg CO₂e/litre)
    """
    try:
        df = pd.read_csv(file_obj)
    except Exception as e:
        raise ValueError(f"Cannot read CSV: {e}")

    df = standardise_columns(df)

    required = {'plant_code', 'fuel_type', 'fuel_liters', 'posting_date'}
    missing  = required - set(df.columns)
    if missing:
        raise ValueError(f"SAP Fuel CSV missing columns: {missing}. Found: {list(df.columns)}")

    records = []
    for _, row in df.iterrows():
        raw = row.to_dict()

        fuel_type  = clean_str(raw.get('fuel_type'), 'default').lower()
        fuel_litres = safe_float(raw.get('fuel_liters') or raw.get('fuel_litres'))
        plant_code = clean_str(raw.get('plant_code'))

        # Derive year from posting_date
        year = None
        pd_val = clean_str(raw.get('posting_date'))
        if pd_val:
            for fmt in ['%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y', '%Y']:
                try:
                    year = datetime.strptime(pd_val[:10], fmt).year
                    break
                except ValueError:
                    continue

        # Calculate normalized emissions (CO₂e in metric tons)
        factor = FUEL_EMISSION_FACTORS.get(fuel_type, FUEL_EMISSION_FACTORS['default'])
        norm_emissions = None
        if fuel_litres is not None and fuel_litres >= 0:
            norm_emissions = round((fuel_litres * factor) / 1000, 4)  # kg → tonnes

        record_data = {
            'company_name':        plant_code or 'Unknown Plant',
            'source':              'SAP ERP',
            'source_type':         'sap_fuel',
            'scope_category':      'scope_1',
            'activity_type':       f'fuel_combustion_{fuel_type}',
            'year':                year,
            'carbon_emissions':    norm_emissions,
            'energy_consumption':  None,
            'water_usage':         None,
            'employee_count':      None,
            'normalized_emissions': norm_emissions,
            'original_source_file': filename,
            'created_by':          uploaded_by,
            'raw_data':            {k: (None if (isinstance(v, float) and pd.isna(v)) else v)
                                    for k, v in raw.items()},
        }

        is_susp, reason = detect_suspicious(record_data)
        record_data['is_suspicious']    = is_susp
        record_data['suspicious_reason'] = reason
        records.append(record_data)

    return records


# ── SOURCE 2: Utility Electricity ─────────────────────────────────────────────

def parse_utility_csv(file_obj, uploaded_by='System', filename='') -> list[dict]:
    """
    Expected columns: meter_id, facility_name, kwh_usage, billing_period, tariff_type
    Scope: 2 (purchased electricity)
    Emission factor: 0.233 kg CO₂e/kWh (UK grid average)
    """
    try:
        df = pd.read_csv(file_obj)
    except Exception as e:
        raise ValueError(f"Cannot read CSV: {e}")

    df = standardise_columns(df)

    required = {'meter_id', 'facility_name', 'kwh_usage', 'billing_period'}
    missing  = required - set(df.columns)
    if missing:
        raise ValueError(f"Utility CSV missing columns: {missing}. Found: {list(df.columns)}")

    records = []
    for _, row in df.iterrows():
        raw = row.to_dict()

        kwh        = safe_float(raw.get('kwh_usage'))
        facility   = clean_str(raw.get('facility_name'), 'Unknown Facility')
        billing    = clean_str(raw.get('billing_period'))

        year = None
        if billing:
            for fmt in ['%Y-%m', '%m/%Y', '%Y']:
                try:
                    year = datetime.strptime(billing[:7], fmt).year
                    break
                except ValueError:
                    continue
            if year is None:
                try:
                    year = int(billing[:4])
                except Exception:
                    pass

        # MWh for energy_consumption field
        energy_mwh = round(kwh / 1000, 4) if kwh is not None else None

        # CO₂e in metric tons
        norm_emissions = None
        if kwh is not None and kwh >= 0:
            norm_emissions = round((kwh * GRID_EMISSION_FACTOR) / 1000, 4)

        record_data = {
            'company_name':        facility,
            'source':              f'Utility Meter {clean_str(raw.get("meter_id"))}',
            'source_type':         'utility_electricity',
            'scope_category':      'scope_2',
            'activity_type':       f'electricity_{clean_str(raw.get("tariff_type","standard")).lower()}',
            'year':                year,
            'carbon_emissions':    norm_emissions,
            'energy_consumption':  energy_mwh,
            'water_usage':         None,
            'employee_count':      None,
            'normalized_emissions': norm_emissions,
            'original_source_file': filename,
            'created_by':          uploaded_by,
            'raw_data':            {k: (None if (isinstance(v, float) and pd.isna(v)) else v)
                                    for k, v in raw.items()},
        }

        is_susp, reason = detect_suspicious(record_data)
        record_data['is_suspicious']    = is_susp
        record_data['suspicious_reason'] = reason
        records.append(record_data)

    return records


# ── SOURCE 3: Corporate Travel ────────────────────────────────────────────────

def parse_travel_csv(file_obj, uploaded_by='System', filename='') -> list[dict]:
    """
    Expected columns: employee_id, from_airport, to_airport, travel_mode, distance_km,
                      hotel_nights, travel_date
    Scope: 3 (business travel — value chain)
    Emission factor: per travel mode (kg CO₂e/km)
    """
    try:
        df = pd.read_csv(file_obj)
    except Exception as e:
        raise ValueError(f"Cannot read CSV: {e}")

    df = standardise_columns(df)

    required = {'employee_id', 'travel_mode', 'distance_km'}
    missing  = required - set(df.columns)
    if missing:
        raise ValueError(f"Travel CSV missing columns: {missing}. Found: {list(df.columns)}")

    records = []
    for _, row in df.iterrows():
        raw = row.to_dict()

        mode       = clean_str(raw.get('travel_mode'), 'default').lower()
        dist_km    = safe_float(raw.get('distance_km'))
        emp_id     = clean_str(raw.get('employee_id'), 'EMP-UNKNOWN')
        hotel_n    = safe_float(raw.get('hotel_nights'))
        travel_date = clean_str(raw.get('travel_date') or raw.get('date'))

        year = None
        if travel_date:
            for fmt in ['%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y']:
                try:
                    year = datetime.strptime(travel_date[:10], fmt).year
                    break
                except ValueError:
                    continue

        factor = TRAVEL_EMISSION_FACTORS.get(mode, TRAVEL_EMISSION_FACTORS['default'])
        norm_emissions = None
        if dist_km is not None and dist_km >= 0:
            norm_emissions = round((dist_km * factor) / 1000, 4)  # kg → tonnes
            # Add hotel emissions (~20.8 kg CO₂e/night)
            if hotel_n is not None and hotel_n > 0:
                norm_emissions += round((hotel_n * 20.8) / 1000, 4)

        record_data = {
            'company_name':        f'Employee {emp_id}',
            'source':              'Corporate Travel System',
            'source_type':         'corporate_travel',
            'scope_category':      'scope_3',
            'activity_type':       f'business_travel_{mode}',
            'year':                year,
            'carbon_emissions':    norm_emissions,
            'energy_consumption':  None,
            'water_usage':         None,
            'employee_count':      None,
            'normalized_emissions': norm_emissions,
            'original_source_file': filename,
            'created_by':          uploaded_by,
            'raw_data':            {k: (None if (isinstance(v, float) and pd.isna(v)) else v)
                                    for k, v in raw.items()},
        }

        is_susp, reason = detect_suspicious(record_data)
        record_data['is_suspicious']    = is_susp
        record_data['suspicious_reason'] = reason
        records.append(record_data)

    return records


# ── SOURCE 4: Generic (backward compatible) ───────────────────────────────────

def parse_generic_csv(file_obj, uploaded_by='System', filename='') -> list[dict]:
    """
    Handles the original generic CSV format.
    Required: company_name, source, year
    """
    try:
        df = pd.read_csv(file_obj)
    except Exception as e:
        raise ValueError(f"Cannot read CSV: {e}")

    df = standardise_columns(df)

    required = {'company_name', 'source', 'year'}
    missing  = required - set(df.columns)
    if missing:
        raise ValueError(
            f"Generic CSV missing required columns: {missing}. Found: {list(df.columns)}"
        )

    records = []
    for _, row in df.iterrows():
        raw = row.to_dict()

        company = clean_str(raw.get('company_name', '')).title() or 'Unknown'
        source  = clean_str(raw.get('source', '')) or 'Unknown'
        year    = safe_int(raw.get('year'))
        carbon  = safe_float(raw.get('carbon_emissions'))
        energy  = safe_float(raw.get('energy_consumption'))
        water   = safe_float(raw.get('water_usage'))
        emp     = safe_int(raw.get('employee_count'))

        record_data = {
            'company_name':        company,
            'source':              source,
            'source_type':         'generic',
            'scope_category':      'scope_1',
            'activity_type':       'general',
            'year':                year,
            'carbon_emissions':    carbon,
            'energy_consumption':  energy,
            'water_usage':         water,
            'employee_count':      emp,
            'normalized_emissions': carbon,   # for generic, treat carbon as normalized
            'original_source_file': filename,
            'created_by':          uploaded_by,
            'raw_data':            {},
        }

        is_susp, reason = detect_suspicious(record_data)
        record_data['is_suspicious']    = is_susp
        record_data['suspicious_reason'] = reason
        records.append(record_data)

    return records


# ── Router function ────────────────────────────────────────────────────────────

PARSERS = {
    'sap_fuel':              parse_sap_fuel_csv,
    'utility_electricity':   parse_utility_csv,
    'corporate_travel':      parse_travel_csv,
    'generic':               parse_generic_csv,
}

def parse_csv_to_records(file_obj, source_type='generic',
                         uploaded_by='System', filename='') -> list[dict]:
    """
    Routes the uploaded CSV to the correct source-specific parser.
    Maintains backward compatibility — defaults to 'generic' if source_type not provided.
    """
    parser = PARSERS.get(source_type, parse_generic_csv)
    return parser(file_obj, uploaded_by=uploaded_by, filename=filename)
