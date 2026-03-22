/**
 * Shared constants mirroring Prisma enums for use in application logic.
 */

export const USER_ROLE = {
  USER: "USER",
  ORGANIZER: "ORGANIZER",
  ADMIN: "ADMIN",
} as const;

export const COURT_STATUS = {
  PENDING_APPROVAL: "PENDING_APPROVAL",
  ACTIVE: "ACTIVE",
  MAINTENANCE: "MAINTENANCE",
  HIDDEN: "HIDDEN",
} as const;

export const BOOKING_STATUS = {
  PENDING: "PENDING",
  PAID: "PAID",
  CANCELLED: "CANCELLED",
  COMPLETED: "COMPLETED",
} as const;

export const DISCOUNT_TYPE = {
  PERCENTAGE: "PERCENTAGE",
  FIXED: "FIXED",
} as const;

export const ANNOUNCEMENT_TYPE = {
  INFO: "INFO",
  MAINTENANCE: "MAINTENANCE",
  PROMOTION: "PROMOTION",
} as const;

/**
 * Booking statuses that occupy a slot (prevent double-booking).
 */
export const ACTIVE_BOOKING_STATUSES = [
  BOOKING_STATUS.PENDING,
  BOOKING_STATUS.PAID,
] as const;

/**
 * Generate a unique booking code: CC-YYYYMMDD-XXXXX
 */
export function generateBookingCode(): string {
  const date = new Date();
  const ymd =
    String(date.getFullYear()) +
    String(date.getMonth() + 1).padStart(2, "0") +
    String(date.getDate()).padStart(2, "0");
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `CC-${ymd}-${rand}`;
}

/**
 * Generate a URL-safe slug from a string.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}
