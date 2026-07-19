import { createHash, randomBytes, scrypt as _scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scrypt = promisify(_scrypt) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number
) => Promise<Buffer>;

const SCRYPT_KEYLEN = 64;
const SCRYPT_SALT_BYTES = 16;

// Format: scrypt$<saltHex>$<hashHex>
// Legacy SHA-256 format: <saltHex>:<hashHex>  (auto-migrated on next login)

export async function hashPassword(password: string): Promise<string> {
  if (typeof password !== "string" || password.length === 0) {
    throw new Error("Password must be a non-empty string");
  }
  if (password.length > 256) {
    throw new Error("Password too long");
  }
  const salt = randomBytes(SCRYPT_SALT_BYTES);
  const derived = await scrypt(password, salt, SCRYPT_KEYLEN);
  return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
}

export async function comparePassword(
  password: string,
  stored: string
): Promise<boolean> {
  if (typeof password !== "string" || typeof stored !== "string") return false;

  // Modern scrypt format
  if (stored.startsWith("scrypt$")) {
    const parts = stored.split("$");
    if (parts.length !== 3) return false;
    const salt = Buffer.from(parts[1], "hex");
    const expected = Buffer.from(parts[2], "hex");
    if (expected.length !== SCRYPT_KEYLEN) return false;
    try {
      const candidate = await scrypt(password, salt, SCRYPT_KEYLEN);
      return candidate.length === expected.length && timingSafeEqual(candidate, expected);
    } catch {
      return false;
    }
  }

  // Legacy SHA-256 format (salt:hash) - kept for backward compat during migration
  if (stored.includes(":") && !stored.includes("$")) {
    const [salt, hash] = stored.split(":");
    if (!salt || !hash) return false;
    const candidate = createHash("sha256").update(password + salt).digest("hex");
    const hashBuffer = Buffer.from(hash, "hex");
    const candidateBuffer = Buffer.from(candidate, "hex");
    if (hashBuffer.length !== candidateBuffer.length) return false;
    return timingSafeEqual(hashBuffer, candidateBuffer);
  }

  return false;
}

export function isLegacyHash(stored: string): boolean {
  return !stored.startsWith("scrypt$") && stored.includes(":");
}

export function validatePasswordStrength(password: string): { valid: boolean; error?: string } {
  if (typeof password !== "string") return { valid: false, error: "Password is required" };
  if (password.length < 10) return { valid: false, error: "Password must be at least 10 characters" };
  if (password.length > 256) return { valid: false, error: "Password too long" };
  if (!/[a-z]/.test(password)) return { valid: false, error: "Password must contain a lowercase letter" };
  if (!/[A-Z]/.test(password)) return { valid: false, error: "Password must contain an uppercase letter" };
  if (!/\d/.test(password)) return { valid: false, error: "Password must contain a digit" };
  // Block trivial sequences
  if (/^(.)\1+$/.test(password)) return { valid: false, error: "Password is too weak" };
  return { valid: true };
}
