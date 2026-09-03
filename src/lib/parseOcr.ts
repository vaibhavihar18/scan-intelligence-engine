/**
 * Robust parsing of OCR text from food package front/back images.
 * Handles messy OCR output from tesseract.js.
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

// Common food ingredients that appear on front-of-pack
const HIGHLIGHTED_INGREDIENTS = [
  "hazelnut", "almond", "cashew", "pistachio", "peanut", "walnut",
  "saffron", "cardamom", "vanilla", "strawberry", "mango", "coconut",
  "cocoa", "chocolate", "milk", "cream", "butter", "cheese",
  "honey", "jaggery", "dates", "fig", "raisin", "cranberry",
  "soy", "wheat", "oat", "rice", "maize",
  "turmeric", "cinnamon", "ginger", "clove", "nutmeg", "pepper",
  "tomato", "onion", "garlic", "lemon", "lime", "orange", "apple",
  "banana", "pineapple", "pomegranate", "blueberry", "peach", "cherry",
  "almonds", "cashews", "pistachios", "peanuts", "walnuts", "hazelnuts",
];

// Normalize ingredient name for matching
function normalizeIngredient(name: string): string {
  return name
    .toLowerCase()
    .replace(/s$/, "") // Remove trailing 's' for plural
    .replace(/[^a-z\s]/g, "")
    .trim();
}

function wordBoundary(name: string): string {
  return `\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}s?\\b`;
}

/**
 * Parse front-of-pack OCR text.
 */
export function parseFrontOcr(rawText: string): OcrFrontResult {
  if (!rawText || rawText.trim().length === 0) {
    return { productName: null, claims: [], highlightedIngredients: [], allergens: [], otherText: [] };
  }

  const lines = rawText.split("\n").map((l) => l.trim()).filter(Boolean);
  const fullText = lines.join(" ");

  // Product name: first meaningful line(s)
  const productName = lines[0]?.trim() ?? null;

  // Detect claims using flexible patterns
  const claims: string[] = [];
  const claimPatterns: [RegExp, string][] = [
    [/high\s*protein/i, "High Protein"],
    [/low\s*sugar/i, "Low Sugar"],
    [/sugar\s*free/i, "Sugar Free"],
    [/no\s*added\s*sugar/i, "No Added Sugar"],
    [/low\s*fat/i, "Low Fat"],
    [/fat\s*free/i, "Fat Free"],
    [/high\s*fib(?:re|er)/i, "High Fibre"],
    [/source\s*of\s*protein/i, "Source of Protein"],
    [/100%?\s*natural/i, "100% Natural"],
    [/natural/i, "Natural"],
    [/pure/i, "Pure"],
    [/fresh/i, "Fresh"],
    [/authentic/i, "Authentic"],
    [/traditional/i, "Traditional"],
    [/original/i, "Original"],
    [/made\s*with/i, "Made With"],
    [/no\s*artificial/i, "No Artificial"],
    [/organic/i, "Organic"],
    [/rich\s*in/i, "Rich In"],
    [/good\s*source/i, "Good Source"],
    [/diet/i, "Diet"],
    [/light/i, "Light"],
  ];

  for (const [pat, label] of claimPatterns) {
    if (pat.test(fullText)) {
      claims.push(label);
    }
  }

  // Detect highlighted ingredients
  const highlightedIngredients: string[] = [];
  for (const ing of HIGHLIGHTED_INGREDIENTS) {
    const re = new RegExp(wordBoundary(ing), "i");
    if (re.test(fullText)) {
      const display = ing.charAt(0).toUpperCase() + ing.slice(1);
      if (!highlightedIngredients.includes(display)) {
        highlightedIngredients.push(display);
      }
    }
  }

  // Detect allergens on front
  const allergens: string[] = [];
  const allergenWords = ["milk", "dairy", "egg", "peanut", "soy", "wheat", "gluten", "nut"];
  for (const ak of allergenWords) {
    if (new RegExp(wordBoundary(ak), "i").test(fullText)) {
      const display = ak.charAt(0).toUpperCase() + ak.slice(1);
      if (!allergens.includes(display)) allergens.push(display);
    }
  }

  return {
    productName,
    claims,
    highlightedIngredients,
    allergens: [...new Set(allergens)],
    otherText: lines.slice(1),
  };
}

/**
 * Parse back-of-pack OCR text (ingredients + nutrition).
 * Much more robust than naive regex.
 */
export function parseBackOcr(rawText: string): OcrBackResult {
  if (!rawText || rawText.trim().length === 0) {
    return emptyBackResult();
  }

  const fullText = rawText;

  // Ingredient list
  const ingredientsList = extractIngredientList(fullText);
  const ingredients = splitIngredients(ingredientsList);
  const ingredientPercentages = extractPercentages(ingredientsList);

  // Nutrition
  const nutritionPerServing = extractNutrition(fullText);

  // Allergens
  const allergens = extractAllergens(fullText);

  return {
    ingredientsList,
    ingredients,
    ingredientPercentages,
    nutritionPerServing,
    allergens,
  };
}

function emptyBackResult(): OcrBackResult {
  return {
    ingredientsList: "",
    ingredients: [],
    ingredientPercentages: {},
    nutritionPerServing: {
      servingSize: null, calories: null, protein: null, carbohydrates: null,
      sugars: null, fat: null, saturatedFat: null, transFat: null, fibre: null, sodium: null,
    },
    allergens: [],
  };
}

function extractIngredientList(text: string): string {
  // Strategy 1: Find "Ingredients:" followed by text until next section
  const patterns = [
    // "Ingredients: ..." until nutrition/allergen/storage section
    /(?:ingredients?|ing)\s*[:;]\s*([\s\S]{10,2000}?)(?=\n\s*(?:nutri|allerg|allergen|may contain|contains|storage|best before|manufact|mfg|expir|fssai|mrp|m\.?r\.?p\.?|net\s*(?:wt|weight|qty)|country|marketer|customer|recip|dir|direction|warning|note|disclaim|shelf|temp|store|cod))/i,
    // Simpler: "Ingredients: ..." until newline blocks
    /(?:ingredients?|ing)\s*[:;]\s*([\s\S]{10,1500})/i,
  ];

  for (const pat of patterns) {
    const match = text.match(pat);
    if (match && match[1].trim().length > 5) {
      return match[1].trim();
    }
  }

  // Fallback: search for known ingredient keywords to find the list
  const ingKeywords = ["sugar", "salt", "oil", "flour", "milk", "cocoa", "butter", "water", "wheat", "rice"];
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const lower = lines[i].toLowerCase();
    if (ingKeywords.some((k) => lower.includes(k))) {
      // Collect consecutive lines that look like ingredients
      const collected: string[] = [];
      for (let j = i; j < Math.min(i + 10, lines.length); j++) {
        const line = lines[j].trim();
        // Stop if we hit a nutrition table or allergen section
        if (/nutri|allerg|calor|energy|serving|fssai|mrp/i.test(line)) break;
        collected.push(line);
      }
      if (collected.length > 0) return collected.join(" ");
    }
  }

  // Last resort: return first 1000 chars
  return text.slice(0, 1000);
}

function splitIngredients(list: string): string[] {
  // Split by commas, semicolons, periods, pipes
  const parts = list.split(/[,;.\n|]+/).map((s) => s.trim()).filter((s) => s.length > 1 && s.length < 100);
  return parts;
}

function extractPercentages(text: string): Record<string, string> {
  const result: Record<string, string> = {};
  // Patterns: "ingredient (5.2%)", "ingredient — 0.1%", "ingredient 5.2%"
  const patterns = [
    /([A-Za-z][A-Za-z\s]+?)\s*\((\d+(?:\.\d+)?)\s*%\)/g,
    /([A-Za-z][A-Za-z\s]+?)\s*[-—]\s*(\d+(?:\.\d+)?)\s*%/g,
    /([A-Za-z][A-Za-z\s]+?)\s+(\d+(?:\.\d+)?)\s*%/g,
  ];

  for (const pat of patterns) {
    let m: RegExpExecArray | null;
    while ((m = pat.exec(text)) !== null) {
      const name = m[1].trim().toLowerCase();
      if (name.length > 1 && name.length < 50) {
        result[name] = `${m[2]}%`;
      }
    }
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

  // Find the nutrition section
  const nutritionSection = text.match(/(?:nutrition|nutritional|nutrient)\s*(?:information|facts|data|table|content|details)?\s*[:;]?([\s\S]{50,800})/i);
  const searchArea = nutritionSection ? nutritionSection[1] : text;

  // Serving size
  const servMatch = searchArea.match(/serving\s*size\s*[:;]?\s*([^\n]{2,50})/i);
  if (servMatch) n.servingSize = servMatch[1].trim().slice(0, 50);

  // Helper: extract a number after a keyword
  function extractNum(keyword: string, unit: string = ""): number | null {
    const re = new RegExp(keyword + "\\s*[:;]?\\s*(\\d+(?:\\.\\d+)?)\\s*" + unit, "i");
    const m = searchArea.match(re);
    return m ? parseFloat(m[1]) : null;
  }

  // Energy/Calories
  const calMatch = searchArea.match(/(?:energy|calori?e?s?)\s*[:;]?\s*(\d+(?:\.\d+)?)\s*(kcal|cal|kj)?/i);
  if (calMatch) n.calories = parseFloat(calMatch[1]);

  // Protein
  n.protein = extractNum("protein");

  // Carbohydrates
  n.carbohydrates = extractNum("(?:carbohydrat?e?s?|carbs?)");

  // Sugars
  n.sugars = extractNum("(?:total\\s*)?sugars?");

  // Fat
  n.fat = extractNum("(?:total\\s*)?fat");

  // Saturated fat
  const satMatch = searchArea.match(/satu?rat(?:ed)?\s*fat\s*[:;]?\s*(\d+(?:\.\d+)?)/i);
  if (satMatch) n.saturatedFat = parseFloat(satMatch[1]);

  // Trans fat
  const transMatch = searchArea.match(/trans\s*fat\s*[:;]?\s*(\d+(?:\.\d+)?)/i);
  if (transMatch) n.transFat = parseFloat(transMatch[1]);

  // Fibre
  const fibreMatch = searchArea.match(/fib(?:re|er)\s*[:;]?\s*(\d+(?:\.\d+)?)/i);
  if (fibreMatch) n.fibre = parseFloat(fibreMatch[1]);

  // Sodium
  const sodMatch = searchArea.match(/sodium\s*[:;]?\s*(\d+(?:\.\d+)?)\s*(mg|g)?/i);
  if (sodMatch) {
    const val = parseFloat(sodMatch[1]);
    n.sodium = val < 10 ? val * 1000 : val;
  }

  // If no nutrition section found, try full text as fallback
  if (n.calories === null && n.protein === null) {
    const allCalMatch = text.match(/(?:energy|calori?e?s?)\s*[:;]?\s*(\d+(?:\.\d+)?)\s*(kcal|cal|kj)/i);
    if (allCalMatch) n.calories = parseFloat(allCalMatch[1]);

    const allProtMatch = text.match(/protein\s*[:;]?\s*(\d+(?:\.\d+)?)\s*g/i);
    if (allProtMatch) n.protein = parseFloat(allProtMatch[1]);

    const allSugMatch = text.match(/sugars?\s*[:;]?\s*(\d+(?:\.\d+)?)\s*g/i);
    if (allSugMatch) n.sugars = parseFloat(allSugMatch[1]);
  }

  return n;
}

function extractAllergens(text: string): string[] {
  const allergens: string[] = [];
  const allergenKeywords = [
    "milk", "dairy", "egg", "peanut", "peanuts", "almond", "cashew",
    "hazelnut", "walnut", "pistachio", "soy", "soya", "wheat", "gluten",
    "fish", "shellfish", "sesame", "mustard", "sulphite", "sulfite",
  ];

  // Check for "Contains:" or "Allergen:" declarations
  const declMatch = text.match(/(?:contains|allergen[s]?|may\s*contain)\s*[:;]?\s*([^\n]{2,300})/i);
  if (declMatch) {
    for (const ak of allergenKeywords) {
      if (new RegExp(wordBoundary(ak), "i").test(declMatch[1])) {
        const display = ak.charAt(0).toUpperCase() + ak.slice(1);
        if (!allergens.includes(display)) allergens.push(display);
      }
    }
  }

  // Also scan ingredient list for allergen words
  const ingMatch = text.match(/(?:ingredients?|ing)\s*[:;]\s*([\s\S]{10,1500})/i);
  if (ingMatch) {
    for (const ak of allergenKeywords) {
      if (new RegExp(wordBoundary(ak), "i").test(ingMatch[1])) {
        const display = ak.charAt(0).toUpperCase() + ak.slice(1);
        if (!allergens.includes(display)) allergens.push(display);
      }
    }
  }

  return allergens;
}

// Re-export normalizeIngredient for external use
export { normalizeIngredient };
