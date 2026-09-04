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

/** Type for client-side OCR results */
type OcrFrontData = {
  productName: string | null;
  claims: string[];
  highlightedIngredients: string[];
  allergens: string[];
  otherText: string[];
};

type OcrBackData = {
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
    // Client-side OCR results (always provided)
    ocrFront: v.any(),
    ocrBack: v.any(),
  },
  handler: async (ctx, args): Promise<Record<string, unknown>> => {
    console.log("[AHAR X] runFullScan called");
    console.log("[AHAR X] profileCategory:", args.profileCategory);

    // 1. Update status to analyzing
    await ctx.runMutation(api.scanSessions.updateStatus, {
      docId: args.docId,
      status: "analyzing",
    });

    try {
      const emptyNutrition = { servingSize: null, calories: null, protein: null, carbohydrates: null, sugars: null, fat: null, saturatedFat: null, transFat: null, fibre: null, sodium: null };
      let front: AiResult["frontAnalysis"] = { productName: null, claims: [], highlightedIngredients: [], allergens: [], otherText: [], vegetarianSymbol: null };
      let back: AiResult["backAnalysis"] = { ingredientsList: "", ingredients: [], ingredientPercentages: {}, nutritionPerServing: emptyNutrition, allergens: [], qualifiers: [], footnotes: [], regulatoryInfo: {} };
      let confidence: AiResult["extractionConfidence"] = { frontOverall: "LOW", backOverall: "LOW", frontNotes: "", backNotes: "" };
      let usedAi = false;

      // 2. Try AI analysis (optional enhancement)
      try {
        console.log("[AHAR X] Attempting AI analysis...");
        const aiResult = (await ctx.runAction(
          api.analyzeLabel.analyzeImages,
          {
            frontImageUrl: args.frontImageUrl,
            backImageUrl: args.backImageUrl,
            scanSessionId: args.scanSessionId,
          },
        )) as AiResult;

        if (aiResult?.frontAnalysis && aiResult?.backAnalysis) {
          front = aiResult.frontAnalysis;
          back = aiResult.backAnalysis;
          confidence = aiResult.extractionConfidence;
          usedAi = true;
          console.log("[AHAR X] AI analysis succeeded");
        } else {
          throw new Error("AI returned incomplete data");
        }
      } catch (aiError: unknown) {
        const msg = aiError instanceof Error ? aiError.message : String(aiError);
        console.error("[AHAR X] AI analysis failed, using OCR data:", msg.slice(0, 200));
      }

      // 3. If AI failed, use client-side OCR results
      if (!usedAi) {
        console.log("[AHAR X] Using client-side OCR data");

        const ocrFront = args.ocrFront as OcrFrontData;
        const ocrBack = args.ocrBack as OcrBackData;

        // Determine confidence based on OCR quality heuristics
        // More generous: any extracted data counts as evidence
        const backHasIngredients = ocrBack.ingredients.length > 0;
        const backHasNutrition = ocrBack.nutritionPerServing.calories !== null ||
          ocrBack.nutritionPerServing.protein !== null ||
          ocrBack.nutritionPerServing.sugars !== null ||
          ocrBack.nutritionPerServing.fat !== null ||
          ocrBack.nutritionPerServing.carbohydrates !== null;
        const frontHasText = ocrFront.highlightedIngredients.length > 0 ||
          ocrFront.claims.length > 0 ||
          ocrFront.productName !== null;
        const backHasAllergens = ocrBack.allergens.length > 0;

        front = {
          productName: ocrFront.productName ?? null,
          claims: ocrFront.claims ?? [],
          highlightedIngredients: ocrFront.highlightedIngredients ?? [],
          allergens: ocrFront.allergens ?? [],
          otherText: ocrFront.otherText ?? [],
          vegetarianSymbol: null,
        };

        back = {
          ingredientsList: ocrBack.ingredientsList ?? "",
          ingredients: ocrBack.ingredients ?? [],
          ingredientPercentages: ocrBack.ingredientPercentages ?? {},
          nutritionPerServing: {
            servingSize: ocrBack.nutritionPerServing?.servingSize ?? null,
            calories: ocrBack.nutritionPerServing?.calories ?? null,
            protein: ocrBack.nutritionPerServing?.protein ?? null,
            carbohydrates: ocrBack.nutritionPerServing?.carbohydrates ?? null,
            sugars: ocrBack.nutritionPerServing?.sugars ?? null,
            fat: ocrBack.nutritionPerServing?.fat ?? null,
            saturatedFat: ocrBack.nutritionPerServing?.saturatedFat ?? null,
            transFat: ocrBack.nutritionPerServing?.transFat ?? null,
            fibre: ocrBack.nutritionPerServing?.fibre ?? null,
            sodium: ocrBack.nutritionPerServing?.sodium ?? null,
          },
          allergens: ocrBack.allergens ?? [],
          qualifiers: [],
          footnotes: [],
          regulatoryInfo: {},
        };

        // More generous confidence: any data extracted counts
        const frontConf: "HIGH" | "MEDIUM" | "LOW" =
          frontHasText ? (ocrFront.highlightedIngredients.length > 0 ? "HIGH" : "MEDIUM") : "LOW";
        const backConf: "HIGH" | "MEDIUM" | "LOW" =
          backHasIngredients
            ? (backHasNutrition ? "HIGH" : backHasAllergens ? "MEDIUM" : "MEDIUM")
            : "LOW";
        confidence = {
          frontOverall: frontConf,
          backOverall: backConf,
          frontNotes: frontHasText
            ? "Extracted via client-side OCR"
            : "Front label text could not be read reliably by OCR",
          backNotes: backHasIngredients
            ? `Extracted via client-side OCR (${ocrBack.ingredients.length} ingredients, ${ocrBack.nutritionPerServing.calories !== null ? 'nutrition' : 'no nutrition'})`
            : "Back label text could not be read reliably by OCR",
        };
      }

      // 4. Build nutrition data
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

      // 5. Verify front ↔ back ingredients
      const ingredientVerifications = verifyIngredients(
        front.highlightedIngredients ?? [],
        back.ingredients ?? [],
        back.ingredientPercentages ?? {},
        confidence.frontOverall,
        confidence.backOverall,
      );

      // 6. Run FSSAI rule engine
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

      // 7. Determine profile category
      const profileCategory: ProfileCategory = (args.profileCategory as ProfileCategory) ?? "general";

      // 8. Calculate AHAR X score
      const aharScore = calculateAharScore(
        nutrition,
        profileCategory,
        ingredientVerifications,
        allAllergens,
      );

      // 9. Assess profile suitability
      console.log("[AHAR X] Building results...");
      console.log("[AHAR X] Product:", front.productName);
      console.log("[AHAR X] Front claims:", front.claims?.length);
      console.log("[AHAR X] Back ingredients:", back.ingredients?.length);
      console.log("[AHAR X] AI used:", usedAi);

      const suitability = assessSuitability(
        nutrition,
        allAllergens,
        back.ingredients ?? [],
        front.claims ?? [],
        front.vegetarianSymbol ?? null,
      );

      // 10. Build limitations
      const limitations: string[] = [
        "AHAR X analyzes the manufacturer's declared label information. It does not laboratory-test the product.",
      ];
      if (!usedAi) {
        limitations.push(
          "Analysis was performed using client-side OCR. For enhanced accuracy, an AI vision service may be used when available.",
        );
      }
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

      // 11. Build simple human-readable explanation
      const productName = front.productName ?? "This product";
      const explanationParts: string[] = [];

      // Sentence 1: What is this product?
      explanationParts.push(`${productName} is a food product that ${front.claims.length > 0 ? `makes claims like ${front.claims.slice(0, 2).join(" and ")}` : "does not prominently highlight specific claims on the front"}.`);

      // Sentence 2: Front vs Back verification
      if (ingredientVerifications.length > 0) {
        const confirmed = ingredientVerifications.filter((v) => v.status === "match_confirmed");
        const inconsistent = ingredientVerifications.filter((v) => v.status === "potential_inconsistency");
        const notStated = ingredientVerifications.filter((v) => v.status === "percentage_not_stated");
        if (confirmed.length > 0 && inconsistent.length === 0) {
          explanationParts.push(`The front-highlighted ingredients (${confirmed.map((v) => v.ingredient).join(", ")}) ${confirmed.length === 1 ? "is" : "are"} confirmed in the declared back ingredient list.`);
        } else if (inconsistent.length > 0) {
          const incList = inconsistent.map((v) => v.ingredient).join(", ");
          explanationParts.push(`${incList} ${inconsistent.length === 1 ? "is" : "are"} highlighted on the front but ${inconsistent.length === 1 ? "was" : "were"} not found in the readable declared ingredient list — potential front-back inconsistency.`);
        } else if (notStated.length > 0) {
          explanationParts.push(`${notStated.map((v) => v.ingredient).join(", ")} ${notStated.length === 1 ? "was" : "were"} found in the ingredient list but the declared percentage could not be read from the label.`);
        }
      }

      // Sentence 3: Key nutrition highlights
      const nutritionHighlights: string[] = [];
      if (nutrition.sugars !== null && nutrition.sugars > 15) nutritionHighlights.push(`high sugar (${nutrition.sugars}g)`);
      else if (nutrition.sugars !== null && nutrition.sugars <= 5) nutritionHighlights.push(`low sugar (${nutrition.sugars}g)`);
      if (nutrition.calories !== null && nutrition.calories > 300) nutritionHighlights.push(`high calories (${nutrition.calories} kcal)`);
      if (nutrition.protein !== null && nutrition.protein >= 10) nutritionHighlights.push(`good protein (${nutrition.protein}g)`);
      if (nutrition.protein !== null && nutrition.protein < 3) nutritionHighlights.push(`low protein (${nutrition.protein}g)`);
      if (nutrition.sodium !== null && nutrition.sodium > 400) nutritionHighlights.push(`high sodium (${nutrition.sodium}mg)`);
      if (nutritionHighlights.length > 0) {
        explanationParts.push(`Key nutrition: ${nutritionHighlights.join(", ")}.`);
      } else if (nutrition.calories !== null) {
        explanationParts.push(`Nutrition per serving: ${nutrition.calories} kcal, ${nutrition.protein ?? "?"}g protein, ${nutrition.sugars ?? "?"}g sugar.`);
      }

      // Sentence 4: Allergen warning
      if (allAllergens.length > 0) {
        explanationParts.push(`Contains allergens: ${allAllergens.join(", ")}.`);
      }

      const simpleExplanation = explanationParts.join(" ");

      // 12. Build full analysis object
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
        analysisSource: usedAi ? "ai_vision" : "client_ocr",
      };

      // 13. Save results
      await ctx.runMutation(api.scanSessions.saveAnalysis, {
        docId: args.docId,
        productName: front.productName ?? undefined,
        analysis,
      });

      // 14. Save evidence trail
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
