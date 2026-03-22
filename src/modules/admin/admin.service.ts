import { prisma } from "../../lib/prisma.js";
import { QueryBuilder, type QueryParams } from "../../helpers/QueryBuilder.js";
import AppError from "../../helpers/AppError.js";
import { COURT_STATUS } from "../../shared/constants.js";

const AdminService = {
  /**
   * Get all users (paginated, searchable).
   */
  async getAllUsers(query: QueryParams) {
    const qb = new QueryBuilder(query, { defaultSort: "-createdAt" })
      .search(["name", "email", "phone"])
      .filter(["role", "emailVerified"])
      .sort()
      .paginate();

    const { where, orderBy, skip, take } = qb.build();

    const [users, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        orderBy,
        skip,
        take,
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
            select: {
              bookings: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return { users, meta: qb.countMeta(total) };
  },

  /**
   * Change a user's role.
   */
  async changeUserRole(userId: string, role: string) {
    const validRoles = ["USER", "ORGANIZER", "ADMIN"];
    if (!validRoles.includes(role)) {
      throw new AppError(
        400,
        `Invalid role. Must be one of: ${validRoles.join(", ")}`,
      );
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError(404, "User not found");

    return prisma.user.update({
      where: { id: userId },
      data: { role: role as any },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        updatedAt: true,
      },
    });
  },

  /**
   * Get dashboard statistics.
   */
  async getDashboardStats() {
    const [
      totalUsers,
      totalOrganizers,
      totalCourts,
      activeCourts,
      totalBookings,
      pendingBookings,
      paidBookings,
      totalAnnouncements,
    ] = await prisma.$transaction([
      prisma.user.count(),
      prisma.user.count({ where: { role: "ORGANIZER" } }),
      prisma.court.count(),
      prisma.court.count({ where: { status: "ACTIVE" } }),
      prisma.booking.count(),
      prisma.booking.count({ where: { status: "PENDING" } }),
      prisma.booking.count({ where: { status: "PAID" } }),
      prisma.announcement.count({ where: { isPublished: true } }),
    ]);

    return {
      users: { total: totalUsers, organizers: totalOrganizers },
      courts: { total: totalCourts, active: activeCourts },
      bookings: {
        total: totalBookings,
        pending: pendingBookings,
        paid: paidBookings,
      },
      announcements: { published: totalAnnouncements },
    };
  },

  /**
   * Get all courts waiting for admin approval.
   */
  async getPendingCourts(query: QueryParams) {
    const qb = new QueryBuilder(query, { defaultSort: "-createdAt" })
      .search(["name", "locationLabel", "type", "organizer.businessName"])
      .addCondition({ status: COURT_STATUS.PENDING_APPROVAL })
      .sort()
      .paginate();

    const { where, orderBy, skip, take } = qb.build();

    const [courts, total] = await prisma.$transaction([
      prisma.court.findMany({
        where,
        orderBy,
        skip,
        take,
        include: {
          organizer: {
            select: {
              id: true,
              businessName: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          media: { where: { isPrimary: true }, take: 1, select: { url: true } },
        },
      }),
      prisma.court.count({ where }),
    ]);

    return { courts, meta: qb.countMeta(total) };
  },

  /**
   * Approve a pending court so it becomes publicly active.
   */
  async approveCourt(courtId: string) {
    const court = await prisma.court.findUnique({ where: { id: courtId } });
    if (!court) throw new AppError(404, "Court not found");

    if (court.status !== COURT_STATUS.PENDING_APPROVAL) {
      throw new AppError(400, "Only pending courts can be approved");
    }

    return prisma.court.update({
      where: { id: courtId },
      data: { status: COURT_STATUS.ACTIVE },
    });
  },

  /**
   * Get all amenities (admin management view).
   */
  async getAmenities() {
    return prisma.amenity.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        icon: true,
        _count: {
          select: { courts: true },
        },
      },
    });
  },

  /**
   * Create a new amenity (admin only).
   */
  async createAmenity(data: { name: string; icon?: string | null }) {
    const name = data.name.trim();

    const exists = await prisma.amenity.findFirst({
      where: {
        name: {
          equals: name,
          mode: "insensitive",
        },
      },
    });

    if (exists) {
      throw new AppError(409, "Amenity with this name already exists");
    }

    return prisma.amenity.create({
      data: {
        name,
        icon: data.icon ?? null,
      },
    });
  },

  /**
   * Update an amenity (admin only).
   */
  async updateAmenity(
    amenityId: string,
    data: Partial<{ name: string; icon: string | null }>,
  ) {
    const amenity = await prisma.amenity.findUnique({
      where: { id: amenityId },
    });
    if (!amenity) throw new AppError(404, "Amenity not found");

    if (data.name) {
      const name = data.name.trim();
      const duplicate = await prisma.amenity.findFirst({
        where: {
          id: { not: amenityId },
          name: {
            equals: name,
            mode: "insensitive",
          },
        },
      });

      if (duplicate) {
        throw new AppError(409, "Amenity with this name already exists");
      }

      data.name = name;
    }

    return prisma.amenity.update({
      where: { id: amenityId },
      data: {
        ...data,
      },
    });
  },

  /**
   * Delete an amenity (admin only).
   * Amenities are independent presets; deleting one should simply detach it from courts.
   */
  async deleteAmenity(amenityId: string) {
    const amenity = await prisma.amenity.findUnique({
      where: { id: amenityId },
      select: { id: true },
    });

    if (!amenity) throw new AppError(404, "Amenity not found");

    return prisma.amenity.delete({
      where: { id: amenityId },
    });
  },
};

export default AdminService;
