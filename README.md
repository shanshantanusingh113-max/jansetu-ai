# JanSetu AI — Bharat 2.0

**AI-powered multilingual citizen grievance routing system.** Citizens submit complaints in Hindi or English (typed or spoken), the AI classifies and routes them to the right municipal department, and officers manage tickets through a dashboard.

> **🔴 Live deployment:** [**jansetu-ai-corsair.netlify.app**](https://jansetu-ai-corsair.netlify.app) — deployed on **Netlify** (Netlify Functions + Netlify Database/Postgres). Use **Citizen** to file a complaint and **Officer** to manage tickets.

> **Design system:** "JanSetu Corsair Edition" — a modern literary-technical aesthetic with an animated blueprint dot-grid background, italic Libre Caslon Text display headlines, Inter body type, and high-contrast solid-black actions with surgical accents of Corsair blue `#0051d5` and accent orange `#d95f00`.

---

## Repository Layout

```
Bharat2.0/
├── PROTOTYPE_OVERVIEW.md            # Detailed prototype overview, API contract & AI pipeline
├── JanSetu_Prototype_Build_Guide.md # Original build guide (source of truth)
├── .gitignore
├── frontend/                        # Clean, standalone frontend copy for design tools (Stitch)
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js           # Corsair design tokens + animation keyframes
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx
│       ├── api.js
│       ├── index.css                # Corsair design system + blueprint background
│       ├── components/              # 10 components (Background, forms, cards, dashboard)
│       └── pages/                   # Citizen, Track, Officer
└── jansetu-ai/
    ├── backend/                     # FastAPI + SQLite + ML
    │   ├── main.py
    │   ├── database.py
    │   ├── models.py
    │   ├── schemas.py
    │   ├── seed_data.py
    │   ├── requirements.txt
    │   ├── ai/                      # classifier, translator, urgency, pipeline, summary, duplicate
    │   ├── routes/                  # complaints, tickets, dashboard
    │   └── data/                    # departments.json
    └── frontend/                    # Working frontend (development + production deployment)
        ├── package.json
        ├── vite.config.js           # /api proxy → backend :8000
        ├── tailwind.config.js
        ├── postcss.config.js
        ├── index.html
        └── src/                     # same source as ./frontend, built & deployed
```

> **Note:** `frontend/` (top-level) and `jansetu-ai/frontend/` share the same source. The top-level copy is a clean design-tool working folder; the `jansetu-ai/frontend` copy is the one built and served.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite) + Tailwind CSS |
| Backend | FastAPI (Python) |
| Database | SQLite |
| ML | TF-IDF + Logistic Regression (scikit-learn) |
| Fonts | Libre Caslon Text (display) · Inter (body) · Noto Sans Devanagari (Hindi) |

---

## Running Locally

### Backend (port 8000)

```bash
cd jansetu-ai/backend
# create + activate venv first
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python seed_data.py          # trains ML model + seeds 10 demo tickets
uvicorn main:app --reload --port 8000
```

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
| `/` | Citizen portal — file a complaint (bilingual, voice-enabled, animated hero) |
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

## Design System (Corsair Edition)

Tokens live in `tailwind.config.js`; component classes in `src/index.css`. Highlights:

- **Colors** — Ink `#121212` (primary), Corsair Blue `#0051d5` (secondary), Parchment `#f8f9fa` (surface), Accent Orange `#d95f00` (tertiary), outline variants for hairline borders.
- **Typography** — Italic *Libre Caslon Text* for display headlines; *Inter* for UI/body.
- **Layout** — 24px dot-grid blueprint background, 1200px max container, 8px rhythm.
- **Animations** — drifting color orbs, animated dashed "signal" line, staggered page-reveal (`rise`), gradient-ring cards, sliding nav underline, pulsing metric dots.

See `PROTOTYPE_OVERVIEW.md` for the full breakdown and the original build guide in `JanSetu_Prototype_Build_Guide.md`.

---

## License

All rights reserved. This project is provided as a prototype demonstration.
