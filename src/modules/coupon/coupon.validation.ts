import { z } from "zod";

export const createCouponSchema = z.object({
  code: z
    .string("Coupon code must be a string")
    .min(3, "Coupon code must be at least 3 characters")
    .max(40, "Coupon code must not exceed 40 characters")
    .regex(
      /^[A-Za-z0-9_-]+$/,
      "Coupon code can only contain letters, numbers, hyphen, and underscore",
    ),
  discountType: z.enum(["PERCENTAGE", "FIXED"]),
  discountValue: z.coerce
    .number("Discount value must be a number")
    .positive("Discount value must be greater than 0"),
  minBookingAmount: z.coerce
    .number("Minimum booking amount must be a number")
    .nonnegative("Minimum booking amount cannot be negative")
    .optional(),
  maxDiscountAmount: z.coerce
    .number("Maximum discount amount must be a number")
    .positive("Maximum discount amount must be greater than 0")
    .optional(),
  usageLimit: z.coerce
    .number("Usage limit must be a number")
    .int("Usage limit must be an integer")
    .positive("Usage limit must be greater than 0")
    .optional(),
  expiresAt: z.iso
    .datetime("Expiry date must be a valid ISO datetime")
    .optional(),
  isActive: z.boolean().optional(),
});

export const updateCouponSchema = z.object({
  code: z
    .string("Coupon code must be a string")
    .min(3, "Coupon code must be at least 3 characters")
    .max(40, "Coupon code must not exceed 40 characters")
    .regex(
      /^[A-Za-z0-9_-]+$/,
      "Coupon code can only contain letters, numbers, hyphen, and underscore",
    )
    .optional(),
  discountType: z.enum(["PERCENTAGE", "FIXED"]).optional(),
  discountValue: z.coerce
    .number("Discount value must be a number")
    .positive("Discount value must be greater than 0")
    .optional(),
  minBookingAmount: z.coerce
    .number("Minimum booking amount must be a number")
    .nonnegative("Minimum booking amount cannot be negative")
    .nullable()
    .optional(),
  maxDiscountAmount: z.coerce
    .number("Maximum discount amount must be a number")
    .positive("Maximum discount amount must be greater than 0")
    .nullable()
    .optional(),
  usageLimit: z.coerce
    .number("Usage limit must be a number")
    .int("Usage limit must be an integer")
    .positive("Usage limit must be greater than 0")
    .nullable()
    .optional(),
  expiresAt: z.iso
    .datetime("Expiry date must be a valid ISO datetime")
    .nullable()
    .optional(),
  isActive: z.boolean().optional(),
});

export const validateCouponSchema = z.object({
  code: z
    .string("Coupon code must be a string")
    .min(1, "Coupon code cannot be empty"),
  bookingAmount: z.coerce
    .number("Booking amount must be a number")
    .positive("Booking amount must be greater than 0"),
});

export const CouponValidation = {
  createCouponSchema,
  updateCouponSchema,
  validateCouponSchema,
};
