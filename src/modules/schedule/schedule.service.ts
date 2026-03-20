import { prisma } from "../../lib/prisma.js";
import AppError from "../../helpers/AppError.js";
import { getOrganizerByUserId } from "../../helpers/getOrganizer.js";

const ScheduleService = {
  /**
   * Create a slot template for a court.
   */
  async createSlotTemplate(
    courtId: string,
    userId: string,
    data: {
      dayOfWeek: number;
      startMinute: number;
      endMinute: number;
      priceOverride?: number;
    },
  ) {
    const organizer = await getOrganizerByUserId(userId);
    const court = await prisma.court.findUnique({ where: { id: courtId } });
    if (!court) throw new AppError(404, "Court not found");
    if (court.organizerId !== organizer.id) {
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
    userId: string,
    data: Partial<{
      startMinute: number;
      endMinute: number;
      priceOverride: number;
      isActive: boolean;
    }>,
  ) {
    const organizer = await getOrganizerByUserId(userId);
    const template = await prisma.courtSlotTemplate.findUnique({
      where: { id: templateId },
      include: { court: { select: { organizerId: true } } },
    });

    if (!template) throw new AppError(404, "Slot template not found");
    if (template.court.organizerId !== organizer.id) {
      throw new AppError(403, "You can only manage your own court schedules");
    }

    return prisma.courtSlotTemplate.update({
      where: { id: templateId },
      data: data as any,
    });
  },

  /**
   * Delete a slot template (soft-deactivate).
   */
  async deleteSlotTemplate(templateId: string, userId: string) {
    const organizer = await getOrganizerByUserId(userId);
    const template = await prisma.courtSlotTemplate.findUnique({
      where: { id: templateId },
      include: { court: { select: { organizerId: true } } },
    });

    if (!template) throw new AppError(404, "Slot template not found");
    if (template.court.organizerId !== organizer.id) {
      throw new AppError(403, "You can only manage your own court schedules");
    }

    return prisma.courtSlotTemplate.update({
      where: { id: templateId },
      data: { isActive: false },
    });
  },

  /**
   * Get available slots for a court on a specific date.
   */
  async getAvailableSlots(courtId: string, date: string) {
    const targetDate = new Date(date);
    const dayOfWeek = targetDate.getDay(); // 0=Sun..6=Sat

    const templates = await prisma.courtSlotTemplate.findMany({
      where: { courtId, dayOfWeek, isActive: true },
      orderBy: { startMinute: "asc" },
    });

    if (templates.length === 0) return [];

    // Get booked slots for this date (PENDING or PAID)
    const bookedSlots = await prisma.bookingSlot.findMany({
      where: {
        courtId,
        bookingDate: targetDate,
        booking: {
          status: { in: ["PENDING", "PAID"] },
        },
      },
    });

    const available = templates.filter((t) => {
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
