import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// --- Validators for AHAR X types ---

const confidenceValidator = v.union(
  v.literal("HIGH"),
  v.literal("MEDIUM"),
  v.literal("LOW"),
);

const sourceSideValidator = v.union(
  v.literal("FRONT"),
  v.literal("BACK"),
);

const scanStatusValidator = v.union(
  v.literal("uploading"),
  v.literal("uploaded"),
  v.literal("analyzing"),
  v.literal("completed"),
  v.literal("failed"),
);

const profileCategoryValidator = v.union(
  v.literal("general"),
  v.literal("child"),
  v.literal("fitness"),
  v.literal("weight"),
  v.literal("vegetarian"),
  v.literal("highProtein"),
);

const languageValidator = v.union(
  v.literal("en"),
  v.literal("mr"),
  v.literal("hi"),
);

const evidenceValidator = v.object({
  scanSessionId: v.string(),
  sourceSide: sourceSideValidator,
  originalText: v.string(),
  normalizedValue: v.string(),
  confidence: confidenceValidator,
});

const ingredientVerificationValidator = v.object({
  ingredient: v.string(),
  frontClaimed: v.boolean(),
  backFound: v.boolean(),
  declaredPercentage: v.optional(v.string()),
  status: v.union(
    v.literal("match_confirmed"),
    v.literal("percentage_not_stated"),
    v.literal("potential_inconsistency"),
    v.literal("insufficient_evidence"),
  ),
  confidence: confidenceValidator,
});

const nutritionDataValidator = v.object({
  servingSize: v.optional(v.string()),
  calories: v.optional(v.number()),
  protein: v.optional(v.number()),
  carbohydrates: v.optional(v.number()),
  sugars: v.optional(v.number()),
  fat: v.optional(v.number()),
  saturatedFat: v.optional(v.number()),
  transFat: v.optional(v.number()),
  fibre: v.optional(v.number()),
  sodium: v.optional(v.number()),
});

const fssaiEvaluationValidator = v.object({
  ruleId: v.string(),
  ruleName: v.string(),
  category: v.union(
    v.literal("labeling"),
    v.literal("nutrition"),
    v.literal("claims"),
    v.literal("ingredients"),
    v.literal("allergens"),
  ),
  status: v.union(
    v.literal("compliant"),
    v.literal("non_compliant"),
    v.literal("insufficient_evidence"),
  ),
  severity: v.union(
    v.literal("info"),
    v.literal("warning"),
    v.literal("violation"),
  ),
  evidence: v.string(),
  detail: v.string(),
});

const suitabilityAssessmentValidator = v.object({
  profile: profileCategoryValidator,
  status: v.union(
    v.literal("suitable"),
    v.literal("use_caution"),
    v.literal("not_recommended"),
    v.literal("insufficient_evidence"),
  ),
  reasons: v.array(v.string()),
});

const scoreFactorValidator = v.object({
  label: v.string(),
  value: v.string(),
  impact: v.union(
    v.literal("positive"),
    v.literal("negative"),
    v.literal("neutral"),
    v.literal("unavailable"),
  ),
  delta: v.number(),
});

const aharScoreValidator = v.object({
  overall: v.number(),
  factors: v.array(scoreFactorValidator),
});

const scanAnalysisValidator = v.object({
  productName: v.optional(v.string()),
  frontClaims: v.array(v.string()),
  frontHighlightedIngredients: v.array(v.string()),
  backIngredients: v.array(v.string()),
  backIngredientPercentages: v.record(v.string(), v.string()),
  allergens: v.array(v.string()),
  qualifiers: v.array(v.string()),
  footnotes: v.array(v.string()),
  vegetarianDeclaration: v.optional(v.string()),
  nutrition: nutritionDataValidator,
  ingredientVerifications: v.array(ingredientVerificationValidator),
  fssaiEvaluations: v.array(fssaiEvaluationValidator),
  suitability: v.array(suitabilityAssessmentValidator),
  aharScore: aharScoreValidator,
  simpleExplanation: v.string(),
  limitations: v.array(v.string()),
});

const userProfileValidator = v.object({
  dietaryGoal: v.string(),
  allergies: v.array(v.string()),
  maxCaloriesPerServing: v.optional(v.number()),
  avoidAddedSugar: v.boolean(),
  avoidTransFat: v.boolean(),
  preferHighFibre: v.boolean(),
});

// --- Schema ---

const schema = defineSchema(
  {
    ...authTables,

    users: defineTable({
      name: v.optional(v.string()),
      image: v.optional(v.string()),
      email: v.optional(v.string()),
      emailVerificationTime: v.optional(v.number()),
      isAnonymous: v.optional(v.boolean()),
      role: v.optional(
        v.union(v.literal("admin"), v.literal("user"), v.literal("member")),
      ),
    }).index("email", ["email"]),

    scanSessions: defineTable({
      userId: v.string(),
      frontImageId: v.string(),
      backImageId: v.string(),
      status: scanStatusValidator,
      productName: v.optional(v.string()),
      profileCategory: v.optional(profileCategoryValidator),
      language: v.optional(languageValidator),
      analysis: v.optional(scanAnalysisValidator),
      createdAt: v.number(),
      completedAt: v.optional(v.number()),
    })
      .index("by_user", ["userId"])
      .index("by_user_created", ["userId", "createdAt"]),

    scanEvidence: defineTable({
      scanSessionId: v.string(),
      evidence: v.array(evidenceValidator),
    }).index("by_session", ["scanSessionId"]),

    userProfiles: defineTable({
      userId: v.string(),
      profile: userProfileValidator,
    }).index("by_user", ["userId"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
