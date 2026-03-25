import { z } from "zod";

export const updateUserProfileSchema = z.object({
  name: z
    .string({ error: "Name must be a string" })
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must not exceed 100 characters")
    .optional(),
  phone: z
    .string({ error: "Phone must be a string" })
    .min(7, "Phone must be at least 7 characters")
    .max(20, "Phone must not exceed 20 characters")
    .nullable()
    .optional(),
  avatarUrl: z
    .url({ error: "Avatar URL must be a valid URL" })
    .nullable()
    .optional(),
});

export const UserValidation = {
  updateUserProfileSchema,
};
