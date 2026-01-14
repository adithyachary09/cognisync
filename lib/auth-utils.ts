import bcrypt from "bcrypt";
import crypto from "crypto";

export function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function generateResetToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function getTokenExpiration() {
  const expires = new Date();
  expires.setHours(expires.getHours() + 1);
  return expires.toISOString();
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPassword(password: string) {
  return password.length >= 8;
}
