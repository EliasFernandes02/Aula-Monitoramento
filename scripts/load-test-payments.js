import "dotenv/config";
import { randomBytes, randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";

const maxRequests = 1000;
const maxConcurrency = 10;

function readBoundedInteger(name, fallback, maximum) {
  const rawValue = process.env[name];
  const value = rawValue === undefined || rawValue === ""
    ? fallback
    : Number(rawValue);

  if (!Number.isSafeInteger(value) || value < 1 || value > maximum) {
    throw new Error(`${name} deve ser um inteiro entre 1 e ${maximum}.`);
  }

  return value;
}

const baseUrl = new URL(process.env.LOAD_TEST_BASE_URL || "http://localhost:3000");
const isLoopback = ["localhost", "127.0.0.1", "::1", "[::1]"]
  .includes(baseUrl.hostname.toLowerCase());
const allowRemote = process.env.LOAD_TEST_ALLOW_REMOTE === "true";
const requestCount = readBoundedInteger("LOAD_TEST_REQUESTS", 100, maxRequests);
const concurrency = readBoundedInteger("LOAD_TEST_CONCURRENCY", 5, maxConcurrency);
const dryRun = process.argv.includes("--dry-run");
const confirmed = process.argv.includes("--confirm-write");

if (baseUrl.username || baseUrl.password) {
  throw new Error("Não inclua credenciais na URL de destino.");
}

if (!["http:", "https:"].includes(baseUrl.protocol)) {
  throw new Error("A URL de destino deve usar HTTP ou HTTPS.");
}

if (!isLoopback && (!allowRemote || baseUrl.protocol !== "https:")) {
  throw new Error(
    "O destino remoto exige HTTPS e LOAD_TEST_ALLOW_REMOTE=true. " +
    "Use isso somente contra uma API sua ou autorizada."
  );
}

if (!dryRun && !confirmed) {
  throw new Error(
    "Este teste grava dados. Rode primeiro --dry-run; para executar, acrescente --confirm-write."
  );
}

function endpoint(path) {
  return new URL(path, baseUrl);
}

async function postJson(path, payload, headers = {}) {
  const response = await fetch(endpoint(path), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15000)
  });
  const responseText = await response.text();
  let responseBody;

  try {
    responseBody = responseText ? JSON.parse(responseText) : {};
  } catch {
    responseBody = {};
  }

  if (!response.ok) {
    const detail = typeof responseBody.error === "string"
      ? `: ${responseBody.error}`
      : "";
    throw new Error(`${path} retornou HTTP ${response.status}${detail}.`);
  }

  return { response, body: responseBody };
}

function percentile(values, percentileValue) {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.ceil(sorted.length * percentileValue) - 1];
}

function formatMilliseconds(value) {
  return value === null ? "n/a" : `${value.toFixed(1)} ms`;
}

async function main() {
  console.log(`Destino: ${baseUrl.origin}`);
  console.log(`Criações de pagamento: ${requestCount}`);
  console.log(`Concorrência máxima: ${Math.min(concurrency, requestCount)}`);
  console.log("O teste registra um usuário descartável e mantém os dados no banco.");

  if (dryRun) {
    console.log("Dry run: nenhuma requisição foi enviada.");
    return;
  }

  const runId = randomUUID();
  const credentials = {
    name: "Teste de volume",
    email: `volume-${runId}@example.test`,
    password: randomBytes(32).toString("base64url")
  };

  await postJson("/api/auth/register", credentials);
  const { body: loginResult } = await postJson("/api/auth/login", {
    email: credentials.email,
    password: credentials.password
  });
  const token = loginResult.token;

  if (typeof token !== "string" || token.length === 0) {
    throw new Error("O login não retornou um token JWT.");
  }

  const durations = [];
  const failures = new Map();
  let nextRequest = 0;
  const startedAt = performance.now();

  async function worker() {
    while (true) {
      const requestIndex = nextRequest;
      nextRequest += 1;
      if (requestIndex >= requestCount) {
        return;
      }

      const requestStartedAt = performance.now();
      try {
        const { response } = await postJson(
          "/api/payments",
          {
            amount: Number((1 + (requestIndex % 1000) / 100).toFixed(2)),
            currency: "BRL",
            description: `Teste de volume ${runId.slice(0, 8)} ${requestIndex + 1}`
          },
          { authorization: `Bearer ${token}` }
        );
        const duration = performance.now() - requestStartedAt;

        if (response.status === 201) {
          durations.push(duration);
        } else {
          const reason = `HTTP ${response.status} (esperado 201)`;
          failures.set(reason, (failures.get(reason) || 0) + 1);
        }
      } catch (error) {
        const reason = error instanceof Error ? error.message : "Erro desconhecido";
        failures.set(reason, (failures.get(reason) || 0) + 1);
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, requestCount) }, () => worker())
  );

  const elapsedSeconds = Math.max((performance.now() - startedAt) / 1000, 0.001);
  const average = durations.length === 0
    ? null
    : durations.reduce((total, duration) => total + duration, 0) / durations.length;

  console.log("\nResultado:");
  console.log(`Sucesso: ${durations.length}`);
  console.log(`Falhas: ${requestCount - durations.length}`);
  console.log(`Tempo total: ${elapsedSeconds.toFixed(2)} s`);
  console.log(`Vazão bem-sucedida: ${(durations.length / elapsedSeconds).toFixed(2)} req/s`);
  console.log(`Latência média: ${formatMilliseconds(average)}`);
  console.log(`Latência p95: ${formatMilliseconds(percentile(durations, 0.95))}`);

  if (failures.size > 0) {
    console.log("Falhas por motivo:");
    for (const [reason, count] of failures) {
      console.log(`- ${reason}: ${count}`);
    }
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`Não foi possível executar o teste: ${error.message}`);
  process.exitCode = 1;
});
