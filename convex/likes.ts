import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const THEME_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,47}$/;

export const toggle = mutation({
  args: { themeId: v.string() },
  handler: async (ctx, { themeId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Sign in with GitHub to like themes.");
    if (!THEME_ID_PATTERN.test(themeId)) throw new Error("Invalid theme id.");
    const existing = await ctx.db
      .query("likes")
      .withIndex("by_theme_user", (q) => q.eq("themeId", themeId).eq("userId", userId))
      .unique();
    if (existing) {
      await ctx.db.delete(existing._id);
      return { liked: false };
    }
    await ctx.db.insert("likes", { themeId, userId });
    return { liked: true };
  },
});

export const counts = query({
  args: {},
  handler: async (ctx) => {
    const likes = await ctx.db.query("likes").collect();
    const byTheme: Record<string, number> = {};
    for (const like of likes) byTheme[like.themeId] = (byTheme[like.themeId] ?? 0) + 1;
    return byTheme;
  },
});

export const count = query({
  args: { themeId: v.string() },
  handler: async (ctx, { themeId }) => {
    const likes = await ctx.db
      .query("likes")
      .withIndex("by_theme", (q) => q.eq("themeId", themeId))
      .collect();
    return likes.length;
  },
});

export const isLiked = query({
  args: { themeId: v.string() },
  handler: async (ctx, { themeId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return false;
    const existing = await ctx.db
      .query("likes")
      .withIndex("by_theme_user", (q) => q.eq("themeId", themeId).eq("userId", userId))
      .unique();
    return existing !== null;
  },
});
