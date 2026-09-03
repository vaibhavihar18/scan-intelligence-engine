/**
 * Parse raw OCR text from front and back food package images
 * into structured data for the AHAR X analysis pipeline.
 */

export interface OcrFrontResult {
  productName: string | null;
  claims: string[];
  highlightedIngredients: string[];
  allergens: string[];
  otherText: string[];
}

export interface OcrBackResult {
  ingredientsList: string;
  ingredients: string[];
  ingredientPercentages: Record<string, string>;
  nutritionPerServing: {
    servingSize: string | null;
    calories: number | null;
    protein: number | null;
    carbohydrates: number | null;
    sugars: number | null;
    fat: number | null;
    saturatedFat: number | null;
    transFat: number | null;
    fibre: number | null;
    sodium: number | null;
  };
  allergens: string[];
}

// Common food ingredients to detect in front claims
const HIGHLIGHTED_INGREDIENTS = [
  "hazelnut", "hazelnuts", "almond", "almonds", "cashew", "cashews",
  "pistachio", "pistachios", "peanut", "peanuts", "walnut", "walnuts",
  "saffron", "cardamom", "vanilla", "strawberry", "mango", "coconut",
  "cocoa", "chocolate", "milk", "cream", "butter", "cheese",
  "honey", "jaggery", "dates", "fig", "raisin", "cranberry",
  "soy", "soya", "wheat", "oat", "oats", "rice", "maize",
  "turmeric", "cinnamon", "ginger", "clove", "nutmeg", "pepper",
  "tomato", "onion", "garlic", "lemon", "lime", "orange", "apple",
  "banana", "pineapple", "pomegranate", "blueberry", "raspberry",
  "peach", "apricot", "cherry", "plum",
];

// Common claims to detect
const CLAIM_PATTERNS = [
  /high\s*protein/i, /low\s*sugar/i, /sugar\s*free/i, /no\s*added\s*sugar/i,
  /low\s*fat/i, /fat\s*free/i, /high\s*fib(?:re|er)/i, /source\s*of\s*protein/i,
  /100%\s*natural/i, /natural/i, /pure/i, /fresh/i, /authentic/i,
  /traditional/i, /original/i, /made\s*with/i, /contains/i,
  /no\s*artificial/i, /no\s*preservat/i, /organic/i, /whole\s*grain/i,
  /diet/i, /light/i, /lite/i, /zero/i, /amilk/i,
  /source\s*of\s*fib/i, /good\s*source/i, /rich\s*in/i,
];

// Common allergen keywords
const ALLERGEN_KEYWORDS = [
  "milk", "dairy", "egg", "eggs", "peanut", "peanuts", "tree nut",
  "almond", "cashew", "hazelnut", "walnut", "pistachio", "soy", "soya",
  "wheat", "gluten", "fish", "shellfish", "shrimp", "sesame", "mustard",
  "celery", "lupin", "sulphite", "sulfite",
];

/**
 * Parse front-of-pack OCR text.
 */
export function parseFrontOcr(rawText: string): OcrFrontResult {
  const lines = rawText.split("\n").map((l) => l.trim()).filter(Boolean);
  const fullText = lines.join(" ");

  // Product name: usually the first prominent line(s)
  const productName = lines[0] ?? null;

  // Detect claims
  const claims: string[] = [];
  for (const pattern of CLAIM_PATTERNS) {
    const match = fullText.match(pattern);
    if (match) {
      claims.push(match[0].trim());
    }
  }

  // Detect highlighted ingredients
  const lowerText = fullText.toLowerCase();
  const highlightedIngredients: string[] = [];
  for (const ing of HIGHLIGHTED_INGREDIENTS) {
    // Word-boundary check
    const re = new RegExp(`\\b${ing}\\b`, "i");
    if (re.test(fullText)) {
      // Capitalize first letter
      highlightedIngredients.push(ing.charAt(0).toUpperCase() + ing.slice(1));
    }
  }
  // Deduplicate
  const uniqueIngredients = [...new Set(highlightedIngredients)];

  // Allergens on front
  const allergens: string[] = [];
  for (const ak of ALLERGEN_KEYWORDS) {
    if (new RegExp(`\\b${ak}\\b`, "i").test(fullText)) {
      allergens.push(ak.charAt(0).toUpperCase() + ak.slice(1));
    }
  }

  return {
    productName,
    claims,
    highlightedIngredients: uniqueIngredients,
    allergens: [...new Set(allergens)],
    otherText: lines.slice(1),
  };
}

/**
 * Parse back-of-pack OCR text (ingredients + nutrition).
 */
export function parseBackOcr(rawText: string): OcrBackResult {
  const lines = rawText.split("\n").map((l) => l.trim()).filter(Boolean);
  const fullText = rawText;

  // ── Ingredient list extraction ──
  const ingredientsList = extractIngredientList(fullText);
  const ingredients = splitIngredients(ingredientsList);
  const ingredientPercentages = extractPercentages(ingredientsList);

  // ── Nutrition extraction ──
  const nutritionPerServing = extractNutrition(fullText);

  // ── Allergen extraction ──
  const allergens = extractAllergens(fullText);

  return {
    ingredientsList,
    ingredients,
    ingredientPercentages,
    nutritionPerServing,
    allergens,
  };
}

function extractIngredientList(text: string): string {
  // Try to find "Ingredients:" section
  const ingMatch = text.match(/ing(?:redients?)?\s*[:；]\s*([\s\S]*?)(?=\n\s*(?:nutrition|allergen|allerg|may contain|contains|storage|best before|manufact|mfg|expir|fssai|mrp|m\.?r\.?p|net [wt|weight]|country|marketer|customer|$))/i);
  if (ingMatch) return ingMatch[1].trim();

  // Fallback: find anything after "Ingredient"
  const altMatch = text.match(/ingredients?\s*[:；]\s*(.{20,500})/i);
  if (altMatch) return altMatch[1].trim();

  // Last resort: return all text (may be imperfect)
  return text.slice(0, 1000);
}

function splitIngredients(list: string): string[] {
  // Split by commas, semicolons, periods
  const parts = list.split(/[,;.\n]+/).map((s) => s.trim()).filter((s) => s.length > 1);
  return parts;
}

function extractPercentages(text: string): Record<string, string> {
  const result: Record<string, string> = {};
  // Match patterns like "ingredient (5.2%)" or "ingredient — 0.1%" or "ingredient 5.2%"
  const re = /([A-Za-z\s]+?)\s*[\(—\-]?\s*(\d+(?:\.\d+)?)\s*%\s*[\)]?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const name = m[1].trim().toLowerCase();
    const pct = `${m[2]}%`;
    if (name.length > 1) result[name] = pct;
  }
  return result;
}

function extractNutrition(text: string): OcrBackResult["nutritionPerServing"] {
  const n = {
    servingSize: null as string | null,
    calories: null as number | null,
    protein: null as number | null,
    carbohydrates: null as number | null,
    sugars: null as number | null,
    fat: null as number | null,
    saturatedFat: null as number | null,
    transFat: null as number | null,
    fibre: null as number | null,
    sodium: null as number | null,
  };

  // Serving size
  const servMatch = text.match(/serving\s*size\s*[:；]?\s*([^\n]{2,40})/i);
  if (servMatch) n.servingSize = servMatch[1].trim();

  // Calories / Energy
  const calMatch = text.match(/(?:calori?e?s?|energy)\s*[:；]?\s*(\d+(?:\.\d+)?)\s*(?:kcal|cal|kj)?/i);
  if (calMatch) n.calories = parseFloat(calMatch[1]);

  // Protein
  const protMatch = text.match(/protein\s*[:；]?\s*(\d+(?:\.\d+)?)\s*g?/i);
  if (protMatch) n.protein = parseFloat(protMatch[1]);

  // Carbohydrates
  const carbMatch = text.match(/(?:carbohydrat?e?s?|carbs?)\s*[:；]?\s*(\d+(?:\.\d+)?)\s*g?/i);
  if (carbMatch) n.carbohydrates = parseFloat(carbMatch[1]);

  // Total sugars
  const sugMatch = text.match(/(?:total\s*)?sugars?\s*[:；]?\s*(\d+(?:\.\d+)?)\s*g?/i);
  if (sugMatch) n.sugars = parseFloat(sugMatch[1]);

  // Total fat
  const fatMatch = text.match(/(?:total\s*)?fat\s*[:；]?\s*(\d+(?:\.\d+)?)\s*g?/i);
  if (fatMatch) n.fat = parseFloat(fatMatch[1]);

  // Saturated fat
  const satMatch = text.match(/satu?rat(?:ed)?\s*fat\s*[:；]?\s*(\d+(?:\.\d+)?)\s*g?/i);
  if (satMatch) n.saturatedFat = parseFloat(satMatch[1]);

  // Trans fat
  const transMatch = text.match(/trans\s*fat\s*[:；]?\s*(\d+(?:\.\d+)?)\s*g?/i);
  if (transMatch) n.transFat = parseFloat(transMatch[1]);

  // Fibre
  const fibreMatch = text.match(/fib(?:re|er)\s*[:；]?\s*(\d+(?:\.\d+)?)\s*g?/i);
  if (fibreMatch) n.fibre = parseFloat(fibreMatch[1]);

  // Sodium
  const sodMatch = text.match(/sodium\s*[:；]?\s*(\d+(?:\.\d+)?)\s*(?:mg|g)?/i);
  if (sodMatch) {
    const val = parseFloat(sodMatch[1]);
    // If value is small (<10), it's probably grams; convert to mg
    n.sodium = val < 10 ? val * 1000 : val;
  }

  return n;
}

function extractAllergens(text: string): string[] {
  const allergens: string[] = [];

  // Look for "Contains:" or "Allergen:" declarations
  const containsMatch = text.match(/(?:contains|allergen[s]?|may contain)[:；]?\s*([^\n]{2,200})/i);
  if (containsMatch) {
    const allergenText = containsMatch[1];
    for (const ak of ALLERGEN_KEYWORDS) {
      if (new RegExp(`\\b${ak}\\b`, "i").test(allergenText)) {
        allergens.push(ak.charAt(0).toUpperCase() + ak.slice(1));
      }
    }
  }

  // Also check full text for common allergen words in ingredient context
  for (const ak of ALLERGEN_KEYWORDS) {
    if (new RegExp(`\\b${ak}\\b`, "i").test(text) && !allergens.includes(ak.charAt(0).toUpperCase() + ak.slice(1))) {
      allergens.push(ak.charAt(0).toUpperCase() + ak.slice(1));
    }
  }

  return [...new Set(allergens)];
}
