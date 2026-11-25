function toApiPayment(payment) {
  return {
    id: payment.id,
    amount: payment.amount,
    currency: payment.currency,
    description: payment.description,
    status: payment.status,
    created_at: payment.createdAt
  };
}

export function createPaymentRepository(prisma) {
  return {
    create: async ({ userId, amount, currency, description }) => {
      const payment = await prisma.payment.create({
        data: {
          userId,
          amount,
          currency,
          description,
          status: "succeeded"
        },
        select: {
          id: true,
          amount: true,
          currency: true,
          description: true,
          status: true,
          createdAt: true
        }
      });
      return toApiPayment(payment);
    },

    findAllByUserId: async (userId) => {
      const payments = await prisma.payment.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          id: true,
          amount: true,
          currency: true,
          description: true,
          status: true,
          createdAt: true
        }
      });
      return payments.map(toApiPayment);
    },

    findByIdAndUserId: async (paymentId, userId) => {
      const payment = await prisma.payment.findFirst({
        where: { id: paymentId, userId },
        select: {
          id: true,
          amount: true,
          currency: true,
          description: true,
          status: true,
          createdAt: true
        }
      });
      return payment ? toApiPayment(payment) : null;
    }
  };
}
