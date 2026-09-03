import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import {
  verifyIngredients,
  evaluateFSSAIRules,
  calculateAharScore,
  generateReport,
  type NutritionData,
} from "./scoring";

type AiResult = {
  frontAnalysis: {
    productName: string | null;
    claims: string[];
    highlightedIngredients: string[];
    allergens: string[];
    otherText: string[];
  };
  backAnalysis: {
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
    qualifiers: string[];
    footnotes: string[];
    regulatoryInfo: Record<string, string | null>;
  };
  extractionConfidence: {
    frontOverall: "HIGH" | "MEDIUM" | "LOW";
    backOverall: "HIGH" | "MEDIUM" | "LOW";
  };
};

// Orchestrates the full scan pipeline for a session
export const runFullScan = action({
  args: {
    docId: v.id("scanSessions"),
    scanSessionId: v.string(),
    frontImageUrl: v.string(),
    backImageUrl: v.string(),
  },
  handler: async (ctx, args): Promise<Record<string, unknown>> => {
    // 1. Update status to analyzing
    await ctx.runMutation(api.scanSessions.updateStatus, {
      docId: args.docId,
      status: "analyzing",
    });

    try {
      // 2. Run AI vision analysis
      const aiResult: AiResult = await ctx.runAction(
        api.analyzeLabel.analyzeImages,
        {
          frontImageUrl: args.frontImageUrl,
          backImageUrl: args.backImageUrl,
          scanSessionId: args.scanSessionId,
        },
      );

      const front: AiResult["frontAnalysis"] = aiResult.frontAnalysis;
      const back: AiResult["backAnalysis"] = aiResult.backAnalysis;
      const confidence: AiResult["extractionConfidence"] =
        aiResult.extractionConfidence;

      // 3. Build nutrition data from extracted evidence
      const nutrition: NutritionData = {
        servingSize: back.nutritionPerServing?.servingSize ?? null,
        calories: back.nutritionPerServing?.calories ?? null,
        protein: back.nutritionPerServing?.protein ?? null,
        carbohydrates: back.nutritionPerServing?.carbohydrates ?? null,
        sugars: back.nutritionPerServing?.sugars ?? null,
        fat: back.nutritionPerServing?.fat ?? null,
        saturatedFat: back.nutritionPerServing?.saturatedFat ?? null,
        transFat: back.nutritionPerServing?.transFat ?? null,
        fibre: back.nutritionPerServing?.fibre ?? null,
        sodium: back.nutritionPerServing?.sodium ?? null,
      };

      // 4. Verify front ↔ back ingredients
      const ingredientVerifications = verifyIngredients(
        front.highlightedIngredients ?? [],
        back.ingredients ?? [],
        back.ingredientPercentages ?? {},
        confidence.frontOverall,
        confidence.backOverall,
      );

      // 5. Run FSSAI rule engine
      const fssaiEvaluations = evaluateFSSAIRules(
        front.claims ?? [],
        front.highlightedIngredients ?? [],
        back.ingredients ?? [],
        back.ingredientPercentages ?? {},
        nutrition,
        [
          ...(front.allergens ?? []),
          ...(back.allergens ?? []),
        ],
        back.qualifiers ?? [],
        confidence.frontOverall,
        confidence.backOverall,
      );

      // 6. Calculate AHAR X score
      const aharScore = calculateAharScore(
        front.claims ?? [],
        front.highlightedIngredients ?? [],
        back.ingredients ?? [],
        back.ingredientPercentages ?? {},
        nutrition,
        ingredientVerifications,
        fssaiEvaluations,
        [
          ...(front.allergens ?? []),
          ...(back.allergens ?? []),
        ],
      );

      // 7. Generate report
      const report: string = generateReport(
        front.productName ?? null,
        front.claims ?? [],
        nutrition,
        ingredientVerifications,
        fssaiEvaluations,
        aharScore,
      );

      // 8. Build full analysis object
      const analysis: Record<string, unknown> = {
        productName: front.productName ?? null,
        frontClaims: front.claims ?? [],
        frontHighlightedIngredients: front.highlightedIngredients ?? [],
        backIngredients: back.ingredients ?? [],
        backIngredientPercentages: back.ingredientPercentages ?? {},
        allergens: [
          ...new Set([
            ...(front.allergens ?? []),
            ...(back.allergens ?? []),
          ]),
        ],
        qualifiers: back.qualifiers ?? [],
        footnotes: back.footnotes ?? [],
        nutrition,
        ingredientVerifications,
        fssaiEvaluations,
        aharScore,
        report,
      };

      // 9. Save results
      await ctx.runMutation(api.scanSessions.saveAnalysis, {
        docId: args.docId,
        productName: front.productName ?? undefined,
        analysis,
      });

      // 10. Save evidence trail
      const evidenceItems = [
        // Front evidence
        ...(front.claims ?? []).map((claim) => ({
          scanSessionId: args.scanSessionId,
          sourceSide: "FRONT" as const,
          originalText: claim,
          normalizedValue: claim.toLowerCase().trim(),
          confidence: (confidence.frontOverall as "HIGH" | "MEDIUM" | "LOW") ?? "MEDIUM",
        })),
        ...(front.highlightedIngredients ?? []).map((ing) => ({
          scanSessionId: args.scanSessionId,
          sourceSide: "FRONT" as const,
          originalText: ing,
          normalizedValue: ing.toLowerCase().trim(),
          confidence: (confidence.frontOverall as "HIGH" | "MEDIUM" | "LOW") ?? "MEDIUM",
        })),
        // Back evidence
        ...(back.ingredients ?? []).map((ing) => ({
          scanSessionId: args.scanSessionId,
          sourceSide: "BACK" as const,
          originalText: ing,
          normalizedValue: ing.toLowerCase().trim(),
          confidence: (confidence.backOverall as "HIGH" | "MEDIUM" | "LOW") ?? "MEDIUM",
        })),
      ];

      if (evidenceItems.length > 0) {
        await ctx.runMutation(api.scanEvidence.saveEvidence, {
          scanSessionId: args.scanSessionId,
          evidence: evidenceItems,
        });
      }

      return analysis;
    } catch (error) {
      // Mark scan as failed
      await ctx.runMutation(api.scanSessions.markFailed, {
        docId: args.docId,
      });
      throw error;
    }
  },
});
