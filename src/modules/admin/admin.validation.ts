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

export const AdminValidation = {
  changeUserRoleSchema,
};

export const UserValidation = {
  updateUserProfileSchema,
};
