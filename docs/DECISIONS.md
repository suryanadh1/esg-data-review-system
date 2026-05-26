# DECISIONS.md
# -------------
# Documents every significant technical decision made in this project.
# WHY: Shows interviewers that you can reason about trade-offs,
# not just write code.

# Technical Decisions — ESG Data Review System

## 1. Why Django + Django REST Framework?

**Decision**: Use Django as the backend framework with DRF for APIs.

**Reasoning**:
- Django has built-in ORM, admin panel, and migrations — reducing setup time significantly
- DRF adds serializers, validation, and response formatting out of the box
- Both are widely used in enterprise Python backends — interview-relevant skill
- SQLite works with zero configuration for local development

**Alternative considered**: FastAPI  
**Why rejected**: FastAPI is faster (performance-wise) but lacks Django's batteries
(admin, ORM migrations, auth). For a 4-day project, Django's productivity wins.

---

## 2. Why React + Vite (not Create React App)?

**Decision**: Use Vite as the build tool.

**Reasoning**:
- Vite starts the dev server in milliseconds (vs 30–60 seconds for CRA)
- CRA is deprecated — Vite is the current community standard
- Simpler config, faster hot reload

---

## 3. Why Tailwind CSS?

**Decision**: Use Tailwind for all styling.

**Reasoning**:
- Utility-first CSS prevents the need for a separate .css file per component
- Tailwind's design system prevents inconsistent spacing/colours
- No unused CSS in production (tree-shaking via PurgeCSS built in)

**Alternative considered**: Plain CSS or Material UI  
**Why rejected**: Plain CSS requires more time. MUI adds bundle size and opinionated components.

---

## 4. Why SQLite for development, PostgreSQL for production?

**Decision**: SQLite locally, Postgres on Render.

**Reasoning**:
- SQLite needs zero setup — just run `migrate` and you're done
- PostgreSQL is production-grade: supports concurrent writes, better for scale
- The DATABASE_URL env var pattern lets us switch cleanly without code changes

---

## 5. Why separate utils.py for normalization logic?

**Decision**: Keep all data cleaning and suspicious detection in `records/utils.py`.

**Reasoning**:
- Views should be thin — they handle HTTP, not business logic
- Separation makes unit testing trivial (test utils without starting a server)
- If the detection rules change, only one file needs updating

---

## 6. Why bulk_create for CSV rows?

**Decision**: Use `ESGRecord.objects.bulk_create()` instead of `.save()` per row.

**Reasoning**:
- A CSV with 1000 rows would make 1000 INSERT queries without bulk_create
- bulk_create sends all rows in one SQL statement — 10–100x faster
- The trade-off: bulk_create doesn't call model `.save()` signals, but we
  don't use those signals, so it's safe here.

---

## 7. Why two serializers for ESGRecord (List vs Detail)?

**Decision**: `ESGRecordListSerializer` for lists, `ESGRecordSerializer` for detail.

**Reasoning**:
- The list view can show 500 records — including nested audit_logs for each
  would return 500 × N audit log objects in one response. Very slow.
- The detail view shows one record — including audit_logs is fine here.
- This pattern is called "serializer per context" and is a DRF best practice.

---

## 8. Why no authentication for this prototype?

**Decision**: No login/JWT system.

**Reasoning**:
- The internship brief asks for a prototype, not a production system
- Adding auth would take 1–2 days and distract from core features
- In production: use Django's session auth or JWT (djangorestframework-simplejwt)
- Noted as a "future improvement" — shows awareness without over-engineering

---

## 9. Why Recharts for charts?

**Decision**: Use Recharts for the dashboard bar and pie charts.

**Reasoning**:
- Recharts is React-native (components, not imperative D3)
- Simple API — a bar chart is 10 lines of JSX
- Good documentation, widely used, small bundle size
