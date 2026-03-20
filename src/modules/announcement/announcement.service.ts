import { prisma } from "../../lib/prisma.js";
import { QueryBuilder, type QueryParams } from "../../helpers/QueryBuilder.js";
import AppError from "../../helpers/AppError.js";
import { slugify } from "../../shared/constants.js";

const AnnouncementService = {
  /**
   * Create an announcement (Admin).
   */
  async createAnnouncement(
    publishedById: string,
    data: {
      title: string;
      content: string;
      coverImageUrl?: string;
      coverPublicId?: string;
      isPinned?: boolean;
      isPublished?: boolean;
    },
  ) {
    const baseSlug = slugify(data.title);
    let slug = baseSlug;
    let counter = 1;
    while (await prisma.announcement.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return prisma.announcement.create({
      data: {
        publishedById,
        title: data.title,
        slug,
        content: data.content,
        coverImageUrl: data.coverImageUrl ?? null,
        coverPublicId: data.coverPublicId ?? null,
        isPinned: data.isPinned ?? false,
        isPublished: data.isPublished ?? false,
        publishedAt: data.isPublished ? new Date() : null,
      },
    });
  },

  /**
   * Get all announcements (public sees published only, admin sees all).
   */
  async getAllAnnouncements(query: QueryParams, userRole?: string) {
    const qb = new QueryBuilder(query, { defaultSort: "-publishedAt" })
      .search(["title", "content"])
      .filter(["isPinned", "isPublished"])
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
          slug: true,
          content: true,
          coverImageUrl: true,
          isPinned: true,
          isPublished: true,
          publishedAt: true,
          createdAt: true,
          publishedBy: { select: { id: true, name: true } },
        },
      }),
      prisma.announcement.count({ where }),
    ]);

    return { announcements, meta: qb.countMeta(total) };
  },

  /**
   * Get a single announcement by slug.
   */
  async getAnnouncementBySlug(slug: string) {
    const announcement = await prisma.announcement.findUnique({
      where: { slug },
      include: {
        publishedBy: { select: { id: true, name: true, avatarUrl: true } },
      },
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
      coverImageUrl: string;
      coverPublicId: string;
      isPinned: boolean;
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

    // If title changed, update slug
    if (data.title && data.title !== existing.title) {
      const baseSlug = slugify(data.title);
      let slug = baseSlug;
      let counter = 1;
      while (
        await prisma.announcement.findFirst({
          where: { slug, id: { not: announcementId } },
        })
      ) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }
      updateData.slug = slug;
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
