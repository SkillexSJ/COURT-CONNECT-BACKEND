/**
 * Shared constants mirroring Prisma enums for use in application logic.
 */

export const USER_ROLE = {
  USER: "USER",
  MEMBER: "MEMBER",
  ORGANIZER: "ORGANIZER",
  ADMIN: "ADMIN",
} as const;

export const COURT_STATUS = {
  ACTIVE: "ACTIVE",
  MAINTENANCE: "MAINTENANCE",
  ARCHIVED: "ARCHIVED",
} as const;

export const BOOKING_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  PAYMENT_PENDING: "PAYMENT_PENDING",
  PAID: "PAID",
  CANCELLED: "CANCELLED",
  COMPLETED: "COMPLETED",
  EXPIRED: "EXPIRED",
} as const;

export const PAYMENT_STATUS = {
  PENDING: "PENDING",
  SUCCEEDED: "SUCCEEDED",
  FAILED: "FAILED",
  REFUNDED: "REFUNDED",
  PARTIALLY_REFUNDED: "PARTIALLY_REFUNDED",
} as const;

export const DISCOUNT_TYPE = {
  PERCENTAGE: "PERCENTAGE",
  FIXED: "FIXED",
} as const;

export const COURT_MEMBER_STATUS = {
  ACTIVE: "ACTIVE",
  LEFT: "LEFT",
  BLOCKED: "BLOCKED",
} as const;

/**
 * Booking statuses that occupy a slot (prevent double-booking).
 */
export const ACTIVE_BOOKING_STATUSES = [
  BOOKING_STATUS.PENDING,
  BOOKING_STATUS.APPROVED,
  BOOKING_STATUS.PAYMENT_PENDING,
  BOOKING_STATUS.PAID,
  BOOKING_STATUS.COMPLETED,
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
