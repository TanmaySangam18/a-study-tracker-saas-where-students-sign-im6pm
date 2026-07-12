import { createHmac } from "crypto";

export const SESSION_COOKIE = "study_tracker_session";
export const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

const SECRET = process.env.SESSION_SECRET ?? "dev-only-secret-set-SESSION_SECRET-in-production";

function sign(value: string): string {
  return createHmac("sha256", SECRET).update(value).digest("hex");
}

export function createSessionToken(userId: string): string {
  const expires = Date.now() + MAX_AGE_SECONDS * 1000;
  const payload = `${userId}.${expires}`;
  const signature = sign(payload);
  return Buffer.from(`${payload}.${signature}`).toString("base64url");
}

export function verifySessionToken(token: string): { userId: string } | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const parts = decoded.split(".");
    if (parts.length !== 3) return null;
    const [userId, expiresStr, signature] = parts;
    if (sign(`${userId}.${expiresStr}`) !== signature) return null;
    const expires = Number(expiresStr);
    if (Number.isNaN(expires) || Date.now() > expires) return null;
    return { userId };
  } catch {
    return null;
  }
}
