import { Router } from "express";
import { createHealthController } from "../controllers/healthController.js";

export default function createHealthRouter(prisma) {
  const router = Router();
  const controller = createHealthController(prisma);

  router.get("/", controller.check);

  return router;
}
