"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";

// VLY Integration Gateway — OpenAI-compatible endpoint
const VLY_GATEWAY_URL = "https://integrations.vly.ai/v1/llm/chat/completions";

// AI vision analysis of food package images
export const analyzeImages = action({
  args: {
    frontImageUrl: v.string(),
    backImageUrl: v.string(),
    scanSessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.VLY_INTEGRATION_KEY;

    if (!apiKey) {
      throw new Error(
        "AI analysis service is not configured. " +
          "VLY_INTEGRATION_KEY is not set in the Convex backend environment variables. " +
          "Please configure it in the Convex dashboard under Settings > Environment Variables.",
      );
    }

    const prompt = `You are an expert food-label analyst specializing in Indian FSSAI regulations.

Analyze BOTH images of this food package (FRONT and BACK) and extract ALL readable information.

CRITICAL RULES:
- Extract ONLY what is visibly readable on the label. Do NOT guess, infer, or invent any values.
- If text is blurry, cropped, or unreadable, mark it as "unreadable" — do NOT fabricate content.
- If a nutrition value or ingredient percentage cannot be read, set it to null — do NOT set it to 0.
- If a claim cannot be read, do NOT include it.
- For ingredients, extract the FULL list exactly as printed, preserving order.
- For each ingredient that has a percentage visible, extract the exact percentage string as printed.
- Look for vegetarian/non-vegetarian symbol (green dot = veg, brown/red dot = non-veg).
- Extract ALL allergen declarations (e.g., "Contains: Milk, Soy", "May contain traces of nuts").
- Extract ALL qualifying statements (e.g., "Approximately", "May contain", "Best before").
- Extract ALL footnotes and disclaimers visible on the back label.
- For front-of-pack claims, detect terms like: High Protein, Low Sugar, Sugar Free, No Added Sugar, Low Fat, Fat Free, High Fibre, Source of Protein, Natural, Pure, Made With, Contains, and any ingredient prominently highlighted (e.g., "HAZELNUT", "ALMOND", "SAFFRON").

Return a JSON object with this EXACT structure:

{
  "frontAnalysis": {
    "productName": "string or null — brand/product name if visible",
    "claims": ["list of all front-of-pack claims visible, e.g. 'Made with Saffron', 'Sugar Free', '100% Natural'"],
    "highlightedIngredients": ["ingredients prominently mentioned/highlighted on front, e.g. 'Hazelnut', 'Almond', 'Saffron'"],
    "allergens": ["any allergen warnings visible on front"],
    "otherText": ["any other notable text on front"],
    "vegetarianSymbol": "string or null — 'vegetarian' or 'non-vegetarian' if dot symbol visible, null if not visible"
  },
  "backAnalysis": {
    "ingredientsList": "full raw ingredient list text as printed",
    "ingredients": ["individual ingredient names in order as listed"],
    "ingredientPercentages": {"ingredientName": "percentage as printed, e.g. '5.2%' or '0.1%'"},
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
    "qualifiers": ["qualifying statements like 'approximately', 'may contain traces of'"],
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
    "frontNotes": "string — brief note about front image quality if relevant",
    "backNotes": "string — brief note about back image quality if relevant"
  }
}

Respond with ONLY the JSON object. No markdown formatting, no explanation.`;

    // Build multimodal messages with base64 data URL images
    const messages = [
      {
        role: "user" as const,
        content: [
          { type: "text" as const, text: prompt },
          {
            type: "image_url" as const,
            image_url: {
              url: args.frontImageUrl,
              detail: "high" as const,
            },
          },
          {
            type: "image_url" as const,
            image_url: {
              url: args.backImageUrl,
              detail: "high" as const,
            },
          },
        ],
      },
    ];

    const response = await fetch(VLY_GATEWAY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        max_tokens: 4000,
        temperature: 0.1,
        messages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `AI analysis service error (${response.status}): ${errorText.slice(0, 300)}`,
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error(
        "AI analysis service returned no content. The images may be too large or unreadable.",
      );
    }

    // Parse the JSON response from the AI
    try {
      const cleaned = content.replace(/```json\n?|\n?```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      return {
        frontAnalysis: parsed.frontAnalysis,
        backAnalysis: parsed.backAnalysis,
        extractionConfidence: parsed.extractionConfidence,
      };
    } catch {
      throw new Error(
        `Failed to parse AI response as structured data. The AI may have returned an unexpected format. Raw content: ${content.slice(0, 500)}`,
      );
    }
  },
});
