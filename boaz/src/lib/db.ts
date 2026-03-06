import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL?.trim();

function getDatabaseConfigError(url: string | undefined) {
  if (!url) {
    return "DATABASE_URL is missing. Add a PostgreSQL connection string in Harnix/boaz/.env.local.";
  }

  try {
    const parsedUrl = new URL(url);

    if (!["postgres:", "postgresql:"].includes(parsedUrl.protocol)) {
      return "DATABASE_URL must start with postgres:// or postgresql://.";
    }

    if (!parsedUrl.password) {
      return "DATABASE_URL is missing the database password.";
    }

    return null;
  } catch {
    return "DATABASE_URL is not a valid URL.";
  }
}

export const databaseConfigError = getDatabaseConfigError(databaseUrl);
export const hasDatabaseConfig = databaseConfigError === null;

const pool = hasDatabaseConfig ? new Pool({ connectionString: databaseUrl }) : null;
const adapter = pool ? new PrismaPg(pool) : null;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createUnavailablePrismaClient() {
  const errorMessage = databaseConfigError ?? "Database is unavailable.";

  return new Proxy(
    {},
    {
      get() {
        throw new Error(errorMessage);
      },
    }
  ) as PrismaClient;
}

export const prisma = hasDatabaseConfig
  ? globalForPrisma.prisma ??
    new PrismaClient({
      adapter: adapter ?? undefined,
      log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    })
  : createUnavailablePrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
