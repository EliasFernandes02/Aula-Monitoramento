import { createPaymentsService } from "../services/paymentsService.js";

export function createPaymentsController(prisma) {
  const paymentsService = createPaymentsService(prisma);

  return {
    create: async (req, res) => {
      const result = await paymentsService.create(req.userId, req.body);
      return res.status(201).json(result);
    },

    list: async (req, res) => {
      const payments = await paymentsService.list(req.userId);
      return res.json({ payments });
    },

    getById: async (req, res) => {
      const payment = await paymentsService.getById(req.userId, req.params.id);
      return res.json({ payment });
    }
  };
}
