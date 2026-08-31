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
