import { z } from "zod";

export const createSlotTemplateSchema = z.object({
  dayOfWeek: z
    .number("Day of week must be a number")
    .int()
    .min(0, "Day must be 0 (Sunday) to 6 (Saturday)")
    .max(6, "Day must be 0 (Sunday) to 6 (Saturday)"),
  startMinute: z
    .number("Start time must be a number")
    .int()
    .min(0, "Start time must be >= 0")
    .max(1439, "Start time must be < 1440"),
  endMinute: z
    .number("End time must be a number")
    .int()
    .min(1, "End time must be > 0")
    .max(1440, "End time must be <= 1440"),
  priceOverride: z
    .number("Price override must be a number")
    .positive("Price override must be positive")
    .optional(),
});

export const updateSlotTemplateSchema = z.object({
  startMinute: z.number("Start minute must be a number").int().min(0).max(1439).optional(),
  endMinute: z.number("End minute must be a number").int().min(1).max(1440).optional(),
  priceOverride: z.number("Price override must be a number").positive().nullable().optional(),
  isActive: z.boolean().optional(),
});
