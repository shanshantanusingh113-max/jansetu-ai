import csv, os, random, uuid
from datetime import datetime, timedelta
from database import SessionLocal, engine, Base
from models import Complaint, Ticket
from ai.pipeline import process_complaint
from timeline import init_history, push_event

Base.metadata.create_all(bind=engine)

TRAINING_DATA = [
    ("Mere area mein teen din se pani nahi aa raha","hi","Water Supply","high"),
    ("Water supply has been stopped for 3 days in our colony","en","Water Supply","high"),
    ("Hamare yahan pani ki bahut kami hai","hi","Water Supply","medium"),
    ("Tap water is not coming since yesterday","en","Water Supply","high"),
    ("Borewell kharab ho gaya hai","hi","Water Supply","medium"),
    ("Handpump is not working in our village","en","Water Supply","medium"),
    ("Tanker nahi aa raha hai do din se","hi","Water Supply","high"),
    ("Water tanker has not come for 2 days","en","Water Supply","high"),
    ("Paani ka pipeline toot gaya hai","hi","Water Supply","critical"),
    ("Water pipeline is burst and water is wasting","en","Water Supply","critical"),
    ("Ghar mein pani ka pressure bahut kam hai","hi","Water Supply","low"),
    ("Low water pressure in residential area","en","Water Supply","low"),
    ("Nala band ho gaya hai aur paani bhar raha hai","hi","Drainage","high"),
    ("Drain is blocked and water is overflowing","en","Drainage","high"),
    ("Sewerage overflow ho raha hai sadak pe","hi","Drainage","critical"),
    ("Sewerage is overflowing on the main road","en","Drainage","critical"),
    ("Naali saaf nahi hui hai mahine bhar se","hi","Drainage","medium"),
    ("Drain has not been cleaned for a month","en","Drainage","medium"),
    ("Gilhari mein se badbu aa rahi hai","hi","Drainage","high"),
    ("Foul smell coming from the drain near school","en","Drainage","high"),
    ("Sadak mein bahut bada gaddha hai jo khatarnak hai","hi","Road Damage","critical"),
    ("There is a huge pothole near the school, very dangerous","en","Road Damage","critical"),
    ("Road is completely broken near bus stand","en","Road Damage","high"),
    ("Sadak toot gayi hai bus stand ke paas","hi","Road Damage","high"),
    ("Pothole has caused two accidents already","en","Road Damage","critical"),
    ("Bijli ki line mein spark ho raha hai bahut khatarnak hai","hi","Electricity","critical"),
    ("Electric wire is sparking near children park, very dangerous","en","Electricity","critical"),
    ("Transformer phat gaya hai aur bijli gayi hai","hi","Electricity","critical"),
    ("Bijli 3 din se gaayab hai","hi","Electricity","high"),
    ("No electricity for 3 days in our area","en","Electricity","high"),
    ("Kachra nahi uthaya ja raha hai do din se","hi","Waste Management","high"),
    ("Garbage has not been collected for 2 days","en","Waste Management","high"),
    ("Dump yard is overflowing and causing health issues","en","Waste Management","critical"),
    ("Kachre ka dher lag gaya hai aur badbu aa rahi hai","hi","Waste Management","critical"),
    ("Gali ki light band hai 5 din se andhera ho raha hai","hi","Street Lighting","high"),
    ("Street light not working for 5 days, very dark at night","en","Street Lighting","high"),
    ("Andhera mein chalna mushkil ho raha hai","hi","Street Lighting","high"),
    ("Road is completely dark due to non-functional lights","en","Street Lighting","high"),
    ("Light ka wire kata hua hai","hi","Street Lighting","critical"),
]

def create_training_csv():
    csv_path = os.path.join(os.path.dirname(__file__), "data", "training_data.csv")
    os.makedirs(os.path.dirname(csv_path), exist_ok=True)
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["text","language","category","urgency_level"])
        for row in TRAINING_DATA:
            writer.writerow(row)

def train_model():
    import pandas as pd
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.linear_model import LogisticRegression
    import joblib
    csv_path = os.path.join(os.path.dirname(__file__), "data", "training_data.csv")
    df = pd.read_csv(csv_path)
    model_dir = os.path.join(os.path.dirname(__file__), "trained_models")
    os.makedirs(model_dir, exist_ok=True)
    vec = TfidfVectorizer(max_features=5000, ngram_range=(1,2), stop_words='english')
    X = vec.fit_transform(df['text'])
    clf = LogisticRegression(C=1.0, max_iter=1000, random_state=42)
    clf.fit(X, df['category'])
    joblib.dump(vec, os.path.join(model_dir, "vectorizer.pkl"))
    joblib.dump(clf, os.path.join(model_dir, "classifier.pkl"))

def seed_demo_tickets():
    db = SessionLocal()
    if db.query(Ticket).count() > 0:
        db.close()
        return
    demos = [
        ("Mere mohalle mein 3 din se pani nahi aa raha hai","hi","Ward 5, Sector 12"),
        ("Road has a massive pothole near the school, two people fell yesterday","en","Main Road, near St. Mary's School"),
        ("Bijli ka khambha jhuk gaya hai girne wala hai bahut khatarnak hai","hi","Gandhi Nagar, Lane 3"),
        ("Garbage has not been collected for a week, terrible smell","en","Market Area, Block B"),
        ("Street light band hai aur raat ko andhera rehta hai","hi","Nehru Colony, Main Street"),
        ("Drainage is completely blocked, water entering homes","en","Rajiv Nagar, Ward 8"),
        ("Transformer phat gaya hai poora area andhera hai","hi","Ambedkar Nagar, Sector 3"),
        ("Open drain near hospital is causing health problems","en","Near District Hospital, Gate 2"),
        ("Pani ka pipe toot gaya hai aur paani sadak pe beh raha hai","hi","MG Road, Near Temple"),
        ("Kachra uthane wala vehicle nahi aaya is hafte","hi","Shanti Nagar, Ward 12"),
        ("Sewerage road pe bah rahi hai aur ek baccha gehraai mein gir gaya","hi","Old Market Road, Sector 6"),
        ("High tension wire down in the colony, sparks and danger for children","en","Pump House Lane, Ward 4"),
    ]
    for text, lang, loc in demos:
        cid = str(uuid.uuid4())
        r = process_complaint(text, lang, loc)
        db.add(Complaint(id=cid, raw_text=text, translated_text=r["translated_text"], language=lang, location=loc))
        tid = f"TKT-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
        status = random.choice(["new", "new", "in_progress", "resolved"])
        created_at = datetime.utcnow() - timedelta(days=random.randint(0, 5), hours=random.randint(0, 10))
        if status == "resolved":
            updated_at = created_at + timedelta(hours=random.randint(3, 36))
        elif status == "in_progress":
            updated_at = created_at + timedelta(hours=random.randint(1, 70))
        else:
            updated_at = datetime.utcnow()
        history = init_history("new")
        if status in ("in_progress", "resolved"):
            history = push_event(history, "in_progress", note="Officer started work", by="officer")
        if status == "resolved":
            history = push_event(history, "resolved", note="Issue resolved by department", by="officer")
        db.add(Ticket(id=tid, complaint_id=cid, category=r["category"], department=r["department"],
            urgency_level=r["urgency_level"], confidence_score=r["confidence_score"],
            summary=r["summary"], status=status, status_history=history,
            created_at=created_at, updated_at=updated_at))
    db.commit()
    # Force one overdue open critical/high ticket so the SLA panel has signal.
    overdue_candidates = [t for t in db.query(Ticket).all()
                          if t.status in ("new", "in_progress")
                          and t.urgency_level in ("critical", "high")]
    if overdue_candidates:
        t = overdue_candidates[0]
        t.updated_at = datetime.utcnow() - timedelta(hours=60)
    db.commit()
    db.close()

if __name__ == "__main__":
    create_training_csv()
    train_model()
    seed_demo_tickets()
    print("Setup complete!")
