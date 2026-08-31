export interface DepartmentInfo {
  department: string;
  keywords_hindi: string[];
  keywords_english: string[];
}

export const DEPARTMENTS: Record<string, DepartmentInfo> = {
  "Water Supply": {
    department: "Municipal Water Department",
    keywords_hindi: ["pani", "jal", "tap", "borewell", "handpump", "nal", "pipeline", "tanker", "paani"],
    keywords_english: ["water", "supply", "tap", "borewell", "pipe", "leak", "tanker", "handpump", "no water"],
  },
  Drainage: {
    department: "Municipal Drainage Department",
    keywords_hindi: ["naali", "sewerage", "drain", "gilhari", "overflow", "nala", "gandagi"],
    keywords_english: ["drain", "sewerage", "overflow", "blocked", "clog", "sewage", "drainage", "stagnant"],
  },
  "Road Damage": {
    department: "Public Works Department (PWD)",
    keywords_hindi: ["sadak", "gaddha", "road", "phata", "kharab", "sarak", "tuta"],
    keywords_english: ["road", "pothole", "crack", "broken", "surface", "damaged", "pavement"],
  },
  Electricity: {
    department: "Electricity Board / DISCOM",
    keywords_hindi: ["bijli", "light", "transformer", "current", "bill", "power cut"],
    keywords_english: ["electricity", "power", "outage", "transformer", "wire", "cut", "electric", "blackout"],
  },
  "Waste Management": {
    department: "Municipal Sanitation Department",
    keywords_hindi: ["kachra", "gandagi", "dustbin", "safai", "koode"],
    keywords_english: ["garbage", "waste", "trash", "bin", "collection", "dump", "sanitation", "cleaning"],
  },
  "Street Lighting": {
    department: "Municipal Electrical Department",
    keywords_hindi: ["streetlight", "lamp", "andhera", "light", "gali", "bulb"],
    keywords_english: ["streetlight", "lamp", "dark", "lighting", "bulb", "street light", "no light"],
  },
};

export function getDepartment(category: string): string {
  return DEPARTMENTS[category]?.department ?? "General Administration";
}
