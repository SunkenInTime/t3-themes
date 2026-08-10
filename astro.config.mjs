// @ts-check
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://t3themes.com",
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
  },
});
