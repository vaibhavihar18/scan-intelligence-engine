/**
 * Robust parsing of OCR text from food package front/back images.
 * Handles messy OCR output from tesseract.js.
 * Specifically tuned for Indian food packages with FSSAI format.
 *
 * The key improvement: multiple extraction strategies with fallbacks,
 * and fuzzy ingredient matching for front↔back verification.
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

// Common food ingredients/words that appear prominently on front-of-pack
const HIGHLIGHTED_INGREDIENTS = [
  "hazelnut", "hazelnuts", "hazel nut",
  "almond", "almonds",
  "cashew", "cashews",
  "pistachio", "pistachios",
  "peanut", "peanuts",
  "walnut", "walnuts",
  "saffron", "cardamom", "vanilla",
  "strawberry", "mango", "coconut",
  "cocoa", "chocolate", "milk", "cream", "butter", "cheese",
  "honey", "jaggery", "dates", "raisin", "cranberry",
  "soy", "wheat", "oat", "rice", "maize", "corn",
  "turmeric", "cinnamon", "ginger", "clove", "nutmeg", "pepper",
  "tomato", "onion", "garlic", "lemon", "lime", "orange", "apple",
  "banana", "pineapple", "pomegranate", "blueberry", "peach", "cherry",
  "protein", "fibre", "fiber",
  "flavour", "flavor",
];

/**
 * Normalize ingredient name for matching.
 */
function normalizeIngredient(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function wordBoundary(name: string): string {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return `\\b${escaped}s?\\b`;
}

/**
 * Parse front-of-pack OCR text.
 * Multiple strategies to catch all visible text.
 */
export function parseFrontOcr(rawText: string): OcrFrontResult {
  if (!rawText || rawText.trim().length === 0) {
    return {
      productName: null,
      claims: [],
      highlightedIngredients: [],
      allergens: [],
      otherText: [],
    };
  }

  const lines = rawText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const fullText = lines.join(" ");

  // Product name: first meaningful line(s) — skip very short/noise lines
  let productName: string | null = null;
  for (const line of lines.slice(0, 5)) {
    if (line.length > 2 && !/^\d+$/.test(line)) {
      productName = line;
      break;
    }
  }

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
    [/\bnatural\b/i, "Natural"],
    [/\bpure\b/i, "Pure"],
    [/\bfresh\b/i, "Fresh"],
    [/\bauthentic\b/i, "Authentic"],
    [/\btraditional\b/i, "Traditional"],
    [/\boriginal\b/i, "Original"],
    [/made\s*with/i, "Made With"],
    [/no\s*artificial/i, "No Artificial"],
    [/\borganic\b/i, "Organic"],
    [/rich\s*in/i, "Rich In"],
    [/good\s*source/i, "Good Source"],
    [/\bdiet\b/i, "Diet"],
    [/\blight\b/i, "Light"],
    [/\bnew\b/i, "New"],
    [/\breal\b/i, "Real"],
    [/\bpremium\b/i, "Premium"],
    [/\bspecial\b/i, "Special"],
    [/\bextra\b/i, "Extra"],
    [/wholesome/i, "Wholesome"],
    [/nutritious/i, "Nutritious"],
    [/daily/i, "Daily"],
    [/complete/i, "Complete"],
    [/enriched/i, "Enriched"],
    [/fortified/i, "Fortified"],
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
      // Use the clean singular form for matching
      const display = ing.replace(/s$/, "");
      const capitalized =
        display.charAt(0).toUpperCase() + display.slice(1);
      if (!highlightedIngredients.includes(capitalized)) {
        highlightedIngredients.push(capitalized);
      }
    }
  }

  // Detect allergens on front
  const allergens: string[] = [];
  const allergenWords = [
    "milk", "dairy", "egg", "peanut", "soy", "wheat", "gluten",
    "nut", "almond", "cashew", "hazelnut", "pistachio",
  ];
  for (const ak of allergenWords) {
    if (new RegExp(wordBoundary(ak), "i").test(fullText)) {
      const display = ak.charAt(0).toUpperCase() + ak.slice(1);
      if (!allergens.includes(display)) allergens.push(display);
    }
  }

  return {
    productName,
    claims,
    highlightedIngredients: [...new Set(highlightedIngredients)],
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
  const ingredientPercentages = extractPercentages(fullText);

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
      servingSize: null,
      calories: null,
      protein: null,
      carbohydrates: null,
      sugars: null,
      fat: null,
      saturatedFat: null,
      transFat: null,
      fibre: null,
      sodium: null,
    },
    allergens: [],
  };
}

function extractIngredientList(text: string): string {
  // Strategy 1: Find "Ingredients:" followed by text until next section
  const patterns = [
    // "Ingredients: ..." until nutrition/allergen/storage section
    /(?:ingredients?|ingr?\.?)\s*[:;]\s*([\s\S]{10,2000}?)(?=\n\s*(?:nutri|allerg|allergen|may contain|contains|storage|best before|manufact|mfg|expir|fssai|mrp|m\.?r\.?p\.?|net\s*(?:wt|weight|qty)|country|marketer|customer|recip|dir|direction|warning|note|disclaim|shelf|temp|store|cod))/i,
    // Simpler: "Ingredients: ..."
    /(?:ingredients?|ingr?\.?)\s*[:;]\s*([\s\S]{10,1500})/i,
  ];

  for (const pat of patterns) {
    const match = text.match(pat);
    if (match && match[1].trim().length > 5) {
      return match[1].trim();
    }
  }

  // Fallback: look for ingredient-like content
  const ingKeywords = [
    "sugar", "salt", "oil", "flour", "milk", "cocoa", "butter",
    "water", "wheat", "rice", "maize", "corn", "solids", "fat",
    "emulsifier", "flavour", "flavor", "lecithin", "starch",
    "vanilla", "chocolate", "cream", "honey", "jaggery",
  ];

  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const lower = lines[i].toLowerCase();
    if (ingKeywords.some((k) => lower.includes(k))) {
      const collected: string[] = [];
      for (let j = Math.max(0, i - 1); j < Math.min(i + 12, lines.length); j++) {
        const line = lines[j].trim();
        // Stop if we hit a nutrition table or allergen section
        if (/nutri|allerg|calor|energy|serving|fssai|mrp/i.test(line)) break;
        collected.push(line);
      }
      if (collected.length > 0) return collected.join(" ");
    }
  }

  // Last resort: return a larger portion of the text
  return text.slice(0, 2000);
}

function splitIngredients(list: string): string[] {
  // Split by commas, semicolons, pipes, line breaks — NOT periods
  // (periods often appear within ingredient text, e.g. "Vit. A")
  // But DO split on periods followed by a space+uppercase (sentence boundary)
  const parts = list
    .split(/[,;|\n]+|(?:\.\s+(?=[A-Z]))/)
    .map((s) => s.replace(/\.\s*$/, "").trim()) // strip trailing periods
    .filter((s) => s.length > 1 && s.length < 100);
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

function extractNutrition(
  text: string
): OcrBackResult["nutritionPerServing"] {
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
  const nutritionSection = text.match(
    /(?:nutrition|nutritional|nutrient)\s*(?:information|facts|data|table|content|details)?\s*[:;]?([\s\S]{50,1500})/i
  );
  const searchArea = nutritionSection ? nutritionSection[1] : text;

  // Also try full text as backup
  const fullSearch = text;

  // Serving size
  const servMatch =
    searchArea.match(/serving\s*size\s*[:;]?\s*([^\n]{2,50})/i) ||
    fullSearch.match(/serving\s*size\s*[:;]?\s*([^\n]{2,50})/i);
  if (servMatch) n.servingSize = servMatch[1].trim().slice(0, 50);

  // Helper: extract a number after a keyword
  function extractNum(area: string, ...keywords: string[]): number | null {
    for (const kw of keywords) {
      const re = new RegExp(
        kw + "\\s*[:;]?\\s*(\\d+(?:\\.\\d+)?)\\s*(g|mg|kcal|cal|kj)?",
        "i"
      );
      const m = area.match(re);
      if (m) {
        const val = parseFloat(m[1]);
        // If unit is g but value seems like mg (sodium), adjust
        if (m[2]?.toLowerCase() === "g" && kw.includes("sodium") && val < 5) {
          return val * 1000;
        }
        return val;
      }
    }
    return null;
  }

  // Energy/Calories — try multiple patterns
  const calMatch =
    searchArea.match(
      /(?:energy|calori?e?s?|cal)\s*[:;]?\s*(\d+(?:\.\d+)?)\s*(kcal|cal|kj|kilojoule)?/i
    ) ||
    fullSearch.match(
      /(?:energy|calori?e?s?|cal)\s*[:;]?\s*(\d+(?:\.\d+)?)\s*(kcal|cal|kj)?/i
    );
  if (calMatch) n.calories = parseFloat(calMatch[1]);

  // Protein
  n.protein = extractNum(searchArea, "protein") ?? extractNum(fullSearch, "protein");

  // Carbohydrates
  n.carbohydrates =
    extractNum(searchArea, "carbohydrat?e?s?", "carbs?", "total carbohydrate") ??
    extractNum(fullSearch, "carbohydrat?e?s?", "carbs?");

  // Sugars — try "total sugar", "sugar", "total sugars"
  n.sugars =
    extractNum(searchArea, "total\\s*sugars?", "sugars?") ??
    extractNum(fullSearch, "total\\s*sugars?", "sugars?");

  // Fat
  n.fat =
    extractNum(searchArea, "total\\s*fat", "fat\\s*content", "fat") ??
    extractNum(fullSearch, "total\\s*fat", "fat");

  // Saturated fat
  const satMatch =
    searchArea.match(/satu?rat(?:ed)?\s*fat\s*[:;]?\s*(\d+(?:\.\d+)?)/i) ||
    fullSearch.match(/satu?rat(?:ed)?\s*fat\s*[:;]?\s*(\d+(?:\.\d+)?)/i);
  if (satMatch) n.saturatedFat = parseFloat(satMatch[1]);

  // Trans fat
  const transMatch =
    searchArea.match(/trans\s*fat\s*[:;]?\s*(\d+(?:\.\d+)?)/i) ||
    fullSearch.match(/trans\s*fat\s*[:;]?\s*(\d+(?:\.\d+)?)/i);
  if (transMatch) n.transFat = parseFloat(transMatch[1]);

  // Fibre
  const fibreMatch =
    searchArea.match(/fib(?:re|er)\s*[:;]?\s*(\d+(?:\.\d+)?)/i) ||
    fullSearch.match(/fib(?:re|er)\s*[:;]?\s*(\d+(?:\.\d+)?)/i);
  if (fibreMatch) n.fibre = parseFloat(fibreMatch[1]);

  // Sodium
  n.sodium =
    extractNum(searchArea, "sodium") ?? extractNum(fullSearch, "sodium");

  return n;
}

function extractAllergens(text: string): string[] {
  const allergens: string[] = [];
  const allergenKeywords = [
    "milk", "dairy", "egg", "peanut", "peanuts", "almond", "cashew",
    "hazelnut", "hazelnuts", "walnut", "pistachio", "soy", "soya",
    "wheat", "gluten", "fish", "shellfish", "sesame", "mustard",
    "sulphite", "sulfite", "lupin", "celery",
  ];

  // Check for "Contains:" or "Allergen:" declarations
  const declMatch = text.match(
    /(?:contains|allergen[s]?|may\s*contain)\s*[:;]?\s*([^\n]{2,300})/i
  );
  if (declMatch) {
    for (const ak of allergenKeywords) {
      if (new RegExp(wordBoundary(ak), "i").test(declMatch[1])) {
        const display = ak.charAt(0).toUpperCase() + ak.slice(1);
        if (!allergens.includes(display)) allergens.push(display);
      }
    }
  }

  // Also scan ingredient list for allergen words
  const ingMatch = text.match(
    /(?:ingredients?|ingr?\.?)\s*[:;]\s*([\s\S]{10,1500})/i
  );
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
