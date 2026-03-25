import { prisma } from "../../lib/prisma";
import { QueryBuilder, type QueryParams } from "../../helpers/QueryBuilder";
import AppError from "../../helpers/AppError";
import { getOrganizerByUserId } from "../../helpers/getOrganizer";
import type {
  CreateAnnouncementInput,
  UpdateAnnouncementInput,
} from "./announcement.type";

const AnnouncementService = {
  /**
   * Create announcement.
   * - ADMIN can create HOME announcements.
   * - ORGANIZER can create VENUE announcements for own courts.
   */
  async createAnnouncement(
    userId: string,
    userRole: "ADMIN" | "ORGANIZER",
    data: CreateAnnouncementInput,
  ) {
    if (userRole === "ADMIN") {
      const audience = data.audience ?? "HOME";
      if (audience !== "HOME") {
        throw new AppError(400, "Admin announcements must target HOME");
      }

      return prisma.announcement.create({
        data: {
          title: data.title,
          content: data.content,
          type: data.type ?? "INFO",
          audience: "HOME",
          createdByRole: "ADMIN",
          organizerId: null,
          courtId: null,
          imageUrl: data.imageUrl ?? null,
          isPublished: data.isPublished ?? false,
          publishedAt: data.isPublished ? new Date() : null,
        },
      });
    }

    // ORGANIZER flow
    if (!data.courtId) {
      throw new AppError(
        400,
        "courtId is required for organizer announcements",
      );
    }

    const organizer = await getOrganizerByUserId(userId);
    const court = await prisma.court.findUnique({
      where: { id: data.courtId },
      select: { id: true, organizerId: true },
    });

    if (!court) {
      throw new AppError(404, "Court not found");
    }

    if (court.organizerId !== organizer.id) {
      throw new AppError(
        403,
        "You can only create announcements for your own venues",
      );
    }

    return prisma.announcement.create({
      data: {
        title: data.title,
        content: data.content,
        type: data.type ?? "INFO",
        audience: "VENUE",
        createdByRole: "ORGANIZER",
        organizerId: organizer.id,
        courtId: court.id,
        imageUrl: data.imageUrl ?? null,
        isPublished: data.isPublished ?? false,
        publishedAt: data.isPublished ? new Date() : null,
      },
    });
  },

  /**
   * Get all announcements.
   * - Public/USER: published only.
   * - ORGANIZER: published + own announcements.
   * - ADMIN: all.
   */
  async getAllAnnouncements(
    query: QueryParams,
    userRole?: string,
    userId?: string,
  ) {
    const qb = new QueryBuilder(query, { defaultSort: "-createdAt" })
      .search(["title", "content"])
      .filter([
        "type",
        "isPublished",
        "audience",
        "courtId",
        "createdByRole",
        "organizerId",
      ])
      .sort()
      .paginate();

    if (userRole === "ADMIN") {
      // Admin sees all.
    } else if (userRole === "ORGANIZER" && userId) {
      const organizer = await getOrganizerByUserId(userId);
      qb.addCondition({
        OR: [{ isPublished: true }, { organizerId: organizer.id }],
      });
    } else {
      // Public and USER role
      qb.addCondition({ isPublished: true });
    }

    const { where, orderBy, skip, take } = qb.build();

    const [announcements, total] = await prisma.$transaction([
      prisma.announcement.findMany({
        where,
        orderBy,
        skip,
        take,
        select: {
          id: true,
          title: true,
          content: true,
          type: true,
          audience: true,
          createdByRole: true,
          organizerId: true,
          courtId: true,
          imageUrl: true,
          isPublished: true,
          publishedAt: true,
          createdAt: true,
        },
      }),
      prisma.announcement.count({ where }),
    ]);

    return { announcements, meta: qb.countMeta(total) };
  },

  /**
   * Public home announcements.
   */
  async getHomeAnnouncements(query: QueryParams) {
    const qb = new QueryBuilder(query, { defaultSort: "-publishedAt" })
      .search(["title", "content"])
      .filter(["type"])
      .sort()
      .paginate()
      .addCondition({
        isPublished: true,
        audience: "HOME",
      });

    const { where, orderBy, skip, take } = qb.build();

    const [announcements, total] = await prisma.$transaction([
      prisma.announcement.findMany({
        where,
        orderBy,
        skip,
        take,
      }),
      prisma.announcement.count({ where }),
    ]);

    return { announcements, meta: qb.countMeta(total) };
  },

  /**
   * Public venue announcements by court.
   */
  async getVenueAnnouncements(courtId: string, query: QueryParams) {
    const court = await prisma.court.findUnique({
      where: { id: courtId },
      select: { id: true },
    });

    if (!court) {
      throw new AppError(404, "Court not found");
    }

    const qb = new QueryBuilder(query, { defaultSort: "-publishedAt" })
      .search(["title", "content"])
      .filter(["type"])
      .sort()
      .paginate()
      .addCondition({
        isPublished: true,
        audience: "VENUE",
        courtId,
      });

    const { where, orderBy, skip, take } = qb.build();

    const [announcements, total] = await prisma.$transaction([
      prisma.announcement.findMany({
        where,
        orderBy,
        skip,
        take,
      }),
      prisma.announcement.count({ where }),
    ]);

    return { announcements, meta: qb.countMeta(total) };
  },

  /**
   * Get  announcement by ID.
   */
  async getAnnouncementBySlug(announcementId: string, userRole?: string) {
    const announcement = await prisma.announcement.findUnique({
      where: { id: announcementId },
    });

    if (!announcement) throw new AppError(404, "Announcement not found");

    if (!announcement.isPublished && userRole !== "ADMIN") {
      throw new AppError(404, "Announcement not found");
    }

    return announcement;
  },

  /**
   * Update announcement.
   * - ADMIN can update any.
   * - ORGANIZER can update own VENUE announcements.
   */
  async updateAnnouncement(
    userId: string,
    userRole: "ADMIN" | "ORGANIZER",
    announcementId: string,
    data: UpdateAnnouncementInput,
  ) {
    const existing = await prisma.announcement.findUnique({
      where: { id: announcementId },
    });
    if (!existing) throw new AppError(404, "Announcement not found");

    if (userRole === "ORGANIZER") {
      const organizer = await getOrganizerByUserId(userId);
      if (existing.organizerId !== organizer.id) {
        throw new AppError(403, "You can only update your own announcements");
      }
    }

    const updateData: Record<string, unknown> = { ...data };

    // publishing first time
    if (data.isPublished && !existing.isPublished) {
      updateData.publishedAt = new Date();
    }

    // unpublishing, clear publishedAt
    if (data.isPublished === false) {
      updateData.publishedAt = null;
    }

    return prisma.announcement.update({
      where: { id: announcementId },
      data: updateData,
    });
  },

  /**
   * Delete announcement.
   * - ADMIN can delete any.
   * - ORGANIZER can delete own announcements.
   */
  async deleteAnnouncement(
    userId: string,
    userRole: "ADMIN" | "ORGANIZER",
    announcementId: string,
  ) {
    const existing = await prisma.announcement.findUnique({
      where: { id: announcementId },
    });
    if (!existing) throw new AppError(404, "Announcement not found");

    if (userRole === "ORGANIZER") {
      const organizer = await getOrganizerByUserId(userId);
      if (existing.organizerId !== organizer.id) {
        throw new AppError(403, "You can only delete your own announcements");
      }
    }

    return prisma.announcement.delete({ where: { id: announcementId } });
  },
};

export default AnnouncementService;
