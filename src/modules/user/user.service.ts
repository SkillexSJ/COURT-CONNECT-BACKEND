import { prisma } from "../../lib/prisma.js";
import AppError from "../../helpers/AppError.js";

const UserService = {
  /**
   * Get user profile with booking history.
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
        isApproved: true,
        createdAt: true,
        _count: {
          select: { bookings: true },
        },
      },
    });

    if (!user) {
      throw new AppError(404, "User not found");
    }

    return user;
  },

  /**
   * Update user profile (name, phone, avatarUrl).
   */
  async updateProfile(
    userId: string,
    data: { name?: string; phone?: string; avatarUrl?: string },
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
        updatedAt: true,
      },
    });

    return user;
  },
};

export default UserService;
