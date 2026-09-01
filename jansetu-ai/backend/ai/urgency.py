URGENCY_KEYWORDS = {
    "critical": ["emergency","accident","fire","death","collapse","gas leak","aapatkalin","maut","aag","immediate danger","life threatening","sparks","sparking","spark","high tension","wire down","drowning","gehraai","hit"],
    "high": ["dangerous","danger","overflow","blocked","no water","open wire","3 days","week","khatarnak","band","pani nahi","sewerage overflow","electric shock","fallen tree","road blocked","health risk","contaminated","flood","child","baccha","bache","gir","fell","unconscious"],
    "medium": ["damaged","broken","not working","complaint","kharab","nahi chal raha","repair","maintenance","crack","pothole","leak"]
}

def score_urgency(text: str, category: str = None) -> str:
    text_lower = text.lower()
    for level in ["critical", "high", "medium"]:
        for keyword in URGENCY_KEYWORDS[level]:
            if keyword.lower() in text_lower:
                return level
    return "low"
