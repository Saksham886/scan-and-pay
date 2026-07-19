export interface ValidationResult {
  valid: boolean;
  error?: string;
}

const NAME_PATTERN = /^[A-Za-z][A-Za-z\s.'-]*[A-Za-z.]$/;
const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)+$/;

export function validateName(raw: string): ValidationResult {
  const name = raw.trim();
  if (!name) return { valid: false, error: "Name is required" };
  if (name.length < 2) return { valid: false, error: "Name must be at least 2 characters" };
  if (name.length > 60) return { valid: false, error: "Name must be 60 characters or less" };
  if (!NAME_PATTERN.test(name)) {
    return { valid: false, error: "Name can only contain letters, spaces, hyphens and apostrophes" };
  }
  if (/(.)\1{4,}/.test(name)) {
    return { valid: false, error: "Please enter a valid name" };
  }
  return { valid: true };
}

export function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, "").slice(-10);
}

export function validatePhone(raw: string): ValidationResult {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return { valid: false, error: "Phone number is required" };
  if (digits.length !== 10) {
    return { valid: false, error: "Phone number must be exactly 10 digits" };
  }
  if (!/^[6-9]/.test(digits)) {
    return { valid: false, error: "Enter a valid Indian mobile number (starts with 6-9)" };
  }
  if (/^(\d)\1{9}$/.test(digits)) {
    return { valid: false, error: "Please enter a valid phone number" };
  }
  return { valid: true };
}

export function validateEmail(raw: string): ValidationResult {
  const email = raw.trim().toLowerCase();
  if (!email) return { valid: false, error: "Email is required" };
  if (email.length > 254) return { valid: false, error: "Email is too long" };
  if (email.includes("..")) return { valid: false, error: "Please enter a valid email" };
  if (!EMAIL_PATTERN.test(email)) {
    return { valid: false, error: "Please enter a valid email address" };
  }
  const [local, domain] = email.split("@");
  if (local.length > 64) return { valid: false, error: "Email is not valid" };
  if (!domain.includes(".")) return { valid: false, error: "Email domain is not valid" };
  return { valid: true };
}
