// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import vercel from "@astrojs/vercel";

// Pages stay static; the waitlist routes (`export const prerender = false`) run as Vercel functions.
export default defineConfig({
  site: "https://supaflow.services",
  compressHTML: true,
  integrations: [react()],
  adapter: vercel(),
});
