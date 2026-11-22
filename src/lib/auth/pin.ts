import crypto from "crypto";

export const MAX_PIN_ATTEMPTS = 5;
export const LOCKOUT_MINUTES = 15;

export function validatePinFormat(pin: string): boolean {
  return /^\d{6}$/.test(pin);
}

export function hashPin(pin: string): string {
  if (!validatePinFormat(pin)) {
    throw new Error("PIN deve conter exatamente 6 dígitos numéricos.");
  }
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(pin, salt, 64).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

export function verifyPin(pin: string, storedHash: string): boolean {
  if (!validatePinFormat(pin)) return false;
  const parts = storedHash.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;

  const [, salt, expectedHex] = parts;
  if (!salt || !expectedHex) return false;

  const derived = crypto.scryptSync(pin, salt, 64);
  const expected = Buffer.from(expectedHex, "hex");
  if (derived.length !== expected.length) return false;

  return crypto.timingSafeEqual(derived, expected);
}
