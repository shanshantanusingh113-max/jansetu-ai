import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base, SessionLocal
from routes import complaints, tickets, dashboard

Base.metadata.create_all(bind=engine)

# Seed demo data on first startup against a persistent DB (idempotent).
def ensure_seed_data():
    try:
        from models import Ticket
        db = SessionLocal()
        try:
            if db.query(Ticket).count() == 0:
                from seed_data import seed_demo_tickets
                seed_demo_tickets()
        finally:
            db.close()
    except Exception as e:
        print(f"[janasetu] seed skipped: {e}")

if os.environ.get("JANSETU_SEED", "1") == "1":
    ensure_seed_data()

app = FastAPI(title="JanSetu AI", version="1.0.0")

allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
]
vercel_url = os.environ.get("VERCEL_URL")
if vercel_url:
    allowed_origins.append(f"https://{vercel_url}")
extra_origins = os.environ.get("CORS_ORIGINS", "")
if extra_origins:
    allowed_origins.extend([o.strip() for o in extra_origins.split(",") if o.strip()])

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
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
