// src/services/auth.service.ts
import { eq } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import db from "../drizzle/db";
import {
  users,
  sessions,
  TInsertUser,
  TSelectUser,
} from "../drizzle/schema";

// ==========================================
// TYPES
// ==========================================
export type TPublicUser = Omit<TSelectUser, "passwordHash">;

export type TRegisterInput = {
  fullName: string;
  email: string;
  password: string; // plaintext, hashed inside
};

export type TLoginInput = {
  email: string;
  password: string;
};

export type TSessionContext = {
  ipAddress?: string;
  userAgent?: string;
};

const SESSION_TTL_DAYS = 30;
const BCRYPT_ROUNDS = 12;

// ==========================================
// HELPERS
// ==========================================
const toPublicUser = (u: TSelectUser): TPublicUser => {
  const { passwordHash, ...safe } = u;
  return safe;
};

const hashPassword = (plain: string) => bcrypt.hash(plain, BCRYPT_ROUNDS);
const verifyPassword = (plain: string, hash: string) =>
  bcrypt.compare(plain, hash);

const generateSessionId = () => randomBytes(32).toString("hex");

// ==========================================
// REGISTER
// ==========================================
export const registerUserService = async (
  input: TRegisterInput
): Promise<TPublicUser> => {
  const email = input.email.trim().toLowerCase();

  // basic guard (Zod at the route layer should already do this)
  if (!input.fullName?.trim() || !email || input.password.length < 8) {
    throw new Error("Invalid registration input");
  }

  // check duplicate first for a clean error
  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
  });
  if (existing) {
    throw new Error("Email already registered");
  }

  const passwordHash = await hashPassword(input.password);

  const [created] = await db
    .insert(users)
    .values({
      fullName: input.fullName.trim(),
      email,
      passwordHash,
      isAdmin: true,
    })
    .returning();

  return toPublicUser(created);
};

// ==========================================
// GET USER
// ==========================================
export const getUserByEmailService = async (
  email: string
): Promise<TSelectUser | undefined> => {
  return await db.query.users.findFirst({
    where: eq(users.email, email.trim().toLowerCase()),
  });
};

export const getPublicUserByEmailService = async (
  email: string
): Promise<TPublicUser | undefined> => {
  const user = await getUserByEmailService(email);
  return user ? toPublicUser(user) : undefined;
};

export const getPublicUserByIdService = async (
  id: string
): Promise<TPublicUser | undefined> => {
  const user = await db.query.users.findFirst({ where: eq(users.id, id) });
  return user ? toPublicUser(user) : undefined;
};

// ==========================================
// LOGIN
// ==========================================
export const loginUserService = async (
  input: TLoginInput
): Promise<TPublicUser> => {
  const email = input.email.trim().toLowerCase();

  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  // same generic message whether user exists or not → prevents enumeration
  if (!user) throw new Error("Invalid email or password");

  const ok = await verifyPassword(input.password, user.passwordHash);
  if (!ok) throw new Error("Invalid email or password");

  return toPublicUser(user);
};

// ==========================================
// SESSIONS
// ==========================================
export const createSessionService = async (
  userId: string,
  ctx: TSessionContext = {}
): Promise<{ sessionId: string; expiresAt: Date }> => {
  const sessionId = generateSessionId();
  const expiresAt = new Date(
    Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000
  );

  await db.insert(sessions).values({
    id: sessionId,
    userId,
    expiresAt,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
  });

  return { sessionId, expiresAt };
};

export const getSessionWithUserService = async (
  sessionId: string
): Promise<{ user: TPublicUser; expiresAt: Date } | null> => {
  const row = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId),
    with: { user: true },
  });

  if (!row) return null;
  if (row.expiresAt < new Date()) {
    // expired → clean up
    await db.delete(sessions).where(eq(sessions.id, sessionId));
    return null;
  }

  return { user: toPublicUser(row.user), expiresAt: row.expiresAt };
};

export const deleteSessionService = async (sessionId: string): Promise<void> => {
  await db.delete(sessions).where(eq(sessions.id, sessionId));
};

export const deleteAllUserSessionsService = async (
  userId: string
): Promise<void> => {
  await db.delete(sessions).where(eq(sessions.userId, userId));
};