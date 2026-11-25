import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { createRequestMetricsMiddleware } from "../src/middleware/requestMetrics.js";

test("records request count and duration with normalized route attributes", () => {
  const recorded = [];
  const logged = [];
  const metrics = {
    count: (...args) => recorded.push({ type: "count", args }),
    distribution: (...args) => recorded.push({ type: "distribution", args })
  };
  const logger = {
    info: (...args) => logged.push(args)
  };
  const middleware = createRequestMetricsMiddleware(metrics, logger);
  const req = {
    method: "POST",
    baseUrl: "/api/payments",
    route: { path: "/" },
    userId: "user-123",
    body: { amount: 49.9, currency: "BRL", description: "Informação privada" }
  };
  const res = new EventEmitter();
  res.statusCode = 200;
  let nextCalled = false;

  middleware(req, res, () => {
    nextCalled = true;
  });
  res.emit("finish");

  assert.equal(nextCalled, true);
  assert.equal(recorded.length, 2);
  assert.equal(recorded[0].type, "count");
  assert.equal(recorded[0].args[0], "api_requests");
  assert.equal(recorded[0].args[1], 1);
  assert.deepEqual(recorded[0].args[2].attributes, {
    method: "POST",
    route: "/api/payments",
    status_code: 200
  });
  assert.equal(recorded[1].type, "distribution");
  assert.equal(recorded[1].args[0], "api_request_duration");
  assert.equal(recorded[1].args[2].unit, "millisecond");
  assert.ok(recorded[1].args[1] >= 0);
  assert.equal(logged.length, 1);
  assert.equal(logged[0][0], "API request completed");
  assert.equal(logged[0][1].route, "/api/payments");
  assert.equal(logged[0][1].status_code, 200);
  assert.equal(logged[0][1].user_id, "user-123");
  assert.deepEqual(JSON.parse(logged[0][1].request_payload), {
    amount: 49.9,
    currency: "BRL",
    description: "[REDACTED]"
  });
  assert.ok(logged[0][1].duration_ms >= 0);
});

test("redacts authentication fields and unknown request payload values", () => {
  let logAttributes;
  const middleware = createRequestMetricsMiddleware({
    count: () => {},
    distribution: () => {}
  }, {
    info: (message, options) => {
      logAttributes = options;
    }
  });
  const req = {
    method: "POST",
    baseUrl: "/api/auth",
    route: { path: "/login" },
    body: { email: "ana@example.com", password: "nao-registrar", extra: "privado" }
  };
  const res = new EventEmitter();
  res.statusCode = 200;

  middleware(req, res, () => {});
  res.emit("finish");

  assert.deepEqual(JSON.parse(logAttributes.request_payload), {
    email: "[REDACTED]",
    password: "[REDACTED]",
    extra: "[REDACTED]"
  });
  assert.equal(logAttributes.user_id, undefined);
});

test("uses a bounded route label for unmatched paths", () => {
  let attributes;
  let logAttributes;
  const middleware = createRequestMetricsMiddleware({
    count: (name, value, options) => {
      attributes = options.attributes;
    },
    distribution: () => {}
  }, {
    info: (message, options) => {
      logAttributes = options;
    }
  });
  const req = { method: "GET", baseUrl: "", path: "/users/private-id" };
  const res = new EventEmitter();
  res.statusCode = 404;

  middleware(req, res, () => {});
  res.emit("finish");

  assert.equal(attributes.route, "unmatched");
  assert.equal(attributes.status_code, 404);
  assert.equal(logAttributes.route, "unmatched");
});
