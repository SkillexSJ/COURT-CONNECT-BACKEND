import { z } from "zod";

export const changeUserRoleSchema = z.object({
  role: z.enum(["USER", "ORGANIZER", "ADMIN"]),
});

export const createAmenitySchema = z.object({
  name: z
    .string({ error: "Amenity name must be a string" })
    .min(2, "Amenity name must be at least 2 characters")
    .max(80, "Amenity name must not exceed 80 characters"),
  icon: z
    .string({ error: "Icon must be a string" })
    .max(120, "Icon must not exceed 120 characters")
    .nullable()
    .optional(),
});

export const updateAmenitySchema = z.object({
  name: z
    .string({ error: "Amenity name must be a string" })
    .min(2, "Amenity name must be at least 2 characters")
    .max(80, "Amenity name must not exceed 80 characters")
    .optional(),
  icon: z
    .string({ error: "Icon must be a string" })
    .max(120, "Icon must not exceed 120 characters")
    .nullable()
    .optional(),
});

export const AdminValidation = {
  changeUserRoleSchema,
  createAmenitySchema,
  updateAmenitySchema,
};
