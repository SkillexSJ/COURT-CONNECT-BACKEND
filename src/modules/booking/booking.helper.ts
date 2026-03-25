import { Prisma } from "../../generated/prisma/client.js";
import { BookingResult } from "./booking.type.js";

/**
 * Calculates the subtotal for a booking based on slot templates and court base price.
 */
export const calculateBookingSubtotal = (
  templates: any[],
  basePrice: number | Prisma.Decimal,
): number => {
  return templates.reduce((sum, t) => {
    const price = t.priceOverride ?? basePrice;
    return sum + Number(price);
  }, 0);
};

/**
 * Generates an expiry date for a booking
 */
export const getBookingExpiryDate = (hours: number = 24): Date => {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
};

/**
 * Validates if a user has permission to access a specific booking.
 */
export const hasBookingAccess = (
  booking: any,
  userId: string,
  userRole: string,
): boolean => {
  const isOwner = booking.userId === userId;
  const isOrganizerOwner = booking.court?.organizer?.userId === userId;
  const isAdmin = userRole === "ADMIN";

  return isOwner || isOrganizerOwner || isAdmin;
};

/**
 * Safely restores coupon usage if a booking is cancelled or rejected. with transaction
 */
export const restoreCouponUsage = async (
  tx: Prisma.TransactionClient,
  couponId: string,
) => {
  return tx.coupon.updateMany({
    where: {
      id: couponId,
      usedCount: { gt: 0 },
    },
    data: {
      usedCount: {
        decrement: 1,
      },
    },
  });
};
