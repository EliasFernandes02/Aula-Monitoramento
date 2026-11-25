import AppError from "../utils/AppError.js";
import { createPaymentRepository } from "../repositories/paymentRepository.js";
import { validatePayment } from "../validation.js";

export function createPaymentsService(prisma) {
  const paymentRepository = createPaymentRepository(prisma);

  return {
    create: async (userId, input) => {
      const validationError = validatePayment(input);
      if (validationError) {
        throw new AppError(400, validationError);
      }

      const payment = await paymentRepository.create({
        userId,
        amount: input.amount.toFixed(2),
        currency: input.currency,
        description: input.description?.trim() || null
      });

      return {
        payment,
        notice: "Pagamento simulado com sucesso."
      };
    },

    list: async (userId) => paymentRepository.findAllByUserId(userId),

    getById: async (userId, paymentId) => {
      const payment = await paymentRepository.findByIdAndUserId(paymentId, userId);
      if (!payment) {
        throw new AppError(404, "Pagamento não encontrado.");
      }
      return payment;
    }
  };
}
