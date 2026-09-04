"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import {
  verifyIngredients,
  evaluateFSSAIRules,
  calculateAharScore,
  assessSuitability,
  calculateValueAnalysis,
  buildLabelTrustCheck,
} from "./scoring";
import type { ProfileCategory, NutritionData } from "../types/ahar";

type AiResult = {
  frontAnalysis: {
    productName: string | null;
    brand: string | null;
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
  };
  extractionConfidence: {
    frontOverall: "HIGH" | "MEDIUM" | "LOW";
    backOverall: "HIGH" | "MEDIUM" | "LOW";
    frontNotes: string;
    backNotes: string;
  };
};

type OcrFrontData = {
  productName: string | null;
  brand: string | null;
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
};

export const runFullScan = action({
  args: {
    docId: v.id("scanSessions"),
    scanSessionId: v.string(),
    frontImageUrl: v.string(),
    backImageUrl: v.string(),
    profileCategory: v.optional(v.union(
      v.literal("general"), v.literal("child"), v.literal("fitness"),
      v.literal("weight"), v.literal("vegetarian"), v.literal("highProtein"),
    )),
    ocrFront: v.any(),
    ocrBack: v.any(),
  },
  handler: async (ctx, args): Promise<Record<string, unknown>> => {
    console.log("[AHAR X] runFullScan called, profile:", args.profileCategory);

    await ctx.runMutation(api.scanSessions.updateStatus, {
      docId: args.docId,
      status: "analyzing",
    });

    try {
      const emptyNutrition = {
        servingSize: null, calories: null, protein: null, carbohydrates: null,
        sugars: null, fat: null, saturatedFat: null, transFat: null, fibre: null, sodium: null,
      };
      const emptyPackaging: {
        mrp: number | null; netQuantity: string | null; netQuantityGrams: number | null;
        mfgDate: string | null; bestBefore: string | null; fssaiLicense: string | null;
        manufacturer: string | null; batchNumber: string | null;
        vegetarianMark: "veg" | "non_veg" | null; warnings: string[]; servingSizeGrams: number | null;
      } = {
        mrp: null, netQuantity: null, netQuantityGrams: null, mfgDate: null,
        bestBefore: null, fssaiLicense: null, manufacturer: null, batchNumber: null,
        vegetarianMark: null, warnings: [], servingSizeGrams: null,
      };

      let front: AiResult["frontAnalysis"] = { productName: null, brand: null, claims: [], highlightedIngredients: [], allergens: [], otherText: [], vegetarianSymbol: null };
      let back: AiResult["backAnalysis"] & { packaging?: Record<string, unknown> } = { ingredientsList: "", ingredients: [], ingredientPercentages: {}, nutritionPerServing: emptyNutrition, allergens: [], qualifiers: [], footnotes: [] };
      let confidence: AiResult["extractionConfidence"] = { frontOverall: "LOW", backOverall: "LOW", frontNotes: "", backNotes: "" };
      let packaging = emptyPackaging;
      let usedAi = false;

      // Try AI analysis (optional enhancement)
      try {
        console.log("[AHAR X] Attempting AI analysis...");
        const aiResult = (await ctx.runAction(api.analyzeLabel.analyzeImages, {
          frontImageUrl: args.frontImageUrl,
          backImageUrl: args.backImageUrl,
          scanSessionId: args.scanSessionId,
        })) as AiResult;

        if (aiResult?.frontAnalysis && aiResult?.backAnalysis) {
          front = aiResult.frontAnalysis;
          back = aiResult.backAnalysis;
          confidence = aiResult.extractionConfidence;
          usedAi = true;
          console.log("[AHAR X] AI analysis succeeded");
        }
      } catch (aiError: unknown) {
        console.error("[AHAR X] AI failed, using OCR:", aiError instanceof Error ? aiError.message : String(aiError));
      }

      // Fall back to client-side OCR
      if (!usedAi) {
        console.log("[AHAR X] Using client-side OCR data");
        const ocrFront = args.ocrFront as OcrFrontData;
        const ocrBack = args.ocrBack as OcrBackData;

        front = {
          productName: ocrFront.productName ?? null,
          brand: ocrFront.brand ?? null,
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
        };

        packaging = {
          mrp: ocrBack.packaging?.mrp ?? null,
          netQuantity: ocrBack.packaging?.netQuantity ?? null,
          netQuantityGrams: ocrBack.packaging?.netQuantityGrams ?? null,
          mfgDate: ocrBack.packaging?.mfgDate ?? null,
          bestBefore: ocrBack.packaging?.bestBefore ?? null,
          fssaiLicense: ocrBack.packaging?.fssaiLicense ?? null,
          manufacturer: ocrBack.packaging?.manufacturer ?? null,
          batchNumber: ocrBack.packaging?.batchNumber ?? null,
          vegetarianMark: ocrBack.packaging?.vegetarianMark ?? null,
          warnings: ocrBack.packaging?.warnings ?? [],
          servingSizeGrams: ocrBack.packaging?.servingSizeGrams ?? null,
        };

        const backHasIngredients = ocrBack.ingredients.length > 0;
        const backHasNutrition = ocrBack.nutritionPerServing.calories !== null;
        const frontHasText = ocrFront.highlightedIngredients.length > 0 || ocrFront.claims.length > 0 || ocrFront.productName !== null;

        confidence = {
          frontOverall: frontHasText ? (ocrFront.highlightedIngredients.length > 0 ? "HIGH" : "MEDIUM") : "LOW",
          backOverall: backHasIngredients ? (backHasNutrition ? "HIGH" : "MEDIUM") : "LOW",
          frontNotes: frontHasText ? "Extracted via client-side OCR" : "Front label text could not be read reliably",
          backNotes: backHasIngredients ? `OCR extracted ${ocrBack.ingredients.length} ingredients` : "Back label text could not be read reliably",
        };
      }

      // Build nutrition data
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

      // Verify front ↔ back ingredients
      const ingredientVerifications = verifyIngredients(
        front.highlightedIngredients ?? [],
        back.ingredients ?? [],
        back.ingredientPercentages ?? {},
        confidence.frontOverall,
        confidence.backOverall,
      );

      // Allergens
      const allAllergens = [...new Set([...(front.allergens ?? []), ...(back.allergens ?? [])])];

      // FSSAI rules
      const fssaiEvaluations = evaluateFSSAIRules(
        front.claims ?? [], back.ingredients ?? [], back.ingredientPercentages ?? {},
        nutrition, allAllergens, back.qualifiers ?? [], confidence.frontOverall, confidence.backOverall,
      );

      // Profile
      const profileCategory: ProfileCategory = (args.profileCategory as ProfileCategory) ?? "general";

      // AHAR X Score
      const aharScore = calculateAharScore(nutrition, profileCategory, ingredientVerifications, allAllergens);

      // Suitability
      const suitability = assessSuitability(nutrition, allAllergens, back.ingredients ?? [], front.claims ?? [], front.vegetarianSymbol ?? null);

      // Value analysis
      const valueAnalysis = calculateValueAnalysis(
        packaging.mrp,
        packaging.netQuantityGrams,
        packaging.netQuantity,
        packaging.servingSizeGrams,
        nutrition,
      );

      // Label trust check
      const labelTrust = buildLabelTrustCheck(
        front.claims ?? [], ingredientVerifications, nutrition, allAllergens,
        front.vegetarianSymbol ?? null, confidence.frontOverall, confidence.backOverall,
      );

      // Date check
      let dateCheckStatus: "within_date" | "near_expiry" | "past_expiry" | "unreadable" = "unreadable";
      let dateExplanation = "Date could not be verified from scanned label.";
      if (packaging.bestBefore) {
        // Simple heuristic: if we can read the date, check it
        const now = new Date();
        dateCheckStatus = "within_date";
        dateExplanation = `Best before: ${packaging.bestBefore}. Date appears readable.`;
        // Check for near expiry (within 30 days) or past
        try {
          const dateStr = packaging.bestBefore.replace(/[\/\-\.]/g, "/");
          const parts = dateStr.split("/");
          if (parts.length === 3) {
            const day = parseInt(parts[0]), month = parseInt(parts[1]) - 1;
            let year = parseInt(parts[2]);
            if (year < 100) year += 2000;
            const expiryDate = new Date(year, month, day);
            const diffDays = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
            if (diffDays < 0) { dateCheckStatus = "past_expiry"; dateExplanation = "Product may be past its best-before date."; }
            else if (diffDays < 30) { dateCheckStatus = "near_expiry"; dateExplanation = `Product is near best-before (${Math.round(diffDays)} days remaining).`; }
            else { dateExplanation = `Best before: ${packaging.bestBefore}. Approximately ${Math.round(diffDays)} days remaining.`; }
          }
        } catch { /* keep default */ }
      }

      // Build limitations
      const limitations: string[] = [
        "AHAR X analyzes the manufacturer's declared label information. It does not laboratory-test the product.",
      ];
      if (!usedAi) limitations.push("Analysis performed using client-side OCR. For enhanced accuracy, AI vision may be used when available.");
      if (confidence.backOverall === "LOW") limitations.push("Some conclusions unavailable — back label image could not be read reliably.");
      if (confidence.frontOverall === "LOW") limitations.push("Front label quality is low. Some claims may not have been captured.");

      // Build simple explanation
      const productName = front.productName ?? "This product";
      const explanationParts: string[] = [];
      explanationParts.push(`${productName} is a food product that ${front.claims.length > 0 ? `makes claims like ${front.claims.slice(0, 2).join(" and ")}` : "does not prominently highlight specific claims on the front"}.`);

      if (ingredientVerifications.length > 0) {
        const confirmed = ingredientVerifications.filter(v => v.status === "match_confirmed");
        const inconsistent = ingredientVerifications.filter(v => v.status === "potential_inconsistency");
        if (confirmed.length > 0 && inconsistent.length === 0) {
          explanationParts.push(`The front-highlighted ingredients (${confirmed.map(v => v.ingredient).join(", ")}) are confirmed in the declared back ingredient list.`);
        } else if (inconsistent.length > 0) {
          const incList = inconsistent.map(v => v.ingredient).join(", ");
          explanationParts.push(`${incList} ${inconsistent.length === 1 ? "is" : "are"} highlighted on the front but ${inconsistent.length === 1 ? "was" : "were"} not found in the readable declared ingredient list — potential front-back inconsistency.`);
        }
      }

      const nutritionHighlights: string[] = [];
      if (nutrition.sugars !== null && nutrition.sugars > 15) nutritionHighlights.push(`high sugar (${nutrition.sugars}g)`);
      else if (nutrition.sugars !== null && nutrition.sugars <= 5) nutritionHighlights.push(`low sugar (${nutrition.sugars}g)`);
      if (nutrition.calories !== null && nutrition.calories > 300) nutritionHighlights.push(`high calories (${nutrition.calories} kcal)`);
      if (nutrition.protein !== null && nutrition.protein >= 10) nutritionHighlights.push(`good protein (${nutrition.protein}g)`);
      if (nutrition.sodium !== null && nutrition.sodium > 400) nutritionHighlights.push(`high sodium (${nutrition.sodium}mg)`);
      if (nutritionHighlights.length > 0) explanationParts.push(`Key nutrition: ${nutritionHighlights.join(", ")}.`);

      if (allAllergens.length > 0) explanationParts.push(`Contains allergens: ${allAllergens.join(", ")}.`);
      if (packaging.mrp) explanationParts.push(`MRP: ₹${packaging.mrp} for ${packaging.netQuantity ?? "unknown quantity"}.`);

      const simpleExplanation = explanationParts.join(" ");

      // Build full analysis object
      const analysis: Record<string, unknown> = {
        productName: front.productName ?? null,
        brand: front.brand ?? null,
        frontClaims: front.claims ?? [],
        frontHighlightedIngredients: front.highlightedIngredients ?? [],
        backIngredients: back.ingredients ?? [],
        backIngredientPercentages: back.ingredientPercentages ?? {},
        allergens: allAllergens,
        qualifiers: back.qualifiers ?? [],
        footnotes: back.footnotes ?? [],
        vegetarianDeclaration: front.vegetarianSymbol ?? packaging.vegetarianMark ?? null,
        nutrition,
        packaging,
        valueAnalysis,
        labelTrust,
        dateCheck: {
          bestBefore: packaging.bestBefore,
          expiryDate: null,
          status: dateCheckStatus,
          explanation: dateExplanation,
        },
        ingredientVerifications,
        fssaiEvaluations,
        suitability,
        aharScore,
        simpleExplanation,
        limitations,
        analysisSource: usedAi ? "ai_vision" : "client_ocr",
      };

      // Save results
      await ctx.runMutation(api.scanSessions.saveAnalysis, {
        docId: args.docId,
        productName: front.productName ?? undefined,
        analysis,
      });

      // Save evidence trail
      const evidenceItems = [
        ...(front.claims ?? []).map((claim) => ({
          scanSessionId: args.scanSessionId, sourceSide: "FRONT" as const,
          originalText: claim, normalizedValue: claim.toLowerCase().trim(),
          confidence: (confidence.frontOverall as "HIGH" | "MEDIUM" | "LOW") ?? "MEDIUM",
        })),
        ...(front.highlightedIngredients ?? []).map((ing) => ({
          scanSessionId: args.scanSessionId, sourceSide: "FRONT" as const,
          originalText: ing, normalizedValue: ing.toLowerCase().trim(),
          confidence: (confidence.frontOverall as "HIGH" | "MEDIUM" | "LOW") ?? "MEDIUM",
        })),
        ...(back.ingredients ?? []).map((ing) => ({
          scanSessionId: args.scanSessionId, sourceSide: "BACK" as const,
          originalText: ing, normalizedValue: ing.toLowerCase().trim(),
          confidence: (confidence.backOverall as "HIGH" | "MEDIUM" | "LOW") ?? "MEDIUM",
        })),
      ];

      if (evidenceItems.length > 0) {
        await ctx.runMutation(api.scanEvidence.saveEvidence, {
          scanSessionId: args.scanSessionId, evidence: evidenceItems,
        });
      }

      console.log("[AHAR X] Scan complete:", front.productName, "| Score:", aharScore.overall);
      return analysis;
    } catch (error) {
      await ctx.runMutation(api.scanSessions.markFailed, { docId: args.docId });
      throw error;
    }
  },
});
