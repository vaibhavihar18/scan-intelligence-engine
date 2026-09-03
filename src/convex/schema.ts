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

const aharScoreValidator = v.object({
  overall: v.number(),
  labelTransparency: v.number(),
  nutritionQuality: v.number(),
  ingredientIntegrity: v.number(),
  claimAccuracy: v.number(),
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
  nutrition: nutritionDataValidator,
  ingredientVerifications: v.array(ingredientVerificationValidator),
  fssaiEvaluations: v.array(fssaiEvaluationValidator),
  aharScore: aharScoreValidator,
  report: v.string(),
});

const dietaryGoalValidator = v.union(
  v.literal("general_healthy"),
  v.literal("weight_loss"),
  v.literal("weight_gain"),
  v.literal("diabetic"),
  v.literal("heart_healthy"),
  v.literal("high_protein"),
  v.literal("low_sodium"),
  v.literal("child_friendly"),
);

const userProfileValidator = v.object({
  dietaryGoal: dietaryGoalValidator,
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
