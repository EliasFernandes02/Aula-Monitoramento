import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { createAuthenticateMiddleware } from "../src/middleware/authenticate.js";

const secret = "teste-seguro-com-mais-de-trinta-e-dois-caracteres";
process.env.JWT_SECRET = secret;

function createResponse() {
  return {
    statusCode: null,
    body: null,
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

function createRequest(token) {
  return { get: () => token ? `Bearer ${token}` : undefined };
}

test("rejects requests without a JWT", async () => {
  const middleware = createAuthenticateMiddleware({
    user: { findUnique: async () => null }
  });
  const response = createResponse();

  await middleware(createRequest(), response, () => assert.fail("next should not be called"));

  assert.equal(response.statusCode, 401);
});

test("rejects a malformed JWT", async () => {
  const middleware = createAuthenticateMiddleware({
    user: { findUnique: async () => null }
  });
  const response = createResponse();

  await middleware(createRequest("token-invalido"), response, () => assert.fail("next should not be called"));

  assert.equal(response.statusCode, 401);
});

test("rejects a valid JWT when its user no longer exists", async () => {
  const token = jwt.sign({}, secret, { subject: "user-123" });
  const middleware = createAuthenticateMiddleware({
    user: { findUnique: async () => null }
  });
  const response = createResponse();

  await middleware(createRequest(token), response, () => assert.fail("next should not be called"));

  assert.equal(response.statusCode, 401);
});

test("attaches the existing user and continues", async () => {
  const user = { id: "user-123", name: "Ana", email: "ana@example.com" };
  const token = jwt.sign({}, secret, { subject: user.id });
  const middleware = createAuthenticateMiddleware({
    user: {
      findUnique: async () => ({
        ...user,
        createdAt: new Date(),
        passwordHash: "hash-nao-retornado"
      })
    }
  });
  const request = createRequest(token);
  const response = createResponse();
  let nextCalled = false;

  await middleware(request, response, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(request.userId, user.id);
  assert.equal(request.user.id, user.id);
  assert.equal(request.user.name, user.name);
  assert.equal(request.user.email, user.email);
});
