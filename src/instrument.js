import "dotenv/config";
import * as Sentry from "@sentry/node";

const tracesSampleRate = Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0.1);
if (!Number.isFinite(tracesSampleRate) || tracesSampleRate < 0 || tracesSampleRate > 1) {
  throw new Error("SENTRY_TRACES_SAMPLE_RATE deve estar entre 0 e 1.");
}

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || "development",
  tracesSampleRate,
  enableLogs: true,
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: false,
    httpBodies: [],
    urlQueryParams: false
  }
});
