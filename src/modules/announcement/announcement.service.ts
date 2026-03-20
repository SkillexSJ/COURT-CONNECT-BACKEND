import { prisma } from "../../lib/prisma.js";
import { QueryBuilder, type QueryParams } from "../../helpers/QueryBuilder.js";
import AppError from "../../helpers/AppError.js";

const AnnouncementService = {
  /**
   * Create an announcement (Admin).
   */
  async createAnnouncement(
    _adminId: string,
    data: {
      title: string;
      content: string;
      type?: "INFO" | "MAINTENANCE" | "PROMOTION";
      imageUrl?: string;
      isPublished?: boolean;
    },
  ) {
    return prisma.announcement.create({
      data: {
        title: data.title,
        content: data.content,
        type: data.type ?? "INFO",
        imageUrl: data.imageUrl ?? null,
        isPublished: data.isPublished ?? false,
        publishedAt: data.isPublished ? new Date() : null,
      },
    });
  },

  /**
   * Get all announcements (public sees published only, admin sees all).
   */
  async getAllAnnouncements(query: QueryParams, userRole?: string) {
    const qb = new QueryBuilder(query, { defaultSort: "-createdAt" })
      .search(["title", "content"])
      .filter(["type", "isPublished"])
      .sort()
      .paginate();

    // Public users only see published
    if (userRole !== "ADMIN") {
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
   * Get a single announcement by ID.
   */
  async getAnnouncementBySlug(announcementId: string) {
    const announcement = await prisma.announcement.findUnique({
      where: { id: announcementId },
    });

    if (!announcement) throw new AppError(404, "Announcement not found");
    return announcement;
  },

  /**
   * Update announcement (Admin).
   */
  async updateAnnouncement(
    announcementId: string,
    data: Partial<{
      title: string;
      content: string;
      type: "INFO" | "MAINTENANCE" | "PROMOTION";
      imageUrl: string;
      isPublished: boolean;
    }>,
  ) {
    const existing = await prisma.announcement.findUnique({ where: { id: announcementId } });
    if (!existing) throw new AppError(404, "Announcement not found");

    const updateData: Record<string, unknown> = { ...data };

    // If publishing for the first time
    if (data.isPublished && !existing.isPublished) {
      updateData.publishedAt = new Date();
    }

    return prisma.announcement.update({
      where: { id: announcementId },
      data: updateData,
    });
  },

  /**
   * Delete announcement (Admin).
   */
  async deleteAnnouncement(announcementId: string) {
    const existing = await prisma.announcement.findUnique({ where: { id: announcementId } });
    if (!existing) throw new AppError(404, "Announcement not found");

    return prisma.announcement.delete({ where: { id: announcementId } });
  },
};

export default AnnouncementService;
