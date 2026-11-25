import { createHealthService } from "../services/healthService.js";

export function createHealthController(prisma) {
  const healthService = createHealthService(prisma);

  return {
    check: async (req, res) => {
      const result = await healthService.check();
      return res.json(result);
    }
  };
}
