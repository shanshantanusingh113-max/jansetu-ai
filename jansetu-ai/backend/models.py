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
