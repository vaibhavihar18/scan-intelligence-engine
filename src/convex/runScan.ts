"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import {
  verifyIngredients,
  evaluateFSSAIRules,
  calculateAharScore,
  assessSuitability,
} from "./scoring";
import type { ProfileCategory, NutritionData } from "../types/ahar";

type AiResult = {
  frontAnalysis: {
    productName: string | null;
    claims: string[];
    highlightedIngredients: string[];
    allergens: string[];
    otherText: string[];
    vegetarianSymbol: string | null;
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
    frontNotes: string;
    backNotes: string;
  };
};

// Orchestrates the full scan pipeline for a session
export const runFullScan = action({
  args: {
    docId: v.id("scanSessions"),
    scanSessionId: v.string(),
    frontImageUrl: v.string(),
    backImageUrl: v.string(),
    profileCategory: v.optional(v.union(
      v.literal("general"),
      v.literal("child"),
      v.literal("fitness"),
      v.literal("weight"),
      v.literal("vegetarian"),
      v.literal("highProtein"),
    )),
  },
  handler: async (ctx, args): Promise<Record<string, unknown>> => {
    console.log("[AHAR X] runFullScan called");
    console.log("[AHAR X] frontImageUrl type:", typeof args.frontImageUrl, "length:", args.frontImageUrl?.length);
    console.log("[AHAR X] backImageUrl type:", typeof args.backImageUrl, "length:", args.backImageUrl?.length);
    console.log("[AHAR X] profileCategory:", args.profileCategory);

    // 1. Update status to analyzing
    await ctx.runMutation(api.scanSessions.updateStatus, {
      docId: args.docId,
      status: "analyzing",
    });

    try {
      // 2. Run AI vision analysis
      console.log("[AHAR X] Calling analyzeImages...");
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
      const allAllergens = [
        ...new Set([
          ...(front.allergens ?? []),
          ...(back.allergens ?? []),
        ]),
      ];

      const fssaiEvaluations = evaluateFSSAIRules(
        front.claims ?? [],
        back.ingredients ?? [],
        back.ingredientPercentages ?? {},
        nutrition,
        allAllergens,
        back.qualifiers ?? [],
        confidence.frontOverall,
        confidence.backOverall,
      );

      // 6. Determine profile category
      const profileCategory: ProfileCategory = (args.profileCategory as ProfileCategory) ?? "general";

      // 7. Calculate AHAR X score
      const aharScore = calculateAharScore(
        nutrition,
        profileCategory,
        ingredientVerifications,
        allAllergens,
      );

      // 8. Assess profile suitability
      console.log("[AHAR X] AI analysis complete, building results...");
      console.log("[AHAR X] Product:", front.productName);
      console.log("[AHAR X] Front claims:", front.claims?.length);
      console.log("[AHAR X] Back ingredients:", back.ingredients?.length);
      console.log("[AHAR X] Verification results:", ingredientVerifications.length);

      const suitability = assessSuitability(
        nutrition,
        allAllergens,
        back.ingredients ?? [],
        front.claims ?? [],
        front.vegetarianSymbol ?? null,
      );

      // 9. Build limitations
      const limitations: string[] = [
        "AHAR X analyzes the manufacturer's declared label information. It does not laboratory-test the product.",
      ];
      if (confidence.backOverall === "LOW") {
        limitations.push(
          "Some conclusions may be unavailable because the supplied label image could not be read reliably.",
        );
      }
      if (confidence.frontOverall === "LOW") {
        limitations.push(
          "Front label image quality is low. Some front claims may not have been captured.",
        );
      }

      // 10. Build simple explanation
      const explanationParts: string[] = [];
      explanationParts.push(`Product: ${front.productName ?? "Unknown"}`);

      if (nutrition.calories !== null) {
        explanationParts.push(`Calories: ${nutrition.calories} kcal per serving`);
      }
      if (nutrition.protein !== null) {
        explanationParts.push(`Protein: ${nutrition.protein}g`);
      }
      if (nutrition.sugars !== null) {
        explanationParts.push(`Sugars: ${nutrition.sugars}g`);
      }

      if (front.claims.length > 0) {
        explanationParts.push(`Front claims: ${front.claims.join(", ")}`);
      }

      if (ingredientVerifications.length > 0) {
        const confirmed = ingredientVerifications.filter((v) => v.status === "match_confirmed");
        const inconsistent = ingredientVerifications.filter((v) => v.status === "potential_inconsistency");
        if (confirmed.length > 0) {
          explanationParts.push(`Verified ingredients: ${confirmed.map((v) => v.ingredient).join(", ")}`);
        }
        if (inconsistent.length > 0) {
          explanationParts.push(`Potential inconsistencies: ${inconsistent.map((v) => v.ingredient).join(", ")}`);
        }
      }

      const simpleExplanation = explanationParts.join(". ");

      // 11. Build full analysis object
      const analysis: Record<string, unknown> = {
        productName: front.productName ?? null,
        frontClaims: front.claims ?? [],
        frontHighlightedIngredients: front.highlightedIngredients ?? [],
        backIngredients: back.ingredients ?? [],
        backIngredientPercentages: back.ingredientPercentages ?? {},
        allergens: allAllergens,
        qualifiers: back.qualifiers ?? [],
        footnotes: back.footnotes ?? [],
        vegetarianDeclaration: front.vegetarianSymbol ?? null,
        nutrition,
        ingredientVerifications,
        fssaiEvaluations,
        suitability,
        aharScore,
        simpleExplanation,
        limitations,
      };

      // 12. Save results
      await ctx.runMutation(api.scanSessions.saveAnalysis, {
        docId: args.docId,
        productName: front.productName ?? undefined,
        analysis,
      });

      // 13. Save evidence trail
      const evidenceItems = [
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
