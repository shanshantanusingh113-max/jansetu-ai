// Port of backend/ai/summary.py

const URGENCY_DESCRIPTIONS: Record<string, string> = {
  critical: "requires immediate attention",
  high: "requires urgent attention",
  medium: "requires attention",
  low: "routine matter",
};

export function generateSummary(
  translatedText: string,
  category: string,
  department: string,
  urgency: string,
  location?: string
): string {
  const keyIssue = translatedText ? (translatedText.split(".")[0].trim() || "Complaint received") : "Complaint received";
  const parts: string[] = [`${category} complaint received.`, `Issue: ${keyIssue}.`];
  if (location) parts.push(`Location: ${location}.`);
  parts.push(`Urgency: ${urgency} — ${URGENCY_DESCRIPTIONS[urgency] ?? "routine matter"}.`);
  parts.push(`Routed to: ${department}.`);
  return parts.join(" ");
}
