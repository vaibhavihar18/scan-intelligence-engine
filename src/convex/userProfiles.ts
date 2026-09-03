import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

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

// Get user profile
export const getProfile = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const existing = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .first();

    return existing?.profile ?? null;
  },
});

// Create or update user profile
export const upsertProfile = mutation({
  args: {
    profile: userProfileValidator,
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { profile: args.profile });
    } else {
      await ctx.db.insert("userProfiles", {
        userId: identity.subject,
        profile: args.profile,
      });
    }
  },
});

// Default profile for new users
export const DEFAULT_PROFILE = {
  dietaryGoal: "general_healthy" as const,
  allergies: [],
  avoidAddedSugar: false,
  avoidTransFat: true,
  preferHighFibre: true,
};
