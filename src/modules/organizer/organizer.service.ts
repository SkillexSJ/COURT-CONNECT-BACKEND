import AppError from "../../helpers/AppError";
import { QueryBuilder, type QueryParams } from "../../helpers/QueryBuilder";
import { prisma } from "../../lib/prisma";
import { COURT_STATUS } from "../../shared/constants";
import { getOrganizerByUserId } from "../../helpers/getOrganizer";
import { roundMoney, clampDays } from "../../helpers/utils";
import type {
  SlotWindow,
  OrganizerProfileCreateInput,
  OrganizerProfileUpdateInput,
  RevenueBreakdownResult,
} from "./organizer.type";
import { getSlotWindow } from "./ogranizer.helper";
import { DAY_LABELS, SLOT_WINDOWS } from "./organizer.constants";

const OrganizerService = {
  /**
   * Public organizers directory.
   */
  async getPublicDirectory(query: QueryParams) {
    const qb = new QueryBuilder(query, {
      defaultSort: "-createdAt",
      limit: 24,
      maxLimit: 100,
    })
      .search([
        "name",
        "email",
        "organizerProfile.businessName",
        "organizerProfile.address",
      ])
      .sort()
      .paginate();

    const { where, orderBy, skip, take } = qb.build();

    const [organizerUsers, total] = await prisma.$transaction([
      prisma.user.findMany({
        where: {
          ...where,
          role: "ORGANIZER",
          organizerProfile: {
            isNot: null,
          },
        },
        orderBy,
        skip,
        take,
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          createdAt: true,
          organizerProfile: {
            select: {
              id: true,
              businessName: true,
              bio: true,
              website: true,
              address: true,
              isVerified: true,
              createdAt: true,
              courts: {
                where: { status: COURT_STATUS.ACTIVE },
                orderBy: { createdAt: "desc" },
                select: {
                  id: true,
                  slug: true,
                  name: true,
                  type: true,
                  locationLabel: true,
                  basePrice: true,
                  latitude: true,
                  longitude: true,
                  status: true,
                  createdAt: true,
                  media: {
                    where: { isPrimary: true },
                    take: 1,
                    select: { url: true },
                  },
                  _count: {
                    select: {
                      bookings: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      prisma.user.count({
        where: {
          ...where,
          role: "ORGANIZER",
          organizerProfile: {
            isNot: null,
          },
        },
      }),
    ]);

    const data = organizerUsers.map((user) => {
      const venues = user.organizerProfile?.courts ?? [];
      const totalBookings = venues.reduce(
        (sum, venue) => sum + (venue._count?.bookings ?? 0),
        0,
      );

      return {
        id: user.organizerProfile?.id ?? user.id,
        businessName: user.organizerProfile?.businessName ?? user.name,
        bio: user.organizerProfile?.bio ?? null,
        website: user.organizerProfile?.website ?? null,
        address: user.organizerProfile?.address ?? null,
        isVerified: user.organizerProfile?.isVerified ?? false,
        createdAt: user.organizerProfile?.createdAt ?? user.createdAt,
        user: {
          id: user.id,
          name: user.name,
          avatarUrl: user.avatarUrl,
        },
        totalVenues: venues.length,
        totalBookings,
        venues,
      };
    });

    return { organizers: data, meta: qb.countMeta(total) };
  },

  /**
   * Public single organizer profile.
   */
  async getPublicProfile(organizerId: string) {
    const organizer = await prisma.organizer.findUnique({
      where: { id: organizerId },
      select: {
        id: true,
        businessName: true,
        bio: true,
        website: true,
        address: true,
        isVerified: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        courts: {
          where: { status: COURT_STATUS.ACTIVE },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            slug: true,
            name: true,
            type: true,
            locationLabel: true,
            basePrice: true,
            latitude: true,
            longitude: true,
            status: true,
            createdAt: true,
            media: {
              where: { isPrimary: true },
              take: 1,
              select: { url: true },
            },
            _count: {
              select: {
                bookings: true,
              },
            },
          },
        },
      },
    });

    if (!organizer) {
      throw new AppError(404, "Organizer profile not found");
    }

    const totalBookings = organizer.courts.reduce(
      (sum, venue) => sum + (venue._count?.bookings ?? 0),
      0,
    );

    return {
      id: organizer.id,
      businessName: organizer.businessName,
      bio: organizer.bio,
      website: organizer.website,
      address: organizer.address,
      isVerified: organizer.isVerified,
      createdAt: organizer.createdAt,
      user: organizer.user,
      totalVenues: organizer.courts.length,
      totalBookings,
      venues: organizer.courts,
    };
  },

  /**
   * Create an organizer profile for a user.
   */
  async createProfile(userId: string, data: OrganizerProfileCreateInput) {
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
  async updateProfile(userId: string, data: OrganizerProfileUpdateInput) {
    const organizer = await prisma.organizer.findUnique({ where: { userId } });
    if (!organizer) {
      throw new AppError(404, "Organizer profile not found. Create one first.");
    }

    return prisma.organizer.update({
      where: { userId },
      data,
    });
  },

  /**
   * Organizer revenue breakdown by venue, day-of-week, and slot window.
   */
  async getRevenueBreakdown(
    userId: string,
    days = 90,
  ): Promise<RevenueBreakdownResult> {
    const organizer = await getOrganizerByUserId(userId);
    const safeDays = clampDays(days);
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - safeDays);
    fromDate.setHours(0, 0, 0, 0);

    const bookings = await prisma.booking.findMany({
      where: {
        status: { in: ["PAID", "COMPLETED"] },
        bookingDate: { gte: fromDate },
        court: { organizerId: organizer.id },
      },
      select: {
        id: true,
        courtId: true,
        totalAmount: true,
        bookingDate: true,
        court: { select: { name: true } },
        slots: { select: { startMinute: true } },
      },
    });

    // Initial maps setup
    const { venueMap, dayMap, windowMap, heatmapMap } =
      this._initializeBreakdownMaps();

    let totalRevenue = 0;

    for (const booking of bookings) {
      const bookingRevenue = Number(booking.totalAmount);
      const dayOfWeek = new Date(booking.bookingDate).getDay();
      const slotCount = Math.max(booking.slots.length, 1);
      const revenuePerSlot = bookingRevenue / slotCount;
      totalRevenue += bookingRevenue;

      // 1. Venue Tracking
      const v = venueMap.get(booking.courtId) ?? {
        courtId: booking.courtId,
        courtName: booking.court.name,
        revenue: 0,
        bookings: 0,
        slotCount: 0,
      };
      v.revenue += bookingRevenue;
      v.bookings += 1;
      v.slotCount += slotCount;
      venueMap.set(booking.courtId, v);

      // 2. Day Tracking
      const d = dayMap.get(dayOfWeek);
      if (d) {
        d.revenue += bookingRevenue;
        d.bookings += 1;
      }

      // 3. Slot & Heatmap Tracking
      for (const slot of booking.slots) {
        const slotWindow = getSlotWindow(slot.startMinute);

        const w = windowMap.get(slotWindow.key);
        if (w) {
          w.revenue += revenuePerSlot;
          w.bookings += 1;
          w.slotCount += 1;
        }

        const heatKey = `${dayOfWeek}:${slotWindow.key}`;
        const h = heatmapMap.get(heatKey);
        if (h) {
          h.revenue += revenuePerSlot;
          h.bookings += 1;
          h.slotCount += 1;
        }
      }
    }

    return {
      rangeDays: safeDays,
      summary: {
        totalRevenue: roundMoney(totalRevenue),
        paidBookings: bookings.length,
        avgBookingValue:
          bookings.length > 0 ? roundMoney(totalRevenue / bookings.length) : 0,
      },
      venueBreakdown: Array.from(venueMap.values())
        .map((v) => ({
          ...v,
          revenue: roundMoney(v.revenue),
          avgBookingValue:
            v.bookings > 0 ? roundMoney(v.revenue / v.bookings) : 0,
          sharePercent:
            totalRevenue > 0 ? roundMoney((v.revenue / totalRevenue) * 100) : 0,
        }))
        .sort((a, b) => b.revenue - a.revenue),
      dayOfWeekBreakdown: Array.from(dayMap.values()).map((d) => ({
        ...d,
        revenue: roundMoney(d.revenue),
        avgBookingValue:
          d.bookings > 0 ? roundMoney(d.revenue / d.bookings) : 0,
      })),
      slotWindowBreakdown: Array.from(windowMap.values()).map((w) => ({
        ...w,
        revenue: roundMoney(w.revenue),
        avgSlotValue: w.slotCount > 0 ? roundMoney(w.revenue / w.slotCount) : 0,
      })),
      heatmap: Array.from(heatmapMap.values()).map((cell) => ({
        ...cell,
        revenue: roundMoney(cell.revenue),
      })),
    };
  },

  _initializeBreakdownMaps() {
    const venueMap = new Map<string, any>();
    const dayMap = new Map<number, any>();
    const windowMap = new Map<string, any>();
    const heatmapMap = new Map<string, any>();

    for (let i = 0; i < 7; i++) {
      dayMap.set(i, {
        dayOfWeek: i,
        label: DAY_LABELS[i],
        revenue: 0,
        bookings: 0,
      });
      for (const sw of SLOT_WINDOWS) {
        heatmapMap.set(`${i}:${sw.key}`, {
          dayOfWeek: i,
          dayLabel: DAY_LABELS[i],
          windowKey: sw.key,
          windowLabel: sw.label,
          revenue: 0,
          bookings: 0,
          slotCount: 0,
        });
      }
    }

    for (const sw of SLOT_WINDOWS) {
      windowMap.set(sw.key, {
        windowKey: sw.key,
        label: sw.label,
        revenue: 0,
        bookings: 0,
        slotCount: 0,
      });
    }

    return { venueMap, dayMap, windowMap, heatmapMap };
  },
};

export default OrganizerService;
