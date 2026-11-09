import { describe, expect, it } from "vitest";
import {
  CAMPAIGN,
  LINK_TTL_MS,
  confirmEmail,
  hashToken,
  joinWaitlist,
  type PendingSignup,
  type Subscriber,
} from "./service";

function fakes(rows: (Subscriber & { email: string; hash?: string })[] = []) {
  const saved: PendingSignup[] = [];
  const sent: { email: string; url: string }[] = [];
  const confirmed: string[] = [];
  const store = {
    find: async (_campaign: string, email: string) => rows.find((r) => r.email === email) ?? null,
    findByTokenHash: async (hash: string) => rows.find((r) => r.hash === hash) ?? null,
    savePending: async (signup: PendingSignup) => void saved.push(signup),
    markConfirmed: async (id: string) => void confirmed.push(id),
  };
  const mailer = { sendConfirm: async (email: string, url: string) => void sent.push({ email, url }) };
  return { store, mailer, saved, sent, confirmed };
}

const now = new Date("2026-11-08T12:00:00Z");
const input = { email: "ada@example.com", consent: true as const };

describe("joinWaitlist", () => {
  it("stores the address unconfirmed with a hashed 48-hour token and emails the link", async () => {
    const f = fakes();
    await joinWaitlist(input, "https://g10s.xyz", { ...f, now: () => now, token: () => "tok" });
    expect(f.saved).toEqual([
      {
        campaign: CAMPAIGN,
        email: "ada@example.com",
        marketing_consent: true,
        consent_at: now.toISOString(),
        confirm_token_hash: hashToken("tok"),
        confirm_expires_at: new Date(now.getTime() + LINK_TTL_MS).toISOString(),
        confirm_sent_at: now.toISOString(),
      },
    ]);
    expect(f.saved[0].confirm_token_hash).not.toBe("tok");
    expect(f.sent).toEqual([{ email: "ada@example.com", url: "https://g10s.xyz/api/waitlist/confirm?token=tok" }]);
  });

  it("sends nothing to an address that is already confirmed", async () => {
    const f = fakes([
      { id: "1", email: "ada@example.com", confirmed: true, confirm_sent_at: null, confirm_expires_at: null },
    ]);
    await joinWaitlist(input, "https://g10s.xyz", { ...f, now: () => now });
    expect(f.saved).toEqual([]);
    expect(f.sent).toEqual([]);
  });

  it("sends at most one link a minute", async () => {
    const recent = new Date(now.getTime() - 30_000).toISOString();
    const f = fakes([
      { id: "1", email: "ada@example.com", confirmed: false, confirm_sent_at: recent, confirm_expires_at: null },
    ]);
    await joinWaitlist(input, "https://g10s.xyz", { ...f, now: () => now });
    expect(f.sent).toEqual([]);
  });

  it("sends a fresh link after the minute is over", async () => {
    const old = new Date(now.getTime() - 120_000).toISOString();
    const f = fakes([
      { id: "1", email: "ada@example.com", confirmed: false, confirm_sent_at: old, confirm_expires_at: old },
    ]);
    await joinWaitlist(input, "https://g10s.xyz", { ...f, now: () => now, token: () => "new" });
    expect(f.sent.map((s) => s.url)).toEqual(["https://g10s.xyz/api/waitlist/confirm?token=new"]);
  });
});

describe("confirmEmail", () => {
  const pending = (expires: string) => ({
    id: "7",
    email: "ada@example.com",
    hash: hashToken("tok"),
    confirmed: false,
    confirm_sent_at: now.toISOString(),
    confirm_expires_at: expires,
  });

  it("sets the confirmed flag for a valid link", async () => {
    const f = fakes([pending(new Date(now.getTime() + 1000).toISOString())]);
    expect(await confirmEmail("tok", { store: f.store, now: () => now })).toBe("confirmed");
    expect(f.confirmed).toEqual(["7"]);
  });

  it("refuses an expired link", async () => {
    const f = fakes([pending(new Date(now.getTime() - 1000).toISOString())]);
    expect(await confirmEmail("tok", { store: f.store, now: () => now })).toBe("expired");
    expect(f.confirmed).toEqual([]);
  });

  it("refuses an unknown or missing token", async () => {
    const f = fakes([pending(new Date(now.getTime() + 1000).toISOString())]);
    expect(await confirmEmail("other", { store: f.store, now: () => now })).toBe("invalid");
    expect(await confirmEmail(null, { store: f.store, now: () => now })).toBe("invalid");
  });

  it("still says confirmed when a used link is opened again", async () => {
    const f = fakes([{ ...pending(new Date(now.getTime() - 1000).toISOString()), confirmed: true }]);
    expect(await confirmEmail("tok", { store: f.store, now: () => now })).toBe("confirmed");
    expect(f.confirmed).toEqual([]);
  });
});
