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
