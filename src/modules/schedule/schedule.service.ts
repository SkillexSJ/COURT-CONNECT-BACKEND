import { prisma } from "../../lib/prisma.js";
import AppError from "../../helpers/AppError.js";
import { ACTIVE_BOOKING_STATUSES } from "../../shared/constants.js";
import type { BookingStatus } from "../../generated/prisma/enums.js";

const ScheduleService = {
  /**
   * Create a slot template for a court.
   */
  async createSlotTemplate(
    courtId: string,
    organizerId: string,
    data: {
      dayOfWeek: number;
      startMinute: number;
      endMinute: number;
      priceOverride?: number;
    },
  ) {
    const court = await prisma.court.findUnique({ where: { id: courtId } });
    if (!court || court.deletedAt) throw new AppError(404, "Court not found");
    if (court.organizerId !== organizerId) {
      throw new AppError(403, "You can only manage schedules for your own courts");
    }

    if (data.startMinute >= data.endMinute) {
      throw new AppError(400, "Start time must be before end time");
    }

    // Check overlap
    const overlap = await prisma.courtSlotTemplate.findFirst({
      where: {
        courtId,
        dayOfWeek: data.dayOfWeek,
        isActive: true,
        startMinute: { lt: data.endMinute },
        endMinute: { gt: data.startMinute },
      },
    });

    if (overlap) {
      throw new AppError(409, "This time slot overlaps with an existing slot template");
    }

    return prisma.courtSlotTemplate.create({
      data: {
        courtId,
        dayOfWeek: data.dayOfWeek,
        startMinute: data.startMinute,
        endMinute: data.endMinute,
        priceOverride: data.priceOverride ?? null,
      },
    });
  },

  /**
   * Get all slot templates for a court, grouped by day.
   */
  async getSlotTemplates(courtId: string) {
    const templates = await prisma.courtSlotTemplate.findMany({
      where: { courtId, isActive: true },
      orderBy: [{ dayOfWeek: "asc" }, { startMinute: "asc" }],
    });

    // Group by dayOfWeek
    const grouped: Record<number, typeof templates> = {};
    for (const t of templates) {
      if (!grouped[t.dayOfWeek]) grouped[t.dayOfWeek] = [];
      grouped[t.dayOfWeek]!.push(t);
    }

    return grouped;
  },

  /**
   * Update a slot template.
   */
  async updateSlotTemplate(
    templateId: string,
    organizerId: string,
    data: Partial<{
      startMinute: number;
      endMinute: number;
      priceOverride: number;
      isActive: boolean;
    }>,
  ) {
    const template = await prisma.courtSlotTemplate.findUnique({
      where: { id: templateId },
      include: { court: { select: { organizerId: true } } },
    });

    if (!template) throw new AppError(404, "Slot template not found");
    if (template.court.organizerId !== organizerId) {
      throw new AppError(403, "You can only manage your own court schedules");
    }

    return prisma.courtSlotTemplate.update({
      where: { id: templateId },
      data: data as any,
    });
  },

  /**
   * Delete a slot template.
   */
  async deleteSlotTemplate(templateId: string, organizerId: string) {
    const template = await prisma.courtSlotTemplate.findUnique({
      where: { id: templateId },
      include: { court: { select: { organizerId: true } } },
    });

    if (!template) throw new AppError(404, "Slot template not found");
    if (template.court.organizerId !== organizerId) {
      throw new AppError(403, "You can only manage your own court schedules");
    }

    // Soft-deactivate instead of hard delete (may have existing bookings)
    return prisma.courtSlotTemplate.update({
      where: { id: templateId },
      data: { isActive: false },
    });
  },

  /**
   * Get available slots for a court on a specific date.
   * Checks templates for the day-of-week, excludes closures and booked slots.
   */
  async getAvailableSlots(courtId: string, date: string) {
    const targetDate = new Date(date);
    const dayOfWeek = targetDate.getDay(); // 0=Sun..6=Sat

    // Get active templates for this day
    const templates = await prisma.courtSlotTemplate.findMany({
      where: { courtId, dayOfWeek, isActive: true },
      orderBy: { startMinute: "asc" },
    });

    if (templates.length === 0) return [];

    // Get closures for this date
    const closures = await prisma.courtClosure.findMany({
      where: { courtId, closureDate: targetDate },
    });

    // Get booked slots for this date
    const bookedSlots = await prisma.bookingSlot.findMany({
      where: {
        courtId,
        bookingDate: targetDate,
        booking: {
          status: { in: ACTIVE_BOOKING_STATUSES as unknown as BookingStatus[] },
        },
      },
    });

    // Filter templates: remove closed and already booked
    const available = templates.filter((t) => {
      // Check closure overlap
      const isClosed = closures.some(
        (c) => c.startMinute < t.endMinute && c.endMinute > t.startMinute,
      );
      if (isClosed) return false;

      // Check booking overlap
      const isBooked = bookedSlots.some(
        (b) => b.startMinute < t.endMinute && b.endMinute > t.startMinute,
      );
      return !isBooked;
    });

    return available.map((t) => ({
      slotTemplateId: t.id,
      dayOfWeek: t.dayOfWeek,
      startMinute: t.startMinute,
      endMinute: t.endMinute,
      price: t.priceOverride, // null means use court.basePrice
    }));
  },
};

export default ScheduleService;
