import { createHash, randomBytes } from "node:crypto";
import type { ConfirmStatus, JoinRequest } from "./contract";

/** Mailing list campaign of the placeholder page; the table holds other campaigns later. */
export const CAMPAIGN = "g10s-waitlist";
export const LINK_TTL_MS = 48 * 60 * 60 * 1000;
/** One confirmation email per address and minute, however often the form is sent. */
export const RESEND_AFTER_MS = 60 * 1000;

export type Subscriber = {
  id: string;
  confirmed: boolean;
  confirm_sent_at: string | null;
  confirm_expires_at: string | null;
};

export type PendingSignup = {
  campaign: string;
  email: string;
  marketing_consent: true;
  consent_at: string;
  confirm_token_hash: string;
  confirm_expires_at: string;
  confirm_sent_at: string;
};

export interface MailingListStore {
  find(campaign: string, email: string): Promise<Subscriber | null>;
  findByTokenHash(hash: string): Promise<Subscriber | null>;
  savePending(signup: PendingSignup): Promise<void>;
  markConfirmed(id: string, at: string): Promise<void>;
}

export interface ConfirmMailer {
  sendConfirm(email: string, confirmUrl: string): Promise<void>;
}

export type Deps = {
  store: MailingListStore;
  mailer: ConfirmMailer;
  now?: () => Date;
  token?: () => string;
};

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
const newToken = () => randomBytes(32).toString("base64url");

/**
 * Stores the address unconfirmed and emails a confirmation link (double opt-in). An address that is already
 * confirmed, or was sent a link within the last minute, gets the same answer and no email.
 */
export async function joinWaitlist(input: JoinRequest, baseUrl: string, deps: Deps): Promise<void> {
  const now = (deps.now ?? (() => new Date()))();
  const existing = await deps.store.find(CAMPAIGN, input.email);
  if (existing?.confirmed) return;
  if (existing?.confirm_sent_at && now.getTime() - Date.parse(existing.confirm_sent_at) < RESEND_AFTER_MS) return;

  const token = (deps.token ?? newToken)();
  await deps.store.savePending({
    campaign: CAMPAIGN,
    email: input.email,
    marketing_consent: true,
    consent_at: now.toISOString(),
    confirm_token_hash: hashToken(token),
    confirm_expires_at: new Date(now.getTime() + LINK_TTL_MS).toISOString(),
    confirm_sent_at: now.toISOString(),
  });
  const url = new URL("/api/waitlist/confirm", baseUrl);
  url.searchParams.set("token", token);
  await deps.mailer.sendConfirm(input.email, url.toString());
}

/** Sets the confirmed flag for the address the token was sent to. A second click on a used link still says confirmed. */
export async function confirmEmail(token: string | null, deps: Pick<Deps, "store" | "now">): Promise<ConfirmStatus> {
  if (!token) return "invalid";
  const subscriber = await deps.store.findByTokenHash(hashToken(token));
  if (!subscriber) return "invalid";
  if (subscriber.confirmed) return "confirmed";
  const now = (deps.now ?? (() => new Date()))();
  if (!subscriber.confirm_expires_at || Date.parse(subscriber.confirm_expires_at) < now.getTime()) return "expired";
  await deps.store.markConfirmed(subscriber.id, now.toISOString());
  return "confirmed";
}
