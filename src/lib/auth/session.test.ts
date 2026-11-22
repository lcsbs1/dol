import { describe, expect, it } from "vitest";
import { createSessionToken, verifySessionToken } from "./session";

describe("JWT session tokens", () => {
  it("creates and verifies HS256 session tokens", async () => {
    const token = await createSessionToken("user-uuid-123", "vault");
    const session = await verifySessionToken(token);
    expect(session).toEqual({
      userId: "user-uuid-123",
      mode: "vault",
    });
  });

  it("rejects tampered tokens", async () => {
    const session = await verifySessionToken("eyJhbGciOiJub25lIn0.eyJzdWIiOiIxIn0.");
    expect(session).toBeNull();
  });
});
