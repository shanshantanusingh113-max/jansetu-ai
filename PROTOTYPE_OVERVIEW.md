# JanSetu AI — Prototype Overview

**AI-powered multilingual citizen grievance routing system.** Citizens submit complaints in Hindi or English (typed or spoken), the AI classifies and routes them, and officers manage tickets through a dashboard.

**Stack:** React + Vite + Tailwind CSS (frontend) | FastAPI + SQLite (backend) | TF-IDF + Logistic Regression (ML)

---

## Repository Layout

```
A:\Bharat2.0\
├── JanSetu_Prototype_Build_Guide.md   # Original build guide (source of truth)
├── frontend/                          # Clean, standalone frontend copy for design tools (Stitch)
└── jansetu-ai/
    ├── backend/                       # FastAPI + SQLite + ML
    │   ├── main.py
    │   ├── database.py
    │   ├── models.py
    │   ├── schemas.py
    │   ├── seed_data.py
    │   ├── requirements.txt
    │   ├── ai/                        # classifier, translator, urgency, duplicate, summary, pipeline
    │   ├── routes/                    # complaints, tickets, dashboard
    │   └── data/                      # departments.json (+ generated training_data.csv)
    └── frontend/                      # Working frontend (development + production deployment)
        ├── package.json
        ├── vite.config.js
        ├── tailwind.config.js
        ├── postcss.config.js
        ├── index.html
        └── src/
            ├── main.jsx
            ├── App.jsx
            ├── api.js
            ├── components/            # 10 components
            └── pages/                 # Citizen, Track, Officer
```

---

## Running the Prototype

### Backend (port 8000)

```bash
cd jansetu-ai/backend
venv\Scripts\activate
pip install -r requirements.txt
python seed_data.py          # trains ML model + seeds 10 demo tickets
uvicorn main:app --reload --port 8000
```

**Note:** Built and tested on **Python 3.14**. Dependencies updated from the original guide for cp314 wheel compatibility (`scikit-learn==1.9.0`, etc.).

### Frontend — Development (port 5173)

```bash
cd jansetu-ai/frontend
npm install
npm run dev
```

### Frontend — Production (port 4173)

```bash
cd jansetu-ai/frontend
npm run build
npm run preview
```

`/api` requests are proxied to the backend on port 8000 (see `vite.config.js`).

---

## Access Points

| Route | Description |
|---|---|
| `/` | Citizen portal — file a complaint (bilingual, voice-enabled) |
| `/track` | Track ticket by ID |
| `/officer` | Officer dashboard — stats, filters, status updates |

---

## API Contract

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/complaints` | Submit a complaint; returns complaint + AI-routed ticket |
| GET | `/api/complaints/{id}` | Fetch a complaint |
| GET | `/api/complaints/similar/{id}` | Find similar tickets |
| GET | `/api/tickets?category=&urgency=&status=` | List tickets with optional filters |
| GET | `/api/tickets/{id}` | Ticket detail with nested complaint |
| PATCH | `/api/tickets/{id}` | Update status / officer notes |
| GET | `/api/dashboard/stats` | Aggregate stats for officer dashboard |

### POST /api/complaints

```json
// Request
{ "raw_text": "मेरे इलाके में 3 दिन से पानी नहीं आ रहा है",
  "language": "hi", "location": "Ward 5, Sector 12" }

// Response (abridged)
{ "id": "uuid", "raw_text": "...", "translated_text": "...",
  "language": "hi", "location": "...", "created_at": "...",
  "ticket": { "id": "TKT-YYYYMMDD-XXXXXX",
    "category": "Water Supply",
    "department": "Municipal Water Department",
    "urgency_level": "high", "confidence_score": 0.99,
    "summary": "...", "status": "new", ... } }
```

---

## AI Pipeline

On every complaint the backend runs `ai/pipeline.py`:
1. **translate** — detect language (Devanagari ratio) and translate Hindi → English
2. **classify** — TF-IDF + Logistic Regression → one of 6 categories (keyword fallback)
3. **department** — map category → responsible office (from `departments.json`)
4. **urgency** — keyword score → critical / high / medium / low
5. **summary** — generate human-readable routing summary

### Categories & Departments

| Category | Department |
|---|---|
| Water Supply | Municipal Water Department |
| Drainage | Municipal Drainage Department |
| Road Damage | Public Works Department (PWD) |
| Electricity | Electricity Board / DISCOM |
| Waste Management | Municipal Sanitation Department |
| Street Lighting | Municipal Electrical Department |

---

## Verification (tested)

All 6 demo complaints classify correctly:

| Language | Text | Category | Urgency | Confidence |
|---|---|---|---|---|
| Hindi | मेरे इलाके में 3 दिन से पानी नहीं आ रहा है | Water Supply | High | 99% |
| English | There is a huge pothole near the school, very dangerous | Road Damage | High | 99% |
| Hindi | सड़क की लाइट बंद है, अंधेरा हो रहा है | Street Lighting | Low | 75% |
| English | Garbage not collected for a week, stinking | Waste Management | High | 99% |
| Hindi | बिजली का खंभा झुक गया है गिरने वाला है | Electricity | Low | 99% |
| English | Drainage is blocked, water entering homes | Drainage | High | 80% |

Ticket listing, detail, status updates, and dashboard filters all verified working end-to-end.

---

## Design System (frontend)

Design tokens and component specs are defined in `tailwind.config.js` and `src/index.css` per the original guide (PART 3):

- **Primary Blue** `#2563eb` — buttons, links, accents
- **Accent Orange** `#f97316` — voice button, urgency highlights
- **Success/Warning/Danger** greens/yellows/reds — statuses & confidence
- **Fonts** — Inter + Noto Sans Devanagari
- **Reusable classes** — `.btn-primary`, `.card`, `.badge`, `.input-field`, `.stat-card`, `.table-cell`, etc.

---

## Design Tools (Stitch)

A clean, standalone frontend copy lives at **`A:\Bharat2.0\frontend`** (no `node_modules` / `dist` / logs). Point Stitch there to design against the real source. Run `npm install` if a preview is needed. If you design there and want the changes deployed, either copy the modified files back into `jansetu-ai/frontend`, or make `A:\Bharat2.0\frontend` the primary working folder and re-point `vite.config.js`/deployment accordingly.

---

## Deployment Status

Currently deployed on localhost (production build):

| Service | URL |
|---|---|
| Frontend (production) | http://localhost:4173/ |
| Backend API | http://localhost:8000/ |
