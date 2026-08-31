import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Use Postgres on Vercel (DATABASE_URL), fall back to local SQLite for development.
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./jansetu.db")

if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    # Normalize to a driver we bundle (pg8000 = pure-python, serverless-safe).
    url = DATABASE_URL
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+pg8000://", 1)
    elif url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+pg8000://", 1)
    engine = create_engine(url, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
