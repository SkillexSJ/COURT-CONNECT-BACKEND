import { prisma } from "../lib/prisma";

/**
 * Expire pending bookings that are older than 24 hours
 * This should be run periodically (every 5-15 minutes)
 */
export async function expirePendingBookings() {
  try {
    const now = new Date();

    const expiredBookings = await prisma.booking.findMany({
      where: {
        status: "PENDING",
        expiresAt: {
          lt: now, // expiry time is in the past
        },
      },
      select: {
        id: true,
        bookingCode: true,
        couponId: true,
      },
    });

    if (expiredBookings.length === 0) {
      console.log("[BookingExpiry] No bookings to expire");
      return;
    }

    // Update expired bookings to CANCELLED and release slots
    for (const booking of expiredBookings) {
      await prisma.$transaction(async (tx) => {
        // Mark booking as CANCELLED
        await tx.booking.update({
          where: { id: booking.id },
          data: { status: "CANCELLED" },
        });

        // Delete booking slots (releases the hold on court availability)
        await tx.bookingSlot.deleteMany({
          where: { bookingId: booking.id },
        });

        if (booking.couponId) {
          await tx.coupon.updateMany({
            where: {
              id: booking.couponId,
              usedCount: { gt: 0 },
            },
            data: {
              usedCount: {
                decrement: 1,
              },
            },
          });
        }
      });

      console.log(
        `[BookingExpiry] Expired booking ${booking.bookingCode} (${booking.id})`,
      );
    }

    console.log(
      `[BookingExpiry] Processed ${expiredBookings.length} expired bookings`,
    );
  } catch (error) {
    console.error("[BookingExpiry] Error expiring bookings:", error);
  }
}

/**
 * Start a background job to check for expired bookings every 5 minutes
 */
export function startBookingExpiryJob() {
  console.log("[BookingExpiry] Starting booking expiry job...");

  // Run immediately on start
  expirePendingBookings();

  // Then run every 5 minutes (300,000 ms)
  setInterval(
    () => {
      expirePendingBookings();
    },
    5 * 60 * 1000,
  );

  console.log(
    "[BookingExpiry] Booking expiry job started (runs every 5 minutes)",
  );
}
