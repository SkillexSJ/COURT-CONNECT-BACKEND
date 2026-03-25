import { prisma } from "../../lib/prisma";
import AppError from "../../helpers/AppError";

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
   * Update user profile
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

  async uploadAvatar(userId: string, file?: Express.Multer.File) {
    if (!file) {
      throw new AppError(400, "Profile image file is required");
    }

    const uploadedUrl =
      (file as Express.Multer.File & { path?: string; secure_url?: string })
        .path ??
      (file as Express.Multer.File & { secure_url?: string }).secure_url;

    if (!uploadedUrl) {
      throw new AppError(500, "Failed to upload profile image");
    }

    return prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: uploadedUrl },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
        updatedAt: true,
      },
    });
  },
};

export default UserService;
