import { prisma } from "../../lib/prisma.js";
import AppError from "../../helpers/AppError.js";

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

    // Check the user exists and has ORGANIZER role
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError(404, "User not found");
    if (user.role !== "ORGANIZER" && user.role !== "ADMIN") {
      throw new AppError(403, "Only users with ORGANIZER role can create an organizer profile");
    }

    return prisma.organizer.create({
      data: {
        userId,
        businessName: data.businessName,
        bio: data.bio ?? null,
        website: data.website ?? null,
        phoneNumber: data.phoneNumber ?? null,
        address: data.address ?? null,
      },
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
