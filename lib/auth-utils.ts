// NOTE: These utilities are for server-side manual auth handling.
// Since we switched to Supabase Native Auth, these might be unused but are kept for safety.

import crypto from "crypto";

// Basic email validation regex
export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Password length check
export function isValidPassword(password: string) {
  return password.length >= 8;
}

// Helper to generate a random token (useful for manual flows if needed later)
export function generateResetToken() {
  return crypto.randomBytes(32).toString("hex");
}

// Helper to calculate expiry time
export function getTokenExpiration() {
  const expires = new Date();
  expires.setHours(expires.getHours() + 1);
  return expires.toISOString();
}