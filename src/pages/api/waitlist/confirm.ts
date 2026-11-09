import type { APIRoute } from "astro";
import type { ConfirmStatus } from "../../../lib/waitlist/contract";
import { confirmEmail } from "../../../lib/waitlist/service";
import { siteUrl } from "../../../lib/waitlist/site-url";
import { supabaseStore } from "../../../lib/waitlist/store";

export const prerender = false;

/** The link in the confirmation email: verifies the token, sets the confirmed flag, then shows /confirmed. */
export const GET: APIRoute = async ({ request, url }) => {
  let status: ConfirmStatus;
  try {
    status = await confirmEmail(url.searchParams.get("token"), { store: supabaseStore() });
  } catch (error) {
    console.error("waitlist confirm failed", error);
    status = "error";
  }
  const target = new URL("/confirmed", siteUrl(request));
  target.searchParams.set("status", status);
  return Response.redirect(target, 303);
};
