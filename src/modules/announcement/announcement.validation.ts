import { z } from "zod";

export const createAnnouncementSchema = z.object({
  title: z
    .string("Title must be a string")
    .min(3, "Title must be at least 3 characters")
    .max(200, "Title must not exceed 200 characters"),
  content: z
    .string("Content must be a string")
    .min(10, "Content must be at least 10 characters"),
  type: z.enum(["INFO", "MAINTENANCE", "PROMOTION"]).optional(),
  imageUrl: z.string("ImageUrl must be a string").url("Must be a valid URL").optional(),
  isPublished: z.boolean().optional(),
});

export const updateAnnouncementSchema = z.object({
  title: z.string("Title must be a string").min(3).max(200).optional(),
  content: z.string("Content must be a string").min(10).optional(),
  type: z.enum(["INFO", "MAINTENANCE", "PROMOTION"]).optional(),
  imageUrl: z.string("ImageUrl must be a string").url("Must be a valid URL").nullable().optional(),
  isPublished: z.boolean().optional(),
});

export const AnnouncementValidation = {
  createAnnouncementSchema,
  updateAnnouncementSchema,
};
