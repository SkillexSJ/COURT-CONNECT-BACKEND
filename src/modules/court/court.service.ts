import { prisma } from "../../lib/prisma.js";
import { QueryBuilder, type QueryParams } from "../../helpers/QueryBuilder.js";
import AppError from "../../helpers/AppError.js";
import { slugify } from "../../shared/constants.js";
import { getOrganizerByUserId } from "../../helpers/getOrganizer.js";

const CourtService = {
  /**
   * Create a new court (Organizer).
   */
  async createCourt(userId: string, data: {
    name: string;
    type: string;
    locationLabel: string;
    description?: string;
    basePrice: number;
    latitude?: number;
    longitude?: number;
  }) {
    const organizer = await getOrganizerByUserId(userId);

    const baseSlug = slugify(data.name);
    let slug = baseSlug;
    let counter = 1;
    while (await prisma.court.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const court = await prisma.court.create({
      data: {
        organizerId: organizer.id,
        slug,
        name: data.name,
        type: data.type,
        locationLabel: data.locationLabel,
        description: data.description ?? null,
        basePrice: data.basePrice,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
      },
    });

    return court;
  },

  /**
   * Get all courts (public, paginated, filterable).
   */
  async getAllCourts(query: QueryParams) {
    const qb = new QueryBuilder(query, { defaultSort: "-createdAt", maxLimit: 50 })
      .search(["name", "locationLabel", "type"])
      .filter(["status", "type", "basePrice"])
      .sort()
      .paginate();

    const { where, orderBy, skip, take } = qb.build();

    const [courts, total] = await prisma.$transaction([
      prisma.court.findMany({
        where,
        orderBy,
        skip,
        take,
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
          organizer: {
            select: {
              id: true,
              businessName: true,
              user: { select: { name: true } },
            },
          },
          media: {
            where: { isPrimary: true },
            take: 1,
            select: { url: true },
          },
        },
      }),
      prisma.court.count({ where }),
    ]);

    return { courts, meta: qb.countMeta(total) };
  },

  /**
   * Get a single court by slug (public).
   */
  async getCourtBySlug(slug: string) {
    const court = await prisma.court.findUnique({
      where: { slug },
      include: {
        organizer: {
          select: {
            id: true,
            businessName: true,
            bio: true,
            user: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
        media: true,
        amenities: {
          select: { id: true, name: true, icon: true },
        },
        slotTemplates: {
          where: { isActive: true },
          orderBy: [{ dayOfWeek: "asc" }, { startMinute: "asc" }],
        },
        _count: {
          select: { bookings: true },
        },
      },
    });

    if (!court) {
      throw new AppError(404, "Court not found");
    }

    return court;
  },

  /**
   * Get courts owned by an organizer.
   */
  async getOrganizerCourts(userId: string, query: QueryParams) {
    const organizer = await getOrganizerByUserId(userId);

    const qb = new QueryBuilder(query, { defaultSort: "-createdAt" })
      .search(["name", "locationLabel"])
      .addCondition({ organizerId: organizer.id })
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
          _count: {
            select: { bookings: true },
          },
          media: { where: { isPrimary: true }, take: 1, select: { url: true } },
        },
      }),
      prisma.court.count({ where }),
    ]);

    return { courts, meta: qb.countMeta(total) };
  },

  /**
   * Update a court (organizer must own it).
   */
  async updateCourt(
    courtId: string,
    userId: string,
    data: Partial<{
      name: string;
      type: string;
      locationLabel: string;
      description: string;
      basePrice: number;
      latitude: number;
      longitude: number;
      status: string;
    }>,
  ) {
    const organizer = await getOrganizerByUserId(userId);
    const court = await prisma.court.findUnique({ where: { id: courtId } });
    if (!court) throw new AppError(404, "Court not found");
    if (court.organizerId !== organizer.id) {
      throw new AppError(403, "You can only update your own courts");
    }

    // If name changed, update slug
    let slug: string | undefined;
    if (data.name && data.name !== court.name) {
      const baseSlug = slugify(data.name);
      slug = baseSlug;
      let counter = 1;
      while (await prisma.court.findFirst({ where: { slug, id: { not: courtId } } })) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }
    }

    const updated = await prisma.court.update({
      where: { id: courtId },
      data: { ...data, ...(slug ? { slug } : {}) } as any,
    });

    return updated;
  },

  /**
   * Soft-delete a court (sets status to HIDDEN).
   */
  async softDeleteCourt(courtId: string, userId: string, userRole: string) {
    const court = await prisma.court.findUnique({ where: { id: courtId } });
    if (!court) throw new AppError(404, "Court not found");

    if (userRole !== "ADMIN") {
      const organizer = await getOrganizerByUserId(userId);
      if (court.organizerId !== organizer.id) {
        throw new AppError(403, "You can only delete your own courts");
      }
    }

    const deleted = await prisma.court.update({
      where: { id: courtId },
      data: { status: "HIDDEN" },
    });

    return deleted;
  },

  /**
   * Get members (users who have booked) of a court.
   */
  async getCourtMembers(courtId: string, query: QueryParams) {
    const qb = new QueryBuilder(query)
      .addCondition({ courtId })
      .sort()
      .paginate();

    const { where, orderBy, skip, take } = qb.build();

    const [bookings, total] = await prisma.$transaction([
      prisma.booking.findMany({
        where,
        orderBy,
        skip,
        take,
        select: {
          id: true,
          bookingCode: true,
          bookingDate: true,
          status: true,
          user: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
        },
      }),
      prisma.booking.count({ where }),
    ]);

    return { members: bookings, meta: qb.countMeta(total) };
  },
};

export default CourtService;
