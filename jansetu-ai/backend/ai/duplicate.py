from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

def find_similar_tickets(text, category, existing_complaints, threshold=0.65):
    if not existing_complaints:
        return {"is_duplicate": False, "similar_tickets": []}
    cat_complaints = [c for c in existing_complaints if c["ticket"].category == category]
    if not cat_complaints:
        return {"is_duplicate": False, "similar_tickets": []}
    texts = [text] + [c["complaint"].translated_text or c["complaint"].raw_text for c in cat_complaints]
    try:
        vec = TfidfVectorizer(max_features=5000, ngram_range=(1, 2))
        matrix = vec.fit_transform(texts)
        sims = cosine_similarity(matrix[0:1], matrix[1:])[0]
    except Exception:
        return {"is_duplicate": False, "similar_tickets": []}
    similar = []
    for i, score in enumerate(sims):
        if score >= threshold:
            similar.append({
                "ticket_id": cat_complaints[i]["ticket"].id,
                "similarity": round(float(score), 3),
                "text_preview": cat_complaints[i]["complaint"].raw_text[:80]
            })
    similar.sort(key=lambda x: x["similarity"], reverse=True)
    return {"is_duplicate": len(similar) > 0, "similar_tickets": similar[:5]}
