// Project categories that SMMEs/NGOs browse by. Keywords let us suggest a category
// from a GitHub repo's topics, languages and description.

export const CATEGORIES = [
  { id: "cybersecurity", label: "Cybersecurity", emoji: "🛡️", keywords: ["security", "secure", "cyber", "firewall", "intrusion", "ids", "encryption", "pentest", "malware", "auth", "vulnerability", "ot-security", "phishing", "hack", "breach", "password", "login", "protect", "threat"] },
  { id: "finance", label: "Finance & FinTech", emoji: "💳", keywords: ["finance", "fintech", "payment", "bank", "wallet", "credit", "loan", "invoice", "accounting", "budget", "stokvel", "crypto", "ledger", "fraud", "money", "salary", "insurance"] },
  { id: "health", label: "Health", emoji: "🩺", keywords: ["health", "clinic", "medical", "patient", "hospital", "pharmacy", "fitness", "mental", "nurse", "doctor"] },
  { id: "education", label: "Education", emoji: "🎓", keywords: ["education", "learn", "school", "student", "course", "tutor", "quiz", "edtech", "teacher", "indigenous knowledge"] },
  { id: "agriculture", label: "Agriculture", emoji: "🌱", keywords: ["agri", "farm", "crop", "soil", "livestock", "irrigation", "harvest", "garden"] },
  { id: "retail", label: "Retail & E-commerce", emoji: "🛒", keywords: ["retail", "shop", "store", "spaza", "ecommerce", "e-commerce", "marketplace", "inventory", "stock", "pos", "vendor", "tuckshop"] },
  { id: "logistics", label: "Logistics & Transport", emoji: "🚚", keywords: ["logistics", "delivery", "transport", "taxi", "fleet", "route", "tracking", "courier", "mobility"] },
  { id: "civic", label: "Civic & Government", emoji: "🏛️", keywords: ["civic", "municipal", "government", "citizen", "community", "infrastructure", "public service", "voting"] },
  { id: "ngo", label: "NGO & Social Impact", emoji: "🤝", keywords: ["ngo", "npo", "donation", "charity", "volunteer", "grant", "social impact", "voucher"] },
  { id: "ai", label: "AI & Data", emoji: "🤖", keywords: ["ai", "machine learning", "ml", "llm", "chatbot", "nlp", "data science", "analytics", "prediction", "computer vision", "tensorflow", "pytorch"] },
  { id: "iot", label: "IoT & Hardware", emoji: "📡", keywords: ["iot", "esp32", "arduino", "sensor", "raspberry", "embedded", "hardware", "rs485", "mqtt", "firmware"] },
  { id: "energy", label: "Energy & Environment", emoji: "⚡", keywords: ["energy", "solar", "loadshedding", "load shedding", "electricity", "water", "climate", "recycling", "environment"] },
  { id: "other", label: "Other", emoji: "✨", keywords: [] },
];

export const CATEGORY_BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));

export const categoryLabel = (id) => CATEGORY_BY_ID[id]?.label || "";

/** Best-guess category from free text (topics, description, languages, name). */
export function suggestCategory(...texts) {
  const text = texts.flat().filter(Boolean).join(" ").toLowerCase().replace(/[-_]/g, " ");
  let best = { id: "other", score: 0 };
  for (const category of CATEGORIES) {
    const score = category.keywords.reduce((total, word) => {
      const w = word.replace(/[-_]/g, " ");
      // Short keywords ("ai", "ml", "pos") must be whole words; longer ones may be prefixes ("learn" -> "learning").
      const pattern = w.length <= 3 ? `(^|[^a-z])${w}([^a-z]|$)` : `(^|[^a-z])${w}`;
      return total + (new RegExp(pattern, "i").test(text) ? 1 : 0);
    }, 0);
    if (score > best.score) best = { id: category.id, score };
  }
  return best.id;
}
