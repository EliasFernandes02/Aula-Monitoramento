import { Router } from "express";
import { createPaymentsController } from "../controllers/paymentsController.js";
import { createAuthenticateMiddleware } from "../middleware/authenticate.js";

export default function createPaymentsRouter(prisma) {
  const router = Router();
  const controller = createPaymentsController(prisma);
  const authenticate = createAuthenticateMiddleware(prisma);
  router.use(authenticate);

  router.post("/", controller.create);
  router.get("/", controller.list);
  router.get("/:id", controller.getById);

  return router;
}
