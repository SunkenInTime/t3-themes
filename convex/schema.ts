import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  likes: defineTable({
    themeId: v.string(),
    clientId: v.string(),
  })
    .index("by_theme", ["themeId"])
    .index("by_theme_client", ["themeId", "clientId"]),
});
