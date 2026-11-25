export function createUserRepository(prisma) {
  return {
    create: async ({ name, email, passwordHash }) => {
      const user = await prisma.user.create({
        data: { name, email, passwordHash },
        select: { id: true, name: true, email: true, createdAt: true }
      });

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        created_at: user.createdAt
      };
    },

    findByEmail: async (email) => {
      const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true, name: true, email: true, passwordHash: true }
      });

      if (!user) {
        return null;
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        password_hash: user.passwordHash
      };
    },

    findById: async (id) => {
      const user = await prisma.user.findUnique({
        where: { id },
        select: { id: true, name: true, email: true, createdAt: true }
      });

      if (!user) {
        return null;
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt
      };
    }
  };
}
