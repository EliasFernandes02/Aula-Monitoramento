export function validateRegistration({ name, email, password } = {}) {
  if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 100) {
    return "O nome deve ter entre 2 e 100 caracteres.";
  }
  if (typeof email !== "string" || email.trim().length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return "Informe um e-mail válido.";
  }
  if (typeof password !== "string" || password.length < 8 || Buffer.byteLength(password, "utf8") > 72) {
    return "A senha deve ter entre 8 e 72 caracteres.";
  }
  return null;
}

export function validatePayment({ amount, currency, description } = {}) {
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0 ||
      amount > 9999999999.99 || Number(amount.toFixed(2)) !== amount) {
    return "O valor deve ser um número positivo de até 9999999999.99.";
  }
  if (!/^[A-Z]{3}$/.test(currency || "")) {
    return "A moeda deve ser informada com três letras maiúsculas, como BRL.";
  }
  if (description !== undefined &&
      (typeof description !== "string" || description.trim().length > 500)) {
    return "A descrição deve ter no máximo 500 caracteres.";
  }
  return null;
}
