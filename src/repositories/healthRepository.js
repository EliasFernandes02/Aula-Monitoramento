export function createHealthRepository(prisma) {
  return {
    checkConnection: async () => prisma.$queryRaw`SELECT 1`
  };
}
