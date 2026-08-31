CREATE TABLE complaints (
  id TEXT PRIMARY KEY,
  raw_text TEXT NOT NULL,
  translated_text TEXT,
  language TEXT DEFAULT 'en',
  location TEXT,
  citizen_name TEXT,
  citizen_contact TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tickets (
  id TEXT PRIMARY KEY,
  complaint_id TEXT REFERENCES complaints(id),
  category TEXT NOT NULL,
  department TEXT NOT NULL,
  urgency_level TEXT DEFAULT 'medium',
  confidence_score DOUBLE PRECISION DEFAULT 0,
  summary TEXT,
  is_duplicate BOOLEAN DEFAULT FALSE,
  duplicate_of TEXT,
  similarity_score DOUBLE PRECISION,
  status TEXT DEFAULT 'new',
  officer_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE INDEX idx_tickets_category ON tickets(category);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_urgency ON tickets(urgency_level);
CREATE INDEX idx_tickets_complaint ON tickets(complaint_id);
CREATE INDEX idx_tickets_created ON tickets(created_at);
