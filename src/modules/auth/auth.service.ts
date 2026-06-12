import { createHash, randomBytes } from "node:crypto";
import argon2 from "argon2";
import { prisma } from "../../db/client";
import { env } from "../../config/env";
import { UnauthorizedError, BadRequestError, NotFoundError } from "../../lib/errors";
import { signAccessToken } from "../../middleware/auth";
import { logActivity } from "../../lib/activity";
import type { LoginInput, UpdateProfileInput } from "./auth.schemas";

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function issueTokens(adminId: string): Promise<TokenPair> {
  const refreshToken = randomBytes(64).toString("hex");
  const refreshExpiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: { tokenHash: hashToken(refreshToken), adminId, expiresAt: refreshExpiresAt },
  });

  return { accessToken: signAccessToken(adminId), refreshToken, refreshExpiresAt };
}

export async function login({ email, password }: LoginInput) {
  const admin = await prisma.admin.findUnique({ where: { email: email.toLowerCase() } });

  // Always burn a hash verification so the response time doesn't reveal
  // whether the email exists.
  const dummyHash =
    "$argon2id$v=19$m=65536,t=3,p=4$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
  const passwordOk = await argon2
    .verify(admin?.passwordHash ?? dummyHash, password)
    .catch(() => false);

  if (!admin) throw new UnauthorizedError();

  if (admin.lockedUntil && admin.lockedUntil > new Date()) {
    throw new UnauthorizedError("Account temporarily locked. Try again later.");
  }

  if (!passwordOk) {
    const failed = admin.failedAttempts + 1;
    await prisma.admin.update({
      where: { id: admin.id },
      data: {
        failedAttempts: failed,
        lockedUntil:
          failed >= MAX_FAILED_ATTEMPTS ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000) : null,
      },
    });
    throw new UnauthorizedError();
  }

  if (admin.failedAttempts > 0 || admin.lockedUntil) {
    await prisma.admin.update({
      where: { id: admin.id },
      data: { failedAttempts: 0, lockedUntil: null },
    });
  }

  const tokens = await issueTokens(admin.id);
  return { admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role }, ...tokens };
}

export async function refresh(rawToken: string) {
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(rawToken) },
  });

  if (!stored) throw new UnauthorizedError("Invalid session.");

  // Reuse of a revoked token means it leaked — kill every session.
  if (stored.revokedAt) {
    await prisma.refreshToken.updateMany({
      where: { adminId: stored.adminId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw new UnauthorizedError("Session revoked.");
  }

  if (stored.expiresAt < new Date()) throw new UnauthorizedError("Session expired.");

  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });

  return issueTokens(stored.adminId);
}

export async function logout(rawToken: string | undefined): Promise<void> {
  if (!rawToken) return;
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashToken(rawToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function getProfile(adminId: string) {
  const admin = await prisma.admin.findUnique({
    where: { id: adminId },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });
  if (!admin) throw new NotFoundError("Admin");
  return admin;
}

export async function updateProfile(adminId: string, input: UpdateProfileInput) {
  const admin = await prisma.admin.findUnique({ where: { id: adminId } });
  if (!admin) throw new NotFoundError("Admin");

  let passwordHash: string | undefined;
  if (input.newPassword) {
    const ok = await argon2.verify(admin.passwordHash, input.currentPassword ?? "").catch(() => false);
    if (!ok) throw new BadRequestError("Current password is incorrect.");
    passwordHash = await argon2.hash(input.newPassword, { type: argon2.argon2id });
    // Changing the password invalidates every other session.
    await prisma.refreshToken.updateMany({
      where: { adminId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  const updated = await prisma.admin.update({
    where: { id: adminId },
    data: {
      name: input.name,
      email: input.email?.toLowerCase(),
      ...(passwordHash ? { passwordHash } : {}),
    },
    select: { id: true, email: true, name: true, role: true },
  });

  logActivity(adminId, "Updated profile", "admin", adminId);
  return updated;
}
