import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const THEME_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,47}$/;
const CLIENT_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export const toggle = mutation({
  args: { themeId: v.string(), clientId: v.string() },
  handler: async (ctx, { themeId, clientId }) => {
    if (!THEME_ID_PATTERN.test(themeId) || !CLIENT_ID_PATTERN.test(clientId)) {
      throw new Error("Invalid like request.");
    }
    const existing = await ctx.db
      .query("likes")
      .withIndex("by_theme_client", (q) => q.eq("themeId", themeId).eq("clientId", clientId))
      .unique();
    if (existing) {
      await ctx.db.delete(existing._id);
      return { liked: false };
    }
    await ctx.db.insert("likes", { themeId, clientId });
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
  args: { themeId: v.string(), clientId: v.string() },
  handler: async (ctx, { themeId, clientId }) => {
    const existing = await ctx.db
      .query("likes")
      .withIndex("by_theme_client", (q) => q.eq("themeId", themeId).eq("clientId", clientId))
      .unique();
    return existing !== null;
  },
});
