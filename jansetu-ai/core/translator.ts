// Language detection + lightweight Hindi->English translation.
// Ports backend/ai/translator.py. Translation is heuristic (no external API):
// it maps common complaint phrases so downstream English-keyword logic works.

const HINDI_PHRASES: Record<string, string> = {
  pani: "water",
  paani: "water",
  jal: "water",
  nahi: "not",
  "nahi aa raha": "not coming",
  "nahi aaya": "not come",
  "aaj": "today",
  "teen din": "3 days",
  "do din": "2 days",
  "mahine bhar": "a month",
  "ek hafte": "a week",
  "mahina": "month",
  "sadak": "road",
  "sarak": "road",
  gaddha: "pothole",
  "gadda": "pothole",
  "phata": "burst",
  "phat gaya": "burst",
  toot: "broken",
  "toot gaya": "burst",
  "tooti": "broken",
  kharab: "broken",
  tuta: "broken",
  naali: "drain",
  nala: "drain",
  drainage: "drainage",
  sewerage: "sewerage",
  ratio: "waste",
  "bijli": "electricity",
  "transformer": "transformer",
  "light": "light",
  "kandhera": "dark",
  andhera: "dark",
  "current": "current",
  "khatarnak": "dangerous",
  danger: "danger",
  bhara: "filled",
  "bhar raha": "filling",
  "kya": "what",
  kachra: "garbage",
  gandagi: "garbage",
  kooda: "garbage",
  safai: "cleaning",
  dustbin: "dustbin",
  "ho gaya": "has happened",
  "ho raha": "is happening",
  "aa raha": "coming",
  "hai": "",
  "ho": "",
  "ka": "",
  "ki": "",
  "mein": "in",
  "main": "in",
  "se": "from",
  "pe": "on",
  "ko": "to",
  "ke": "of",
  "par": "on",
  "humare": "our",
  "hamare": "our",
  "mere": "my",
  "yahan": "here",
  "wahan": "there",
  "bahut": "very",
  "kam": "less",
  "zyada": "more",
  "private": "residential",
};

// Longer phrases must be replaced before single tokens to avoid partial overlaps.
const HINDI_MULTI: Array<[RegExp, string]> = [
  [/pani nahi aa raha/gi, "water not coming"],
  [/pani ki/gi, "water"],
  [/nahi aa raha/gi, "not coming"],
  [/nahi aa rahi/gi, "not coming"],
  [/nahi chal raha/gi, "not working"],
  [/nahi aaya/gi, "did not come"],
  [/nahi hui/gi, "not done"],
  [/toot gaya/gi, "burst"],
  [/phat gaya/gi, "burst"],
  [/bhar raha hai/gi, "is filling"],
  [/din se/gi, "days since"],
  [/log bhar/gi, "filled"],
  [/ho raha hai/gi, "is happening"],
  [/ho rahi hai/gi, "is happening"],
  [/aa raha hai/gi, "is coming"],
  [/aa rahi hai/gi, "is coming"],
  [/gaya hai/gi, "has happened"],
  [/gaya/gi, "has been"],
  [/mein se/gi, "in"],
  [/ka paas/gi, "near"],
  [/ke paas/gi, "near"],
  [/paas/gi, "near"],
  [/hone/gi, "to be"],
];

export function detectLanguage(text: string): string {
  let devanagariCount = 0;
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    if (code >= 0x0900 && code <= 0x097f) devanagariCount++;
  }
  return devanagariCount > text.length * 0.3 ? "hi" : "en";
}

export function translateToEnglish(text: string, sourceLang: string): string {
  if (sourceLang === "en") return text;
  let result = " " + text.toLowerCase() + " ";
  for (const [re, replacement] of HINDI_MULTI) {
    result = result.replace(re, " " + replacement + " ");
  }
  for (const [phrase, replacement] of Object.entries(HINDI_PHRASES)) {
    const re = new RegExp(`\\b${phrase}\\b`, "gi");
    result = result.replace(re, " " + replacement + " ");
  }
  // Collapse whitespace.
  result = result.replace(/\s+/g, " ").trim();
  return result.length > 0 ? result : text;
}
