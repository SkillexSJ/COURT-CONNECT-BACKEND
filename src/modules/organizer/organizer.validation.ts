import { z } from "zod";

export const createOrganizerProfileSchema = z.object({
  businessName: z
    .string("Business name must be a string")
    .min(2, "Business name must be at least 2 characters")
    .max(150, "Business name must not exceed 150 characters"),
  bio: z.string("Bio must be a string").max(500, "Bio must not exceed 500 characters").optional(),
  website: z.string("Website must be a string").url("Must be a valid URL").optional(),
  phoneNumber: z
    .string("Phone number must be a string")
    .min(7, "Phone number must be at least 7 characters")
    .max(20, "Phone number must not exceed 20 characters")
    .optional(),
  address: z
    .string("Address must be a string")
    .max(300, "Address must not exceed 300 characters")
    .optional(),
});

export const updateOrganizerProfileSchema = z.object({
  businessName: z.string("Business name must be a string").min(2).max(150).optional(),
  bio: z.string("Bio must be a string").max(500).nullable().optional(),
  website: z.string("Website must be a string").url("Must be a valid URL").nullable().optional(),
  phoneNumber: z.string("Phone number must be a string").min(7).max(20).nullable().optional(),
  address: z.string("Address must be a string").max(300).nullable().optional(),
});

export const OrganizerValidation = {
  createOrganizerProfileSchema,
  updateOrganizerProfileSchema,
};
