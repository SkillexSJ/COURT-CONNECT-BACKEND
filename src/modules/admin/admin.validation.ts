import { z } from "zod";

export const changeUserRoleSchema = z.object({
  role: z.enum(["USER", "ORGANIZER", "ADMIN"]),
});

export const updateUserProfileSchema = z.object({
  name: z
    .string("Name must be a string")
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must not exceed 100 characters")
    .optional(),
  phone: z
    .string("Phone must be a string")
    .min(7, "Phone must be at least 7 characters")
    .max(20, "Phone must not exceed 20 characters")
    .nullable()
    .optional(),
  avatarUrl: z
    .string("Avatar URL must be a string")
    .url("Must be a valid URL")
    .nullable()
    .optional(),
});

export const createAmenitySchema = z.object({
  name: z
    .string("Amenity name must be a string")
    .min(2, "Amenity name must be at least 2 characters")
    .max(80, "Amenity name must not exceed 80 characters"),
  icon: z
    .string("Icon must be a string")
    .max(120, "Icon must not exceed 120 characters")
    .nullable()
    .optional(),
});

export const updateAmenitySchema = z.object({
  name: z
    .string("Amenity name must be a string")
    .min(2, "Amenity name must be at least 2 characters")
    .max(80, "Amenity name must not exceed 80 characters")
    .optional(),
  icon: z
    .string("Icon must be a string")
    .max(120, "Icon must not exceed 120 characters")
    .nullable()
    .optional(),
});

export const AdminValidation = {
  changeUserRoleSchema,
  createAmenitySchema,
  updateAmenitySchema,
};

export const UserValidation = {
  updateUserProfileSchema,
};
