# ESG Data Review System

[![Django](https://img.shields.io/badge/Django-4.2-green)](https://djangoproject.com)
[![React](https://img.shields.io/badge/React-18.2-blue)](https://react.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8)](https://tailwindcss.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> A prototype web application that ingests ESG (Environmental, Social, Governance) data from CSV files, normalises it, flags suspicious records, and provides an analyst workflow to approve or reject records before audit.

---

## 🌿 What is ESG?

ESG stands for **Environmental, Social, and Governance** — a set of standards used by investors to evaluate a company's sustainability and ethical impact. This system helps compliance analysts review raw ESG data before it is submitted for formal audit.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 📤 CSV Upload | Drag-and-drop CSV ingestion with instant feedback |
| 🔍 Auto-Normalisation | Strips whitespace, title-cases names, converts types |
| ⚠️ Suspicious Detection | 6 rule-based checks flag anomalous data automatically |
| ✅ Approve / Reject | Analysts review and action each record with notes |
| 📋 Audit Log | Immutable chronological trail of every action |
| 📊 Dashboard | Summary stats + bar/pie charts |
| 🔎 Filter & Search | Filter records by status, source, year, company name |

---

## 🗂 Project Structure

```
ESG-Data-Review-System/
├── backend/                   Django REST API
│   ├── esg_backend/           Project config (settings, urls, wsgi)
│   ├── records/               Core app (models, views, utils, serializers)
│   ├── manage.py
│   ├── requirements.txt
│   └── .env                   ← NOT committed to Git
├── frontend/                  React + Vite + Tailwind
│   ├── src/
│   │   ├── api/esgApi.js      Axios API client
│   │   ├── components/        Navbar, StatCard, StatusBadge, LoadingSpinner
│   │   └── pages/             Dashboard, Upload, Records, RecordDetail, AuditLog
│   ├── package.json
│   └── vite.config.js
├── sample_data/
│   ├── esg_sample_clean.csv   15 clean records
│   └── esg_sample_dirty.csv   15 records with intentional errors
├── docs/
│   ├── MODEL.md               Database design decisions
│   ├── DECISIONS.md           Technical decisions
│   ├── TRADEOFFS.md           Honest trade-off analysis
│   └── SOURCES.md             References and citations
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- Git

---

### Backend Setup

```bash
# 1. Navigate to backend
cd backend

# 2. Create and activate virtual environment
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Mac/Linux

# 3. Install dependencies
pip install -r requirements.txt

# 4. Run database migrations
python manage.py makemigrations
python manage.py migrate

# 5. Create admin superuser (optional)
python manage.py createsuperuser

# 6. Start the development server
python manage.py runserver
```

Backend runs at: **http://localhost:8000**  
Admin panel at: **http://localhost:8000/admin/**

---

### Frontend Setup

```bash
# 1. Navigate to frontend (in a NEW terminal)
cd frontend

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
```

Frontend runs at: **http://localhost:5173**

---

## 📡 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/upload/` | Upload a CSV file |
| `GET` | `/api/records/` | List all records |
| `GET` | `/api/records/{id}/` | Get record details |
| `POST` | `/api/records/{id}/approve/` | Approve a record |
| `POST` | `/api/records/{id}/reject/` | Reject a record |
| `GET` | `/api/audit-logs/` | Get all audit logs |
| `GET` | `/api/dashboard/` | Get summary statistics |

### Example: Upload CSV
```bash
curl -X POST http://localhost:8000/api/upload/ \
  -F "file=@sample_data/esg_sample_clean.csv"
```

### Example: Approve a Record
```bash
curl -X POST http://localhost:8000/api/records/1/approve/ \
  -H "Content-Type: application/json" \
  -d '{"reviewer_name": "Alice", "notes": "Data verified against annual report."}'
```

---

## 🏗 Database Schema

### ESGRecord
```
id | company_name | source | year | carbon_emissions | energy_consumption |
water_usage | employee_count | status | is_suspicious | suspicious_reason |
uploaded_at | reviewed_at | reviewed_by | notes
```

### AuditLog
```
id | record (FK) | action | performed_by | timestamp | details
```

---

## ⚠️ Suspicious Detection Rules

A record is automatically flagged if ANY of the following:

1. `carbon_emissions > 1,000,000` metric tons (implausibly high)
2. `energy_consumption > 5,000,000` MWh (implausibly high)
3. Any metric is **negative** (physically impossible)
4. `employee_count < 1` (no employees)
5. `year < 2000` or `year > current year` (invalid year)
6. All ESG metrics (carbon, energy, water) are **missing**

---

## 🌐 Deployment

### Backend → Render

1. Push code to GitHub
2. Go to [render.com](https://render.com) → New Web Service
3. Connect your GitHub repo
4. Set:
   - **Build Command**: `pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate`
   - **Start Command**: `gunicorn esg_backend.wsgi:application`
5. Add environment variables:
   - `SECRET_KEY` → generate a secure key
   - `DEBUG` → `False`
   - `DATABASE_URL` → Render PostgreSQL connection string
   - `FRONTEND_URL` → your Vercel URL

### Frontend → Vercel

1. Go to [vercel.com](https://vercel.com) → New Project
2. Import your GitHub repo, select the `frontend/` folder
3. Add environment variable:
   - `VITE_API_BASE_URL` → your Render backend URL (e.g., `https://esg-backend.onrender.com`)
4. Deploy

---

## 🧪 Testing

### Manual Test Checklist

- [ ] Upload `esg_sample_clean.csv` → 15 records created, 0 flagged
- [ ] Upload `esg_sample_dirty.csv` → 15 records created, ~10+ flagged
- [ ] Filter records by `status=pending`
- [ ] Click a flagged record → suspicious reason shown
- [ ] Approve a record with your name → status changes to Approved
- [ ] Reject a record → status changes to Rejected
- [ ] Check Audit Log → all actions recorded
- [ ] Check Dashboard → counts updated

---

## 📚 Documentation

| File | Purpose |
|------|---------|
| [MODEL.md](docs/MODEL.md) | Database design and field-level decisions |
| [DECISIONS.md](docs/DECISIONS.md) | Why each technology was chosen |
| [TRADEOFFS.md](docs/TRADEOFFS.md) | Honest limitations and future improvements |
| [SOURCES.md](docs/SOURCES.md) | All references, libraries, and resources |

---

## 🎯 Interview Talking Points

**"What does this project do?"**
> "It ingests ESG data from CSV files, normalises it using Pandas, automatically flags suspicious records using rule-based detection, and provides analysts a review workflow to approve or reject records with full audit logging."

**"Why Django?"**
> "Django's ORM, admin panel, and migrations reduce setup time significantly. DRF adds serializers and validation. For a prototype focused on data processing, Django's batteries-included approach wins over FastAPI."

**"How does suspicious detection work?"**
> "Six rules check for physically impossible or statistically implausible values — negative emissions, future years, missing all metrics. Any rule violation sets is_suspicious=True with a human-readable reason string explaining what triggered it."

**"What would you improve with more time?"**
> "Add authentication (JWT), pagination for large datasets, file storage for uploaded CSVs in S3, and unit tests for the normalisation and detection logic."

---

## 👤 Author

Built as an internship assignment project.  
Stack: Django · DRF · React · Tailwind CSS · SQLite/PostgreSQL

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.
