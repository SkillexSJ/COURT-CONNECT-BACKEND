import AppError from "../../helpers/AppError";
import { prisma } from "../../lib/prisma";

const OrganizerService = {
  /**
   * Create an organizer profile for a user.
   */
  async createProfile(
    userId: string,
    data: {
      businessName: string;
      bio?: string;
      website?: string;
      phoneNumber?: string;
      address?: string;
    },
  ) {
    // Check if user already has an organizer profile
    const existing = await prisma.organizer.findUnique({ where: { userId } });
    if (existing) {
      throw new AppError(409, "You already have an organizer profile");
    }

    // Check the user exists and can become organizer
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError(404, "User not found");
    if (!["USER", "ORGANIZER", "ADMIN"].includes(user.role as string)) {
      throw new AppError(
        403,
        "Only users with USER, ORGANIZER, or ADMIN role can create an organizer profile",
      );
    }

    return prisma.$transaction(async (tx) => {
      if (user.role === "USER") {
        await tx.user.update({
          where: { id: userId },
          data: { role: "ORGANIZER" as any },
        });
      }

      return tx.organizer.create({
        data: {
          userId,
          businessName: data.businessName,
          bio: data.bio ?? null,
          website: data.website ?? null,
          phoneNumber: data.phoneNumber ?? null,
          address: data.address ?? null,
        },
      });
    });
  },

  /**
   * Get organizer profile by user ID.
   */
  async getProfile(userId: string) {
    const organizer = await prisma.organizer.findUnique({
      where: { userId },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        _count: {
          select: { courts: true },
        },
      },
    });

    if (!organizer) {
      throw new AppError(404, "Organizer profile not found");
    }

    return organizer;
  },

  /**
   * Update organizer profile.
   */
  async updateProfile(
    userId: string,
    data: Partial<{
      businessName: string;
      bio: string;
      website: string;
      phoneNumber: string;
      address: string;
    }>,
  ) {
    const organizer = await prisma.organizer.findUnique({ where: { userId } });
    if (!organizer) {
      throw new AppError(404, "Organizer profile not found. Create one first.");
    }

    return prisma.organizer.update({
      where: { userId },
      data,
    });
  },
};

export default OrganizerService;
