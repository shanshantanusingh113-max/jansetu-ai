import { DEPARTMENTS, getDepartment } from "./departments.js";

// Port of backend/ai/classifier.py keyword_classify + department mapping.
// We use the deterministic keyword classifier (no heavy ML deps to bundle).

export interface Classification {
  category: string;
  confidence: number;
  department: string;
}

export function keywordClassify(text: string): { category: string; confidence: number } {
  const textLower = text.toLowerCase();
  const scores: Record<string, number> = {};
  for (const [category, info] of Object.entries(DEPARTMENTS)) {
    const keywords = info.keywords_english.concat(info.keywords_hindi);
    scores[category] = keywords.filter((kw) => textLower.includes(kw.toLowerCase())).length;
  }
  const values = Object.values(scores);
  const maxScore = Math.max(...values, 0);
  if (maxScore === 0) {
    return { category: "Other", confidence: 0.3 };
  }
  const total = values.reduce((a, b) => a + b, 0);
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
  const confidence = total > 0 ? Math.min(scores[best] / total, 0.99) : 0.3;
  return { category: best, confidence: Math.round(confidence * 100) / 100 };
}

export function classifyComplaint(text: string): Classification {
  const { category, confidence } = keywordClassify(text);
  return { category, confidence, department: getDepartment(category) };
}
