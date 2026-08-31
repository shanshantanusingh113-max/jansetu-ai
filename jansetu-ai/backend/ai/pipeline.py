from ai.translator import detect_language, translate_to_english
from ai.classifier import classify_complaint, get_department
from ai.urgency import score_urgency
from ai.summary import generate_summary

def process_complaint(raw_text, language=None, location=None):
    if language is None:
        language = detect_language(raw_text)
    translated = translate_to_english(raw_text, language)
    category, confidence = classify_complaint(translated)
    department = get_department(category)
    urgency = score_urgency(translated, category)
    summary = generate_summary(translated, category, department, urgency, location)
    return {
        "translated_text": translated, "language": language,
        "category": category, "department": department,
        "urgency_level": urgency, "confidence_score": confidence,
        "is_duplicate": False, "duplicate_of": None,
        "similarity_score": None, "summary": summary
    }
