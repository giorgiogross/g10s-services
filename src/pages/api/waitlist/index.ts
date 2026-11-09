import type { APIRoute } from "astro";
import { joinRequest, type JoinResponse } from "../../../lib/waitlist/contract";
import { postmarkMailer } from "../../../lib/waitlist/postmark";
import { joinWaitlist } from "../../../lib/waitlist/service";
import { siteUrl } from "../../../lib/waitlist/site-url";
import { supabaseStore } from "../../../lib/waitlist/store";

export const prerender = false;

const json = (body: JoinResponse, status = 200) => Response.json(body, { status });

/** The waitlist form: stores the address unconfirmed and emails the confirm link. */
export const POST: APIRoute = async ({ request }) => {
  const parsed = joinRequest.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return json({ status: "error", message: parsed.error.issues[0]?.message ?? "Please check your email address." }, 400);
  }
  try {
    await joinWaitlist(parsed.data, siteUrl(request), { store: supabaseStore(), mailer: postmarkMailer() });
    return json({ status: "pending" });
  } catch (error) {
    console.error("waitlist signup failed", error);
    return json({ status: "error", message: "Something went wrong. Please try again in a moment." }, 502);
  }
};
