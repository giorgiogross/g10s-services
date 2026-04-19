// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";

export default defineConfig({
  site: "https://supaflow.services",
  compressHTML: true,
  integrations: [react()],
});
