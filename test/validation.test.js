import test from "node:test";
import assert from "node:assert/strict";
import { validatePayment, validateRegistration } from "../src/validation.js";

test("validates registration fields", () => {
  assert.equal(validateRegistration({
    name: "Ana Silva",
    email: "ana@example.com",
    password: "senha-segura"
  }), null);
  assert.match(validateRegistration({
    name: "A",
    email: "ana@example.com",
    password: "senha-segura"
  }), /nome/);
});

test("validates payment amount, currency and description", () => {
  assert.equal(validatePayment({ amount: 25.5, currency: "BRL", description: "Aula" }), null);
  assert.match(validatePayment({ amount: 0, currency: "BRL" }), /valor/);
  assert.match(validatePayment({ amount: 1.001, currency: "BRL" }), /valor/);
  assert.match(validatePayment({ amount: 25, currency: "brl" }), /moeda/);
});
