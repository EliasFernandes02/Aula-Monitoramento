import jwt from "jsonwebtoken";
import { createUserRepository } from "../repositories/userRepository.js";

export function createAuthenticateMiddleware(prisma) {
  const userRepository = createUserRepository(prisma);

  return async function authenticate(req, res, next) {
    const authorization = req.get("authorization");
    if (!authorization || !authorization.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Token de acesso não informado." });
    }

    let payload;
    try {
      payload = jwt.verify(authorization.slice(7), process.env.JWT_SECRET);
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        return res.status(401).json({ error: "Token inválido ou expirado." });
      }
      return next(error);
    }

    if (!payload || typeof payload !== "object" || typeof payload.sub !== "string") {
      return res.status(401).json({ error: "Token inválido ou expirado." });
    }

    const user = await userRepository.findById(payload.sub);
    if (!user) {
      return res.status(401).json({ error: "Sessão inválida ou usuário não encontrado." });
    }

    req.user = user;
    req.userId = user.id;
    return next();
  };
}
