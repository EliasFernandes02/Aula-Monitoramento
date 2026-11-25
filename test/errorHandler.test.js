import test from "node:test";
import assert from "node:assert/strict";
import AppError from "../src/utils/AppError.js";
import { createErrorHandler } from "../src/middleware/errorHandler.js";

function createResponse() {
  return {
    statusCode: null,
    body: null,
    headersSent: false,
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    }
  };
}

test("captures unexpected errors and returns a generic 500 response", () => {
  const captured = [];
  const error = new Error("database connection failed");
  const response = createResponse();
  const handler = createErrorHandler({
    captureException: (exception) => captured.push(exception),
    logError: () => {}
  });

  handler(error, {}, response, assert.fail);

  assert.deepEqual(captured, [error]);
  assert.equal(response.statusCode, 500);
  assert.deepEqual(response.body, { error: "Erro interno do servidor." });
});

test("captures server AppErrors but not expected client errors", () => {
  const captured = [];
  const handler = createErrorHandler({
    captureException: (error) => captured.push(error),
    logError: () => {}
  });
  const clientResponse = createResponse();
  const serverResponse = createResponse();
  const clientError = new AppError(404, "Não encontrado.");
  const serverError = new AppError(503, "Serviço indisponível.");

  handler(clientError, {}, clientResponse, assert.fail);
  handler(serverError, {}, serverResponse, assert.fail);

  assert.deepEqual(captured, [serverError]);
  assert.equal(clientResponse.statusCode, 404);
  assert.equal(serverResponse.statusCode, 503);
});

test("does not capture malformed JSON parser errors", () => {
  const captured = [];
  const response = createResponse();
  const handler = createErrorHandler({
    captureException: (error) => captured.push(error),
    logError: () => {}
  });

  handler({ type: "entity.parse.failed" }, {}, response, assert.fail);

  assert.deepEqual(captured, []);
  assert.equal(response.statusCode, 400);
});
