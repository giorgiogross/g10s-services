import { z } from "zod";

/** POST /api/waitlist */
export const joinRequest = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  consent: z.literal(true, { errorMap: () => ({ message: "Please agree to receive emails from us." }) }),
});
export type JoinRequest = z.infer<typeof joinRequest>;

export type JoinResponse = { status: "pending" } | { status: "error"; message: string };

/** Where GET /api/waitlist/confirm sends the browser: /confirmed?status=… */
export const confirmStatus = z.enum(["confirmed", "expired", "invalid", "error"]);
export type ConfirmStatus = z.infer<typeof confirmStatus>;
