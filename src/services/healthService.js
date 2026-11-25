import { createHealthRepository } from "../repositories/healthRepository.js";

export function createHealthService(prisma) {
  const healthRepository = createHealthRepository(prisma);

  return {
    check: async () => {
      await healthRepository.checkConnection();
      return { status: "ok" };
    }
  };
}
