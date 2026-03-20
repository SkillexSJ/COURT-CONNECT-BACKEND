import { prisma } from "../../lib/prisma.js";

const UserService = {
  /**
   * Get user profile with memberships.
   */
  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        name: true,
        role: true,
        phone: true,
        avatarUrl: true,
        memberSince: true,
        createdAt: true,
        memberships: {
          where: { status: "ACTIVE" },
          select: {
            id: true,
            joinedAt: true,
            court: {
              select: { id: true, name: true, slug: true, type: true },
            },
          },
        },
      },
    });

    if (!user) {
      throw new (await import("../../helpers/AppError.js")).default(404, "User not found");
    }

    return user;
  },

  /**
   * Update user profile (name, phone, avatarUrl).
   */
  async updateProfile(
    userId: string,
    data: { name?: string; phone?: string; avatarUrl?: string; avatarPublicId?: string },
  ) {
    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        avatarUrl: true,
        memberSince: true,
        updatedAt: true,
      },
    });

    return user;
  },
};

export default UserService;
