import { prisma } from "../../lib/prisma.js";
import { QueryBuilder, type QueryParams } from "../../helpers/QueryBuilder.js";
import AppError from "../../helpers/AppError.js";
import type { CreateReviewInput, UpdateReviewInput } from "./review.type.js";

const ReviewService = {
  async createReview(userId: string, data: CreateReviewInput) {
    // If it's a reply, verify parent exists and depth is not exceeded
    if (data.parentId) {
      const parent = await prisma.review.findUnique({
        where: { id: data.parentId },
        include: { parent: { include: { parent: true } } },
      });

      if (!parent) {
        throw new AppError(404, "Parent review not found");
      }

      // Depth limit rule (allow max 2-3 levels total)
      if (parent.parentId && parent.parent?.parentId) {
        throw new AppError(400, "Maximum reply depth exceeded (3 levels max)");
      }

      //  inherit the courtId/organizerId
      if (parent.courtId) data.courtId = parent.courtId;
      if (parent.organizerId) data.organizerId = parent.organizerId;
    } else {
      // Top level review
      if (!data.courtId && !data.organizerId) {
        throw new AppError(
          400,
          "courtId or organizerId is required for top-level review",
        );
      }
    }

    const review = await prisma.review.create({
      data: {
        userId,
        courtId: data.courtId ?? null,
        organizerId: data.organizerId ?? null,
        rating: data.rating ?? null,
        comment: data.comment,
        parentId: data.parentId ?? null,
      },
      include: {
        user: { select: { id: true, name: true, role: true, avatarUrl: true } },
      },
    });

    return review;
  },

  /**
   * Get all reviews
   */
  async getReviews(query: QueryParams) {
    const qb = new QueryBuilder(query, {
      defaultSort: "-createdAt",
      maxLimit: 50,
    })
      .filter(["courtId", "organizerId"])
      .sort()
      .paginate();

    // Only fetch top-level reviews
    qb.addCondition({ parentId: null });

    const { where, orderBy, skip, take } = qb.build();

    const [reviews, total] = await prisma.$transaction([
      prisma.review.findMany({
        where,
        orderBy,
        skip,
        take,
        include: {
          user: {
            select: { id: true, name: true, role: true, avatarUrl: true },
          },
          replies: {
            orderBy: { createdAt: "asc" },
            include: {
              user: {
                select: { id: true, name: true, role: true, avatarUrl: true },
              },
              replies: {
                orderBy: { createdAt: "asc" },
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      role: true,
                      avatarUrl: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      prisma.review.count({ where }),
    ]);

    return { reviews, meta: qb.countMeta(total) };
  },

  /**
   * Update a review
   */
  async updateReview(
    reviewId: string,
    userId: string,
    data: UpdateReviewInput,
  ) {
    const review = await prisma.review.findUnique({ where: { id: reviewId } });

    if (!review) throw new AppError(404, "Review not found");
    if (review.userId !== userId) {
      throw new AppError(403, "You can only edit your own reviews");
    }

    const updated = await prisma.review.update({
      where: { id: reviewId },
      data,
      include: {
        user: { select: { id: true, name: true, role: true, avatarUrl: true } },
      },
    });

    return updated;
  },

  /**
   * Delete a review
   */
  async deleteReview(reviewId: string, userId: string, userRole: string) {
    const review = await prisma.review.findUnique({ where: { id: reviewId } });

    if (!review) throw new AppError(404, "Review not found");

    // Only the author or an ADMIN can delete a review
    if (review.userId !== userId && userRole !== "ADMIN") {
      throw new AppError(403, "Not authorized to delete this review");
    }

    // Cascade delete
    await prisma.review.delete({ where: { id: reviewId } });

    return null;
  },
};

export default ReviewService;
