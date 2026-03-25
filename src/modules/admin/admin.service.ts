import { prisma } from "../../lib/prisma";
import { QueryBuilder, type QueryParams } from "../../helpers/QueryBuilder";
import AppError from "../../helpers/AppError";
import { COURT_STATUS } from "../../shared/constants";
import {
  DAY_IN_MS,
  asAmount,
  formatMonthKey,
  formatMonthLabel,
  parseDays,
} from "./admin.helpers";

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
          organizerProfile: {
            select: {
              isVerified: true,
            },
          },
          _count: {
            select: {
              bookings: true,
            },
          },
          bookings: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              id: true,
              bookingDate: true,
              status: true,
              court: {
                select: {
                  id: true,
                  name: true,
                },
              },
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

    return prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          role: role as any,
          isApproved: role === "ORGANIZER" ? true : user.isApproved,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          updatedAt: true,
        },
      });

      if (role === "ORGANIZER") {
        await tx.organizer.updateMany({
          where: { userId },
          data: { isVerified: true },
        });
      }

      if (role === "USER") {
        await tx.organizer.updateMany({
          where: { userId },
          data: { isVerified: false },
        });
      }

      return updatedUser;
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
   * Get advanced reports for admin analytics page.
   */
  async getReports(query: QueryParams) {
    const rangeDays = parseDays(query.days);
    const now = new Date();
    const rangeStart = new Date(now.getTime() - (rangeDays - 1) * DAY_IN_MS);

    const [rawStats, recentRevenueBookings] = await prisma.$transaction(
      async (tx) => {
        const rawStats = await this._getRawReportStats(now, rangeStart);
        const recentRevenueBookings = await tx.booking.findMany({
          where: {
            status: { in: ["PAID", "COMPLETED"] },
            bookingDate: { gte: rangeStart },
          },
          select: {
            id: true,
            bookingDate: true,
            totalAmount: true,
            court: {
              select: {
                type: true,
                organizer: {
                  select: {
                    id: true,
                    businessName: true,
                    user: { select: { name: true } },
                    courts: { select: { id: true } },
                  },
                },
              },
            },
          },
        });
        return [rawStats, recentRevenueBookings];
      },
    );

    // Process maps
    const {
      monthlyRevenue,
      topOrganizers,
      courtTypePerformance,
      organizerCount,
    } = this._processRevenueData(recentRevenueBookings);

    return {
      rangeDays,
      generatedAt: now.toISOString(),
      summary: {
        lifetimeRevenue: Number(
          asAmount(rawStats.lifetimeRevenue._sum.totalAmount).toFixed(2),
        ),
        totalBookings: rawStats.totalBookings,
        completedTransactions:
          rawStats.paidBookings + rawStats.completedBookings,
        activeOrganizersInRange: organizerCount,
        totalOrganizers: rawStats.totalOrganizers,
        activeCoupons: rawStats.activeCoupons,
        expiringCouponsSoon: rawStats.expiringCouponsSoon,
      },
      statusBreakdown: [
        { status: "PENDING", count: rawStats.pendingBookings },
        { status: "PAID", count: rawStats.paidBookings },
        { status: "COMPLETED", count: rawStats.completedBookings },
        { status: "CANCELLED", count: rawStats.cancelledBookings },
      ],
      monthlyRevenue,
      topOrganizers,
      courtTypePerformance,
      alerts: this._generateAlerts(rawStats),
    };
  },

  /* ---- Internal Report Helpers ---- */

  async _getRawReportStats(now: Date, rangeStart: Date) {
    const [
      lifetimeRevenue,
      totalBookings,
      pendingBookings,
      paidBookings,
      completedBookings,
      cancelledBookings,
      pendingCourts,
      activeCoupons,
      expiringCouponsSoon,
      totalOrganizers,
    ] = await prisma.$transaction([
      prisma.booking.aggregate({
        where: { status: { in: ["PAID", "COMPLETED"] } },
        _sum: { totalAmount: true },
      }),
      prisma.booking.count(),
      prisma.booking.count({ where: { status: "PENDING" } }),
      prisma.booking.count({ where: { status: "PAID" } }),
      prisma.booking.count({ where: { status: "COMPLETED" } }),
      prisma.booking.count({ where: { status: "CANCELLED" } }),
      prisma.court.count({ where: { status: COURT_STATUS.PENDING_APPROVAL } }),
      prisma.coupon.count({ where: { isActive: true } }),
      prisma.coupon.count({
        where: {
          isActive: true,
          expiresAt: {
            gte: now,
            lte: new Date(now.getTime() + 30 * DAY_IN_MS),
          },
        },
      }),
      prisma.user.count({ where: { role: "ORGANIZER" } }),
    ]);

    return {
      lifetimeRevenue,
      totalBookings,
      pendingBookings,
      paidBookings,
      completedBookings,
      cancelledBookings,
      pendingCourts,
      activeCoupons,
      expiringCouponsSoon,
      totalOrganizers,
    };
  },

  _processRevenueData(bookings: any[]) {
    const monthMap = new Map<string, { revenue: number; bookings: number }>();
    const organizerMap = new Map<string, any>();
    const courtTypeMap = new Map<string, any>();

    for (const booking of bookings) {
      const amount = asAmount(booking.totalAmount);

      // Monthly
      const monthKey = formatMonthKey(booking.bookingDate);
      const m = monthMap.get(monthKey) ?? { revenue: 0, bookings: 0 };
      m.revenue += amount;
      m.bookings += 1;
      monthMap.set(monthKey, m);

      // Organizer
      const orgId = booking.court.organizer.id;
      const o = organizerMap.get(orgId) ?? {
        organizerId: orgId,
        businessName: booking.court.organizer.businessName,
        ownerName: booking.court.organizer.user.name,
        revenue: 0,
        paidBookings: 0,
        courtCount: booking.court.organizer.courts.length,
      };
      o.revenue += amount;
      o.paidBookings += 1;
      organizerMap.set(orgId, o);

      // Court Type
      const typeKey = booking.court.type || "Unknown";
      const t = courtTypeMap.get(typeKey) ?? {
        courtType: typeKey,
        revenue: 0,
        paidBookings: 0,
      };
      t.revenue += amount;
      t.paidBookings += 1;
      courtTypeMap.set(typeKey, t);
    }

    const monthlyRevenue = Array.from(monthMap.entries())
      .map(([monthKey, value]) => ({
        monthKey,
        monthLabel: formatMonthLabel(monthKey),
        revenue: Number(value.revenue.toFixed(2)),
        bookings: value.bookings,
      }))
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey));

    const topOrganizers = Array.from(organizerMap.values())
      .map((org) => ({ ...org, revenue: Number(org.revenue.toFixed(2)) }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6);

    const courtTypePerformance = Array.from(courtTypeMap.values())
      .map((row) => ({ ...row, revenue: Number(row.revenue.toFixed(2)) }))
      .sort((a, b) => b.revenue - a.revenue);

    return {
      monthlyRevenue,
      topOrganizers,
      courtTypePerformance,
      organizerCount: organizerMap.size,
    };
  },

  _generateAlerts(stats: any) {
    return [
      {
        key: "pending-court-approvals",
        label: "Pending court approvals",
        value: stats.pendingCourts,
        severity:
          stats.pendingCourts > 10
            ? "HIGH"
            : stats.pendingCourts > 0
              ? "MEDIUM"
              : "LOW",
      },
      {
        key: "pending-bookings",
        label: "Pending booking confirmations",
        value: stats.pendingBookings,
        severity:
          stats.pendingBookings > 25
            ? "HIGH"
            : stats.pendingBookings > 0
              ? "MEDIUM"
              : "LOW",
      },
      {
        key: "coupons-expiring-30d",
        label: "Coupons expiring in 30 days",
        value: stats.expiringCouponsSoon,
        severity:
          stats.expiringCouponsSoon > 10
            ? "HIGH"
            : stats.expiringCouponsSoon > 0
              ? "MEDIUM"
              : "LOW",
      },
    ];
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
   * Approve a pending court
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
   * Get all amenities
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
