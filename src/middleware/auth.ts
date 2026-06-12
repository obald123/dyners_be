import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { prisma } from "../db/client";
import { ForbiddenError, UnauthorizedError } from "../lib/errors";

interface AccessTokenPayload {
  sub: string;
  type: "access";
}

export function signAccessToken(adminId: string): string {
  const payload: AccessTokenPayload = { sub: adminId, type: "access" };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: `${env.ACCESS_TOKEN_TTL_MIN}m`,
    issuer: "dyners-api",
  });
}

/** Requires a valid Bearer access token; sets req.adminId. */
export const requireAuth: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    next(new UnauthorizedError("Authentication required."));
    return;
  }

  try {
    const decoded = jwt.verify(header.slice("Bearer ".length), env.JWT_ACCESS_SECRET, {
      issuer: "dyners-api",
    }) as jwt.JwtPayload;
    if (decoded.type !== "access" || typeof decoded.sub !== "string") {
      throw new Error("wrong token type");
    }
    req.adminId = decoded.sub;
    next();
  } catch {
    next(new UnauthorizedError("Invalid or expired token."));
  }
};

export const requireSuperAdmin: RequestHandler = async (req, _res, next) => {
  if (!req.adminId) {
    next(new UnauthorizedError("Authentication required."));
    return;
  }

  const admin = await prisma.admin.findUnique({
    where: { id: req.adminId },
    select: { role: true },
  });

  if (admin?.role !== "super_admin") {
    next(new ForbiddenError("Super admin access required."));
    return;
  }

  next();
};
