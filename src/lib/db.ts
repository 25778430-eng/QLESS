import { PrismaClient } from "@prisma/client";
import { poolSafeUrl } from "./db-url";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const url = poolSafeUrl(process.env.DATABASE_URL);
export const db = globalForPrisma.prisma ?? new PrismaClient(url ? { datasources: { db: { url } } } : undefined);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
