import os
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.orm import Session

from database import get_db
from models import Complaint, Ticket
from schemas import ComplaintResponse
from ai.pipeline import process_complaint
from timeline import init_history, push_event

router = APIRouter()

UPLOADS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
ALLOWED_EXT = {".jpg", ".jpeg", ".png", ".webp", ".gif"}


def generate_ticket_id():
    now = datetime.utcnow()
    date_str = now.strftime("%Y%m%d")
    short_id = uuid.uuid4().hex[:6].upper()
    return f"TKT-{date_str}-{short_id}"


def save_photo(data, filename):
    if not data:
        return None
    ext = os.path.splitext(filename or "")[1].lower()
    if ext not in ALLOWED_EXT:
        ext = ".jpg"
    os.makedirs(UPLOADS_DIR, exist_ok=True)
    name = f"{uuid.uuid4().hex}{ext}"
    target = os.path.join(UPLOADS_DIR, name)
    with open(target, "wb") as f:
        f.write(data)
    return f"/uploads/{name}"


def link_duplicates(ticket, complaint, db):
    """Find the most similar existing ticket in the same category and link it."""
    from ai.duplicate import find_similar_tickets
    all_tickets = db.query(Ticket).filter(
        Ticket.id != ticket.id, Ticket.category == ticket.category
    ).all()
    existing = []
    for t in all_tickets:
        c = db.query(Complaint).filter(Complaint.id == t.complaint_id).first()
        if c:
            existing.append({"ticket": t, "complaint": c})
    text = complaint.translated_text or complaint.raw_text
    result = find_similar_tickets(text, ticket.category, existing)
    if result["is_duplicate"]:
        top = result["similar_tickets"][0]
        ticket.is_duplicate = True
        ticket.duplicate_of = top["ticket_id"]
        ticket.similarity_score = top["similarity"]


async def create_complaint_from_payload(db, raw_text, language, location,
                                        citizen_name, citizen_contact,
                                        photo_bytes=None, photo_name=None):
    complaint_id = str(uuid.uuid4())
    ai_result = await run_in_threadpool(
        process_complaint, raw_text, language, location
    )
    photo_url = save_photo(photo_bytes, photo_name)
    complaint = Complaint(
        id=complaint_id, raw_text=raw_text,
        translated_text=ai_result["translated_text"],
        language=ai_result["language"],
        location=location,
        citizen_name=citizen_name,
        citizen_contact=citizen_contact,
        photo_url=photo_url,
    )
    db.add(complaint)

    # Auto-escalate critical complaints: skip the queue and flag them in_progress.
    status = "in_progress" if ai_result["urgency_level"] == "critical" else "new"
    if status == "in_progress":
        history = push_event(
            init_history("new"),
            "in_progress",
            note="Auto-escalated: critical urgency detected by AI",
        )
    else:
        history = init_history(status)

    ticket = Ticket(
        id=generate_ticket_id(), complaint_id=complaint_id,
        category=ai_result["category"], department=ai_result["department"],
        urgency_level=ai_result["urgency_level"],
        confidence_score=ai_result["confidence_score"],
        summary=ai_result["summary"],
        is_duplicate=False, duplicate_of=None, similarity_score=None,
        status=status, status_history=history,
        updated_at=datetime.utcnow(),
    )
    db.add(ticket)
    db.flush()
    link_duplicates(ticket, complaint, db)
    db.commit()
    db.refresh(complaint)
    return complaint


async def _extract_data(request: Request):
    content_type = request.headers.get("content-type", "")
    if "multipart" in content_type or "application/x-www-form-urlencoded" in content_type:
        form = await request.form()
        photo = form.get("photo")
        photo_bytes = None
        photo_name = None
        if photo is not None:
            photo_bytes = await photo.read()
            photo_name = getattr(photo, "filename", None)
        return (
            str(form.get("raw_text", "")).strip(),
            form.get("language") or None,
            form.get("location") or None,
            form.get("citizen_name") or None,
            form.get("citizen_contact") or None,
            photo_bytes,
            photo_name,
        )
    body = await request.json()
    return (
        str(body.get("raw_text", "")).strip(),
        body.get("language") or None,
        body.get("location") or None,
        body.get("citizen_name") or None,
        body.get("citizen_contact") or None,
        None,
        None,
    )


@router.post("/complaints", response_model=ComplaintResponse)
async def create_complaint(request: Request, db: Session = Depends(get_db)):
    (raw_text, language, location, citizen_name, citizen_contact,
     photo_bytes, photo_name) = await _extract_data(request)
    if not raw_text:
        raise HTTPException(status_code=422, detail="raw_text is required")
    return await create_complaint_from_payload(
        db, raw_text, language, location, citizen_name,
        citizen_contact, photo_bytes, photo_name,
    )


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