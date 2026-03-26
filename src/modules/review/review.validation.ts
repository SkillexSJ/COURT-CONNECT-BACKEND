import { z } from "zod";

export const createReviewSchema = z
  .object({
    courtId: z.string().uuid().optional(),
    organizerId: z.string().uuid().optional(),
    rating: z.number().min(1).max(5).optional(),
    comment: z
      .string({ error: "Comment is required" })
      .min(2, "Comment is too short"),
    parentId: z.uuid().optional(),
  })
  .refine((data) => data.courtId || data.organizerId, {
    message: "Either courtId or organizerId must be provided",
    path: ["courtId"],
  });

export const updateReviewSchema = z.object({
  rating: z.number().min(1).max(5).optional(),
  comment: z.string().min(2).optional(),
});

export const ReviewValidation = {
  createReviewSchema,
  updateReviewSchema,
};
