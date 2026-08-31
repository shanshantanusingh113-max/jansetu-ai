import json, os, joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "trained_models")

def load_departments():
    with open(os.path.join(DATA_DIR, "departments.json"), "r", encoding="utf-8") as f:
        return json.load(f)

def keyword_classify(text: str, departments: dict) -> tuple:
    text_lower = text.lower()
    scores = {}
    for category, info in departments.items():
        all_kw = info.get("keywords_english", []) + info.get("keywords_hindi", [])
        scores[category] = sum(1 for kw in all_kw if kw.lower() in text_lower)
    if max(scores.values()) == 0:
        return "Other", 0.3
    best = max(scores, key=scores.get)
    total = sum(scores.values())
    return best, round(min(scores[best] / total if total > 0 else 0.3, 0.99), 2)

_model = None
_vectorizer = None

def load_ml_model():
    global _model, _vectorizer
    mp = os.path.join(MODEL_DIR, "classifier.pkl")
    vp = os.path.join(MODEL_DIR, "vectorizer.pkl")
    if os.path.exists(mp) and os.path.exists(vp):
        _model = joblib.load(mp)
        _vectorizer = joblib.load(vp)
        return True
    return False

def classify_complaint(text: str) -> tuple:
    departments = load_departments()
    if _model is None:
        load_ml_model()
    if _model and _vectorizer:
        try:
            X = _vectorizer.transform([text])
            pred = _model.predict(X)[0]
            conf = float(max(_model.predict_proba(X)[0]))
            if conf > 0.5:
                return pred, round(conf, 2)
        except Exception:
            pass
    return keyword_classify(text, departments)

def get_department(category: str) -> str:
    return load_departments().get(category, {}).get("department", "General Administration")
