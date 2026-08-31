export const URGENCY_KEYWORDS: Record<string, string[]> = {
  critical: [
    "emergency", "accident", "fire", "death", "collapse", "gas leak",
    "aapatkalin", "maut", "aag", "immediate danger", "life threatening",
  ],
  high: [
    "dangerous", "overflow", "blocked", "no water", "open wire", "3 days", "week",
    "khatarnak", "band", "pani nahi", "sewerage overflow", "electric shock",
    "fallen tree", "road blocked", "health risk", "contaminated", "flood",
  ],
  medium: [
    "damaged", "broken", "not working", "complaint", "kharab", "nahi chal raha",
    "repair", "maintenance", "crack", "pothole", "leak",
  ],
};

export function scoreUrgency(text: string): string {
  const textLower = text.toLowerCase();
  const levels: Array<keyof typeof URGENCY_KEYWORDS> = ["critical", "high", "medium"];
  for (const level of levels) {
    for (const keyword of URGENCY_KEYWORDS[level]) {
      if (textLower.includes(keyword.toLowerCase())) {
        return level;
      }
    }
  }
  return "low";
}
