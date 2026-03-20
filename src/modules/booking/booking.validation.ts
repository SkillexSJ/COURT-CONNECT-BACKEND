import { z } from "zod";

export const createBookingSchema = z.object({
  courtId: z.uuid("Court ID must be a valid UUID format"),
  bookingDate: z
    .string("Booking date must be a string")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Booking date must be in YYYY-MM-DD format"),
  slotTemplateIds: z
    .array(z.uuid("Invalid slot template ID"))
    .min(1, "At least one slot must be selected"),
  couponCode: z
    .string("Coupon code must be a string")
    .min(1, "Coupon code cannot be empty")
    .optional(),
});

export const BookingValidation = {
  createBookingSchema,
};
