// AHAR X — Food Label Intelligence System Types
// Every scan is evidence-first: results come from uploaded package images only.

export type Confidence = "HIGH" | "MEDIUM" | "LOW";

export type SourceSide = "FRONT" | "BACK";

export type ScanStatus =
  | "uploading"
  | "uploaded"
  | "analyzing"
  | "completed"
  | "failed";

export type ProfileCategory =
  | "general"
  | "child"
  | "fitness"
  | "weight"
  | "vegetarian"
  | "highProtein";

export type LanguageCode = "en" | "mr" | "hi";

// --- Evidence provenance ---

export interface Evidence {
  scanSessionId: string;
  sourceSide: SourceSide;
  originalText: string;
  normalizedValue: string;
  confidence: Confidence;
}

// --- Front ↔ Back ingredient verification ---

export interface IngredientVerification {
  ingredient: string;
  frontClaimed: boolean;
  backFound: boolean;
  declaredPercentage: string | null;
  status:
    | "match_confirmed"
    | "percentage_not_stated"
    | "potential_inconsistency"
    | "insufficient_evidence";
  confidence: Confidence;
}

// --- Nutrition values (from label extraction) ---

export interface NutritionData {
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
}

// --- FSSAI rule evaluation result ---

export interface FSSAIEvaluation {
  ruleId: string;
  ruleName: string;
  category:
    | "labeling"
    | "nutrition"
    | "claims"
    | "ingredients"
    | "allergens";
  status: "compliant" | "non_compliant" | "insufficient_evidence";
  severity: "info" | "warning" | "violation";
  evidence: string;
  detail: string;
}

// --- Profile suitability assessment ---

export interface SuitabilityAssessment {
  profile: ProfileCategory;
  status: "suitable" | "use_caution" | "not_recommended" | "insufficient_evidence";
  reasons: string[];
}

// --- AHAR X Score (5-point scale) ---

export interface AharScore {
  overall: number; // 0-10, one decimal
  factors: ScoreFactor[];
}

export interface ScoreFactor {
  label: string;
  value: string;
  impact: "positive" | "negative" | "neutral" | "unavailable";
  delta: number;
}

// --- Complete analysis result for a scan session ---

export interface ScanAnalysis {
  productName: string | null;
  frontClaims: string[];
  frontHighlightedIngredients: string[];
  backIngredients: string[];
  backIngredientPercentages: Record<string, string>;
  allergens: string[];
  qualifiers: string[];
  footnotes: string[];
  vegetarianDeclaration: string | null;
  nutrition: NutritionData;
  ingredientVerifications: IngredientVerification[];
  fssaiEvaluations: FSSAIEvaluation[];
  suitability: SuitabilityAssessment[];
  aharScore: AharScore;
  simpleExplanation: string;
  limitations: string[];
}

// --- User profile for personalized scoring ---

export interface UserProfile {
  dietaryGoal: string;
  allergies: string[];
  maxCaloriesPerServing: number | null;
  avoidAddedSugar: boolean;
  avoidTransFat: boolean;
  preferHighFibre: boolean;
}

// --- Scan session (what gets stored in Convex) ---

export interface ScanSession {
  _id: string;
  userId: string;
  frontImageId: string;
  backImageId: string;
  status: ScanStatus;
  productName: string | null;
  profileCategory: ProfileCategory | null;
  language: LanguageCode;
  analysis: ScanAnalysis | null;
  createdAt: number;
  completedAt: number | null;
}
