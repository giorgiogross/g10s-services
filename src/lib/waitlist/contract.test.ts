import { describe, expect, it } from "vitest";
import { joinRequest } from "./contract";

describe("joinRequest", () => {
  it("normalises the address", () => {
    expect(joinRequest.parse({ email: "  Ada@Example.COM ", consent: true })).toEqual({
      email: "ada@example.com",
      consent: true,
    });
  });

  it("requires consent and a valid address", () => {
    expect(joinRequest.safeParse({ email: "ada@example.com", consent: false }).success).toBe(false);
    expect(joinRequest.safeParse({ email: "ada@example.com" }).success).toBe(false);
    expect(joinRequest.safeParse({ email: "not-an-email", consent: true }).success).toBe(false);
  });
});
