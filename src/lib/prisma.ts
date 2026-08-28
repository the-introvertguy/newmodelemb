import { PrismaClient } from "@prisma/client";

function getDatabaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url) return undefined;

  // Enforce serverless-safe connection pool limits (prevents FATAL: remaining connection slots)
  if (!url.includes("connection_limit=")) {
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}connection_limit=2&pool_timeout=20`;
  }
  return url;
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

const dbUrl = getDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: dbUrl ? { db: { url: dbUrl } } : undefined,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

globalForPrisma.prisma = prisma;

