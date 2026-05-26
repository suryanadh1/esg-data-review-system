# MODEL.md
# ---------
# Explains the data model decisions for this project.
# WHY THIS FILE? Internship reviewers want to see that you understand
# WHY you made each database design choice — not just what you built.

# Data Model — ESG Data Review System

## Overview

This system uses two database tables:
1. **ESGRecord** — stores individual ESG data points ingested from CSV files
2. **AuditLog** — stores a permanent record of every action taken on each ESGRecord

---

## ESGRecord Table

| Column | Type | Nullable | Why |
|--------|------|----------|-----|
| id | BigAutoField | No | Auto-incrementing primary key |
| company_name | CharField(255) | No | The subject of the ESG data |
| source | CharField(100) | No | Where the data came from (Bloomberg, Reuters, Manual) |
| year | IntegerField | No | Fiscal year — important for trend analysis |
| carbon_emissions | FloatField | Yes | CO₂ equivalent in metric tons — nullable because CSVs often have gaps |
| energy_consumption | FloatField | Yes | MWh — nullable |
| water_usage | FloatField | Yes | Cubic meters — nullable |
| employee_count | IntegerField | Yes | Headcount — nullable |
| status | CharField(20) | No | pending / approved / rejected — review workflow state |
| is_suspicious | BooleanField | No | True if system flagged this record |
| suspicious_reason | TextField | No | Human-readable explanation of why it was flagged |
| uploaded_at | DateTimeField | No | Auto-set to ingestion time |
| reviewed_at | DateTimeField | Yes | Set when analyst approves/rejects |
| reviewed_by | CharField(100) | Yes | Analyst's name |
| notes | TextField | No | Analyst's comments |

### Key Design Decisions

**Why Float for emissions, not Decimal?**
Decimal is more precise for financial data. For ESG metrics, Float is
acceptable because the data itself has ±5% measurement uncertainty.
Simplicity wins here.

**Why is status a CharField, not a Boolean?**
A boolean `is_approved` can't represent three states: pending, approved,
rejected. CharField with choices is the clean solution.

**Why nullable ESG metrics?**
Real-world ESG datasets are incomplete. If we required all fields,
we'd reject 30–40% of real CSV files. We accept nulls and flag them
as suspicious instead — giving analysts the choice to approve or reject.

---

## AuditLog Table

| Column | Type | Why |
|--------|------|-----|
| id | BigAutoField | PK |
| record | ForeignKey(ESGRecord) | Links log entry to the record it describes |
| action | CharField(20) | uploaded / approved / rejected |
| performed_by | CharField(100) | Name of analyst or "System (CSV Import)" |
| timestamp | DateTimeField | When the action happened — auto-set |
| details | TextField | Extra context (notes, file name, etc.) |

### Key Design Decisions

**Why a separate AuditLog table instead of just storing review info on ESGRecord?**
One record can have multiple audit events (uploaded → rejected → re-reviewed).
A separate table is the only correct way to model a one-to-many timeline.

**Why is AuditLog write-only (no update/delete)?**
Audit logs are legal evidence of decisions made. Once written, they
must not be editable. The Django admin enforces this by disabling
add/change permissions on AuditLog.

**Why no ForeignKey to Django's User model?**
For this prototype, analyst identity is just a name string. In a
production system, you'd use `request.user` and a proper auth system.
Keeping it simple for a 4-day internship project is the right trade-off.

---

## Entity Relationship

```
ESGRecord (1) ────── (*) AuditLog
   ↑
   CSV Upload
```

One ESGRecord can have many AuditLog entries over its lifetime.
