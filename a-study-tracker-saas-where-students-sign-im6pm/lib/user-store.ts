import { randomUUID, randomBytes, scryptSync, timingSafeEqual } from "crypto";

export type MemoryUser = {
  id: string;
  email: string;
  passwordHash: string;
  salt: string;
};

type Global = typeof globalThis & {
  __studyTrackerUsers?: Map<string, MemoryUser>;
};

const g = globalThis as Global;
const users = g.__studyTrackerUsers ?? (g.__studyTrackerUsers = new Map());

export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return { hash, salt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const attempt = scryptSync(password, salt, 64);
  const original = Buffer.from(hash, "hex");
  if (attempt.length !== original.length) return false;
  return timingSafeEqual(attempt, original);
}

export function createUser(email: string, password: string): MemoryUser {
  const { hash, salt } = hashPassword(password);
  const user: MemoryUser = {
    id: randomUUID(),
    email: email.toLowerCase(),
    passwordHash: hash,
    salt,
  };
  users.set(user.email, user);
  return user;
}

export function findUserByEmail(email: string): MemoryUser | undefined {
  return users.get(email.toLowerCase());
}

export function findUserById(id: string): MemoryUser | undefined {
  for (const user of users.values()) {
    if (user.id === id) return user;
  }
  return undefined;
}
