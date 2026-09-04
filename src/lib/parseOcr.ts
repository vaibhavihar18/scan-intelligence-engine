/**
 * Robust parsing of OCR text from food package front/back images.
 * Handles messy OCR output from tesseract.js.
 * Specifically tuned for Indian food packages with FSSAI format.
 *
 * Extracts: ingredients, nutrition, claims, MRP, dates, packaging info,
 * allergens, percentages — all from actual OCR text only.
 */

export interface OcrFrontResult {
  productName: string | null;
  brand: string | null;
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
  packaging: {
    mrp: number | null;
    netQuantity: string | null;
    netQuantityGrams: number | null;
    mfgDate: string | null;
    bestBefore: string | null;
    fssaiLicense: string | null;
    manufacturer: string | null;
    batchNumber: string | null;
    vegetarianMark: "veg" | "non_veg" | null;
    warnings: string[];
    servingSizeGrams: number | null;
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

function wordBoundary(name: string): string {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return `\\b${escaped}s?\\b`;
}

/**
 * Parse front-of-pack OCR text.
 */
export function parseFrontOcr(rawText: string): OcrFrontResult {
  if (!rawText || rawText.trim().length === 0) {
    return { productName: null, brand: null, claims: [], highlightedIngredients: [], allergens: [], otherText: [] };
  }

  const lines = rawText.split("\n").map((l) => l.trim()).filter(Boolean);
  const fullText = lines.join(" ");

  // Product name: first meaningful line(s)
  let productName: string | null = null;
  let brand: string | null = null;
  for (const line of lines.slice(0, 5)) {
    if (line.length > 2 && !/^\d+$/.test(line)) {
      if (!productName) productName = line;
      else if (!brand) { brand = line; break; }
    }
  }

  // Detect claims
  const claims: string[] = [];
  const claimPatterns: [RegExp, string][] = [
    [/high\s*protein/i, "High Protein"], [/low\s*sugar/i, "Low Sugar"],
    [/sugar\s*free/i, "Sugar Free"], [/no\s*added\s*sugar/i, "No Added Sugar"],
    [/low\s*fat/i, "Low Fat"], [/fat\s*free/i, "Fat Free"],
    [/high\s*fib(?:re|er)/i, "High Fibre"], [/source\s*of\s*protein/i, "Source of Protein"],
    [/100%?\s*natural/i, "100% Natural"], [/\bnatural\b/i, "Natural"],
    [/\bpure\b/i, "Pure"], [/\bfresh\b/i, "Fresh"], [/\bauthentic\b/i, "Authentic"],
    [/\btraditional\b/i, "Traditional"], [/\boriginal\b/i, "Original"],
    [/made\s*with/i, "Made With"], [/no\s*artificial/i, "No Artificial"],
    [/\borganic\b/i, "Organic"], [/rich\s*in/i, "Rich In"],
    [/good\s*source/i, "Good Source"], [/\bdiet\b/i, "Diet"],
    [/\blight\b/i, "Light"], [/\breal\b/i, "Real"],
    [/\bpremium\b/i, "Premium"], [/\bspecial\b/i, "Special"],
    [/\bextra\b/i, "Extra"], [/wholesome/i, "Wholesome"],
    [/nutritious/i, "Nutritious"], [/enriched/i, "Enriched"],
    [/fortified/i, "Fortified"], [/creamy/i, "Creamy"],
    [/crispy/i, "Crispy"], [/roasted/i, "Roasted"],
  ];

  for (const [pat, label] of claimPatterns) {
    if (pat.test(fullText)) claims.push(label);
  }

  // Detect highlighted ingredients
  const highlightedIngredients: string[] = [];
  for (const ing of HIGHLIGHTED_INGREDIENTS) {
    const re = new RegExp(wordBoundary(ing), "i");
    if (re.test(fullText)) {
      const display = ing.replace(/s$/, "");
      const capitalized = display.charAt(0).toUpperCase() + display.slice(1);
      if (!highlightedIngredients.includes(capitalized)) highlightedIngredients.push(capitalized);
    }
  }

  // Detect allergens on front
  const allergens: string[] = [];
  const allergenWords = ["milk", "dairy", "egg", "peanut", "soy", "wheat", "gluten", "nut", "almond", "cashew", "hazelnut", "pistachio"];
  for (const ak of allergenWords) {
    if (new RegExp(wordBoundary(ak), "i").test(fullText)) {
      const display = ak.charAt(0).toUpperCase() + ak.slice(1);
      if (!allergens.includes(display)) allergens.push(display);
    }
  }

  return {
    productName,
    brand,
    claims,
    highlightedIngredients: [...new Set(highlightedIngredients)],
    allergens: [...new Set(allergens)],
    otherText: lines.slice(1),
  };
}

/**
 * Parse back-of-pack OCR text (ingredients + nutrition + packaging).
 */
export function parseBackOcr(rawText: string): OcrBackResult {
  if (!rawText || rawText.trim().length === 0) {
    return emptyBackResult();
  }

  const fullText = rawText;
  const ingredientsList = extractIngredientList(fullText);
  const ingredients = splitIngredients(ingredientsList);
  const ingredientPercentages = extractPercentages(fullText);
  const nutritionPerServing = extractNutrition(fullText);
  const packaging = extractPackaging(fullText, ingredients);
  const allergens = extractAllergens(fullText);

  return { ingredientsList, ingredients, ingredientPercentages, nutritionPerServing, packaging, allergens };
}

function emptyBackResult(): OcrBackResult {
  return {
    ingredientsList: "", ingredients: [], ingredientPercentages: {},
    nutritionPerServing: {
      servingSize: null, calories: null, protein: null, carbohydrates: null,
      sugars: null, fat: null, saturatedFat: null, transFat: null, fibre: null, sodium: null,
    },
    packaging: {
      mrp: null, netQuantity: null, netQuantityGrams: null, mfgDate: null,
      bestBefore: null, fssaiLicense: null, manufacturer: null, batchNumber: null,
      vegetarianMark: null, warnings: [], servingSizeGrams: null,
    },
    allergens: [],
  };
}

function extractIngredientList(text: string): string {
  const patterns = [
    /(?:ingredients?|ingr?\.?)\s*[:;]\s*([\s\S]{10,2000}?)(?=\n\s*(?:nutri|allerg|allergen|may contain|contains|storage|best before|manufact|mfg|expir|fssai|mrp|m\.?r\.?p\.?|net\s*(?:wt|weight|qty)|country|marketer|customer|recip|dir|direction|warning|note|disclaim|shelf|temp|store|cod))/i,
    /(?:ingredients?|ingr?\.?)\s*[:;]\s*([\s\S]{10,1500})/i,
  ];

  for (const pat of patterns) {
    const match = text.match(pat);
    if (match && match[1].trim().length > 5) return match[1].trim();
  }

  const ingKeywords = ["sugar", "salt", "oil", "flour", "milk", "cocoa", "butter", "water", "wheat", "rice", "maize", "corn", "solids", "fat", "emulsifier", "flavour", "flavor", "lecithin", "starch", "vanilla", "chocolate", "cream", "honey", "jaggery"];
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const lower = lines[i].toLowerCase();
    if (ingKeywords.some((k) => lower.includes(k))) {
      const collected: string[] = [];
      for (let j = Math.max(0, i - 1); j < Math.min(i + 12, lines.length); j++) {
        const line = lines[j].trim();
        if (/nutri|allerg|calor|energy|serving|fssai|mrp/i.test(line)) break;
        collected.push(line);
      }
      if (collected.length > 0) return collected.join(" ");
    }
  }

  return text.slice(0, 2000);
}

function splitIngredients(list: string): string[] {
  return list
    .split(/[,;|\n]+|(?:\.\s+(?=[A-Z]))/)
    .map((s) => s.replace(/\.\s*$/, "").trim())
    .filter((s) => s.length > 1 && s.length < 100);
}

function extractPercentages(text: string): Record<string, string> {
  const result: Record<string, string> = {};
  const patterns = [
    /([A-Za-z][A-Za-z\s]+?)\s*\((\d+(?:\.\d+)?)\s*%\)/g,
    /([A-Za-z][A-Za-z\s]+?)\s*[-—]\s*(\d+(?:\.\d+)?)\s*%/g,
    /([A-Za-z][A-Za-z\s]+?)\s+(\d+(?:\.\d+)?)\s*%/g,
  ];
  for (const pat of patterns) {
    let m: RegExpExecArray | null;
    while ((m = pat.exec(text)) !== null) {
      const name = m[1].trim().toLowerCase();
      if (name.length > 1 && name.length < 50) result[name] = `${m[2]}%`;
    }
  }
  return result;
}

function extractNutrition(text: string): OcrBackResult["nutritionPerServing"] {
  const n = {
    servingSize: null as string | null, calories: null as number | null,
    protein: null as number | null, carbohydrates: null as number | null,
    sugars: null as number | null, fat: null as number | null,
    saturatedFat: null as number | null, transFat: null as number | null,
    fibre: null as number | null, sodium: null as number | null,
  };

  const nutritionSection = text.match(
    /(?:nutrition|nutritional|nutrient)\s*(?:information|facts|data|table|content|details)?\s*[:;]?([\s\S]{50,1500})/i
  );
  const searchArea = nutritionSection ? nutritionSection[1] : text;
  const fullSearch = text;

  const servMatch = searchArea.match(/serving\s*size\s*[:;]?\s*([^\n]{2,50})/i) || fullSearch.match(/serving\s*size\s*[:;]?\s*([^\n]{2,50})/i);
  if (servMatch) n.servingSize = servMatch[1].trim().slice(0, 50);

  function extractNum(area: string, ...keywords: string[]): number | null {
    for (const kw of keywords) {
      const re = new RegExp(kw + "\\s*[:;]?\\s*(\\d+(?:\\.\\d+)?)\\s*(g|mg|kcal|cal|kj)?", "i");
      const m = area.match(re);
      if (m) {
        const val = parseFloat(m[1]);
        if (m[2]?.toLowerCase() === "g" && kw.includes("sodium") && val < 5) return val * 1000;
        return val;
      }
    }
    return null;
  }

  const calMatch = searchArea.match(/(?:energy|calori?e?s?|cal)\s*[:;]?\s*(\d+(?:\.\d+)?)\s*(kcal|cal|kj|kilojoule)?/i)
    || fullSearch.match(/(?:energy|calori?e?s?|cal)\s*[:;]?\s*(\d+(?:\.\d+)?)\s*(kcal|cal|kj)?/i);
  if (calMatch) n.calories = parseFloat(calMatch[1]);

  n.protein = extractNum(searchArea, "protein") ?? extractNum(fullSearch, "protein");
  n.carbohydrates = extractNum(searchArea, "carbohydrat?e?s?", "carbs?", "total carbohydrate") ?? extractNum(fullSearch, "carbohydrat?e?s?", "carbs?");
  n.sugars = extractNum(searchArea, "total\\s*sugars?", "sugars?") ?? extractNum(fullSearch, "total\\s*sugars?", "sugars?");
  n.fat = extractNum(searchArea, "total\\s*fat", "fat\\s*content", "fat") ?? extractNum(fullSearch, "total\\s*fat", "fat");

  const satMatch = searchArea.match(/satu?rat(?:ed)?\s*fat\s*[:;]?\s*(\d+(?:\.\d+)?)/i) || fullSearch.match(/satu?rat(?:ed)?\s*fat\s*[:;]?\s*(\d+(?:\.\d+)?)/i);
  if (satMatch) n.saturatedFat = parseFloat(satMatch[1]);

  const transMatch = searchArea.match(/trans\s*fat\s*[:;]?\s*(\d+(?:\.\d+)?)/i) || fullSearch.match(/trans\s*fat\s*[:;]?\s*(\d+(?:\.\d+)?)/i);
  if (transMatch) n.transFat = parseFloat(transMatch[1]);

  const fibreMatch = searchArea.match(/fib(?:re|er)\s*[:;]?\s*(\d+(?:\.\d+)?)/i) || fullSearch.match(/fib(?:re|er)\s*[:;]?\s*(\d+(?:\.\d+)?)/i);
  if (fibreMatch) n.fibre = parseFloat(fibreMatch[1]);

  n.sodium = extractNum(searchArea, "sodium") ?? extractNum(fullSearch, "sodium");

  return n;
}

/**
 * Extract packaging information from back label OCR text.
 * Handles Indian food package formats with MRP, dates, FSSAI, etc.
 */
function extractPackaging(
  text: string,
  _ingredients: string[],
): OcrBackResult["packaging"] {
  const pkg: OcrBackResult["packaging"] = {
    mrp: null, netQuantity: null, netQuantityGrams: null, mfgDate: null,
    bestBefore: null, fssaiLicense: null, manufacturer: null, batchNumber: null,
    vegetarianMark: null, warnings: [], servingSizeGrams: null,
  };

  // MRP extraction
  const mrpMatch = text.match(/(?:mrp|m\.r\.p\.?|maximum\s*retail\s*price)\s*[:;]?\s*(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)/i);
  if (mrpMatch) pkg.mrp = parseFloat(mrpMatch[1]);

  // Net quantity
  const netQtyMatch = text.match(/(?:net\s*(?:wt|weight|qty|quantity|contents?))\s*[:;]?\s*([^\n]{2,30})/i);
  if (netQtyMatch) {
    pkg.netQuantity = netQtyMatch[1].trim();
    // Try to extract grams
    const gramsMatch = pkg.netQuantity.match(/(\d+(?:\.\d+)?)\s*(?:g|gm|grams?)/i);
    if (gramsMatch) pkg.netQuantityGrams = parseFloat(gramsMatch[1]);
    else {
      const kgMatch = pkg.netQuantity.match(/(\d+(?:\.\d+)?)\s*kg/i);
      if (kgMatch) pkg.netQuantityGrams = parseFloat(kgMatch[1]) * 1000;
      else {
        const mlMatch = pkg.netQuantity.match(/(\d+(?:\.\d+)?)\s*(?:ml|mlt)/i);
        if (mlMatch) pkg.netQuantityGrams = parseFloat(mlMatch[1]); // 1ml ≈ 1g approx
      }
    }
  }

  // Manufacturing date
  const mfgMatch = text.match(/(?:mfg|mfd|manufact(?:ured|ing)\s*date|date\s*of\s*manufact)\s*[:;]?\s*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/i)
    || text.match(/(?:mfg|mfd|manufact)\s*[:;]?\s*(\d{1,2}\s+\w+\s+\d{2,4})/i);
  if (mfgMatch) pkg.mfgDate = mfgMatch[1];

  // Best before / expiry
  const bbMatch = text.match(/(?:best\s*before|bb|use\s*by|expiry|exp\.?)\s*[:;]?\s*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/i)
    || text.match(/(?:best\s*before|bb|use\s*by|expiry|exp\.?)\s*[:;]?\s*(?:\d+\s*(?:months?|days?|years?)\s*(?:from\s*(?:mfg|date))?)?\s*(\d{1,2}\s+\w+\s+\d{2,4})/i);
  if (bbMatch) pkg.bestBefore = bbMatch[1];

  // FSSAI license
  const fssaiMatch = text.match(/fssai\s*(?:license|lic\.?|no\.?|number)?\s*[:;]?\s*(\d{10,14})/i)
    || text.match(/(\d{14})/); // 14-digit FSSAI number
  if (fssaiMatch) pkg.fssaiLicense = fssaiMatch[1];

  // Batch number
  const batchMatch = text.match(/(?:batch|lot|bn|b\.?no\.?)\s*[:;]?\s*([A-Z0-9\-\/]{2,20})/i);
  if (batchMatch) pkg.batchNumber = batchMatch[1];

  // Manufacturer
  const mfgByMatch = text.match(/(?:m(?:anufac)?t(?:ured)?\.?\s*(?:by|at|for)|packed\s*by|marketed\s*by)\s*[:;]?\s*([^\n]{5,100})/i);
  if (mfgByMatch) pkg.manufacturer = mfgByMatch[1].trim().slice(0, 100);

  // Vegetarian mark (green dot = veg, brown/red = non-veg)
  if (/(?:green\s*dot|🟢|veg(?:etarian)?\s*(?:mark|symbol))/i.test(text)) {
    pkg.vegetarianMark = "veg";
  } else if (/(?:brown\s*dot|red\s*dot|🔴|non[\s-]*veg(?:etarian)?\s*(?:mark|symbol))/i.test(text)) {
    pkg.vegetarianMark = "non_veg";
  }

  // Warnings
  const warningPatterns = [
    /(?:warning|caution|note|disclaimer)\s*[:;]?\s*([^\n]{5,200})/gi,
    /(?:not\s*suitable|avoid|excess|limit)\s+([^\n]{5,100})/gi,
  ];
  for (const pat of warningPatterns) {
    let m: RegExpExecArray | null;
    while ((m = pat.exec(text)) !== null) {
      const w = m[1].trim();
      if (w.length > 5 && !pkg.warnings.includes(w)) pkg.warnings.push(w);
    }
  }

  // Serving size grams (from nutrition table)
  const servingGramsMatch = text.match(/serving\s*size\s*[:;]?\s*(\d+(?:\.\d+)?)\s*(?:g|gm|grams?)/i);
  if (servingGramsMatch) pkg.servingSizeGrams = parseFloat(servingGramsMatch[1]);

  return pkg;
}

function extractAllergens(text: string): string[] {
  const allergens: string[] = [];
  const allergenKeywords = [
    "milk", "dairy", "egg", "peanut", "peanuts", "almond", "cashew",
    "hazelnut", "hazelnuts", "walnut", "pistachio", "soy", "soya",
    "wheat", "gluten", "fish", "shellfish", "sesame", "mustard",
    "sulphite", "sulfite", "lupin", "celery",
  ];

  const declMatch = text.match(/(?:contains|allergen[s]?|may\s*contain)\s*[:;]?\s*([^\n]{2,300})/i);
  if (declMatch) {
    for (const ak of allergenKeywords) {
      if (new RegExp(wordBoundary(ak), "i").test(declMatch[1])) {
        const display = ak.charAt(0).toUpperCase() + ak.slice(1);
        if (!allergens.includes(display)) allergens.push(display);
      }
    }
  }

  const ingMatch = text.match(/(?:ingredients?|ingr?\.?)\s*[:;]\s*([\s\S]{10,1500})/i);
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

export { extractPackaging };
