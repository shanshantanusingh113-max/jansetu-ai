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
