import * as Sentry from "@sentry/node";

function getRouteLabel(req) {
  if (!req.route?.path) {
    return "unmatched";
  }

  const routePath = Array.isArray(req.route.path)
    ? req.route.path.filter((path) => typeof path === "string").join("|")
    : req.route.path;
  if (typeof routePath !== "string") {
    return "unmatched";
  }

  const route = `${req.baseUrl}${routePath}` || "/";
  return route.length > 1 ? route.replace(/\/+$/, "") : route;
}

function getSafeRequestPayload(req) {
  const body = req.body;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return undefined;
  }

  const route = getRouteLabel(req);
  const payload = {};
  for (const [key, value] of Object.entries(body)) {
    if (route === "/api/payments" && key === "amount" &&
        typeof value === "number" && Number.isFinite(value)) {
      payload[key] = value;
    } else if (route === "/api/payments" && key === "currency" &&
        typeof value === "string" && /^[A-Z]{3}$/.test(value)) {
      payload[key] = value;
    } else {
      payload[key] = "[REDACTED]";
    }
  }

  return JSON.stringify(payload).slice(0, 1000);
}

export function createRequestMetricsMiddleware(
  metrics = Sentry.metrics,
  logger = Sentry.logger
) {
  return (req, res, next) => {
    const startedAt = process.hrtime.bigint();

    res.once("finish", () => {
      const attributes = {
        method: req.method,
        route: getRouteLabel(req),
        status_code: res.statusCode
      };
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
      const requestPayload = getSafeRequestPayload(req);

      metrics.count("api_requests", 1, { attributes });
      metrics.distribution("api_request_duration", durationMs, {
        unit: "millisecond",
        attributes
      });
      logger.info("API request completed", {
        ...attributes,
        duration_ms: durationMs,
        ...(req.userId ? { user_id: req.userId } : {}),
        ...(requestPayload !== undefined
          ? { request_payload: requestPayload }
          : {})
      });
    });

    return next();
  };
}
