import json
from datetime import datetime

def now_iso():
    return datetime.utcnow().isoformat(timespec="seconds")

def init_history(status, note="Complaint received"):
    return json.dumps([{"status": status, "note": note, "by": "system", "at": now_iso()}])

def push_event(history, status, note=None, by="system"):
    events = parse_history(history)
    events.append({"status": status, "note": note, "by": by, "at": now_iso()})
    return json.dumps(events)

def parse_history(history):
    if not history:
        return []
    try:
        if isinstance(history, (list, dict)):
            return history
        return json.loads(history)
    except Exception:
        return []