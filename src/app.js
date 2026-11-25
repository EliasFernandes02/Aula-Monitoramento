import express from "express";
import helmet from "helmet";
import createHealthRouter from "./routes/health.js";
import createAuthRouter from "./routes/auth.js";
import createPaymentsRouter from "./routes/payments.js";
import { createRequestMetricsMiddleware } from "./middleware/requestMetrics.js";
import { createErrorHandler } from "./middleware/errorHandler.js";

export function createApp(prisma) {
  const app = express();

  app.use(helmet());
  app.use(createRequestMetricsMiddleware());
  app.use(express.json({ limit: "10kb" }));

  app.use("/health", createHealthRouter(prisma));
  app.use("/api/auth", createAuthRouter(prisma));
  app.use("/api/payments", createPaymentsRouter(prisma));

  app.use((req, res) => res.status(404).json({ error: "Rota não encontrada." }));
  app.use(createErrorHandler());

  return app;
}
