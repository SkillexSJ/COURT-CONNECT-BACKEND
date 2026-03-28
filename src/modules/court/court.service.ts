import { prisma } from "../../lib/prisma.js";
import { QueryBuilder, type QueryParams } from "../../helpers/QueryBuilder.js";
import AppError from "../../helpers/AppError.js";
import { COURT_STATUS, slugify } from "../../shared/constants.js";
import { getOrganizerByUserId } from "../../helpers/getOrganizer.js";
import cloudinary from "../../config/cloudinary.js";
import type {
  CreateCourtInput,
  UpdateCourtInput,
  CourtMediaUploadResult,
  CourtMemberResult,
} from "./court.type.js";

const CourtService = {
  /**
   * Create a new court
   */
  async createCourt(userId: string, data: CreateCourtInput) {
    const organizer = await getOrganizerByUserId(userId);

    if (!organizer.isVerified) {
      throw new AppError(
        403,
        "Your organizer profile is not verified yet. Please contact admin.",
      );
    }

    const baseSlug = slugify(data.name);
    let slug = baseSlug;
    let counter = 1;
    while (await prisma.court.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    let amenityConnections: { id: string }[] | undefined;
    if (data.amenityIds && data.amenityIds.length > 0) {
      const foundAmenities = await prisma.amenity.findMany({
        where: { id: { in: data.amenityIds } },
        select: { id: true },
      });

      if (foundAmenities.length !== data.amenityIds.length) {
        throw new AppError(400, "One or more selected amenities are invalid");
      }

      amenityConnections = foundAmenities.map((item) => ({ id: item.id }));
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
        status: COURT_STATUS.PENDING_APPROVAL as any,
        ...(amenityConnections
          ? { amenities: { connect: amenityConnections } }
          : {}),
      },
    });

    return court;
  },

  /**
   * Upload court media (primary + gallery)
   */
  async uploadCourtMedia(
    courtId: string,
    userId: string,
    userRole: string,
    files: Express.Multer.File[],
    primaryIndex?: number,
  ): Promise<CourtMediaUploadResult[]> {
    if (!files || files.length === 0) {
      throw new AppError(400, "At least one image is required");
    }

    const court = await prisma.court.findUnique({ where: { id: courtId } });
    if (!court) throw new AppError(404, "Court not found");

    if (userRole !== "ADMIN") {
      const organizer = await getOrganizerByUserId(userId);
      if (court.organizerId !== organizer.id) {
        throw new AppError(403, "You can only upload media to your own courts");
      }
    }

    const uploadedPublicIds = files
      .map((file) => (file as any).filename as string | undefined)
      .filter((id): id is string => Boolean(id));

    try {
      const existingPrimary = await prisma.courtMedia.findFirst({
        where: { courtId, isPrimary: true },
        select: { id: true },
      });

      const validPrimaryIndex =
        primaryIndex !== undefined &&
        Number.isInteger(primaryIndex) &&
        primaryIndex >= 0 &&
        primaryIndex < files.length
          ? primaryIndex
          : undefined;

      const mediaRows = files.map((file, index) => {
        const cloudinaryPath = (file as any).path as string | undefined;
        const cloudinaryPublicId = (file as any).filename as string | undefined;

        if (!cloudinaryPath || !cloudinaryPublicId) {
          throw new AppError(500, "Cloudinary upload metadata is missing");
        }

        const isPrimary =
          validPrimaryIndex !== undefined
            ? index === validPrimaryIndex
            : !existingPrimary && index === 0;

        return {
          courtId,
          url: cloudinaryPath,
          publicId: cloudinaryPublicId,
          isPrimary,
        };
      });

      return (await prisma.$transaction(async (tx) => {
        if (validPrimaryIndex !== undefined) {
          await tx.courtMedia.updateMany({
            where: { courtId, isPrimary: true },
            data: { isPrimary: false },
          });
        }

        await tx.courtMedia.createMany({ data: mediaRows });

        return tx.courtMedia.findMany({
          where: { courtId },
          orderBy: [{ isPrimary: "desc" }, { id: "desc" }],
        });
      })) as CourtMediaUploadResult[];
    } catch (error) {
      // If any error occurs, attempt to clean up uploaded images from Cloudinary
      if (uploadedPublicIds.length > 0) {
        await Promise.allSettled(
          uploadedPublicIds.map((publicId) =>
            cloudinary.uploader.destroy(publicId, {
              resource_type: "image",
              invalidate: true,
            }),
          ),
        );
      }

      throw error;
    }
  },

  /**
   * Get all courts
   */
  async getAllCourts(query: QueryParams) {
    const qb = new QueryBuilder(query, {
      defaultSort: "-createdAt",
      maxLimit: 50,
    })
      .search(["name", "locationLabel", "type"])
      .filter(["status", "type", "basePrice"])
      .sort()
      .paginate();

    // Public listing should only show approved/active
    if (!query.status) {
      qb.addCondition({ status: COURT_STATUS.ACTIVE });
    }

    // Filter by amenities
    const rawAmenityIds = query.amenityIds;
    const amenityIds = (
      Array.isArray(rawAmenityIds)
        ? rawAmenityIds.join(",")
        : typeof rawAmenityIds === "string"
          ? rawAmenityIds
          : ""
    )
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    if (amenityIds.length > 0) {
      qb.addCondition({
        amenities: {
          some: {
            id: { in: amenityIds },
          },
        },
      });
    }

    // Filter by organization owner when requested
    if (typeof query.organizerId === "string" && query.organizerId.trim()) {
      qb.addCondition({ organizerId: query.organizerId.trim() });
    }

    let { where, orderBy, skip, take } = qb.build();

    // Custom sorting mapping Rating / Popularity
    if (query.sortBy === "-rating" || query.sortBy === "rating") {
      orderBy = [
        {
          bookings: {
            _count: query.sortBy === "-rating" ? "desc" : "asc",
          },
        },
      ] as any;
    }

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
              user: { select: { id: true, name: true, avatarUrl: true } },
            },
          },
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
      }),
      prisma.court.count({ where }),
    ]);

    return { courts, meta: qb.countMeta(total) };
  },

  /**
   * Get a single court by slug (public)
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
   * Update a court organizer must own it
   */
  async updateCourt(courtId: string, userId: string, data: UpdateCourtInput) {
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
      while (
        await prisma.court.findFirst({ where: { slug, id: { not: courtId } } })
      ) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }
    }

    const { amenityIds, ...restData } = data;

    let amenitySetPayload:
      | {
          set: { id: string }[];
        }
      | undefined;

    if (amenityIds !== undefined) {
      if (amenityIds.length > 0) {
        const foundAmenities = await prisma.amenity.findMany({
          where: { id: { in: amenityIds } },
          select: { id: true },
        });

        if (foundAmenities.length !== amenityIds.length) {
          throw new AppError(400, "One or more selected amenities are invalid");
        }

        amenitySetPayload = {
          set: foundAmenities.map((item) => ({ id: item.id })),
        };
      } else {
        amenitySetPayload = { set: [] };
      }
    }

    const updated = await prisma.court.update({
      where: { id: courtId },
      data: {
        ...restData,
        ...(slug ? { slug } : {}),
        ...(amenitySetPayload ? { amenities: amenitySetPayload } : {}),
      } as any,
    });

    return updated;
  },

  /**
   * Soft-delete a court
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
   * Get amenities list for organizer.
   */
  async getAmenities() {
    // Auto-seed constant amenitie
    const CORE_AMENITIES = [
      { name: "Free WiFi", icon: "wifi" },
      { name: "Parking", icon: "parking" },
      { name: "Changing Room", icon: "shower" },
      { name: "Cafe/Snacks", icon: "coffee" },
      { name: "Equipment Rental", icon: "dumbbell" },
      { name: "Wheelchair Access", icon: "accessibility" },
    ];

    const existingCoreCount = await prisma.amenity.count({
      where: {
        name: { in: CORE_AMENITIES.map((a) => a.name) },
      },
    });

    // detecting hardcoded aminites
    if (existingCoreCount < CORE_AMENITIES.length) {
      for (const amenity of CORE_AMENITIES) {
        await prisma.amenity.upsert({
          where: { name: amenity.name },
          update: {},
          create: amenity,
        });
      }
    }

    return prisma.amenity.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        icon: true,
      },
    });
  },

  /**
   * Get members users who have booked of a court.
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

    return {
      members: bookings as unknown as CourtMemberResult[],
      meta: qb.countMeta(total),
    };
  },
};

export default CourtService;
