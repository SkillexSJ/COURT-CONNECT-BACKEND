import { z } from "zod";

export const createCourtSchema = z.object({
  name: z
    .string("Court name must be a string")
    .min(3, "Name must be at least 3 characters")
    .max(100, "Name must not exceed 100 characters"),
  type: z
    .string("Court type must be a string")
    .min(2, "Type must be at least 2 characters"),
  locationLabel: z
    .string("Location must be a string")
    .min(3, "Location must be at least 3 characters"),
  description: z
    .string("Description must be a string")
    .max(1000, "Description must not exceed 1000 characters")
    .optional(),
  basePrice: z
    .number("Base price must be a number")
    .positive("Price must be a positive number"),
  latitude: z.number("Latitude must be a number").min(-90).max(90).optional(),
  longitude: z.number("Longitude must be a number").min(-180).max(180).optional(),
});

export const updateCourtSchema = z.object({
  name: z
    .string("Name must be a string")
    .min(3, "Name must be at least 3 characters")
    .max(100, "Name must not exceed 100 characters")
    .optional(),
  type: z.string("Type must be a string").min(2).optional(),
  locationLabel: z.string("Location must be a string").min(3).optional(),
  description: z.string("Description must be a string").max(1000).optional(),
  basePrice: z.number("Price must be a number").positive("Price must be positive").optional(),
  latitude: z.number("Latitude must be a number").min(-90).max(90).optional(),
  longitude: z.number("Longitude must be a number").min(-180).max(180).optional(),
  status: z.enum(["ACTIVE", "MAINTENANCE", "HIDDEN"]).optional(),
});

export const CourtValidation = {
  createCourtSchema,
  updateCourtSchema,
};
