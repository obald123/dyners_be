import { PrismaClient } from "@prisma/client";
import { env } from "../config/env";

declare global {
  var prismaGlobal: PrismaClient | undefined;
}

export const prisma =
  global.prismaGlobal ??
  new PrismaClient({
    log: env.isProduction ? ["error"] : ["warn", "error"],
  });

if (!env.isProduction) global.prismaGlobal = prisma;
