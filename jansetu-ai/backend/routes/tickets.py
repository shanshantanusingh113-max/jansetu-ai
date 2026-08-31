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
