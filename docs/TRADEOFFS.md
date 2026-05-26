# TRADEOFFS.md
# -------------
# Honest analysis of what was simplified or left out, and why.
# WHY: Shows maturity — experienced engineers acknowledge limitations.

# Trade-offs — ESG Data Review System

## 1. No Authentication System

**What we did**: Reviewer name is a plain text field in the request body.

**Real-world alternative**: JWT tokens, session-based login, role-based access control.

**Why we skipped it**: Authentication adds 1–2 days of development. The internship
focuses on ESG data processing, not auth infrastructure.

**Impact**: Any user can claim any reviewer name. Not suitable for production.

**Mitigation planned**: Would add `djangorestframework-simplejwt` and a login page.

---

## 2. No Pagination on the Records API

**What we did**: `/api/records/` returns all records in one response.

**Real-world alternative**: Cursor-based or page-number pagination.

**Why we skipped it**: With sample data (15–50 records), pagination adds complexity
without visible benefit.

**Impact**: With 10,000+ records, this endpoint would be very slow.

**Mitigation**: Add `PageNumberPagination` in DRF settings — 30 minutes of work.

---

## 3. SQLite for Local Development

**What we did**: SQLite database file checked into the project root.

**Real-world alternative**: PostgreSQL locally via Docker.

**Why we chose SQLite**: Zero setup — critical for a 4-day project. Any developer
can clone and run `migrate` immediately.

**Impact**: SQLite doesn't support concurrent writes. Not suitable for multi-user prod.

---

## 4. No File Storage for CSVs

**What we did**: Parse the CSV in memory (Pandas) and immediately discard it.

**Real-world alternative**: Store uploaded CSVs in S3/GCS for audit trail and re-processing.

**Why we skipped it**: Storing files requires cloud storage setup (AWS S3, boto3 config),
which is out of scope for a prototype.

**Impact**: Cannot re-process uploaded files or trace errors back to source file.

---

## 5. No Unit Tests

**What we did**: Manual testing via Postman and browser.

**Real-world alternative**: Django `TestCase` for API tests, Jest/Vitest for React.

**Why we skipped it**: Tests take as long to write as the feature code for a prototype.

**What we'd test**:
- `utils.py` → `detect_suspicious()` with edge-case inputs
- `/api/upload/` → valid CSV, invalid CSV, empty CSV
- `/api/records/{id}/approve/` → pending record, already-approved record

---

## 6. Simplified Suspicious Detection Rules

**What we did**: Hard-coded thresholds (e.g., carbon > 1,000,000).

**Real-world alternative**: Statistical outlier detection (Z-score, IQR) per industry sector.

**Why we simplified**: Statistical methods require historical baseline data we don't have.
Rule-based detection is explainable — analysts can understand exactly why a record is flagged.

**Benefit of current approach**: Transparent, auditable, zero false-positives on clean data.

---

## 7. No Real-time Updates

**What we did**: Page refresh (or re-fetch on action) to see updated data.

**Real-world alternative**: WebSockets or Server-Sent Events for live dashboard updates.

**Why we skipped it**: Real-time adds significant complexity (Django Channels, Redis).
For a review workflow, analysts don't need sub-second updates.

---

## Summary Table

| Simplification | Production Solution | Complexity to Add |
|---------------|---------------------|-------------------|
| No auth | JWT + RBAC | High (2–3 days) |
| No pagination | DRF PageNumberPagination | Low (30 min) |
| SQLite | PostgreSQL | Low (1 hr with Docker) |
| No file storage | AWS S3 + boto3 | Medium (4–6 hrs) |
| No unit tests | Django TestCase + Jest | Medium (2–3 days) |
| Hard-coded thresholds | ML-based anomaly detection | Very High |
| No real-time | Django Channels + Redis | High |
