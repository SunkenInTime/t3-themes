import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,
  likes: defineTable({
    themeId: v.string(),
    userId: v.id("users"),
  })
    .index("by_theme", ["themeId"])
    .index("by_theme_user", ["themeId", "userId"]),
});
