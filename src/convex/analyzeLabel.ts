"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";

const VLY_GATEWAY_URL = "https://integrations.vly.ai/v1/llm/chat/completions";

const EXTRACTION_PROMPT = `You are an expert food-label analyst specializing in Indian FSSAI regulations.

Analyze BOTH images of this food package (FRONT and BACK) and extract ALL readable information.

CRITICAL RULES:
- Extract ONLY what is visibly readable on the label. Do NOT guess, infer, or invent any values.
- If text is blurry, cropped, or unreadable, mark it as "unreadable" — do NOT fabricate content.
- If a nutrition value or ingredient percentage cannot be read, set it to null — do NOT set it to 0.
- If a claim cannot be read, do NOT include it.
- For ingredients, extract the FULL list exactly as printed, preserving order.
- For each ingredient that has a percentage visible, extract the exact percentage string as printed.
- Look for vegetarian/non-vegetarian symbol (green dot = veg, brown/red dot = non-veg).
- Extract ALL allergen declarations.
- For front-of-pack claims, detect terms like: High Protein, Low Sugar, Sugar Free, No Added Sugar, Low Fat, Fat Free, High Fibre, Natural, Pure, Made With, Contains, and any ingredient prominently highlighted (e.g. "HAZELNUT", "ALMOND").

Return a JSON object with this EXACT structure:

{
  "frontAnalysis": {
    "productName": "string or null",
    "claims": ["all front-of-pack claims visible"],
    "highlightedIngredients": ["ingredients prominently highlighted on front"],
    "allergens": ["allergen warnings on front"],
    "otherText": ["other notable text on front"],
    "vegetarianSymbol": "string or null"
  },
  "backAnalysis": {
    "ingredientsList": "full raw ingredient list text",
    "ingredients": ["individual ingredient names in order"],
    "ingredientPercentages": {"ingredientName": "percentage as printed"},
    "nutritionPerServing": {
      "servingSize": "string or null",
      "calories": number or null,
      "protein": number or null,
      "carbohydrates": number or null,
      "sugars": number or null,
      "fat": number or null,
      "saturatedFat": number or null,
      "transFat": number or null,
      "fibre": number or null,
      "sodium": number or null
    },
    "allergens": ["allergen declarations from back label"],
    "qualifiers": ["qualifying statements"],
    "footnotes": ["footnotes and disclaimers"],
    "regulatoryInfo": {
      "fssaiLicenseNumber": "string or null",
      "manufacturingDate": "string or null",
      "expiryDate": "string or null",
      "brandName": "string or null"
    }
  },
  "extractionConfidence": {
    "frontOverall": "HIGH | MEDIUM | LOW",
    "backOverall": "HIGH | MEDIUM | LOW",
    "frontNotes": "brief note about front image quality",
    "backNotes": "brief note about back image quality"
  }
}

Respond with ONLY the JSON object. No markdown, no explanation.`;

function parseAiResponse(raw: string): Record<string, unknown> {
  const cleaned = raw.replace(/```json\n?|\n?```/g, "").trim();
  return JSON.parse(cleaned);
}

export const analyzeImages = action({
  args: {
    frontImageUrl: v.string(),
    backImageUrl: v.string(),
    scanSessionId: v.string(),
  },
  handler: async (_ctx, args) => {
    const apiKey = process.env.VLY_INTEGRATION_KEY;

    if (!apiKey) {
      throw new Error(
        "AI analysis service is not configured. VLY_INTEGRATION_KEY is missing.",
      );
    }

    // ── Attempt 1: AI SDK generateText (correct multimodal format) ──
    try {
      const ai = await import("ai");
      const openaiCompatible = await import("@ai-sdk/openai-compatible");

      const provider = openaiCompatible.createOpenAICompatible({
        name: "vly-gateway",
        baseURL: "https://integrations.vly.ai/v1/llm",
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      const model = provider("gpt-4o");

      const result = await ai.generateText({
        model,
        messages: [
          {
            role: "user",
            content: [
              { type: "text" as const, text: EXTRACTION_PROMPT },
              { type: "image" as const, image: args.frontImageUrl },
              { type: "image" as const, image: args.backImageUrl },
            ],
          },
        ],
        temperature: 0.1,
        maxOutputTokens: 4000,
      });

      const parsed = parseAiResponse(result.text);
      if (parsed.frontAnalysis && parsed.backAnalysis) {
        return {
          frontAnalysis: parsed.frontAnalysis,
          backAnalysis: parsed.backAnalysis,
          extractionConfidence: parsed.extractionConfidence,
        };
      }
    } catch (e: unknown) {
      console.error("[AHAR X] AI SDK attempt failed:", e instanceof Error ? e.message : String(e));
    }

    // ── Attempt 2: Raw fetch with OpenAI multimodal format ──
    try {
      const resp = await fetch(VLY_GATEWAY_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          max_tokens: 4000,
          temperature: 0.1,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: EXTRACTION_PROMPT },
                { type: "image_url", image_url: { url: args.frontImageUrl, detail: "high" } },
                { type: "image_url", image_url: { url: args.backImageUrl, detail: "high" } },
              ],
            },
          ],
        }),
      });

      if (resp.ok) {
        const data = await resp.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          const parsed = parseAiResponse(content);
          if (parsed.frontAnalysis && parsed.backAnalysis) {
            return {
              frontAnalysis: parsed.frontAnalysis,
              backAnalysis: parsed.backAnalysis,
              extractionConfidence: parsed.extractionConfidence,
            };
          }
        }
      } else {
        const errBody = await resp.text();
        console.error("[AHAR X] Raw fetch failed:", resp.status, errBody.slice(0, 300));
      }
    } catch (e: unknown) {
      console.error("[AHAR X] Raw fetch attempt failed:", e instanceof Error ? e.message : String(e));
    }

    // ── Attempt 3: Text-only via AI SDK (degraded — no vision) ──
    try {
      const ai = await import("ai");
      const openaiCompatible = await import("@ai-sdk/openai-compatible");

      const provider = openaiCompatible.createOpenAICompatible({
        name: "vly-gateway",
        baseURL: "https://integrations.vly.ai/v1/llm",
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      const model = provider("gpt-4o");

      const result = await ai.generateText({
        model,
        messages: [
          {
            role: "user",
            content: EXTRACTION_PROMPT + "\n\n[Images could not be transmitted. Return empty results with LOW confidence.]",
          },
        ],
        temperature: 0.1,
        maxOutputTokens: 2000,
      });

      const parsed = parseAiResponse(result.text);
      if (parsed.frontAnalysis && parsed.backAnalysis) {
        return {
          frontAnalysis: parsed.frontAnalysis,
          backAnalysis: parsed.backAnalysis,
          extractionConfidence: parsed.extractionConfidence,
        };
      }
    } catch (e: unknown) {
      console.error("[AHAR X] Text-only fallback failed:", e instanceof Error ? e.message : String(e));
    }

    throw new Error(
      "AI analysis service is temporarily unavailable. All connection attempts failed. Please try again.",
    );
  },
});
