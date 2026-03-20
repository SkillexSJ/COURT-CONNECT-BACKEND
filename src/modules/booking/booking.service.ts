import { prisma } from "../../lib/prisma.js";
import { QueryBuilder, type QueryParams } from "../../helpers/QueryBuilder.js";
import AppError from "../../helpers/AppError.js";
import {
  ACTIVE_BOOKING_STATUSES,
  generateBookingCode,
} from "../../shared/constants.js";
import type { Prisma } from "../../generated/prisma/client.js";
import type { BookingStatus } from "../../generated/prisma/enums.js";

type Decimal = Prisma.Decimal;

const BookingService = {
  /**
   * Create a booking with selected slot templates.
   */
  async createBooking(
    userId: string,
    data: {
      courtId: string;
      bookingDate: string;
      slotTemplateIds: string[];
      notes?: string;
      couponCode?: string;
    },
  ) {
    const { courtId, bookingDate, slotTemplateIds, notes } = data;

    if (!slotTemplateIds || slotTemplateIds.length === 0) {
      throw new AppError(400, "At least one slot must be selected");
    }

    const court = await prisma.court.findUnique({ where: { id: courtId } });
    if (!court || court.deletedAt) throw new AppError(404, "Court not found");
    if (court.status !== "ACTIVE") throw new AppError(400, "Court is not available for booking");

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
      throw new AppError(400, "One or more selected slots are invalid or inactive");
    }

    // Check each slot for double-booking
    for (const t of templates) {
      const existing = await prisma.bookingSlot.findFirst({
        where: {
          courtId,
          bookingDate: targetDate,
          startMinute: t.startMinute,
          endMinute: t.endMinute,
          booking: {
            status: { in: ACTIVE_BOOKING_STATUSES as unknown as BookingStatus[] },
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

    // Calculate pricing
    const subtotal = templates.reduce((sum, t) => {
      const price = t.priceOverride ?? court.basePrice;
      return sum + Number(price);
    }, 0);

    const bookingCode = generateBookingCode();

    // Create booking + slots + initial status in a transaction
    const booking = await prisma.$transaction(async (tx) => {
      const newBooking = await tx.booking.create({
        data: {
          bookingCode,
          userId,
          courtId,
          bookingDate: targetDate,
          subtotal,
          discountAmount: 0,
          totalAmount: subtotal,
          currency: court.currency,
          notes: notes ?? null,
        },
      });

      // Create booking slots
      await tx.bookingSlot.createMany({
        data: templates.map((t) => ({
          bookingId: newBooking.id,
          courtId,
          slotTemplateId: t.id,
          bookingDate: targetDate,
          startMinute: t.startMinute,
          endMinute: t.endMinute,
          unitPrice: t.priceOverride ?? court.basePrice,
        })),
      });

      // Initial status history
      await tx.bookingStatusHistory.create({
        data: {
          bookingId: newBooking.id,
          changedById: userId,
          fromStatus: null,
          toStatus: "PENDING",
          reason: "Booking created",
        },
      });

      return newBooking;
    });

    return prisma.booking.findUnique({
      where: { id: booking.id },
      include: {
        slots: true,
        court: { select: { id: true, name: true, slug: true } },
      },
    });
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
          court: { select: { id: true, name: true, slug: true, type: true } },
          slots: { orderBy: { startMinute: "asc" } },
        },
      }),
      prisma.booking.count({ where }),
    ]);

    return { bookings, meta: qb.countMeta(total) };
  },

  /**
   * Get a single booking by ID.
   */
  async getBookingById(bookingId: string, userId: string, userRole: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        court: {
          select: { id: true, name: true, slug: true, type: true, organizerId: true },
        },
        slots: { orderBy: { startMinute: "asc" } },
        statusHistory: {
          orderBy: { createdAt: "desc" },
          include: {
            changedBy: { select: { id: true, name: true } },
          },
        },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    if (!booking) throw new AppError(404, "Booking not found");

    // Access control: user can see own, organizer can see their court's, admin sees all
    const isOwner = booking.userId === userId;
    const isOrganizer = booking.court.organizerId === userId;
    const isAdmin = userRole === "ADMIN";

    if (!isOwner && !isOrganizer && !isAdmin) {
      throw new AppError(403, "Access denied");
    }

    return booking;
  },

  /**
   * Approve a booking (Organizer/Admin).
   */
  async approveBooking(bookingId: string, approverId: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { court: { select: { organizerId: true } } },
    });

    if (!booking) throw new AppError(404, "Booking not found");
    if (booking.status !== "PENDING") {
      throw new AppError(400, `Cannot approve a booking with status: ${booking.status}`);
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: "APPROVED",
          approvedById: approverId,
          approvedAt: new Date(),
        },
      });

      await tx.bookingStatusHistory.create({
        data: {
          bookingId,
          changedById: approverId,
          fromStatus: "PENDING",
          toStatus: "APPROVED",
          reason: "Booking approved",
        },
      });

      // Auto-create CourtMember if user doesn't already have membership
      await tx.courtMember.upsert({
        where: {
          userId_courtId: {
            userId: booking.userId,
            courtId: booking.courtId,
          },
        },
        create: {
          userId: booking.userId,
          courtId: booking.courtId,
          source: "BOOKING_APPROVED",
          status: "ACTIVE",
        },
        update: {},
      });

      return updated;
    });
  },

  /**
   * Reject a booking (Organizer/Admin).
   */
  async rejectBooking(bookingId: string, approverId: string, reason?: string) {
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });

    if (!booking) throw new AppError(404, "Booking not found");
    if (booking.status !== "PENDING") {
      throw new AppError(400, `Cannot reject a booking with status: ${booking.status}`);
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.booking.update({
        where: { id: bookingId },
        data: { status: "REJECTED" },
      });

      await tx.bookingStatusHistory.create({
        data: {
          bookingId,
          changedById: approverId,
          fromStatus: "PENDING",
          toStatus: "REJECTED",
          reason: reason || "Booking rejected",
        },
      });

      // Remove booking slots so the time becomes available again
      await tx.bookingSlot.deleteMany({ where: { bookingId } });

      return updated;
    });
  },

  /**
   * Cancel a booking (User owner or Admin).
   */
  async cancelBooking(bookingId: string, userId: string, userRole: string) {
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });

    if (!booking) throw new AppError(404, "Booking not found");

    const canCancel = booking.userId === userId || userRole === "ADMIN";
    if (!canCancel) throw new AppError(403, "You can only cancel your own bookings");

    const cancellable = ["PENDING", "APPROVED", "PAYMENT_PENDING"];
    if (!cancellable.includes(booking.status)) {
      throw new AppError(400, `Cannot cancel a booking with status: ${booking.status}`);
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
        },
      });

      await tx.bookingStatusHistory.create({
        data: {
          bookingId,
          changedById: userId,
          fromStatus: booking.status,
          toStatus: "CANCELLED",
          reason: "Booking cancelled by user",
        },
      });

      // Free up slots
      await tx.bookingSlot.deleteMany({ where: { bookingId } });

      return updated;
    });
  },

  /**
   * Get bookings for a specific court (Organizer dashboard).
   */
  async getCourtBookings(courtId: string, organizerId: string, userRole: string, query: QueryParams) {
    // Verify organizer owns this court (unless admin)
    if (userRole !== "ADMIN") {
      const court = await prisma.court.findUnique({ where: { id: courtId } });
      if (!court) throw new AppError(404, "Court not found");
      if (court.organizerId !== organizerId) {
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
          user: { select: { id: true, name: true, email: true } },
          slots: { orderBy: { startMinute: "asc" } },
        },
      }),
      prisma.booking.count({ where }),
    ]);

    return { bookings, meta: qb.countMeta(total) };
  },
};

export default BookingService;
