import { createAuthService } from "../services/authService.js";

export function createAuthController(prisma) {
  const authService = createAuthService(prisma);

  return {
    register: async (req, res) => {
      const user = await authService.register(req.body);
      req.userId = user.id;
      return res.status(201).json({ user });
    },

    login: async (req, res) => {
      const result = await authService.login(req.body);
      req.userId = result.user.id;
      return res.json(result);
    }
  };
}
