import csv
import io
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import or_, case
from sqlalchemy.orm import Session, contains_eager

from database import get_db
from models import Ticket, Complaint
from schemas import TicketUpdate, FeedbackCreate, BulkTicketUpdate
from timeline import push_event, parse_history

router = APIRouter()

SORTABLE = {"created_at", "confidence_score", "urgency_level"}

# Custom rank so critical > high > medium > low in string-safe ORDER BY.
URGENCY_RANK = case(
    (Ticket.urgency_level == "critical", 0),
    (Ticket.urgency_level == "high", 1),
    (Ticket.urgency_level == "medium", 2),
    (Ticket.urgency_level == "low", 3),
    else_=4,
)


def apply_filters(query, category, urgency, status, search):
    if category:
        query = query.filter(Ticket.category == category)
    if urgency:
        query = query.filter(Ticket.urgency_level == urgency)
    if status:
        query = query.filter(Ticket.status == status)
    if search:
        like = f"%{search.strip()}%"
        query = query.filter(or_(
            Ticket.id.like(like),
            Ticket.category.like(like),
            Ticket.department.like(like),
            Complaint.raw_text.like(like),
            Complaint.translated_text.like(like),
            Complaint.citizen_name.like(like),
            Complaint.location.like(like),
        ))
    return query


def apply_sort(query, sort, order):
    if sort not in SORTABLE:
        return query.order_by(Ticket.created_at.desc())
    col = URGENCY_RANK if sort == "urgency_level" else getattr(Ticket, sort)
    if order == "asc":
        return query.order_by(col.asc())
    return query.order_by(col.desc())


def ticket_rows(tickets):
    from timeline import parse_history
    result = []
    for t in tickets:
        c = t.complaint
        result.append({
            "id": t.id,
            "complaint_text": c.raw_text[:100] if c else "",
            "category": t.category, "department": t.department,
            "urgency_level": t.urgency_level,
            "confidence_score": t.confidence_score,
            "status": t.status,
            "is_duplicate": t.is_duplicate,
            "created_at": t.created_at.isoformat() if t.created_at else "",
        })
    return result


def ticket_detail(t):
    complaint = t.complaint
    return {
        "id": t.id, "category": t.category,
        "department": t.department,
        "urgency_level": t.urgency_level,
        "confidence_score": t.confidence_score,
        "summary": t.summary,
        "is_duplicate": t.is_duplicate,
        "duplicate_of": t.duplicate_of,
        "similarity_score": t.similarity_score,
        "status": t.status,
        "officer_notes": t.officer_notes,
        "status_history": parse_history(t.status_history),
        "feedback_rating": t.feedback_rating,
        "feedback_comment": t.feedback_comment,
        "feedback_at": t.feedback_at.isoformat() if t.feedback_at else "",
        "created_at": t.created_at.isoformat() if t.created_at else "",
        "updated_at": t.updated_at.isoformat() if t.updated_at else "",
        "complaint": {
            "id": complaint.id, "raw_text": complaint.raw_text,
            "translated_text": complaint.translated_text,
            "language": complaint.language,
            "location": complaint.location,
            "citizen_name": complaint.citizen_name,
            "photo_url": complaint.photo_url,
            "created_at": complaint.created_at.isoformat() if complaint.created_at else "",
        } if complaint else None
    }


@router.get("/tickets")
def list_tickets(
    category: Optional[str] = Query(None),
    urgency: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    sort: Optional[str] = Query(None),
    order: Optional[str] = Query("desc"),
    limit: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(Ticket).join(Complaint, Ticket.complaint_id == Complaint.id) \
        .options(contains_eager(Ticket.complaint))
    query = apply_filters(query, category, urgency, status, search)
    query = apply_sort(query, sort, order)
    if limit:
        query = query.limit(limit)
    return ticket_rows(query.all())


@router.get("/tickets/export")
def export_tickets(
    category: Optional[str] = Query(None),
    urgency: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    sort: Optional[str] = Query(None),
    order: Optional[str] = Query("desc"),
    db: Session = Depends(get_db)
):
    query = db.query(Ticket).join(Complaint, Ticket.complaint_id == Complaint.id) \
        .options(contains_eager(Ticket.complaint))
    query = apply_filters(query, category, urgency, status, search)
    query = apply_sort(query, sort, order)
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["Ticket ID", "Complaint", "Category", "Department", "Urgency",
                     "Confidence", "Status", "Location", "Citizen", "Created At", "Updated At"])
    now = datetime.utcnow().isoformat(timespec="seconds")
    for t in query.all():
        c = t.complaint
        writer.writerow([
            t.id,
            c.raw_text if c else "",
            t.category,
            t.department,
            t.urgency_level,
            round(t.confidence_score or 0, 3),
            t.status,
            c.location if c else "",
            c.citizen_name if c else "",
            t.created_at.isoformat() if t.created_at else "",
            t.updated_at.isoformat() if t.updated_at else now,
        ])
    filename = f"jansetu_tickets_{datetime.utcnow().strftime('%Y%m%d')}.csv"
    return Response(
        content=buf.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.post("/tickets/bulk")
def bulk_update(data: BulkTicketUpdate, db: Session = Depends(get_db)):
    updated = 0
    for ticket_id in data.ids:
        ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
        if not ticket:
            continue
        ticket.status = data.status
        ticket.updated_at = datetime.utcnow()
        ticket.status_history = push_event(
            ticket.status_history, data.status,
            note=data.note or f"Bulk update to {data.status}",
            by="officer",
        )
        updated += 1
    db.commit()
    return {"updated": updated, "status": data.status}


@router.get("/tickets/{ticket_id}")
def get_ticket(ticket_id: str, db: Session = Depends(get_db)):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket_detail(ticket)


@router.patch("/tickets/{ticket_id}")
def update_ticket(ticket_id: str, data: TicketUpdate, db: Session = Depends(get_db)):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    changes = []
    if data.status is not None and data.status != ticket.status:
        ticket.status = data.status
        ticket.status_history = push_event(
            ticket.status_history, data.status,
            note=f"Status changed to {data.status}",
            by="officer",
        )
        changes.append(f"status={data.status}")
    if data.department is not None and data.department != ticket.department:
        ticket.department = data.department
        ticket.status_history = push_event(
            ticket.status_history, ticket.status,
            note=f"Reassigned to {data.department}",
            by="officer",
        )
        changes.append(f"department={data.department}")
    if data.officer_notes is not None:
        ticket.officer_notes = data.officer_notes
        changes.append("notes updated")
    ticket.updated_at = datetime.utcnow()
    db.commit()
    return {"message": "Ticket updated", "ticket_id": ticket.id,
            "status": ticket.status, "department": ticket.department}


@router.post("/tickets/{ticket_id}/feedback")
def add_feedback(ticket_id: str, data: FeedbackCreate, db: Session = Depends(get_db)):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if data.rating < 1 or data.rating > 5:
        raise HTTPException(status_code=422, detail="Rating must be 1-5")
    ticket.feedback_rating = data.rating
    ticket.feedback_comment = data.comment
    ticket.feedback_at = datetime.utcnow()
    db.commit()
    return {"message": "Feedback recorded", "ticket_id": ticket.id, "rating": data.rating}