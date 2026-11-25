import express from "express";
import helmet from "helmet";
import createHealthRouter from "./routes/health.js";
import createAuthRouter from "./routes/auth.js";
import createPaymentsRouter from "./routes/payments.js";
import { createRequestMetricsMiddleware } from "./middleware/requestMetrics.js";
import AppError from "./utils/AppError.js";

export function createApp(prisma) {
  const app = express();

  app.use(helmet());
  app.use(createRequestMetricsMiddleware());
  app.use(express.json({ limit: "10kb" }));

  app.use("/health", createHealthRouter(prisma));
  app.use("/api/auth", createAuthRouter(prisma));
  app.use("/api/payments", createPaymentsRouter(prisma));

  app.use((req, res) => res.status(404).json({ error: "Rota não encontrada." }));
  app.use((error, req, res, next) => {
    if (res.headersSent) {
      return next(error);
    }
    if (error.type === "entity.parse.failed") {
      return res.status(400).json({ error: "O corpo da requisição contém JSON inválido." });
    }
    if (error.type === "entity.too.large") {
      return res.status(413).json({ error: "O corpo da requisição excede o limite permitido." });
    }
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error(error);
    return res.status(500).json({ error: "Erro interno do servidor." });
  });

  return app;
}
