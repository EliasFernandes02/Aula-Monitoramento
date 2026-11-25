import "dotenv/config";

if (!process.env.SENTRY_DSN?.trim()) {
  throw new Error("Configure SENTRY_DSN no .env antes de testar o envio ao Sentry.");
}

const Sentry = await import("@sentry/node");
await import("../src/instrument.js");
const { createApp } = await import("../src/app.js");
const sentryEnvironment = process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || "development";

const simulatedError = new Error("Erro de teste: falha intencional para validar HTTP 500 no Sentry.");
const prisma = {
  $queryRaw: async () => {
    throw simulatedError;
  }
};
const server = createApp(prisma).listen(0, "127.0.0.1");

try {
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });

  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}/health`);
  const responseBody = await response.json();

  if (response.status !== 500 || responseBody.error !== "Erro interno do servidor.") {
    throw new Error(`A API deveria responder 500, mas respondeu ${response.status}.`);
  }

  const flushed = await Sentry.flush(10000);
  if (!flushed) {
    throw new Error("O SDK não confirmou o envio do evento dentro do tempo limite.");
  }

  console.log("Erro HTTP 500 simulado e enviado ao Sentry.");
  console.log(`Ambiente no Sentry: ${sentryEnvironment}`);
} finally {
  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}
