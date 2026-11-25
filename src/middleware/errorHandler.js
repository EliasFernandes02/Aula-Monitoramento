import * as Sentry from "@sentry/node";
import AppError from "../utils/AppError.js";

export function createErrorHandler({
  captureException = Sentry.captureException,
  logError = console.error
} = {}) {
  return (error, req, res, next) => {
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
      if (error.statusCode >= 500) {
        captureException(error);
      }
      return res.status(error.statusCode).json({ error: error.message });
    }
    logError(error);
    captureException(error);
    return res.status(500).json({ error: "Erro interno do servidor." });
  };
}
