import "dotenv/config";
import { createApp } from "./app.js";
import { createPrismaClient } from "./db.js";

const port = Number(process.env.PORT || 3000);
const secret = process.env.JWT_SECRET;
if (!secret || secret.length < 32) {
  throw new Error("JWT_SECRET deve conter pelo menos 32 caracteres.");
}

const prisma = createPrismaClient();
const app = createApp(prisma);
const server = app.listen(port, () => {
  console.log(`API disponível em http://localhost:${port}`);
});

async function shutdown(signal) {
  console.log(`Recebido ${signal}; encerrando a API...`);
  server.close(async (error) => {
    if (error) {
      console.error("Erro ao encerrar o servidor:", error);
      process.exitCode = 1;
    }
    try {
      await prisma.$disconnect();
    } catch (poolError) {
      console.error("Erro ao encerrar conexões do banco:", poolError);
      process.exitCode = 1;
    }
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
