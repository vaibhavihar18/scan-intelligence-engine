// AHAR X Scoring Engine & FSSAI Rule Evaluation
// Evidence-first: all results come from extracted label data only.

import type {
  IngredientVerification,
  FSSAIEvaluation,
  SuitabilityAssessment,
  AharScore,
  ScoreFactor,
  ProfileCategory,
  NutritionData,
} from "../types/ahar";

// --- Profile-based AHAR X Score Calculation (5-point scale) ---

export function calculateAharScore(
  nutrition: NutritionData,
  profile: ProfileCategory,
  ingredientVerifications: IngredientVerification[],
  allergens: string[],
): AharScore {
  let score = 5.0;
  const factors: ScoreFactor[] = [];

  // Helper to add score factor
  const addFactor = (
    label: string,
    value: string,
    delta: number,
  ) => {
    factors.push({
      label,
      value,
      impact: delta > 0 ? "positive" : delta < 0 ? "negative" : "neutral",
      delta,
    });
    score += delta;
  };

  const hasNutrition = nutrition.calories !== null || nutrition.protein !== null;

  if (!hasNutrition) {
    factors.push({
      label: "Nutrition data unavailable",
      value: "Label could not be read",
      impact: "unavailable",
      delta: 0,
    });
  }

  // Profile-specific scoring
  if (profile === "fitness") {
    // Protein
    if (nutrition.protein !== null) {
      if (nutrition.protein >= 10) addFactor("High protein", `${nutrition.protein}g`, 2.0);
      else if (nutrition.protein >= 5) addFactor("Moderate protein", `${nutrition.protein}g`, 1.0);
      else addFactor("Low protein", `${nutrition.protein}g`, -0.5);

      // Protein/calorie ratio
      if (nutrition.calories !== null && nutrition.calories > 0) {
        const ratio = (nutrition.protein / nutrition.calories) * 100;
        if (ratio >= 5) addFactor("Good protein/calorie ratio", `${ratio.toFixed(1)}%`, 1.0);
      }
    } else {
      addFactor("Protein", "Not available", 0);
    }

    // Sugar
    if (nutrition.sugars !== null) {
      if (nutrition.sugars > 15) addFactor("High sugar", `${nutrition.sugars}g`, -1.5);
      else if (nutrition.sugars <= 5) addFactor("Low sugar", `${nutrition.sugars}g`, 0.5);
    } else {
      addFactor("Sugar", "Not available", 0);
    }

    // Sodium
    if (nutrition.sodium !== null && nutrition.sodium > 400) {
      addFactor("High sodium", `${nutrition.sodium}mg`, -0.5);
    }
  } else if (profile === "weight") {
    // Calories
    if (nutrition.calories !== null) {
      if (nutrition.calories > 300) addFactor("High calories", `${nutrition.calories} kcal`, -1.5);
      else if (nutrition.calories <= 200) addFactor("Low calories", `${nutrition.calories} kcal`, 1.0);
    } else {
      addFactor("Calories", "Not available", 0);
    }

    // Sugar
    if (nutrition.sugars !== null) {
      if (nutrition.sugars > 15) addFactor("High sugar", `${nutrition.sugars}g`, -1.5);
      else if (nutrition.sugars <= 5) addFactor("Low sugar", `${nutrition.sugars}g`, 0.5);
    } else {
      addFactor("Sugar", "Not available", 0);
    }

    // Fibre
    if (nutrition.fibre !== null) {
      if (nutrition.fibre >= 5) addFactor("High fibre", `${nutrition.fibre}g`, 1.0);
      else if (nutrition.fibre < 2) addFactor("Low fibre", `${nutrition.fibre}g`, -0.5);
    } else {
      addFactor("Fibre", "Not available", 0);
    }
  } else if (profile === "general") {
    // Protein
    if (nutrition.protein !== null) {
      if (nutrition.protein >= 10) addFactor("High protein", `${nutrition.protein}g`, 1.0);
    } else {
      addFactor("Protein", "Not available", 0);
    }

    // Fibre
    if (nutrition.fibre !== null) {
      if (nutrition.fibre >= 5) addFactor("High fibre", `${nutrition.fibre}g`, 1.0);
    } else {
      addFactor("Fibre", "Not available", 0);
    }

    // Sugar
    if (nutrition.sugars !== null) {
      if (nutrition.sugars > 15) addFactor("High sugar", `${nutrition.sugars}g`, -1.5);
    } else {
      addFactor("Sugar", "Not available", 0);
    }

    // Sodium
    if (nutrition.sodium !== null) {
      if (nutrition.sodium > 400) addFactor("High sodium", `${nutrition.sodium}mg`, -0.5);
    } else {
      addFactor("Sodium", "Not available", 0);
    }

    // Saturated fat
    if (nutrition.saturatedFat !== null) {
      if (nutrition.saturatedFat > 5) addFactor("High saturated fat", `${nutrition.saturatedFat}g`, -0.5);
    } else {
      addFactor("Saturated fat", "Not available", 0);
    }
  } else if (profile === "child") {
    // Sugar
    if (nutrition.sugars !== null) {
      if (nutrition.sugars > 15) addFactor("High sugar for children", `${nutrition.sugars}g`, -2.0);
      else if (nutrition.sugars <= 5) addFactor("Low sugar", `${nutrition.sugars}g`, 0.5);
    } else {
      addFactor("Sugar", "Not available", 0);
    }

    // Sodium
    if (nutrition.sodium !== null) {
      if (nutrition.sodium > 400) addFactor("High sodium for children", `${nutrition.sodium}mg`, -1.5);
    } else {
      addFactor("Sodium", "Not available", 0);
    }

    // Protein
    if (nutrition.protein !== null && nutrition.protein >= 5) {
      addFactor("Good protein content", `${nutrition.protein}g`, 0.5);
    }

    // Allergen caution for children
    if (allergens.length > 0) {
      addFactor("Allergens present", allergens.join(", "), -0.5);
    }
  } else if (profile === "highProtein") {
    // Protein
    if (nutrition.protein !== null) {
      if (nutrition.protein >= 15) addFactor("Excellent protein", `${nutrition.protein}g`, 2.5);
      else if (nutrition.protein >= 10) addFactor("High protein", `${nutrition.protein}g`, 1.5);
      else if (nutrition.protein >= 5) addFactor("Moderate protein", `${nutrition.protein}g`, 0.5);
      else addFactor("Low protein", `${nutrition.protein}g`, -1.0);
    } else {
      addFactor("Protein", "Not available", 0);
    }

    // Sugar penalty
    if (nutrition.sugars !== null && nutrition.sugars > 15) {
      addFactor("High sugar", `${nutrition.sugars}g`, -1.0);
    }
  } else if (profile === "vegetarian") {
    // This is mainly a suitability check, not scoring
    // But we add fibre as positive
    if (nutrition.fibre !== null && nutrition.fibre >= 3) {
      addFactor("Good fibre content", `${nutrition.fibre}g`, 0.5);
    }
    if (nutrition.sugars !== null && nutrition.sugars > 15) {
      addFactor("High sugar", `${nutrition.sugars}g`, -1.0);
    }
  }

  // Clamp and round
  const clamped = Math.max(0, Math.min(10, Math.round(score * 10) / 10));

  return {
    overall: clamped,
    factors,
  };
}

// --- Ingredient Verification ---

export function verifyIngredients(
  frontHighlights: string[],
  backIngredients: string[],
  backPercentages: Record<string, string>,
  frontConfidence: string,
  backConfidence: string,
): IngredientVerification[] {
  if (frontHighlights.length === 0) return [];

  return frontHighlights.map((frontIng) => {
    const normalizedFront = frontIng.toLowerCase().trim();
    const normFront = normalizedFront.replace(/s$/, ""); // strip trailing 's'

    const match = backIngredients.find((backIng) => {
      const normalizedBack = backIng.toLowerCase().trim();
      const normBack = normalizedBack.replace(/s$/, "");
      // Exact match
      if (normalizedBack === normalizedFront) return true;
      // Root match (strip trailing s)
      if (normBack === normFront) return true;
      // Containment (front in back or back in front)
      if (normalizedBack.includes(normalizedFront) || normalizedFront.includes(normalizedBack)) return true;
      // Root containment
      if (normBack.includes(normFront) || normFront.includes(normBack)) return true;
      // Word boundary match on individual words
      const frontWords = normalizedFront.split(/\s+/);
      return frontWords.some((w) => normalizedBack.includes(w) && w.length > 3);
    });

    if (!match) {
      if (backConfidence === "LOW") {
        return {
          ingredient: frontIng,
          frontClaimed: true,
          backFound: false,
          declaredPercentage: null,
          status: "insufficient_evidence" as const,
          confidence: "LOW" as const,
        };
      }
      return {
        ingredient: frontIng,
        frontClaimed: true,
        backFound: false,  declaredPercentage: null,
          status: "potential_inconsistency" as const,
        confidence: backConfidence === "HIGH" ? ("HIGH" as const) : ("MEDIUM" as const),
      };
    }

    // Find declared percentage by trying multiple normalized forms
    const matchLower = match.toLowerCase().trim();
    const matchRoot = matchLower.replace(/s$/, "");
    const normFrontRoot = normFront;
    let declaredPercentage: string | null = null;
    // Try direct lookups first
    declaredPercentage =
      backPercentages[match] ??
      backPercentages[matchLower] ??
      backPercentages[normalizedFront] ??
      backPercentages[normFrontRoot] ??
      null;
    // If not found, search all keys for a substring match
    if (!declaredPercentage) {
      for (const [key, val] of Object.entries(backPercentages)) {
        const keyLower = key.toLowerCase().trim();
        if (
          keyLower.includes(matchLower) ||
          matchLower.includes(keyLower) ||
          keyLower.includes(normFrontRoot) ||
          normFrontRoot.includes(keyLower)
        ) {
          declaredPercentage = val;
          break;
        }
      }
    }

    if (declaredPercentage) {
      return {
        ingredient: frontIng,
        frontClaimed: true,
        backFound: true,
        declaredPercentage,
        status: "match_confirmed" as const,
        confidence: "HIGH" as const,
      };
    }

    return {
      ingredient: frontIng,
      frontClaimed: true,
      backFound: true,        declaredPercentage: null,
        status: "percentage_not_stated" as const,
      confidence: "HIGH" as const,
    };
  });
}

// --- Profile Suitability Assessment ---

export function assessSuitability(
  nutrition: NutritionData,
  allergens: string[],
  backIngredients: string[],
  frontClaims: string[],
  vegetarianDecl: string | null,
): SuitabilityAssessment[] {
  const assessments: SuitabilityAssessment[] = [];
  const hasData = nutrition.calories !== null || nutrition.protein !== null;

  // 1. General Adult
  {
    const reasons: string[] = [];
    let status: SuitabilityAssessment["status"] = "suitable";

    if (!hasData) {
      status = "insufficient_evidence";
      reasons.push("Insufficient nutrition data to assess suitability");
    } else {
      if (nutrition.sugars !== null && nutrition.sugars > 15) {
        reasons.push("High sugar content — consume in moderation");
      }
      if (nutrition.sodium !== null && nutrition.sodium > 400) {
        reasons.push("High sodium — monitor daily intake");
      }
      if (allergens.length > 0) {
        reasons.push(`Contains allergens: ${allergens.join(", ")}`);
      }
      if (reasons.length > 0) status = "use_caution";
    }

    assessments.push({ profile: "general", status, reasons });
  }

  // 2. Child
  {
    const reasons: string[] = [];
    let status: SuitabilityAssessment["status"] = "suitable";

    if (!hasData) {
      status = "insufficient_evidence";
      reasons.push("Insufficient nutrition data to assess child suitability");
    } else {
      if (nutrition.sugars !== null && nutrition.sugars > 15) {
        reasons.push("High sugar content — not ideal for children");
        status = "use_caution";
      }
      if (nutrition.sodium !== null && nutrition.sodium > 400) {
        reasons.push("High sodium — use caution for children");
        status = "use_caution";
      }
      if (nutrition.saturatedFat !== null && nutrition.saturatedFat > 8) {
        reasons.push("High saturated fat — not recommended for young children");
        status = "use_caution";
      }
      if (allergens.length > 0) {
        reasons.push(`Contains allergens: ${allergens.join(", ")} — check for child's allergies`);
      }
      // Check for artificial ingredients
      const hasArtificial = backIngredients.some(
        (i) => i.toLowerCase().includes("artificial") || i.toLowerCase().includes("synthetic"),
      );
      if (hasArtificial) {
        reasons.push("Contains artificial ingredients — use caution for children");
        status = "use_caution";
      }
      if (nutrition.protein !== null && nutrition.protein < 3) {
        reasons.push("Low protein — limited nutritional value for growing children");
      }
    }

    assessments.push({ profile: "child", status, reasons });
  }

  // 3. Fitness
  {
    const reasons: string[] = [];
    let status: SuitabilityAssessment["status"] = "suitable";

    if (!hasData) {
      status = "insufficient_evidence";
      reasons.push("Insufficient nutrition data to assess fitness suitability");
    } else {
      if (nutrition.protein !== null && nutrition.protein >= 10) {
        reasons.push(`Good protein source: ${nutrition.protein}g`);
      } else if (nutrition.protein !== null && nutrition.protein < 5) {
        reasons.push("Low protein — may not meet fitness goals");
      }
      if (nutrition.sugars !== null && nutrition.sugars > 15) {
        reasons.push("High sugar — not ideal for fitness goals");
        status = "use_caution";
      }
      if (nutrition.calories !== null && nutrition.calories > 300) {
        reasons.push("High calorie density — consider portion control");
      }
      if (nutrition.fibre !== null && nutrition.fibre >= 3) {
        reasons.push(`Good fibre content: ${nutrition.fibre}g`);
      }
    }

    assessments.push({ profile: "fitness", status, reasons });
  }

  // 4. Weight-Conscious
  {
    const reasons: string[] = [];
    let status: SuitabilityAssessment["status"] = "suitable";

    if (!hasData) {
      status = "insufficient_evidence";
      reasons.push("Insufficient nutrition data to assess weight-conscious suitability");
    } else {
      if (nutrition.calories !== null && nutrition.calories > 300) {
        reasons.push("High calorie content — not ideal for weight management");
        status = "use_caution";
      }
      if (nutrition.sugars !== null && nutrition.sugars > 15) {
        reasons.push("High sugar — contributes to excess calories");
        status = "use_caution";
      }
      if (nutrition.fibre !== null && nutrition.fibre >= 5) {
        reasons.push("High fibre — helps with satiety");
      }
      if (nutrition.protein !== null && nutrition.protein >= 5) {
        reasons.push("Good protein content — supports satiety");
      }
    }

    assessments.push({ profile: "weight", status, reasons });
  }

  // 5. Vegetarian
  {
    const reasons: string[] = [];
    let status: SuitabilityAssessment["status"] = "suitable";

    // Check vegetarian symbol/declaration
    if (vegetarianDecl) {
      const isVeg = vegetarianDecl.toLowerCase().includes("veg") &&
        !vegetarianDecl.toLowerCase().includes("non-veg");
      if (!isVeg) {
        reasons.push("Label indicates non-vegetarian product");
        status = "not_recommended";
      } else {
        reasons.push("Label indicates vegetarian product");
      }
    } else {
      // Inspect ingredients for animal-derived items
      const animalDerived = ["meat", "chicken", "fish", "egg", "gelatin", "lard", "tallow"];
      const found = backIngredients.filter((ing) =>
        animalDerived.some((a) => ing.toLowerCase().includes(a)),
      );
      if (found.length > 0) {
        reasons.push(`May contain animal-derived ingredients: ${found.join(", ")}`);
        status = "use_caution";
      } else {
        reasons.push("No obvious animal-derived ingredients detected in readable list");
        reasons.push("Note: vegetarian symbol not detected — verify from label");
        status = "insufficient_evidence";
      }
    }

    assessments.push({ profile: "vegetarian", status, reasons });
  }

  // 6. High-Protein
  {
    const reasons: string[] = [];
    let status: SuitabilityAssessment["status"] = "suitable";

    if (!hasData) {
      status = "insufficient_evidence";
      reasons.push("Insufficient nutrition data to assess protein suitability");
    } else {
      if (nutrition.protein !== null) {
        if (nutrition.protein >= 15) {
          reasons.push(`Excellent protein: ${nutrition.protein}g`);
        } else if (nutrition.protein >= 10) {
          reasons.push(`Good protein: ${nutrition.protein}g`);
        } else if (nutrition.protein >= 5) {
          reasons.push(`Moderate protein: ${nutrition.protein}g`);
          status = "use_caution";
        } else {
          reasons.push(`Low protein: ${nutrition.protein}g — may not meet high-protein goals`);
          status = "not_recommended";
        }
      }
      if (nutrition.sugars !== null && nutrition.sugars > 15) {
        reasons.push("High sugar content — consider protein alternatives");
      }
    }

    assessments.push({ profile: "highProtein", status, reasons });
  }

  return assessments;
}

// --- FSSAI Rule Engine ---

export function evaluateFSSAIRules(
  frontClaims: string[],
  backIngredients: string[],
  backPercentages: Record<string, string>,
  nutrition: NutritionData,
  allergens: string[],
  qualifiers: string[],
  frontConfidence: string,
  backConfidence: string,
): FSSAIEvaluation[] {
  const evaluations: FSSAIEvaluation[] = [];

  // Rule 1: Nutrition Information Mandatory
  const hasNutrition = nutrition.calories !== null || nutrition.protein !== null || nutrition.fat !== null;
  evaluations.push({
    ruleId: "FSSAI-L-001",
    ruleName: "Nutrition Information Mandatory",
    category: "labeling",
    status: hasNutrition ? "compliant" : backConfidence === "LOW" ? "insufficient_evidence" : "non_compliant",
    severity: hasNutrition ? "info" : backConfidence === "LOW" ? "warning" : "violation",
    evidence: hasNutrition
      ? `Nutrition facts visible: ${nutrition.calories ?? "N/A"} kcal per serving`
      : "No nutrition information readable on scanned label",
    detail: hasNutrition
      ? "Nutrition facts panel is present on the label as required under FSSAI regulations."
      : "FSSAI regulations (Schedule II, FSSR 2011) require nutrition information on packaged food labels.",
  });

  // Rule 2: Allergen Declaration
  const hasAllergenDeclaration = allergens.length > 0;
  const highRiskAllergens = ["milk", "egg", "peanut", "tree nut", "soy", "wheat", "gluten", "fish", "shellfish", "sesame"];
  const hasHighRiskIngredients = backIngredients.some((ing) =>
    highRiskAllergens.some((allergen) => ing.toLowerCase().includes(allergen)),
  );
  evaluations.push({
    ruleId: "FSSAI-L-002",
    ruleName: "Allergen Declaration",
    category: "allergens",
    status: hasAllergenDeclaration ? "compliant" : hasHighRiskIngredients ? "non_compliant" : "insufficient_evidence",
    severity: hasAllergenDeclaration ? "info" : hasHighRiskIngredients ? "violation" : "warning",
    evidence: hasAllergenDeclaration
      ? `Allergens declared: ${allergens.join(", ")}`
      : hasHighRiskIngredients
        ? "Contains common allergens but no allergen declaration found"
        : "Allergen status could not be determined from scanned label",
    detail: "FSSAI requires declaration of specified allergens (Schedule 5, Amendment 2021).",
  });

  // Rule 3: Ingredient List Completeness
  const hasIngredientList = backIngredients.length > 0;
  evaluations.push({
    ruleId: "FSSAI-L-003",
    ruleName: "Ingredient List Declaration",
    category: "ingredients",
    status: hasIngredientList ? "compliant" : backConfidence === "LOW" ? "insufficient_evidence" : "non_compliant",
    severity: hasIngredientList ? "info" : backConfidence === "LOW" ? "warning" : "violation",
    evidence: hasIngredientList
      ? `${backIngredients.length} ingredients identified on back label`
      : "No ingredient list readable on scanned back label",
    detail: "FSSAI requires ingredients to be listed in descending order of weight/mass.",
  });

  // Rule 4: Trans Fat Disclosure
  if (nutrition.transFat !== null) {
    evaluations.push({
      ruleId: "FSSAI-N-001",
      ruleName: "Trans Fat Disclosure",
      category: "nutrition",
      status: "compliant",
      severity: "info",
      evidence: `Trans fat: ${nutrition.transFat}g per serving`,
      detail: "Trans fat value is declared on the nutrition label.",
    });
  } else if (backConfidence !== "LOW") {
    evaluations.push({
      ruleId: "FSSAI-N-001",
      ruleName: "Trans Fat Disclosure",
      category: "nutrition",
      status: "insufficient_evidence",
      severity: "warning",
      evidence: "Trans fat value not readable from scanned label",
      detail: "FSSAI requires trans fat declaration. Could not verify from scanned image.",
    });
  }

  // Rule 5: Claims Verification
  if (frontClaims.length > 0 && backIngredients.length > 0) {
    for (const claim of frontClaims) {
      const claimLower = claim.toLowerCase();
      if (claimLower.includes("sugar free") || claimLower.includes("no sugar")) {
        const hasSugar = backIngredients.some(
          (i) => i.toLowerCase().includes("sugar") || i.toLowerCase().includes("sucrose"),
        );
        evaluations.push({
          ruleId: "FSSAI-C-001",
          ruleName: `Claim: "${claim}"`,
          category: "claims",
          status: hasSugar ? "non_compliant" : "compliant",
          severity: hasSugar ? "violation" : "info",
          evidence: hasSugar
            ? `Front claims "${claim}" but sugar/sweetener found in ingredient list`
            : `No sugars found in ingredient list consistent with claim`,
          detail: "FSSAI prohibits misleading claims. Sugar-free claims require absence of added sugars.",
        });
      }
      if (claimLower.includes("natural") || claimLower.includes("100% natural")) {
        const hasArtificial = backIngredients.some(
          (i) => i.toLowerCase().includes("artificial") || i.toLowerCase().includes("synthetic"),
        );
        evaluations.push({
          ruleId: "FSSAI-C-002",
          ruleName: `Claim: "${claim}"`,
          category: "claims",
          status: hasArtificial ? "non_compliant" : "insufficient_evidence",
          severity: hasArtificial ? "violation" : "warning",
          evidence: hasArtificial
            ? `Front claims "${claim}" but artificial ingredients found`
            : "Cannot fully verify natural claim from label alone",
          detail: "FSSAI requires 'natural' claims to be substantiated.",
        });
      }
    }
  }

  // Rule 6: Serving Size
  evaluations.push({
    ruleId: "FSSAI-N-002",
    ruleName: "Serving Size Declaration",
    category: "labeling",
    status: nutrition.servingSize ? "compliant" : backConfidence === "LOW" ? "insufficient_evidence" : "non_compliant",
    severity: nutrition.servingSize ? "info" : "warning",
    evidence: nutrition.servingSize
      ? `Serving size: ${nutrition.servingSize}`
      : "Serving size not found on scanned label",
    detail: "FSSAI requires serving size to be declared on nutrition labels.",
  });

  // Rule 7: Ingredient Percentages
  if (Object.keys(backPercentages).length > 0) {
    evaluations.push({
      ruleId: "FSSAI-L-004",
      ruleName: "Ingredient Percentage Declarations",
      category: "ingredients",
      status: "compliant",
      severity: "info",
      evidence: `Declared percentages: ${Object.entries(backPercentages).map(([k, v]) => `${k} (${v})`).join(", ")}`,
      detail: "Ingredient percentages are declared, aiding transparency.",
    });
  }

  // Rule 8: Qualifying Statements
  if (qualifiers.length > 0) {
    evaluations.push({
      ruleId: "FSSAI-L-005",
      ruleName: "Qualifying Statements Present",
      category: "labeling",
      status: "compliant",
      severity: "info",
      evidence: `Qualifiers found: ${qualifiers.join("; ")}`,
      detail: "Qualifying statements indicate transparent labeling.",
    });
  }

  return evaluations;
}
