import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Create a new scan session
export const createScanSession = mutation({
  args: {
    frontImageId: v.string(),
    backImageId: v.string(),
    profileCategory: v.optional(v.union(
      v.literal("general"),
      v.literal("child"),
      v.literal("fitness"),
      v.literal("weight"),
      v.literal("vegetarian"),
      v.literal("highProtein"),
    )),
    language: v.optional(v.union(
      v.literal("en"),
      v.literal("mr"),
      v.literal("hi"),
    )),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const sessionId = `scan_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const now = Date.now();

    const id = await ctx.db.insert("scanSessions", {
      userId: identity.subject,
      frontImageId: args.frontImageId,
      backImageId: args.backImageId,
      status: "uploaded",
      profileCategory: args.profileCategory ?? "general",
      language: args.language ?? "en",
      createdAt: now,
    });

    return { sessionId, docId: id };
  },
});

// Update scan session status
export const updateStatus = mutation({
  args: {
    docId: v.id("scanSessions"),
    status: v.union(
      v.literal("uploading"),
      v.literal("uploaded"),
      v.literal("analyzing"),
      v.literal("completed"),
      v.literal("failed"),
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.docId, { status: args.status });
  },
});

// Save analysis results to a scan session
export const saveAnalysis = mutation({
  args: {
    docId: v.id("scanSessions"),
    productName: v.optional(v.string()),
    analysis: v.any(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.docId, {
      status: "completed",
      productName: args.productName,
      analysis: args.analysis,
      completedAt: Date.now(),
    });
  },
});

// Mark scan as failed
export const markFailed = mutation({
  args: {
    docId: v.id("scanSessions"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.docId, {
      status: "failed",
      completedAt: Date.now(),
    });
  },
});

// Get all scans for current user (newest first)
export const listUserScans = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const scans = await ctx.db
      .query("scanSessions")
      .withIndex("by_user_created", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .collect();

    return scans;
  },
});

// Get a single scan session by ID
export const getScan = query({
  args: { docId: v.id("scanSessions") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.docId);
  },
});

// Get scan count for current user
export const getUserScanCount = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return 0;

    const scans = await ctx.db
      .query("scanSessions")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();

    return scans.length;
  },
});
