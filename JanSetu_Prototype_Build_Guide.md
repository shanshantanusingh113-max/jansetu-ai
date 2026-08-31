# JanSetu AI — Complete Prototype Build Guide

> **READ THIS FIRST:** This is the single source of truth for building the JanSetu AI prototype. Every file, every line of code, every design token is here. A new session should read this file and start building immediately without asking any questions.

---

## Project Overview

**JanSetu AI** is an AI-powered multilingual citizen grievance routing system. Citizens submit complaints in Hindi or English (typed or spoken), the AI classifies and routes them, and officers manage tickets through a dashboard.

**Stack:** React + Vite + Tailwind CSS (frontend) | FastAPI + SQLite (backend) | TF-IDF + Logistic Regression (ML)

---

## Quick Start Commands

```bash
# Terminal 1 — Backend
cd jansetu-ai/backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python seed_data.py
uvicorn main:app --reload --port 8000

# Terminal 2 — Frontend
cd jansetu-ai/frontend
npm install
npm run dev
```

**Access:** Citizen portal at `http://localhost:5173/`, Officer dashboard at `http://localhost:5173/officer`

---

## Complete File Tree

```
jansetu-ai/
├── backend/
│   ├── main.py
│   ├── database.py
│   ├── models.py
│   ├── schemas.py
│   ├── requirements.txt
│   ├── seed_data.py
│   ├── ai/
│   │   ├── __init__.py
│   │   ├── classifier.py
│   │   ├── translator.py
│   │   ├── urgency.py
│   │   ├── duplicate.py
│   │   ├── summary.py
│   │   └── pipeline.py
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── complaints.py
│   │   ├── tickets.py
│   │   └── dashboard.py
│   └── data/
│       └── departments.json
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── index.css
│       ├── api.js
│       ├── components/
│       │   ├── Navbar.jsx
│       │   ├── ComplaintForm.jsx
│       │   ├── VoiceInput.jsx
│       │   ├── LanguageToggle.jsx
│       │   ├── TicketResult.jsx
│       │   ├── TicketCard.jsx
│       │   ├── TicketDetail.jsx
│       │   ├── OfficerDashboard.jsx
│       │   ├── StatusBadge.jsx
│       │   ├── ConfidenceBar.jsx
│       │   └── StatsCards.jsx
│       └── pages/
│           ├── CitizenPage.jsx
│           ├── TrackPage.jsx
│           └── OfficerPage.jsx
```

---

## PART 1: BACKEND FILES

---

### backend/requirements.txt

```
fastapi==0.104.1
uvicorn[standard]==0.24.0
sqlalchemy==2.0.23
aiosqlite==0.19.0
scikit-learn==1.3.2
joblib==1.3.2
deep-translator==1.11.4
pydantic==2.5.2
```

---

### backend/database.py

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

SQLALCHEMY_DATABASE_URL = "sqlite:///./jansetu.db"

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

---

### backend/models.py

```python
from sqlalchemy import Column, String, Text, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class Complaint(Base):
    __tablename__ = "complaints"
    id = Column(String, primary_key=True)
    raw_text = Column(Text, nullable=False)
    translated_text = Column(Text)
    language = Column(String, default="en")
    location = Column(String)
    citizen_name = Column(String, nullable=True)
    citizen_contact = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    ticket = relationship("Ticket", back_populates="complaint", uselist=False)

class Ticket(Base):
    __tablename__ = "tickets"
    id = Column(String, primary_key=True)
    complaint_id = Column(String, ForeignKey("complaints.id"))
    category = Column(String, nullable=False)
    department = Column(String, nullable=False)
    urgency_level = Column(String, default="medium")
    confidence_score = Column(Float, default=0.0)
    summary = Column(Text)
    is_duplicate = Column(Boolean, default=False)
    duplicate_of = Column(String, nullable=True)
    similarity_score = Column(Float, nullable=True)
    status = Column(String, default="new")
    officer_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=True)
    complaint = relationship("Complaint", back_populates="ticket")
```

---

### backend/schemas.py

```python
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ComplaintCreate(BaseModel):
    raw_text: str
    language: Optional[str] = None
    location: Optional[str] = None
    citizen_name: Optional[str] = None
    citizen_contact: Optional[str] = None

class TicketResponse(BaseModel):
    id: str
    complaint_id: str
    category: str
    department: str
    urgency_level: str
    confidence_score: float
    summary: Optional[str]
    is_duplicate: bool
    duplicate_of: Optional[str]
    similarity_score: Optional[float]
    status: str
    officer_notes: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]
    class Config:
        from_attributes = True

class ComplaintResponse(BaseModel):
    id: str
    raw_text: str
    translated_text: Optional[str]
    language: str
    location: Optional[str]
    created_at: datetime
    ticket: Optional[TicketResponse] = None
    class Config:
        from_attributes = True

class TicketUpdate(BaseModel):
    status: Optional[str] = None
    officer_notes: Optional[str] = None

class DashboardStats(BaseModel):
    total_tickets: int
    by_category: dict
    by_status: dict
    by_urgency: dict
    avg_confidence: float
    recent_tickets: list
```

---

### backend/main.py

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routes import complaints, tickets, dashboard

Base.metadata.create_all(bind=engine)

app = FastAPI(title="JanSetu AI", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(complaints.router, prefix="/api")
app.include_router(tickets.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")

@app.get("/")
def root():
    return {"message": "JanSetu AI Backend Running"}
```

---

### backend/routes/__init__.py

```python
```

---

### backend/routes/complaints.py

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Complaint, Ticket
from schemas import ComplaintCreate, ComplaintResponse
from ai.pipeline import process_complaint
import uuid
from datetime import datetime

router = APIRouter()

def generate_ticket_id():
    now = datetime.utcnow()
    date_str = now.strftime("%Y%m%d")
    short_id = uuid.uuid4().hex[:6].upper()
    return f"TKT-{date_str}-{short_id}"

@router.post("/complaints", response_model=ComplaintResponse)
def create_complaint(data: ComplaintCreate, db: Session = Depends(get_db)):
    complaint_id = str(uuid.uuid4())
    ai_result = process_complaint(
        raw_text=data.raw_text,
        language=data.language,
        location=data.location
    )
    complaint = Complaint(
        id=complaint_id, raw_text=data.raw_text,
        translated_text=ai_result["translated_text"],
        language=ai_result["language"],
        location=data.location,
        citizen_name=data.citizen_name,
        citizen_contact=data.citizen_contact
    )
    db.add(complaint)
    ticket = Ticket(
        id=generate_ticket_id(), complaint_id=complaint_id,
        category=ai_result["category"], department=ai_result["department"],
        urgency_level=ai_result["urgency_level"],
        confidence_score=ai_result["confidence_score"],
        summary=ai_result["summary"],
        is_duplicate=ai_result["is_duplicate"],
        duplicate_of=ai_result.get("duplicate_of"),
        similarity_score=ai_result.get("similarity_score"),
        status="new"
    )
    db.add(ticket)
    db.commit()
    db.refresh(complaint)
    return complaint

@router.get("/complaints/{complaint_id}", response_model=ComplaintResponse)
def get_complaint(complaint_id: str, db: Session = Depends(get_db)):
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return complaint

@router.get("/complaints/similar/{complaint_id}")
def find_similar(complaint_id: str, db: Session = Depends(get_db)):
    from ai.duplicate import find_similar_tickets
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    ticket = db.query(Ticket).filter(Ticket.complaint_id == complaint_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    all_tickets = db.query(Ticket).filter(Ticket.id != ticket.id).all()
    all_complaints = []
    for t in all_tickets:
        c = db.query(Complaint).filter(Complaint.id == t.complaint_id).first()
        if c:
            all_complaints.append({"ticket": t, "complaint": c})
    return find_similar_tickets(
        complaint.translated_text or complaint.raw_text,
        ticket.category, all_complaints
    )
```

---

### backend/routes/tickets.py

```python
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from models import Ticket, Complaint
from schemas import TicketUpdate
from datetime import datetime
from typing import Optional

router = APIRouter()

@router.get("/tickets")
def list_tickets(
    category: Optional[str] = Query(None),
    urgency: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(Ticket)
    if category:
        query = query.filter(Ticket.category == category)
    if urgency:
        query = query.filter(Ticket.urgency_level == urgency)
    if status:
        query = query.filter(Ticket.status == status)
    tickets = query.order_by(Ticket.created_at.desc()).all()
    result = []
    for t in tickets:
        complaint = db.query(Complaint).filter(Complaint.id == t.complaint_id).first()
        result.append({
            "id": t.id,
            "complaint_text": complaint.raw_text[:100] if complaint else "",
            "category": t.category, "department": t.department,
            "urgency_level": t.urgency_level,
            "confidence_score": t.confidence_score,
            "status": t.status,
            "created_at": t.created_at.isoformat() if t.created_at else ""
        })
    return result

@router.get("/tickets/{ticket_id}")
def get_ticket(ticket_id: str, db: Session = Depends(get_db)):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    complaint = db.query(Complaint).filter(Complaint.id == ticket.complaint_id).first()
    return {
        "id": ticket.id, "category": ticket.category,
        "department": ticket.department,
        "urgency_level": ticket.urgency_level,
        "confidence_score": ticket.confidence_score,
        "summary": ticket.summary,
        "is_duplicate": ticket.is_duplicate,
        "duplicate_of": ticket.duplicate_of,
        "similarity_score": ticket.similarity_score,
        "status": ticket.status,
        "officer_notes": ticket.officer_notes,
        "created_at": ticket.created_at.isoformat() if ticket.created_at else "",
        "updated_at": ticket.updated_at.isoformat() if ticket.updated_at else "",
        "complaint": {
            "id": complaint.id, "raw_text": complaint.raw_text,
            "translated_text": complaint.translated_text,
            "language": complaint.language,
            "location": complaint.location,
            "citizen_name": complaint.citizen_name,
            "created_at": complaint.created_at.isoformat() if complaint.created_at else ""
        } if complaint else None
    }

@router.patch("/tickets/{ticket_id}")
def update_ticket(ticket_id: str, data: TicketUpdate, db: Session = Depends(get_db)):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if data.status is not None:
        ticket.status = data.status
    if data.officer_notes is not None:
        ticket.officer_notes = data.officer_notes
    ticket.updated_at = datetime.utcnow()
    db.commit()
    return {"message": "Ticket updated", "ticket_id": ticket.id, "status": ticket.status}
```

---

### backend/routes/dashboard.py

```python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models import Ticket, Complaint

router = APIRouter()

@router.get("/dashboard/stats")
def get_stats(db: Session = Depends(get_db)):
    total = db.query(Ticket).count()
    category_counts = dict(db.query(Ticket.category, func.count(Ticket.id)).group_by(Ticket.category).all())
    status_counts = dict(db.query(Ticket.status, func.count(Ticket.id)).group_by(Ticket.status).all())
    urgency_counts = dict(db.query(Ticket.urgency_level, func.count(Ticket.id)).group_by(Ticket.urgency_level).all())
    avg_conf = db.query(func.avg(Ticket.confidence_score)).scalar() or 0.0
    recent = db.query(Ticket).order_by(Ticket.created_at.desc()).limit(5).all()
    recent_list = []
    for t in recent:
        c = db.query(Complaint).filter(Complaint.id == t.complaint_id).first()
        recent_list.append({
            "id": t.id, "category": t.category, "status": t.status,
            "urgency_level": t.urgency_level,
            "complaint_text": c.raw_text[:80] if c else "",
            "created_at": t.created_at.isoformat() if t.created_at else ""
        })
    return {
        "total_tickets": total, "by_category": category_counts,
        "by_status": status_counts, "by_urgency": urgency_counts,
        "avg_confidence": round(avg_conf, 2),
        "recent_tickets": recent_list
    }
```

---

### backend/ai/__init__.py

```python
```

---

### backend/ai/translator.py

```python
from deep_translator import GoogleTranslator

def detect_language(text: str) -> str:
    devanagari_count = sum(1 for c in text if '\u0900' <= c <= '\u097F')
    return "hi" if devanagari_count > len(text) * 0.3 else "en"

def translate_to_english(text: str, source_lang: str = "hi") -> str:
    if source_lang == "en":
        return text
    try:
        translator = GoogleTranslator(source='hi', target='en')
        result = translator.translate(text)
        return result if result else text
    except Exception:
        return text
```

---

### backend/ai/classifier.py

```python
import json, os, joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "trained_models")

def load_departments():
    with open(os.path.join(DATA_DIR, "departments.json"), "r", encoding="utf-8") as f:
        return json.load(f)

def keyword_classify(text: str, departments: dict) -> tuple:
    text_lower = text.lower()
    scores = {}
    for category, info in departments.items():
        all_kw = info.get("keywords_english", []) + info.get("keywords_hindi", [])
        scores[category] = sum(1 for kw in all_kw if kw.lower() in text_lower)
    if max(scores.values()) == 0:
        return "Other", 0.3
    best = max(scores, key=scores.get)
    total = sum(scores.values())
    return best, round(min(scores[best] / total if total > 0 else 0.3, 0.99), 2)

_model = None
_vectorizer = None

def load_ml_model():
    global _model, _vectorizer
    mp = os.path.join(MODEL_DIR, "classifier.pkl")
    vp = os.path.join(MODEL_DIR, "vectorizer.pkl")
    if os.path.exists(mp) and os.path.exists(vp):
        _model = joblib.load(mp)
        _vectorizer = joblib.load(vp)
        return True
    return False

def classify_complaint(text: str) -> tuple:
    departments = load_departments()
    if _model and _vectorizer:
        try:
            X = _vectorizer.transform([text])
            pred = _model.predict(X)[0]
            conf = float(max(_model.predict_proba(X)[0]))
            if conf > 0.5:
                return pred, round(conf, 2)
        except Exception:
            pass
    return keyword_classify(text, departments)

def get_department(category: str) -> str:
    return load_departments().get(category, {}).get("department", "General Administration")
```

---

### backend/ai/urgency.py

```python
URGENCY_KEYWORDS = {
    "critical": ["emergency","accident","fire","death","collapse","gas leak","aapatkalin","maut","aag","immediate danger","life threatening"],
    "high": ["dangerous","overflow","blocked","no water","open wire","3 days","week","khatarnak","band","pani nahi","sewerage overflow","electric shock","fallen tree","road blocked","health risk","contaminated","flood"],
    "medium": ["damaged","broken","not working","complaint","kharab","nahi chal raha","repair","maintenance","crack","pothole","leak"]
}

def score_urgency(text: str, category: str = None) -> str:
    text_lower = text.lower()
    for level in ["critical", "high", "medium"]:
        for keyword in URGENCY_KEYWORDS[level]:
            if keyword.lower() in text_lower:
                return level
    return "low"
```

---

### backend/ai/duplicate.py

```python
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

def find_similar_tickets(text, category, existing_complaints, threshold=0.65):
    if not existing_complaints:
        return {"is_duplicate": False, "similar_tickets": []}
    cat_complaints = [c for c in existing_complaints if c["ticket"].category == category]
    if not cat_complaints:
        return {"is_duplicate": False, "similar_tickets": []}
    texts = [text] + [c["complaint"].translated_text or c["complaint"].raw_text for c in cat_complaints]
    try:
        vec = TfidfVectorizer(max_features=5000, ngram_range=(1, 2))
        matrix = vec.fit_transform(texts)
        sims = cosine_similarity(matrix[0:1], matrix[1:])[0]
    except Exception:
        return {"is_duplicate": False, "similar_tickets": []}
    similar = []
    for i, score in enumerate(sims):
        if score >= threshold:
            similar.append({
                "ticket_id": cat_complaints[i]["ticket"].id,
                "similarity": round(float(score), 3),
                "text_preview": cat_complaints[i]["complaint"].raw_text[:80]
            })
    similar.sort(key=lambda x: x["similarity"], reverse=True)
    return {"is_duplicate": len(similar) > 0, "similar_tickets": similar[:5]}
```

---

### backend/ai/summary.py

```python
def generate_summary(translated_text, category, department, urgency, location=None):
    key_issue = translated_text.split('.')[0].strip() if translated_text else "Complaint received"
    parts = [f"{category} complaint received.", f"Issue: {key_issue}."]
    if location:
        parts.append(f"Location: {location}.")
    urgency_map = {"critical": "requires immediate attention", "high": "requires urgent attention", "medium": "requires attention", "low": "routine matter"}
    parts.append(f"Urgency: {urgency} — {urgency_map.get(urgency, 'routine matter')}.")
    parts.append(f"Routed to: {department}.")
    return " ".join(parts)
```

---

### backend/ai/pipeline.py

```python
from ai.translator import detect_language, translate_to_english
from ai.classifier import classify_complaint, get_department
from ai.urgency import score_urgency
from ai.summary import generate_summary

def process_complaint(raw_text, language=None, location=None):
    if language is None:
        language = detect_language(raw_text)
    translated = translate_to_english(raw_text, language)
    category, confidence = classify_complaint(translated)
    department = get_department(category)
    urgency = score_urgency(translated, category)
    summary = generate_summary(translated, category, department, urgency, location)
    return {
        "translated_text": translated, "language": language,
        "category": category, "department": department,
        "urgency_level": urgency, "confidence_score": confidence,
        "is_duplicate": False, "duplicate_of": None,
        "similarity_score": None, "summary": summary
    }
```

---

### backend/data/departments.json

```json
{
  "Water Supply": {
    "department": "Municipal Water Department",
    "keywords_hindi": ["pani","jal","tap","borewell","handpump","nal","pipeline","tanker","paani"],
    "keywords_english": ["water","supply","tap","borewell","pipe","leak","tanker","handpump","no water"]
  },
  "Drainage": {
    "department": "Municipal Drainage Department",
    "keywords_hindi": ["naali","sewerage","drain","gilhari","overflow","nala","gandagi"],
    "keywords_english": ["drain","sewerage","overflow","blocked","clog","sewage","drainage","stagnant"]
  },
  "Road Damage": {
    "department": "Public Works Department (PWD)",
    "keywords_hindi": ["sadak","gaddha","road","phata","kharab","sarak","tuta"],
    "keywords_english": ["road","pothole","crack","broken","surface","damaged","pavement"]
  },
  "Electricity": {
    "department": "Electricity Board / DISCOM",
    "keywords_hindi": ["bijli","light","transformer","current","bill","power cut"],
    "keywords_english": ["electricity","power","outage","transformer","wire","cut","electric","blackout"]
  },
  "Waste Management": {
    "department": "Municipal Sanitation Department",
    "keywords_hindi": ["kachra","gandagi","dustbin","safai","koode","safai karmchari"],
    "keywords_english": ["garbage","waste","trash","bin","collection","dump","sanitation","cleaning"]
  },
  "Street Lighting": {
    "department": "Municipal Electrical Department",
    "keywords_hindi": ["streetlight","lamp","andhera","light","gali","bulb"],
    "keywords_english": ["streetlight","lamp","dark","lighting","bulb","street light","no light"]
  }
}
```

---

### backend/seed_data.py

```python
import csv, os, random, uuid
from datetime import datetime, timedelta
from database import SessionLocal, engine, Base
from models import Complaint, Ticket
from ai.pipeline import process_complaint

Base.metadata.create_all(bind=engine)

TRAINING_DATA = [
    ("Mere area mein teen din se pani nahi aa raha","hi","Water Supply","high"),
    ("Water supply has been stopped for 3 days in our colony","en","Water Supply","high"),
    ("Hamare yahan pani ki bahut kami hai","hi","Water Supply","medium"),
    ("Tap water is not coming since yesterday","en","Water Supply","high"),
    ("Borewell kharab ho gaya hai","hi","Water Supply","medium"),
    ("Handpump is not working in our village","en","Water Supply","medium"),
    ("Tanker nahi aa raha hai do din se","hi","Water Supply","high"),
    ("Water tanker has not come for 2 days","en","Water Supply","high"),
    ("Paani ka pipeline toot gaya hai","hi","Water Supply","critical"),
    ("Water pipeline is burst and water is wasting","en","Water Supply","critical"),
    ("Ghar mein pani ka pressure bahut kam hai","hi","Water Supply","low"),
    ("Low water pressure in residential area","en","Water Supply","low"),
    ("Nala band ho gaya hai aur paani bhar raha hai","hi","Drainage","high"),
    ("Drain is blocked and water is overflowing","en","Drainage","high"),
    ("Sewerage overflow ho raha hai sadak pe","hi","Drainage","critical"),
    ("Sewerage is overflowing on the main road","en","Drainage","critical"),
    ("Naali saaf nahi hui hai mahine bhar se","hi","Drainage","medium"),
    ("Drain has not been cleaned for a month","en","Drainage","medium"),
    ("Gilhari mein se badbu aa rahi hai","hi","Drainage","high"),
    ("Foul smell coming from the drain near school","en","Drainage","high"),
    ("Sadak mein bahut bada gaddha hai jo khatarnak hai","hi","Road Damage","critical"),
    ("There is a huge pothole near the school, very dangerous","en","Road Damage","critical"),
    ("Road is completely broken near bus stand","en","Road Damage","high"),
    ("Sadak toot gayi hai bus stand ke paas","hi","Road Damage","high"),
    ("Pothole has caused two accidents already","en","Road Damage","critical"),
    ("Bijli ki line mein spark ho raha hai bahut khatarnak hai","hi","Electricity","critical"),
    ("Electric wire is sparking near children park, very dangerous","en","Electricity","critical"),
    ("Transformer phat gaya hai aur bijli gayi hai","hi","Electricity","critical"),
    ("Bijli 3 din se gaayab hai","hi","Electricity","high"),
    ("No electricity for 3 days in our area","en","Electricity","high"),
    ("Kachra nahi uthaya ja raha hai do din se","hi","Waste Management","high"),
    ("Garbage has not been collected for 2 days","en","Waste Management","high"),
    ("Dump yard is overflowing and causing health issues","en","Waste Management","critical"),
    ("Kachre ka dher lag gaya hai aur badbu aa rahi hai","hi","Waste Management","critical"),
    ("Gali ki light band hai 5 din se andhera ho raha hai","hi","Street Lighting","high"),
    ("Street light not working for 5 days, very dark at night","en","Street Lighting","high"),
    ("Andhera mein chalna mushkil ho raha hai","hi","Street Lighting","high"),
    ("Road is completely dark due to non-functional lights","en","Street Lighting","high"),
    ("Light ka wire kata hua hai","hi","Street Lighting","critical"),
]

def create_training_csv():
    csv_path = os.path.join(os.path.dirname(__file__), "data", "training_data.csv")
    os.makedirs(os.path.dirname(csv_path), exist_ok=True)
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["text","language","category","urgency_level"])
        for row in TRAINING_DATA:
            writer.writerow(row)

def train_model():
    import pandas as pd
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.linear_model import LogisticRegression
    import joblib
    csv_path = os.path.join(os.path.dirname(__file__), "data", "training_data.csv")
    df = pd.read_csv(csv_path)
    model_dir = os.path.join(os.path.dirname(__file__), "trained_models")
    os.makedirs(model_dir, exist_ok=True)
    vec = TfidfVectorizer(max_features=5000, ngram_range=(1,2), stop_words='english')
    X = vec.fit_transform(df['text'])
    clf = LogisticRegression(C=1.0, max_iter=1000, random_state=42)
    clf.fit(X, df['category'])
    joblib.dump(vec, os.path.join(model_dir, "vectorizer.pkl"))
    joblib.dump(clf, os.path.join(model_dir, "classifier.pkl"))

def seed_demo_tickets():
    db = SessionLocal()
    if db.query(Ticket).count() > 0:
        db.close()
        return
    demos = [
        ("Mere mohalle mein 3 din se pani nahi aa raha hai","hi","Ward 5, Sector 12"),
        ("Road has a massive pothole near the school, two people fell yesterday","en","Main Road, near St. Mary's School"),
        ("Bijli ka khambha jhuk gaya hai girne wala hai bahut khatarnak hai","hi","Gandhi Nagar, Lane 3"),
        ("Garbage has not been collected for a week, terrible smell","en","Market Area, Block B"),
        ("Street light band hai aur raat ko andhera rehta hai","hi","Nehru Colony, Main Street"),
        ("Drainage is completely blocked, water entering homes","en","Rajiv Nagar, Ward 8"),
        ("Transformer phat gaya hai poora area andhera hai","hi","Ambedkar Nagar, Sector 3"),
        ("Open drain near hospital is causing health problems","en","Near District Hospital, Gate 2"),
        ("Pani ka pipe toot gaya hai aur paani sadak pe beh raha hai","hi","MG Road, Near Temple"),
        ("Kachra uthane wala vehicle nahi aaya is hafte","hi","Shanti Nagar, Ward 12"),
    ]
    for text, lang, loc in demos:
        cid = str(uuid.uuid4())
        r = process_complaint(text, lang, loc)
        db.add(Complaint(id=cid, raw_text=text, translated_text=r["translated_text"], language=lang, location=loc))
        tid = f"TKT-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
        db.add(Ticket(id=tid, complaint_id=cid, category=r["category"], department=r["department"],
            urgency_level=r["urgency_level"], confidence_score=r["confidence_score"],
            summary=r["summary"], status=random.choice(["new","new","in_progress","resolved"]),
            created_at=datetime.utcnow()-timedelta(days=random.randint(0,5))))
    db.commit()
    db.close()

if __name__ == "__main__":
    create_training_csv()
    train_model()
    seed_demo_tickets()
    print("Setup complete!")
```

---

## PART 2: FRONTEND FILES

See FRONTEND_DESIGN.md for complete UI specifications.

---

### frontend/package.json

```json
{
  "name": "jansetu-frontend",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "axios": "^1.6.2"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.0",
    "vite": "^5.0.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.31",
    "autoprefixer": "^10.4.16"
  }
}
```

### frontend/vite.config.js

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': { target: 'http://localhost:8000', changeOrigin: true } }
  }
})
```

### frontend/tailwind.config.js

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html","./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: { 50:'#eff6ff',100:'#dbeafe',200:'#bfdbfe',300:'#93c5fd',400:'#60a5fa',500:'#3b82f6',600:'#2563eb',700:'#1d4ed8',800:'#1e40af',900:'#1e3a8a' },
        accent: { 50:'#fff7ed',100:'#ffedd5',200:'#fed7aa',300:'#fdba74',400:'#fb923c',500:'#f97316',600:'#ea580c' },
      },
      fontFamily: {
        sans: ['Inter','system-ui','-apple-system','sans-serif'],
        hindi: ['Noto Sans Devanagari','Inter','sans-serif'],
      },
    },
  },
  plugins: [],
}
```

### frontend/postcss.config.js

```javascript
export default { plugins: { tailwindcss: {}, autoprefixer: {} } }
```

### frontend/index.html

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>JanSetu AI</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+Devanagari:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.jsx"></script>
</body>
</html>
```

### frontend/src/index.css

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base { body { @apply font-sans text-gray-900 bg-gray-50 antialiased; } }
@layer components {
  .btn-primary { @apply bg-primary-600 hover:bg-primary-700 text-white font-medium py-2.5 px-6 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm; }
  .btn-secondary { @apply bg-white hover:bg-gray-50 text-gray-700 font-medium py-2.5 px-6 rounded-lg border border-gray-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 text-sm; }
  .btn-voice { @apply bg-accent-500 hover:bg-accent-600 text-white font-medium py-2.5 px-6 rounded-full transition-all duration-200 flex items-center gap-2 text-sm; }
  .btn-voice-active { @apply bg-red-500 hover:bg-red-600 animate-pulse; }
  .input-field { @apply w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm bg-white; }
  .textarea-field { @apply w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm bg-white resize-none; }
  .label-text { @apply block text-sm font-medium text-gray-700 mb-1.5; }
  .card { @apply bg-white rounded-xl shadow-sm border border-gray-200 p-6; }
  .card-hover { @apply bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200 cursor-pointer; }
  .badge { @apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium; }
  .stat-card { @apply bg-white rounded-xl shadow-sm border border-gray-200 p-5; }
  .table-header { @apply px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider; }
  .table-cell { @apply px-4 py-3 text-sm text-gray-700; }
}
```

### frontend/src/main.jsx

```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
ReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>)
```

### frontend/src/App.jsx

```jsx
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom'
import CitizenPage from './pages/CitizenPage'
import TrackPage from './pages/TrackPage'
import OfficerPage from './pages/OfficerPage'

function Navbar() {
  const location = useLocation()
  const links = [{path:'/',label:'File Complaint'},{path:'/track',label:'Track Ticket'},{path:'/officer',label:'Officer Dashboard'}]
  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">JS</span>
            </div>
            <span className="text-lg font-bold text-gray-900">JanSetu AI</span>
          </Link>
          <div className="flex items-center gap-1">
            {links.map(l=>(
              <Link key={l.path} to={l.path}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${location.pathname===l.path?'bg-primary-50 text-primary-700':'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}>
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <Routes>
            <Route path="/" element={<CitizenPage/>} />
            <Route path="/track" element={<TrackPage/>} />
            <Route path="/officer" element={<OfficerPage/>} />
          </Routes>
        </main>
        <footer className="border-t border-gray-200 bg-white mt-12">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 text-center text-sm text-gray-500">
            Powered by JanSetu AI — AI-Powered Citizen Grievance Routing System
          </div>
        </footer>
      </div>
    </Router>
  )
}
```

### frontend/src/api.js

```javascript
const API_BASE = "/api";
export const submitComplaint = async (data) => {
  const res = await fetch(`${API_BASE}/complaints`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(data) });
  if (!res.ok) throw new Error("Failed"); return res.json();
};
export const getComplaint = async (id) => {
  const res = await fetch(`${API_BASE}/complaints/${id}`);
  if (!res.ok) throw new Error("Not found"); return res.json();
};
export const getTickets = async (filters={}) => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k,v])=>{if(v)params.set(k,v)});
  const res = await fetch(`${API_BASE}/tickets?${params}`);
  if (!res.ok) throw new Error("Failed"); return res.json();
};
export const getTicket = async (id) => {
  const res = await fetch(`${API_BASE}/tickets/${id}`);
  if (!res.ok) throw new Error("Not found"); return res.json();
};
export const updateTicket = async (id, data) => {
  const res = await fetch(`${API_BASE}/tickets/${id}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify(data) });
  if (!res.ok) throw new Error("Failed"); return res.json();
};
export const getDashboardStats = async () => {
  const res = await fetch(`${API_BASE}/dashboard/stats`);
  if (!res.ok) throw new Error("Failed"); return res.json();
};
```

---

### frontend/src/components/ComplaintForm.jsx

```jsx
import { useState } from 'react'
import LanguageToggle from './LanguageToggle'
import VoiceInput from './VoiceInput'
import TicketResult from './TicketResult'
import { submitComplaint } from '../api'

export default function ComplaintForm() {
  const [text, setText] = useState('')
  const [language, setLanguage] = useState('hi')
  const [location, setLocation] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const placeholders = {
    hi: 'Apni shikayat yahan likhen... (जैसे: मेरे इलाके में 3 दिन से पानी नहीं आ रहा)',
    en: 'Describe your complaint here... (e.g., There is a pothole near my house)',
  }
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!text.trim()) { setError(language==='hi'?'Kripya shikayat darj karen':'Please describe your complaint'); return }
    setLoading(true); setError('')
    try {
      const data = await submitComplaint({ raw_text:text, language, location:location||null })
      setResult(data)
    } catch(err) { setError('Failed to submit. Please try again.') }
    finally { setLoading(false) }
  }
  if (result) return <TicketResult ticket={result.ticket} complaint={result} onReset={()=>{setResult(null);setText('');setLocation('')}} />
  return (
    <form onSubmit={handleSubmit} className="card space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">{language==='hi'?'Shikayat Darj Karein':'File a Complaint'}</h3>
        <LanguageToggle language={language} onChange={setLanguage} />
      </div>
      <div>
        <label className="label-text">{language==='hi'?'Shikayat ka vishay':'Complaint Description'} *</label>
        <textarea className="textarea-field h-36" placeholder={placeholders[language]} value={text} onChange={e=>setText(e.target.value)} />
      </div>
      <VoiceInput language={language} onTranscript={t=>setText(prev=>prev?prev+' '+t:t)} />
      <div>
        <label className="label-text">{language==='hi'?'Stham (Optional)':'Location (Optional)'}</label>
        <input type="text" className="input-field" placeholder={language==='hi'?'जैसे: Ward 5, Sector 12':'e.g., Ward 5, Sector 12'} value={location} onChange={e=>setLocation(e.target.value)} />
      </div>
      {error && <div className="bg-red-50 text-red-700 text-sm px-4 py-2.5 rounded-lg border border-red-200">{error}</div>}
      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            {language==='hi'?'Jaari hai...':'Processing...'}
          </span>
        ) : (language==='hi'?'Shikayat Darj Karein':'Submit Complaint')}
      </button>
    </form>
  )
}
```

### frontend/src/components/VoiceInput.jsx

```jsx
import { useState, useRef, useCallback } from 'react'
export default function VoiceInput({ language, onTranscript }) {
  const [isListening, setIsListening] = useState(false)
  const [supported, setSupported] = useState(true)
  const recRef = useRef(null)
  const start = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { setSupported(false); return }
    const r = new SR()
    r.lang = language==='hi'?'hi-IN':'en-US'; r.continuous=false; r.interimResults=false
    r.onresult = (e) => { onTranscript(e.results[0][0].transcript); setIsListening(false) }
    r.onerror = () => setIsListening(false); r.onend = () => setIsListening(false)
    recRef.current = r; r.start(); setIsListening(true)
  }, [language, onTranscript])
  const stop = () => { recRef.current?.stop(); setIsListening(false) }
  if (!supported) return <div className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">Voice not supported. Please use Chrome.</div>
  return (
    <div className="flex items-center gap-3">
      <button type="button" onClick={isListening?stop:start} className={isListening?'btn-voice btn-voice-active':'btn-voice'}>
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd"/></svg>
        {isListening?(language==='hi'?'Sun raha hai...':'Listening...'):(language==='hi'?'Bol ke likhen':'Speak complaint')}
      </button>
      {isListening && <span className="flex items-center gap-1 text-xs text-red-600"><span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>Recording</span>}
    </div>
  )
}
```

### frontend/src/components/LanguageToggle.jsx

```jsx
export default function LanguageToggle({ language, onChange }) {
  return (
    <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
      <button type="button" onClick={()=>onChange('en')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${language==='en'?'bg-white text-primary-700 shadow-sm':'text-gray-500 hover:text-gray-700'}`}>English</button>
      <button type="button" onClick={()=>onChange('hi')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 font-hindi ${language==='hi'?'bg-white text-primary-700 shadow-sm':'text-gray-500 hover:text-gray-700'}`}>हिन्दी</button>
    </div>
  )
}
```

### frontend/src/components/TicketResult.jsx

```jsx
import { Link } from 'react-router-dom'
import ConfidenceBar from './ConfidenceBar'
import StatusBadge from './StatusBadge'
export default function TicketResult({ ticket, complaint, onReset }) {
  if (!ticket) return null
  const uc = {critical:'bg-red-100 text-red-800 border-red-200',high:'bg-orange-100 text-orange-800 border-orange-200',medium:'bg-yellow-100 text-yellow-800 border-yellow-200',low:'bg-green-100 text-green-800 border-green-200'}
  return (
    <div className="card space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
          <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
        </div>
        <div><h3 className="text-lg font-semibold text-gray-900">Complaint Submitted</h3><p className="text-sm text-gray-500">AI has processed your complaint</p></div>
      </div>
      <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
        <p className="text-xs text-primary-600 font-medium uppercase tracking-wider mb-1">Ticket ID</p>
        <p className="text-2xl font-bold text-primary-700 font-mono">{ticket.id}</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Category</p><p className="text-sm font-semibold text-gray-900">{ticket.category}</p></div>
        <div><p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Department</p><p className="text-sm font-semibold text-gray-900">{ticket.department}</p></div>
        <div><p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Urgency</p><span className={`badge border ${uc[ticket.urgency_level]||'bg-gray-100 text-gray-800'}`}>{ticket.urgency_level?.toUpperCase()}</span></div>
        <div><p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Status</p><StatusBadge status={ticket.status} /></div>
      </div>
      <div><p className="text-xs text-gray-500 uppercase tracking-wider mb-1">AI Confidence</p><ConfidenceBar score={ticket.confidence_score} /></div>
      {ticket.summary && <div><p className="text-xs text-gray-500 uppercase tracking-wider mb-1">AI Summary</p><p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-200">{ticket.summary}</p></div>}
      {complaint?.language==='hi' && complaint?.translated_text && <div><p className="text-xs text-gray-500 uppercase tracking-wider mb-1">English Translation</p><p className="text-sm text-gray-600 italic">{complaint.translated_text}</p></div>}
      <div className="flex gap-3">
        <Link to={`/track?id=${ticket.id}`} className="btn-primary flex-1 text-center">Track This Ticket</Link>
        <button onClick={onReset} className="btn-secondary flex-1">File Another</button>
      </div>
    </div>
  )
}
```

### frontend/src/components/TicketCard.jsx

```jsx
import ConfidenceBar from './ConfidenceBar'
import StatusBadge from './StatusBadge'
export default function TicketCard({ ticket }) {
  const uc = {critical:'bg-red-100 text-red-800 border-red-200',high:'bg-orange-100 text-orange-800 border-orange-200',medium:'bg-yellow-100 text-yellow-800 border-yellow-200',low:'bg-green-100 text-green-800 border-green-200'}
  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <div><p className="text-xs text-gray-500 uppercase tracking-wider">Ticket ID</p><p className="text-lg font-bold text-primary-700 font-mono">{ticket.id}</p></div>
        <StatusBadge status={ticket.status} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Category</p><p className="text-sm font-semibold">{ticket.category}</p></div>
        <div><p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Department</p><p className="text-sm font-semibold">{ticket.department}</p></div>
        <div><p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Urgency</p><span className={`badge border ${uc[ticket.urgency_level]}`}>{ticket.urgency_level?.toUpperCase()}</span></div>
        <div><p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Created</p><p className="text-sm text-gray-600">{new Date(ticket.created_at).toLocaleDateString()}</p></div>
      </div>
      <div><p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Complaint</p><p className="text-sm text-gray-700">{ticket.complaint?.raw_text}</p>
        {ticket.complaint?.language==='hi' && ticket.complaint?.translated_text && <p className="text-xs text-gray-500 mt-1 italic">Translation: {ticket.complaint.translated_text}</p>}
      </div>
      <div><p className="text-xs text-gray-500 uppercase tracking-wider mb-1">AI Confidence</p><ConfidenceBar score={ticket.confidence_score} /></div>
      {ticket.summary && <div><p className="text-xs text-gray-500 uppercase tracking-wider mb-1">AI Summary</p><p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{ticket.summary}</p></div>}
    </div>
  )
}
```

### frontend/src/components/TicketDetail.jsx

```jsx
import { useState } from 'react'
import ConfidenceBar from './ConfidenceBar'
import { updateTicket } from '../api'
export default function TicketDetail({ ticket, onClose, onUpdate }) {
  const [status, setStatus] = useState(ticket.status)
  const [notes, setNotes] = useState(ticket.officer_notes||'')
  const [saving, setSaving] = useState(false)
  const handleSave = async () => {
    setSaving(true)
    try { await updateTicket(ticket.id, {status, officer_notes:notes}); onUpdate?.() }
    catch(e) { alert('Failed to update') }
    finally { setSaving(false) }
  }
  const uc = {critical:'bg-red-100 text-red-800 border-red-200',high:'bg-orange-100 text-orange-800 border-orange-200',medium:'bg-yellow-100 text-yellow-800 border-yellow-200',low:'bg-green-100 text-green-800 border-green-200'}
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div><h2 className="text-xl font-bold text-gray-900">Ticket Details</h2><p className="text-sm text-primary-600 font-mono">{ticket.id}</p></div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg></button>
        </div>
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div><p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Category</p><p className="text-sm font-semibold">{ticket.category}</p></div>
            <div><p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Department</p><p className="text-sm font-semibold">{ticket.department}</p></div>
            <div><p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Urgency</p><span className={`badge border ${uc[ticket.urgency_level]}`}>{ticket.urgency_level?.toUpperCase()}</span></div>
            <div><p className="text-xs text-gray-500 uppercase tracking-wider mb-1">AI Confidence</p><ConfidenceBar score={ticket.confidence_score} /></div>
          </div>
          <div><p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Complaint</p><p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">{ticket.complaint?.raw_text}</p>
            {ticket.complaint?.language==='hi' && ticket.complaint?.translated_text && <p className="text-xs text-gray-500 mt-2 italic">Translation: {ticket.complaint.translated_text}</p>}
          </div>
          {ticket.summary && <div><p className="text-xs text-gray-500 uppercase tracking-wider mb-1">AI Summary</p><p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{ticket.summary}</p></div>}
          <div><label className="label-text">Update Status</label>
            <select className="input-field" value={status} onChange={e=>setStatus(e.target.value)}>
              <option value="new">New</option><option value="in_progress">In Progress</option><option value="resolved">Resolved</option><option value="closed">Closed</option>
            </select>
          </div>
          <div><label className="label-text">Officer Notes</label><textarea className="textarea-field h-24" placeholder="Add notes..." value={notes} onChange={e=>setNotes(e.target.value)} /></div>
          <div className="flex gap-3">
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">{saving?'Saving...':'Save Changes'}</button>
            <button onClick={onClose} className="btn-secondary flex-1">Close</button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

### frontend/src/components/OfficerDashboard.jsx

```jsx
import { useState, useEffect } from 'react'
import { getTickets } from '../api'
import StatusBadge from './StatusBadge'
import ConfidenceBar from './ConfidenceBar'
import TicketDetail from './TicketDetail'
export default function OfficerDashboard() {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({category:'',urgency:'',status:''})
  const [selected, setSelected] = useState(null)
  const [page, setPage] = useState(1)
  const perPage = 10
  const fetchTickets = async () => {
    setLoading(true)
    try { setTickets(await getTickets(filters)) } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }
  useEffect(()=>{ fetchTickets() },[filters])
  const tp = Math.ceil(tickets.length/perPage)
  const paged = tickets.slice((page-1)*perPage, page*perPage)
  const cats = ['Water Supply','Drainage','Road Damage','Electricity','Waste Management','Street Lighting']
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3">
        <select className="input-field w-auto" value={filters.category} onChange={e=>setFilters({...filters,category:e.target.value})}><option value="">All Categories</option>{cats.map(c=><option key={c} value={c}>{c}</option>)}</select>
        <select className="input-field w-auto" value={filters.urgency} onChange={e=>setFilters({...filters,urgency:e.target.value})}><option value="">All Urgency</option>{['critical','high','medium','low'].map(u=><option key={u} value={u}>{u[0].toUpperCase()+u.slice(1)}</option>)}</select>
        <select className="input-field w-auto" value={filters.status} onChange={e=>setFilters({...filters,status:e.target.value})}><option value="">All Status</option>{['new','in_progress','resolved','closed'].map(s=><option key={s} value={s}>{s.replace('_',' ')}</option>)}</select>
      </div>
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200"><tr>
              <th className="table-header">Ticket ID</th><th className="table-header">Complaint</th><th className="table-header">Category</th><th className="table-header">Urgency</th><th className="table-header">Confidence</th><th className="table-header">Status</th><th className="table-header">Date</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-200">
              {loading?<tr><td colSpan="7" className="table-cell text-center py-8 text-gray-500">Loading...</td></tr>
              :paged.length===0?<tr><td colSpan="7" className="table-cell text-center py-8 text-gray-500">No tickets found</td></tr>
              :paged.map(t=>(
                <tr key={t.id} className="hover:bg-gray-50 cursor-pointer" onClick={()=>setSelected(t)}>
                  <td className="table-cell font-mono text-xs">{t.id}</td>
                  <td className="table-cell max-w-xs truncate">{t.complaint_text}</td>
                  <td className="table-cell text-xs font-medium">{t.category}</td>
                  <td className="table-cell"><span className={`badge ${t.urgency_level==='critical'?'bg-red-100 text-red-800':t.urgency_level==='high'?'bg-orange-100 text-orange-800':t.urgency_level==='medium'?'bg-yellow-100 text-yellow-800':'bg-green-100 text-green-800'}`}>{t.urgency_level?.toUpperCase()}</span></td>
                  <td className="table-cell"><ConfidenceBar score={t.confidence_score}/></td>
                  <td className="table-cell"><StatusBadge status={t.status}/></td>
                  <td className="table-cell text-xs text-gray-500">{new Date(t.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {tp>1&&<div className="flex items-center justify-center gap-2"><button disabled={page===1} onClick={()=>setPage(p=>p-1)} className="btn-secondary text-xs px-3 py-1.5">Prev</button><span className="text-sm text-gray-500">Page {page} of {tp}</span><button disabled={page===tp} onClick={()=>setPage(p=>p+1)} className="btn-secondary text-xs px-3 py-1.5">Next</button></div>}
      {selected&&<TicketDetail ticket={selected} onClose={()=>setSelected(null)} onUpdate={fetchTickets}/>}
    </div>
  )
}
```

### frontend/src/components/StatusBadge.jsx

```jsx
export default function StatusBadge({ status }) {
  const s = {new:'bg-blue-100 text-blue-800',in_progress:'bg-yellow-100 text-yellow-800',resolved:'bg-green-100 text-green-800',closed:'bg-gray-100 text-gray-800'}
  const l = {new:'New',in_progress:'In Progress',resolved:'Resolved',closed:'Closed'}
  return <span className={`badge ${s[status]||'bg-gray-100 text-gray-800'}`}>{l[status]||status}</span>
}
```

### frontend/src/components/ConfidenceBar.jsx

```jsx
export default function ConfidenceBar({ score }) {
  const p = Math.round((score||0)*100)
  const c = p>=80?'bg-green-500':p>=60?'bg-yellow-500':'bg-red-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[100px]"><div className={`${c} h-2 rounded-full transition-all duration-500`} style={{width:`${p}%`}}/></div>
      <span className="text-xs font-medium text-gray-600">{p}%</span>
    </div>
  )
}
```

### frontend/src/components/StatsCards.jsx

```jsx
export default function StatsCards({ stats }) {
  if (!stats) return null
  const cards = [
    {label:'Total Tickets',value:stats.total_tickets,color:'bg-primary-50 text-primary-700 border-primary-200'},
    {label:'New',value:stats.by_status?.new||0,color:'bg-blue-50 text-blue-700 border-blue-200'},
    {label:'In Progress',value:stats.by_status?.in_progress||0,color:'bg-yellow-50 text-yellow-700 border-yellow-200'},
    {label:'Resolved',value:stats.by_status?.resolved||0,color:'bg-green-50 text-green-700 border-green-200'},
  ]
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map(c=>(
        <div key={c.label} className={`stat-card border ${c.color}`}>
          <p className="text-xs font-medium uppercase tracking-wider opacity-70">{c.label}</p>
          <p className="text-2xl font-bold mt-1">{c.value}</p>
        </div>
      ))}
    </div>
  )
}
```

---

### frontend/src/pages/CitizenPage.jsx

```jsx
import ComplaintForm from '../components/ComplaintForm'
export default function CitizenPage() {
  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-gray-900">JanSetu AI</h1>
        <p className="text-sm text-gray-500">AI-Powered Citizen Grievance Routing System</p>
        <p className="text-xs text-gray-400">File your complaint in Hindi or English — typed or spoken</p>
      </div>
      <ComplaintForm />
    </div>
  )
}
```

### frontend/src/pages/TrackPage.jsx

```jsx
import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getTicket } from '../api'
import TicketCard from '../components/TicketCard'
export default function TrackPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [ticketId, setTicketId] = useState(searchParams.get('id')||'')
  const [ticket, setTicket] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const handleSearch = async () => {
    if (!ticketId.trim()) return
    setLoading(true); setError(''); setTicket(null)
    try { setTicket(await getTicket(ticketId.trim())) }
    catch(e) { setError('Ticket not found. Please check the ID.') }
    finally { setLoading(false) }
  }
  useEffect(()=>{ if(searchParams.get('id')){setTicketId(searchParams.get('id'));handleSearch()} },[])
  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-gray-900">Track Your Ticket</h1>
        <p className="text-sm text-gray-500">Enter your ticket ID to check status</p>
      </div>
      <div className="card space-y-4">
        <div className="flex gap-3">
          <input type="text" className="input-field flex-1" placeholder="e.g., TKT-20260831-A1B2C3" value={ticketId} onChange={e=>setTicketId(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleSearch()} />
          <button onClick={handleSearch} disabled={loading} className="btn-primary">{loading?'Searching...':'Search'}</button>
        </div>
        {error && <div className="bg-red-50 text-red-700 text-sm px-4 py-2.5 rounded-lg border border-red-200">{error}</div>}
      </div>
      {ticket && <TicketCard ticket={ticket} />}
    </div>
  )
}
```

### frontend/src/pages/OfficerPage.jsx

```jsx
import { useState, useEffect } from 'react'
import StatsCards from '../components/StatsCards'
import OfficerDashboard from '../components/OfficerDashboard'
import { getDashboardStats } from '../api'
export default function OfficerPage() {
  const [stats, setStats] = useState(null)
  useEffect(()=>{ getDashboardStats().then(setStats).catch(console.error) },[])
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Officer Dashboard</h1><p className="text-sm text-gray-500">Manage and track citizen grievances</p></div>
      </div>
      <StatsCards stats={stats} />
      <OfficerDashboard />
    </div>
  )
}
```

---

## PART 3: FRONTEND DESIGN SPECIFICATIONS

Use these specs to generate UI mockups with Stitch or any design tool.

---

### Design Tokens

| Token | Value | Usage |
|---|---|---|
| **Primary Blue** | #2563eb (600) | Buttons, links, accents |
| **Primary Hover** | #1d4ed8 (700) | Button hover state |
| **Primary Light** | #eff6ff (50) | Card backgrounds, highlights |
| **Accent Orange** | #f97316 (500) | Voice button, urgency highlights |
| **Success Green** | #22c55e | Resolved status, confidence >80% |
| **Warning Yellow** | #f59e0b | In-progress status, confidence 60-80% |
| **Danger Red** | #ef4444 | Critical urgency, errors, confidence <60% |
| **Background** | #f9fafb (gray-50) | Page background |
| **Card Background** | #ffffff | Card surfaces |
| **Card Border** | #e5e7eb (gray-200) | Card borders |
| **Text Primary** | #111827 (gray-900) | Headings, primary text |
| **Text Secondary** | #6b7280 (gray-500) | Labels, descriptions |
| **Text Muted** | #9ca3af (gray-400) | Placeholder, footer |

### Typography

| Element | Font | Size | Weight | Line Height |
|---|---|---|---|---|
| **Page Title** | Inter | 24px (text-2xl) | Bold 700 | 32px |
| **Section Title** | Inter | 18px (text-lg) | Semibold 600 | 28px |
| **Body Text** | Inter | 14px (text-sm) | Regular 400 | 20px |
| **Label** | Inter | 14px (text-sm) | Medium 500 | 20px |
| **Small/Caption** | Inter | 12px (text-xs) | Medium 500 | 16px |
| **Ticket ID** | Inter Mono | 24px/14px | Bold 700 | 32px/20px |
| **Stat Number** | Inter | 24px (text-2xl) | Bold 700 | 32px |
| **Badge Text** | Inter | 12px (text-xs) | Semibold 600 | 16px |
| **Hindi Text** | Noto Sans Devanagari | Same as above | Same | Same |

### Spacing & Layout

| Element | Value |
|---|---|
| Page max-width | 1152px (max-w-6xl) |
| Page horizontal padding | 24px (px-6) |
| Page vertical padding | 32px (py-8) |
| Card padding | 24px (p-6) |
| Card border-radius | 12px (rounded-xl) |
| Card shadow | 0 1px 2px rgba(0,0,0,0.05) |
| Card border | 1px solid #e5e7eb |
| Button padding | 10px 24px (py-2.5 px-6) |
| Button border-radius | 8px (rounded-lg) |
| Input padding | 12px 16px (py-3 px-4) |
| Input border-radius | 8px (rounded-lg) |
| Badge padding | 2px 10px (py-0.5 px-2.5) |
| Badge border-radius | 9999px (rounded-full) |
| Grid gap | 16px (gap-4) |
| Section spacing | 20px (space-y-5) |

### Component Specs

#### Navbar
- Height: 64px (h-16)
- Background: white
- Border-bottom: 1px solid #e5e7eb
- Sticky top-0, z-50
- Logo: 32x32 blue rounded-lg with "JS" white text
- Nav links: 14px, medium weight, 8px horizontal padding, 8px vertical, rounded-lg
- Active link: blue-50 background, blue-700 text

#### Citizen Form Card
- Width: max 576px (max-w-xl), centered
- Hero above: "JanSetu AI" 24px bold, subtitle 14px gray-500
- Form: card component, space-y-5
- Textarea: height 144px (h-36), resize-none
- Submit button: full width, primary blue

#### Officer Dashboard
- Filter bar: horizontal flex, gap-12px, 3 dropdown selects
- Table: full width, header gray-50 background
- Table rows: hover gray-50, cursor pointer
- Pagination: centered, prev/next buttons

#### Stats Cards
- Grid: 4 columns on desktop, 2 on mobile
- Each card: stat-card class, colored left accent via border color
- Label: 12px uppercase tracking-wider
- Value: 24px bold

#### Status Badges
- New: blue-100 bg, blue-800 text
- In Progress: yellow-100 bg, yellow-800 text
- Resolved: green-100 bg, green-800 text
- Closed: gray-100 bg, gray-800 text

#### Confidence Bar
- Container: flex, items-center, gap-8px
- Track: 100px max width, 8px height (h-2), gray-200 bg, rounded-full
- Fill: colored based on score, rounded-full, transition-all
- Label: 12px, medium, gray-600

#### Urgency Badges
- Critical: red-100 bg, red-800 text, red-200 border
- High: orange-100 bg, orange-800 text, orange-200 border
- Medium: yellow-100 bg, yellow-800 text, yellow-200 border
- Low: green-100 bg, green-800 text, green-200 border

#### Voice Button
- Shape: pill (rounded-full)
- Background: orange-500, hover orange-600
- Active: red-500, animate-pulse
- Icon: microphone SVG, 16px
- Label: 14px, medium, white

#### Modal (Ticket Detail)
- Overlay: black bg-opacity-50
- Container: white bg, rounded-2xl, shadow-xl, max-w-2xl, max-h-90vh overflow-y
- Header: border-b, flex justify-between
- Close button: X icon, gray-400 hover gray-600

### Color Palette Visual Reference

```
Blue:    #eff6ff → #dbeafe → #bfdbfe → #93c5fd → #60a5fa → #3b82f6 → #2563eb → #1d4ed8 → #1e40af → #1e3a8a
Orange:  #fff7ed → #ffedd5 → #fed7aa → #fdba74 → #fb923c → #f97316 → #ea580c
Green:   #22c55e
Yellow:  #f59e0b
Red:     #ef4444
Gray:    #f9fafb → #f3f4f6 → #e5e7eb → #d1d5db → #9ca3af → #6b7280 → #4b5563 → #374151 → #1f2937 → #111827
```

---

## API Contract Reference

### POST /api/complaints
**Request:**
```json
{ "raw_text": "string", "language": "hi|en|null", "location": "string|null" }
```
**Response:**
```json
{
  "id": "uuid",
  "raw_text": "string",
  "translated_text": "string",
  "language": "hi|en",
  "location": "string|null",
  "created_at": "ISO datetime",
  "ticket": {
    "id": "TKT-YYYYMMDD-XXXXXX",
    "category": "Water Supply|Drainage|Road Damage|Electricity|Waste Management|Street Lighting",
    "department": "string",
    "urgency_level": "critical|high|medium|low",
    "confidence_score": 0.85,
    "summary": "string",
    "is_duplicate": false,
    "status": "new",
    "created_at": "ISO datetime"
  }
}
```

### GET /api/complaints/{id}
Same response as POST without ticket wrapper issues.

### GET /api/tickets?category=&urgency=&status=
**Response:** Array of ticket list items.

### GET /api/tickets/{id}
**Response:** Full ticket with nested complaint object.

### PATCH /api/tickets/{id}
**Request:** `{ "status": "in_progress", "officer_notes": "string" }`
**Response:** `{ "message": "Ticket updated", "ticket_id": "TKT-...", "status": "in_progress" }`

### GET /api/dashboard/stats
**Response:** `{ total_tickets, by_category, by_status, by_urgency, avg_confidence, recent_tickets }`

---

## Build Order (Execute in This Sequence)

```
1.  Create project folder: jansetu-ai/
2.  Create backend/requirements.txt → pip install
3.  Create backend/database.py
4.  Create backend/models.py
5.  Create backend/schemas.py
6.  Create backend/ai/__init__.py
7.  Create backend/ai/translator.py
8.  Create backend/ai/urgency.py
9.  Create backend/ai/classifier.py
10. Create backend/ai/duplicate.py
11. Create backend/ai/summary.py
12. Create backend/ai/pipeline.py
13. Create backend/data/departments.json
14. Create backend/routes/__init__.py
15. Create backend/routes/complaints.py
16. Create backend/routes/tickets.py
17. Create backend/routes/dashboard.py
18. Create backend/main.py
19. Create backend/seed_data.py → run it
20. Test backend: uvicorn main:app --reload
21. Create frontend/ (npm create vite)
22. Create frontend/vite.config.js, tailwind.config.js, postcss.config.js
23. Create frontend/index.html
24. Create frontend/src/index.css, main.jsx, api.js
25. Create frontend/src/App.jsx
26. Create components: StatusBadge, ConfidenceBar, StatsCards
27. Create components: LanguageToggle, VoiceInput
28. Create components: ComplaintForm, TicketResult, TicketCard
29. Create components: TicketDetail, OfficerDashboard
30. Create pages: CitizenPage, TrackPage, OfficerPage
31. Test full flow end-to-end
32. Polish UI and test demo scenarios
```

---

## Demo Complaints (Test These)

| Language | Text | Expected Category | Expected Urgency |
|---|---|---|---|
| Hindi | "मेरे इलाके में 3 दिन से पानी नहीं आ रहा है" | Water Supply | High |
| English | "There is a huge pothole near the school, very dangerous" | Road Damage | Critical |
| Hindi | "सड़क की लाइट बंद है, अंधेरा हो रहा है" | Street Lighting | Medium |
| English | "Garbage not collected for a week, stinking" | Waste Management | High |
| Hindi | "बिजली का खंभा झुक गया है गिरने वाला है" | Electricity | Critical |
| English | "Drainage is blocked, water entering homes" | Drainage | Critical |
