import { describe, expect, it } from "vitest";
import { hashPin, validatePinFormat, verifyPin } from "./pin";

describe("PIN scrypt security", () => {
  it("validates 6-digit PIN format", () => {
    expect(validatePinFormat("123456")).toBe(true);
    expect(validatePinFormat("12345")).toBe(false);
    expect(validatePinFormat("12345a")).toBe(false);
  });

  it("hashes and verifies PIN using scrypt with random salt", () => {
    const hash1 = hashPin("482910");
    const hash2 = hashPin("482910");
    expect(hash1).not.toBe(hash2);
    expect(verifyPin("482910", hash1)).toBe(true);
    expect(verifyPin("000000", hash1)).toBe(false);
  });
});
