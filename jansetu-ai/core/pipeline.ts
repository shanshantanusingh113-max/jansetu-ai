import { detectLanguage, translateToEnglish } from "./translator.js";
import { classifyComplaint } from "./classifier.js";
import { scoreUrgency } from "./urgency.js";
import { generateSummary } from "./summary.js";

export interface ProcessedComplaint {
  translated_text: string;
  language: string;
  category: string;
  department: string;
  urgency_level: string;
  confidence_score: number;
  is_duplicate: boolean;
  duplicate_of: string | null;
  similarity_score: number | null;
  summary: string;
}

export function processComplaint(
  rawText: string,
  language?: string,
  location?: string
): ProcessedComplaint {
  const lang = language ?? detectLanguage(rawText);
  const translated = translateToEnglish(rawText, lang);
  const { category, department, confidence } = classifyComplaint(translated);
  const urgency = scoreUrgency(translated);
  const summary = generateSummary(translated, category, department, urgency, location);
  return {
    translated_text: translated,
    language: lang,
    category,
    department,
    urgency_level: urgency,
    confidence_score: confidence,
    is_duplicate: false,
    duplicate_of: null,
    similarity_score: null,
    summary,
  };
}
