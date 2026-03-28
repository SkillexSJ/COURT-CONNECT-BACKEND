import { prisma } from "../../lib/prisma.js";
import { QueryBuilder, type QueryParams } from "../../helpers/QueryBuilder.js";
import AppError from "../../helpers/AppError.js";
import { generateBookingCode } from "../../shared/constants.js";
import { getOrganizerByUserId } from "../../helpers/getOrganizer.js";
import CouponService from "../coupon/coupon.service.js";
import type { CreateBookingInput, BookingResult } from "./booking.type.js";
import {
  calculateBookingSubtotal,
  getBookingExpiryDate,
  hasBookingAccess,
  restoreCouponUsage,
} from "./booking.helper.js";

const BookingService = {
  /**
   * Create a booking with selected slot templates.
   */
  async createBooking(
    userId: string,
    data: CreateBookingInput,
  ): Promise<BookingResult | null> {
    const { courtId, bookingDate, slotTemplateIds } = data;

    if (!slotTemplateIds || slotTemplateIds.length === 0) {
      throw new AppError(400, "At least one slot must be selected");
    }

    const court = await prisma.court.findUnique({
      where: { id: courtId },
      include: { organizer: true },
    });
    if (!court) throw new AppError(404, "Court not found");
    if (court.status !== "ACTIVE")
      throw new AppError(400, "Court is not available for booking");
    if (court.organizer.userId === userId)
      throw new AppError(400, "You cannot book your own court");

    const targetDate = new Date(bookingDate);

    // Fetch the requested slot templates
    const templates = await prisma.courtSlotTemplate.findMany({
      where: {
        id: { in: slotTemplateIds },
        courtId,
        isActive: true,
      },
    });

    if (templates.length !== slotTemplateIds.length) {
      throw new AppError(
        400,
        "One or more selected slots are invalid or inactive",
      );
    }

    // Check each slot for double-booking
    for (const t of templates) {
      const existing = await prisma.bookingSlot.findFirst({
        where: {
          courtId,
          bookingDate: targetDate,
          startMinute: t.startMinute,
          booking: {
            status: { in: ["PENDING", "PAID"] },
          },
        },
      });

      if (existing) {
        throw new AppError(
          409,
          `Slot ${t.startMinute}-${t.endMinute} is already booked for this date`,
        );
      }
    }

    // Calculate slot subtotal using helper
    const subtotalAmount = calculateBookingSubtotal(templates, court.basePrice);

    // Handle coupon and discount
    let couponId: string | null = null;
    let totalAmount = subtotalAmount;

    if (data.couponCode) {
      const couponResult = await CouponService.validateCouponForBooking(
        data.couponCode,
        subtotalAmount,
      );

      couponId = couponResult.coupon.id;
      totalAmount = couponResult.finalAmount;
    }

    const bookingCode = generateBookingCode();
    // Use helper for expiry
    const expiresAt = getBookingExpiryDate();

    // Create booking + slots in a transaction
    const booking = await prisma.$transaction(async (tx) => {
      const newBooking = await tx.booking.create({
        data: {
          bookingCode,
          userId,
          courtId,
          couponId,
          bookingDate: targetDate,
          totalAmount,
          expiresAt,
        },
      });

      // Create booking slots
      await tx.bookingSlot.createMany({
        data: templates.map((t) => ({
          bookingId: newBooking.id,
          courtId,
          bookingDate: targetDate,
          startMinute: t.startMinute,
          endMinute: t.endMinute,
        })),
      });

      // Increment coupon usage if used
      if (couponId) {
        await tx.coupon.update({
          where: { id: couponId },
          data: { usedCount: { increment: 1 } },
        });
      }

      return newBooking;
    });

    return (await prisma.booking.findUnique({
      where: { id: booking.id },
      include: {
        slots: true,
        court: { select: { id: true, name: true, slug: true } },
        coupon: {
          select: {
            id: true,
            code: true,
            discountType: true,
            discountValue: true,
          },
        },
      },
    })) as BookingResult | null;
  },

  /**
   * Get bookings for the logged-in user.
   */
  async getUserBookings(userId: string, query: QueryParams) {
    const qb = new QueryBuilder(query, { defaultSort: "-createdAt" })
      .addCondition({ userId })
      .filter(["status"])
      .sort()
      .paginate();

    const { where, orderBy, skip, take } = qb.build();

    const [bookings, total] = await prisma.$transaction([
      prisma.booking.findMany({
        where,
        orderBy,
        skip,
        take,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
          court: {
            select: {
              id: true,
              name: true,
              slug: true,
              type: true,
              media: {
                select: {
                  url: true,
                  isPrimary: true,
                },
                orderBy: [{ isPrimary: "desc" }, { id: "asc" }],
                take: 1,
              },
            },
          },
          slots: { orderBy: { startMinute: "asc" } },
        },
      }),
      prisma.booking.count({ where }),
    ]);

    return {
      bookings: bookings as unknown as BookingResult[],
      meta: qb.countMeta(total),
    };
  },

  /**
   * Get a single booking by ID.
   */
  async getBookingById(bookingId: string, userId: string, userRole: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        court: {
          select: {
            id: true,
            name: true,
            slug: true,
            type: true,
            organizerId: true,
            organizer: { select: { userId: true } },
          },
        },
        slots: { orderBy: { startMinute: "asc" } },
        user: { select: { id: true, name: true, email: true } },
        coupon: {
          select: { code: true, discountType: true, discountValue: true },
        },
      },
    });

    if (!booking) throw new AppError(404, "Booking not found");

    // Use helper for access control
    if (!hasBookingAccess(booking, userId, userRole)) {
      throw new AppError(403, "Access denied");
    }

    return booking as unknown as BookingResult;
  },

  /**
   * Approve a booking
   */
  async approveBooking(bookingId: string, userId: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        court: { select: { organizer: { select: { userId: true } } } },
      },
    });

    if (!booking) throw new AppError(404, "Booking not found");
    if (booking.status !== "PENDING") {
      throw new AppError(
        400,
        `Cannot approve a booking with status: ${booking.status}`,
      );
    }

    return (await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: "PAID",
        paidAt: new Date(),
      },
    })) as unknown as BookingResult;
  },

  /**
   * Reject a booking
   */
  async rejectBooking(bookingId: string, userId: string, reason?: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) throw new AppError(404, "Booking not found");
    if (booking.status !== "PENDING") {
      throw new AppError(
        400,
        `Cannot reject a booking with status: ${booking.status}`,
      );
    }

    return (await prisma.$transaction(async (tx) => {
      const updated = await tx.booking.update({
        where: { id: bookingId },
        data: { status: "CANCELLED" },
      });

      // Remove booking slots
      await tx.bookingSlot.deleteMany({ where: { bookingId } });

      // Use helper to restore coupon
      if (booking.couponId) {
        await restoreCouponUsage(tx, booking.couponId);
      }

      return updated;
    })) as unknown as BookingResult;
  },

  /**
   * Cancel a booking (User owner or Admin)
   */
  async cancelBooking(bookingId: string, userId: string, userRole: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) throw new AppError(404, "Booking not found");

    const canCancel = booking.userId === userId || userRole === "ADMIN";
    if (!canCancel)
      throw new AppError(403, "You can only cancel your own bookings");

    if (!["PENDING", "PAID"].includes(booking.status)) {
      throw new AppError(
        400,
        `Cannot cancel a booking with status: ${booking.status}`,
      );
    }

    return (await prisma.$transaction(async (tx) => {
      const updated = await tx.booking.update({
        where: { id: bookingId },
        data: { status: "CANCELLED" },
      });

      // Free up slots
      await tx.bookingSlot.deleteMany({ where: { bookingId } });

      // Use helper to restore coupon
      if (booking.status === "PENDING" && booking.couponId) {
        await restoreCouponUsage(tx, booking.couponId);
      }

      return updated;
    })) as unknown as BookingResult;
  },

  /**
   * Get bookings for a specific court (for Organizer dashboard).
   */
  async getCourtBookings(
    courtId: string,
    userId: string,
    userRole: string,
    query: QueryParams,
  ) {
    // Verify organizer owns this court
    if (userRole !== "ADMIN") {
      const organizer = await getOrganizerByUserId(userId);
      const court = await prisma.court.findUnique({ where: { id: courtId } });
      if (!court) throw new AppError(404, "Court not found");
      if (court.organizerId !== organizer.id) {
        throw new AppError(403, "Access denied");
      }
    }

    const qb = new QueryBuilder(query, { defaultSort: "-createdAt" })
      .addCondition({ courtId })
      .filter(["status", "bookingDate"])
      .search(["bookingCode"])
      .sort()
      .paginate();

    const { where, orderBy, skip, take } = qb.build();

    const [bookings, total] = await prisma.$transaction([
      prisma.booking.findMany({
        where,
        orderBy,
        skip,
        take,
        include: {
          user: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
          court: {
            select: {
              id: true,
              name: true,
              slug: true,
              type: true,
              media: {
                select: {
                  url: true,
                  isPrimary: true,
                },
                orderBy: [{ isPrimary: "desc" }, { id: "asc" }],
                take: 1,
              },
            },
          },
          slots: { orderBy: { startMinute: "asc" } },
        },
      }),
      prisma.booking.count({ where }),
    ]);

    return {
      bookings: bookings as unknown as BookingResult[],
      meta: qb.countMeta(total),
    };
  },
};

export default BookingService;
