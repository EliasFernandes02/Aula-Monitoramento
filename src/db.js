import { PrismaClient } from "@prisma/client";

export function createPrismaClient() {
  if (!process.env.DATABASE_URL) {
    throw new Error("A variável DATABASE_URL não foi configurada.");
  }

  return new PrismaClient();
}
