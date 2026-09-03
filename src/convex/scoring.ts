// AHAR X Scoring Engine & FSSAI Rule Evaluation
// Applied to extracted label evidence from current scan only.

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
}

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

export interface AharScore {
  overall: number;
  labelTransparency: number;
  nutritionQuality: number;
  ingredientIntegrity: number;
  claimAccuracy: number;
}

// --- Front ↔ Back Ingredient Verification ---

export function verifyIngredients(
  frontHighlights: string[],
  backIngredients: string[],
  backPercentages: Record<string, string>,
  frontConfidence: string,
  backConfidence: string,
): IngredientVerification[] {
  if (backConfidence === "LOW" && backIngredients.length === 0) {
    return frontHighlights.map((ing) => ({
      ingredient: ing,
      frontClaimed: true,
      backFound: false,
      declaredPercentage: null,
      status: "insufficient_evidence" as const,
    }));
  }

  return frontHighlights.map((frontIng) => {
    const normalizedFront = frontIng.toLowerCase().trim();
    const match = backIngredients.find(
      (backIng) =>
        backIng.toLowerCase().trim() === normalizedFront ||
        backIng.toLowerCase().includes(normalizedFront) ||
        normalizedFront.includes(backIng.toLowerCase().trim()),
    );

    if (!match) {
      if (backConfidence === "LOW") {
        return {
          ingredient: frontIng,
          frontClaimed: true,
          backFound: false,
          declaredPercentage: null,
          status: "insufficient_evidence" as const,
        };
      }
      return {
        ingredient: frontIng,
        frontClaimed: true,
        backFound: false,
        declaredPercentage: null,
        status: "potential_inconsistency" as const,
      };
    }

    const percentage = backPercentages[match] ?? null;

    if (percentage) {
      return {
        ingredient: frontIng,
        frontClaimed: true,
        backFound: true,
        declaredPercentage: percentage,
        status: "match_confirmed" as const,
      };
    }

    return {
      ingredient: frontIng,
      frontClaimed: true,
      backFound: true,
      declaredPercentage: null,
      status: "percentage_not_stated" as const,
    };
  });
}

// --- FSSAI Rule Engine ---

export function evaluateFSSAIRules(
  frontClaims: string[],
  frontIngredients: string[],
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
  const hasNutrition =
    nutrition.calories !== null ||
    nutrition.protein !== null ||
    nutrition.fat !== null;
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
  const hasHighRiskIngredients = backIngredients.some((ing) =>
    ["milk", "egg", "peanut", "tree nut", "soy", "wheat", "gluten", "fish", "shellfish", "sesame"].some(
      (allergen) => ing.toLowerCase().includes(allergen),
    ),
  );
  evaluations.push({
    ruleId: "FSSAI-L-002",
    ruleName: "Allergen Declaration",
    category: "allergens",
    status: hasAllergenDeclaration
      ? "compliant"
      : hasHighRiskIngredients
        ? "non_compliant"
        : "insufficient_evidence",
    severity: hasAllergenDeclaration
      ? "info"
      : hasHighRiskIngredients
        ? "violation"
        : "warning",
    evidence: hasAllergenDeclaration
      ? `Allergens declared: ${allergens.join(", ")}`
      : hasHighRiskIngredients
        ? "Contains common allergens but no allergen declaration found"
        : "Allergen status could not be determined from scanned label",
    detail: "FSSAI regulations require declaration of specified allergens (Schedule 5, Amendment 2021).",
  });

  // Rule 3: Ingredient List Completeness
  const hasIngredientList = backIngredients.length > 0;
  evaluations.push({
    ruleId: "FSSAI-L-003",
    ruleName: "Ingredient List Declaration",
    category: "ingredients",
    status: hasIngredientList
      ? "compliant"
      : backConfidence === "LOW"
        ? "insufficient_evidence"
        : "non_compliant",
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
  }

  // Rule 5: Claims Verification — Front claims must be backed by ingredient list
  if (frontClaims.length > 0 && backIngredients.length > 0) {
    for (const claim of frontClaims) {
      const claimLower = claim.toLowerCase();
      // Check common claims
      if (claimLower.includes("sugar free") || claimLower.includes("no sugar")) {
        const hasSugar = backIngredients.some(
          (i) =>
            i.toLowerCase().includes("sugar") ||
            i.toLowerCase().includes("sucrose") ||
            i.toLowerCase().includes("hfcs"),
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
          (i) =>
            i.toLowerCase().includes("artificial") ||
            i.toLowerCase().includes("synthetic"),
        );
        evaluations.push({
          ruleId: "FSSAI-C-002",
          ruleName: `Claim: "${claim}"`,
          category: "claims",
          status: hasArtificial ? "non_compliant" : "insufficient_evidence",
          severity: hasArtificial ? "violation" : "warning",
          evidence: hasArtificial
            ? `Front claims "${claim}" but artificial ingredients found in list`
            : `Cannot fully verify natural claim from label alone`,
          detail: "FSSAI requires 'natural' claims to be substantiated.",
        });
      }
    }
  }

  // Rule 6: FSSAI License Number
  if (frontConfidence !== "LOW" || backConfidence !== "LOW") {
    evaluations.push({
      ruleId: "FSSAI-L-004",
      ruleName: "FSSAI License Number",
      category: "labeling",
      status: "insufficient_evidence",
      severity: "warning",
      evidence: "FSSAI license number extraction requires clear label image",
      detail: "All FSSAI-licensed packaged foods must display their FSSAI license number.",
    });
  }

  // Rule 7: Serving Size Declaration
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

  // Rule 8: Qualifying Statements
  if (qualifiers.length > 0) {
    evaluations.push({
      ruleId: "FSSAI-L-005",
      ruleName: "Qualifying Statements Present",
      category: "labeling",
      status: "compliant",
      severity: "info",
      evidence: `Qualifiers found: ${qualifiers.join("; ")}`,
      detail: "Qualifying statements (e.g., 'approximate', 'may contain traces') indicate transparent labeling.",
    });
  }

  // Rule 9: Ingredient Declaration Percentages
  if (frontIngredients.length > 0) {
    const missingPercentages = frontIngredients.filter(
      (ing) => !backPercentages[ing],
    );
    if (missingPercentages.length > 0 && backConfidence !== "LOW") {
      evaluations.push({
        ruleId: "FSSAI-L-006",
        ruleName: "Ingredient Percentage Declarations",
        category: "ingredients",
        status: "non_compliant",
        severity: "warning",
        evidence: `Highlighted ingredients without percentages: ${missingPercentages.join(", ")}`,
        detail: "FSSAI recommends/prevents percentages for ingredients highlighted on front of pack.",
      });
    }
  }

  return evaluations;
}

// --- AHAR X Score Calculation ---

export function calculateAharScore(
  frontClaims: string[],
  frontIngredients: string[],
  backIngredients: string[],
  backPercentages: Record<string, string>,
  nutrition: NutritionData,
  ingredientVerifications: IngredientVerification[],
  fssaiEvaluations: FSSAIEvaluation[],
  allergens: string[],
): AharScore {
  // 1. Label Transparency (0-100)
  let transparency = 50; // baseline
  if (backIngredients.length > 0) transparency += 15;
  if (nutrition.calories !== null) transparency += 5;
  if (nutrition.protein !== null) transparency += 3;
  if (nutrition.fat !== null) transparency += 3;
  if (nutrition.sugars !== null) transparency += 3;
  if (nutrition.fibre !== null) transparency += 3;
  if (nutrition.sodium !== null) transparency += 3;
  if (allergens.length > 0) transparency += 8;
  if (Object.keys(backPercentages).length > 0) transparency += 7;
  transparency = Math.min(100, transparency);

  // 2. Nutrition Quality (0-100) — based on extracted values
  let nutritionScore = 50;
  if (nutrition.calories !== null) {
    if (nutrition.calories <= 200) nutritionScore += 10;
    else if (nutrition.calories <= 400) nutritionScore += 5;
    else nutritionScore -= 5;
  }
  if (nutrition.protein !== null) {
    if (nutrition.protein >= 10) nutritionScore += 12;
    else if (nutrition.protein >= 5) nutritionScore += 6;
  }
  if (nutrition.sugars !== null) {
    if (nutrition.sugars <= 5) nutritionScore += 10;
    else if (nutrition.sugars <= 15) nutritionScore += 3;
    else nutritionScore -= 5;
  }
  if (nutrition.fat !== null) {
    if (nutrition.fat <= 10) nutritionScore += 8;
    else if (nutrition.fat <= 20) nutritionScore += 2;
    else nutritionScore -= 5;
  }
  if (nutrition.transFat !== null) {
    if (nutrition.transFat === 0) nutritionScore += 8;
    else if (nutrition.transFat <= 0.5) nutritionScore += 2;
    else nutritionScore -= 8;
  }
  if (nutrition.fibre !== null) {
    if (nutrition.fibre >= 6) nutritionScore += 8;
    else if (nutrition.fibre >= 3) nutritionScore += 4;
  }
  if (nutrition.sodium !== null) {
    if (nutrition.sodium <= 120) nutritionScore += 5;
    else if (nutrition.sodium <= 400) nutritionScore += 0;
    else nutritionScore -= 5;
  }
  nutritionScore = Math.max(0, Math.min(100, nutritionScore));

  // 3. Ingredient Integrity (0-100)
  let integrity = 50;
  if (backIngredients.length > 0) integrity += 15;
  const confirmed = ingredientVerifications.filter(
    (v) => v.status === "match_confirmed",
  );
  const inconsistent = ingredientVerifications.filter(
    (v) => v.status === "potential_inconsistency",
  );
  if (ingredientVerifications.length > 0) {
    const confirmedRatio = confirmed.length / ingredientVerifications.length;
    integrity += Math.round(confirmedRatio * 25);
    integrity -= inconsistent.length * 10;
  }
  integrity = Math.max(0, Math.min(100, integrity));

  // 4. Claim Accuracy (0-100)
  let claimScore = 50;
  const violations = fssaiEvaluations.filter(
    (e) => e.severity === "violation" && e.category === "claims",
  );
  const claimWarnings = fssaiEvaluations.filter(
    (e) => e.severity === "warning" && e.category === "claims",
  );
  claimScore -= violations.length * 15;
  claimScore -= claimWarnings.length * 5;
  claimScore += confirmed.length * 3;
  claimScore = Math.max(0, Math.min(100, claimScore));

  // Overall weighted average
  const overall = Math.round(
    transparency * 0.25 +
      nutritionScore * 0.3 +
      integrity * 0.25 +
      claimScore * 0.2,
  );

  return {
    overall: Math.max(0, Math.min(100, overall)),
    labelTransparency: Math.max(0, Math.min(100, transparency)),
    nutritionQuality: Math.max(0, Math.min(100, nutritionScore)),
    ingredientIntegrity: Math.max(0, Math.min(100, integrity)),
    claimAccuracy: Math.max(0, Math.min(100, claimScore)),
  };
}

// --- Generate Human-Readable Report ---

export function generateReport(
  productName: string | null,
  frontClaims: string[],
  nutrition: NutritionData,
  ingredientVerifications: IngredientVerification[],
  fssaiEvaluations: FSSAIEvaluation[],
  aharScore: AharScore,
): string {
  const lines: string[] = [];
  lines.push(`# AHAR X Analysis Report`);
  if (productName) lines.push(`\n**Product:** ${productName}`);
  lines.push(`\n## AHAR X Score: ${aharScore.overall}/100`);

  // Score breakdown
  lines.push(`\n### Score Breakdown`);
  lines.push(`- Label Transparency: ${aharScore.labelTransparency}/100`);
  lines.push(`- Nutrition Quality: ${aharScore.nutritionQuality}/100`);
  lines.push(`- Ingredient Integrity: ${aharScore.ingredientIntegrity}/100`);
  lines.push(`- Claim Accuracy: ${aharScore.claimAccuracy}/100`);

  // Nutrition summary
  if (nutrition.calories !== null || nutrition.protein !== null) {
    lines.push(`\n### Nutrition (per serving)`);
    if (nutrition.servingSize) lines.push(`- Serving Size: ${nutrition.servingSize}`);
    if (nutrition.calories !== null) lines.push(`- Calories: ${nutrition.calories} kcal`);
    if (nutrition.protein !== null) lines.push(`- Protein: ${nutrition.protein}g`);
    if (nutrition.carbohydrates !== null) lines.push(`- Carbs: ${nutrition.carbohydrates}g`);
    if (nutrition.sugars !== null) lines.push(`- Sugars: ${nutrition.sugars}g`);
    if (nutrition.fat !== null) lines.push(`- Fat: ${nutrition.fat}g`);
    if (nutrition.saturatedFat !== null) lines.push(`- Saturated Fat: ${nutrition.saturatedFat}g`);
    if (nutrition.transFat !== null) lines.push(`- Trans Fat: ${nutrition.transFat}g`);
    if (nutrition.fibre !== null) lines.push(`- Fibre: ${nutrition.fibre}g`);
    if (nutrition.sodium !== null) lines.push(`- Sodium: ${nutrition.sodium}mg`);
  }

  // Ingredient verification
  if (ingredientVerifications.length > 0) {
    lines.push(`\n### Front–Back Verification`);
    for (const v of ingredientVerifications) {
      const statusEmoji =
        v.status === "match_confirmed"
          ? "✅"
          : v.status === "percentage_not_stated"
            ? "⚠️"
            : v.status === "potential_inconsistency"
              ? "❌"
              : "❓";
      let line = `${statusEmoji} **${v.ingredient}**`;
      if (v.declaredPercentage) line += ` — ${v.declaredPercentage}`;
      else if (v.status === "percentage_not_stated") line += " — percentage not stated on label";
      else if (v.status === "potential_inconsistency") line += " — not found in back ingredient list";
      else if (v.status === "insufficient_evidence") line += " — insufficient evidence";
      lines.push(line);
    }
  }

  // FSSAI evaluation
  if (fssaiEvaluations.length > 0) {
    lines.push(`\n### FSSAI Regulatory Check`);
    for (const ev of fssaiEvaluations) {
      const icon =
        ev.status === "compliant"
          ? "✅"
          : ev.status === "non_compliant"
            ? "❌"
            : "⚠️";
      lines.push(`${icon} **${ev.ruleName}** — ${ev.detail}`);
    }
  }

  return lines.join("\n");
}
