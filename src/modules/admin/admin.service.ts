import { prisma } from "../../lib/prisma.js";
import { QueryBuilder, type QueryParams } from "../../helpers/QueryBuilder.js";
import AppError from "../../helpers/AppError.js";

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
          memberSince: true,
          createdAt: true,
          _count: {
            select: {
              bookings: true,
              memberships: { where: { status: "ACTIVE" } },
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
    const validRoles = ["USER", "MEMBER", "ORGANIZER", "ADMIN"];
    if (!validRoles.includes(role)) {
      throw new AppError(400, `Invalid role. Must be one of: ${validRoles.join(", ")}`);
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
      totalMembers,
      totalOrganizers,
      totalCourts,
      activeCourts,
      totalBookings,
      pendingBookings,
      approvedBookings,
      totalAnnouncements,
    ] = await prisma.$transaction([
      prisma.user.count(),
      prisma.user.count({ where: { role: "MEMBER" } }),
      prisma.user.count({ where: { role: "ORGANIZER" } }),
      prisma.court.count({ where: { deletedAt: null } }),
      prisma.court.count({ where: { status: "ACTIVE", deletedAt: null } }),
      prisma.booking.count(),
      prisma.booking.count({ where: { status: "PENDING" } }),
      prisma.booking.count({ where: { status: "APPROVED" } }),
      prisma.announcement.count({ where: { isPublished: true } }),
    ]);

    return {
      users: { total: totalUsers, members: totalMembers, organizers: totalOrganizers },
      courts: { total: totalCourts, active: activeCourts },
      bookings: { total: totalBookings, pending: pendingBookings, approved: approvedBookings },
      announcements: { published: totalAnnouncements },
    };
  },
};

export default AdminService;
