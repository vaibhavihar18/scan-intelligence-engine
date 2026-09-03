import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const evidenceValidator = v.object({
  scanSessionId: v.string(),
  sourceSide: v.union(v.literal("FRONT"), v.literal("BACK")),
  originalText: v.string(),
  normalizedValue: v.string(),
  confidence: v.union(v.literal("HIGH"), v.literal("MEDIUM"), v.literal("LOW")),
});

export const saveEvidence = mutation({
  args: {
    scanSessionId: v.string(),
    evidence: v.array(evidenceValidator),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("scanEvidence", {
      scanSessionId: args.scanSessionId,
      evidence: args.evidence,
    });
  },
});

export const getEvidenceForSession = query({
  args: { scanSessionId: v.string() },
  handler: async (ctx, args) => {
    const records = await ctx.db
      .query("scanEvidence")
      .withIndex("by_session", (q) =>
        q.eq("scanSessionId", args.scanSessionId),
      )
      .collect();

    return records.flatMap((r) => r.evidence);
  },
});
