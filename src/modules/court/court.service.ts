import { prisma } from "../../lib/prisma.js";
import { QueryBuilder, type QueryParams } from "../../helpers/QueryBuilder.js";
import AppError from "../../helpers/AppError.js";
import { slugify } from "../../shared/constants.js";

const CourtService = {
  /**
   * Create a new court (Organizer).
   */
  async createCourt(organizerId: string, data: {
    name: string;
    type: string;
    surface: string;
    locationLabel: string;
    description?: string;
    basePrice: number;
    currency: string;
    capacity: number;
    isIndoor?: boolean;
  }) {
    const baseSlug = slugify(data.name);
    // Ensure unique slug
    let slug = baseSlug;
    let counter = 1;
    while (await prisma.court.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const court = await prisma.court.create({
      data: {
        organizerId,
        slug,
        name: data.name,
        type: data.type,
        surface: data.surface,
        locationLabel: data.locationLabel,
        description: data.description ?? null,
        basePrice: data.basePrice,
        currency: data.currency,
        capacity: data.capacity,
        isIndoor: data.isIndoor ?? false,
      },
    });

    return court;
  },

  /**
   * Get all courts (public, paginated, filterable).
   */
  async getAllCourts(query: QueryParams) {
    const qb = new QueryBuilder(query, { defaultSort: "-createdAt", maxLimit: 50 })
      .search(["name", "locationLabel", "type", "surface"])
      .filter(["status", "type", "surface", "isIndoor", "basePrice"])
      .softDelete()
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
          surface: true,
          locationLabel: true,
          basePrice: true,
          currency: true,
          capacity: true,
          status: true,
          isIndoor: true,
          createdAt: true,
          organizer: {
            select: { id: true, name: true },
          },
          media: {
            where: { isPrimary: true },
            take: 1,
            select: { secureUrl: true },
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
          select: { id: true, name: true, avatarUrl: true },
        },
        media: { orderBy: { sortOrder: "asc" } },
        amenities: {
          include: {
            amenity: { select: { id: true, name: true, slug: true, icon: true } },
          },
        },
        slotTemplates: {
          where: { isActive: true },
          orderBy: [{ dayOfWeek: "asc" }, { startMinute: "asc" }],
        },
        _count: {
          select: { members: { where: { status: "ACTIVE" } } },
        },
      },
    });

    if (!court || court.deletedAt) {
      throw new AppError(404, "Court not found");
    }

    return court;
  },

  /**
   * Get courts owned by an organizer.
   */
  async getOrganizerCourts(organizerId: string, query: QueryParams) {
    const qb = new QueryBuilder(query, { defaultSort: "-createdAt" })
      .search(["name", "locationLabel"])
      .addCondition({ organizerId })
      .softDelete()
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
            select: {
              bookings: true,
              members: { where: { status: "ACTIVE" } },
            },
          },
          media: { where: { isPrimary: true }, take: 1, select: { secureUrl: true } },
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
    organizerId: string,
    data: Partial<{
      name: string;
      type: string;
      surface: string;
      locationLabel: string;
      description: string;
      basePrice: number;
      currency: string;
      capacity: number;
      isIndoor: boolean;
      status: string;
    }>,
  ) {
    const court = await prisma.court.findUnique({ where: { id: courtId } });
    if (!court || court.deletedAt) throw new AppError(404, "Court not found");
    if (court.organizerId !== organizerId) {
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
   * Soft-delete a court.
   */
  async softDeleteCourt(courtId: string, userId: string, userRole: string) {
    const court = await prisma.court.findUnique({ where: { id: courtId } });
    if (!court || court.deletedAt) throw new AppError(404, "Court not found");

    if (userRole !== "ADMIN" && court.organizerId !== userId) {
      throw new AppError(403, "You can only delete your own courts");
    }

    const deleted = await prisma.court.update({
      where: { id: courtId },
      data: { deletedAt: new Date(), status: "ARCHIVED" },
    });

    return deleted;
  },

  /**
   * Get members of a court.
   */
  async getCourtMembers(courtId: string, query: QueryParams) {
    const qb = new QueryBuilder(query)
      .addCondition({ courtId })
      .filter(["status"])
      .sort()
      .paginate();

    const { where, orderBy, skip, take } = qb.build();

    const [members, total] = await prisma.$transaction([
      prisma.courtMember.findMany({
        where,
        orderBy,
        skip,
        take,
        include: {
          user: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
        },
      }),
      prisma.courtMember.count({ where }),
    ]);

    return { members, meta: qb.countMeta(total) };
  },
};

export default CourtService;
