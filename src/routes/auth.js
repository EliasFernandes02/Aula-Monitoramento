import { Router } from "express";
import { createAuthController } from "../controllers/authController.js";

export default function createAuthRouter(prisma) {
  const router = Router();
  const controller = createAuthController(prisma);

  router.post("/register", controller.register);
  router.post("/login", controller.login);

  return router;
}
