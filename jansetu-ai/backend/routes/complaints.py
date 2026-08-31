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
