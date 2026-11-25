import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createUserRepository } from "../repositories/userRepository.js";
import AppError from "../utils/AppError.js";
import { validateRegistration } from "../validation.js";

export function createAuthService(prisma) {
  const userRepository = createUserRepository(prisma);

  return {
    register: async (input) => {
      const validationError = validateRegistration(input);
      if (validationError) {
        throw new AppError(400, validationError);
      }

      const name = input.name.trim();
      const email = input.email.trim().toLowerCase();
      const passwordHash = await bcrypt.hash(input.password, 12);

      try {
        return await userRepository.create({ name, email, passwordHash });
      } catch (error) {
        if (error.code === "P2002") {
          throw new AppError(409, "Este e-mail já está cadastrado.");
        }
        throw error;
      }
    },

    login: async (input = {}) => {
      const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
      const password = typeof input.password === "string" ? input.password : "";
      if (!email || !password) {
        throw new AppError(400, "Informe e-mail e senha.");
      }

      const user = await userRepository.findByEmail(email);
      if (!user || !(await bcrypt.compare(password, user.password_hash))) {
        throw new AppError(401, "E-mail ou senha inválidos.");
      }

      const expiresIn = process.env.JWT_EXPIRES_IN || "1h";
      const token = jwt.sign({}, process.env.JWT_SECRET, {
        subject: user.id,
        expiresIn
      });

      return {
        token,
        tokenType: "Bearer",
        expiresIn,
        user: { id: user.id, name: user.name, email: user.email }
      };
    }
  };
}
