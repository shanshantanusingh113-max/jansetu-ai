def generate_summary(translated_text, category, department, urgency, location=None):
    key_issue = translated_text.split('.')[0].strip() if translated_text else "Complaint received"
    parts = [f"{category} complaint received.", f"Issue: {key_issue}."]
    if location:
        parts.append(f"Location: {location}.")
    urgency_map = {"critical": "requires immediate attention", "high": "requires urgent attention", "medium": "requires attention", "low": "routine matter"}
    parts.append(f"Urgency: {urgency} — {urgency_map.get(urgency, 'routine matter')}.")
    parts.append(f"Routed to: {department}.")
    return " ".join(parts)
