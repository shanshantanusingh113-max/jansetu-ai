from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models import Ticket, Complaint

router = APIRouter()

OPEN_STATUSES = ["new", "in_progress"]


@router.get("/dashboard/stats")
def get_stats(db: Session = Depends(get_db)):
    total = db.query(Ticket).count()
    category_counts = dict(db.query(Ticket.category, func.count(Ticket.id)).group_by(Ticket.category).all())
    status_counts = dict(db.query(Ticket.status, func.count(Ticket.id)).group_by(Ticket.status).all())
    urgency_counts = dict(db.query(Ticket.urgency_level, func.count(Ticket.id)).group_by(Ticket.urgency_level).all())
    dept_counts = dict(db.query(Ticket.department, func.count(Ticket.id)).group_by(Ticket.department).all())
    avg_conf = db.query(func.avg(Ticket.confidence_score)).scalar() or 0.0

    # Open backlog per department (new + in_progress) for workload balancing.
    backlog_rows = db.query(
        Ticket.department, func.count(Ticket.id)
    ).filter(Ticket.status.in_(OPEN_STATUSES)).group_by(Ticket.department).all()
    backlog = {dept: int(count) for dept, count in backlog_rows}
    total_open = sum(backlog.values()) or 0

    # Resolution SLA: average hours from created_at to updated_at across resolved tickets.
    resolved = db.query(Ticket).filter(
        Ticket.status.in_(["resolved", "closed"]),
        Ticket.updated_at.isnot(None),
        Ticket.created_at.isnot(None),
    ).all()
    if resolved:
        hours = [(t.updated_at - t.created_at).total_seconds() / 3600 for t in resolved]
        avg_resolution_hours = round(sum(hours) / len(hours), 1)
    else:
        avg_resolution_hours = None

    # Overdue: critical/high tickets still open and older than 48h since last update.
    overdue_span = datetime.utcnow() - timedelta(hours=48)
    overdue = db.query(Ticket).filter(
        Ticket.status.in_(OPEN_STATUSES),
        Ticket.urgency_level.in_(["critical", "high"]),
        Ticket.updated_at.isnot(None),
        Ticket.updated_at < overdue_span,
    ).count()

    # Daily trend for the last 14 days.
    days = [(datetime.utcnow() - timedelta(days=i)).date() for i in range(13, -1, -1)]
    trend_rows = dict(db.query(
        func.date(Ticket.created_at), func.count(Ticket.id)
    ).group_by(func.date(Ticket.created_at)).all())
    daily_trend = []
    for day in days:
        daily_trend.append({
            "date": day.isoformat(),
            "count": int(trend_rows.get(str(day), 0) or trend_rows.get(day.isoformat(), 0)),
        })

    # Critical + open: auto-flagged alerts panel.
    critical_open = db.query(Ticket).filter(
        Ticket.status.in_(OPEN_STATUSES),
        Ticket.urgency_level == "critical",
    ).order_by(Ticket.created_at.desc()).limit(5).all()
    critical_list = []
    for t in critical_open:
        c = t.complaint
        critical_list.append({
            "id": t.id, "category": t.category, "department": t.department,
            "status": t.status,
            "complaint_text": c.raw_text[:80] if c else "",
            "created_at": t.created_at.isoformat() if t.created_at else "",
        })

    recent = db.query(Ticket).order_by(Ticket.created_at.desc()).limit(5).all()
    recent_list = []
    for t in recent:
        c = t.complaint
        recent_list.append({
            "id": t.id, "category": t.category, "status": t.status,
            "urgency_level": t.urgency_level,
            "complaint_text": c.raw_text[:80] if c else "",
            "created_at": t.created_at.isoformat() if t.created_at else ""
        })
    return {
        "total_tickets": total, "by_category": category_counts,
        "by_status": status_counts, "by_urgency": urgency_counts,
        "by_department": dept_counts, "open_backlog": backlog,
        "total_open": total_open,
        "avg_confidence": round(avg_conf, 2),
        "avg_resolution_hours": avg_resolution_hours,
        "overdue": overdue,
        "daily_trend": daily_trend,
        "critical_open": critical_list,
        "recent_tickets": recent_list
    }