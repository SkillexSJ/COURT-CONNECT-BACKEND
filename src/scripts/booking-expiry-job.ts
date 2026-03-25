import cron from "node-cron";
import { prisma } from "../lib/prisma.js";

let isProcessing = false;

/**
 * Expire pending bookings that are older than their expiry time
 */
export async function expirePendingBookings() {
  if (isProcessing) {
    console.warn(
      "[BookingExpiry] Previous job still running, skipping this cycle.",
    );
    return;
  }

  isProcessing = true;
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
      // Quietly return
      return;
    }

    console.log(
      `[BookingExpiry] Found ${expiredBookings.length} bookings to expire...`,
    );

    // Process each booking in  transaction
    for (const booking of expiredBookings) {
      try {
        await prisma.$transaction(async (tx) => {
          // CANCELLED
          await tx.booking.update({
            where: { id: booking.id },
            data: { status: "CANCELLED" },
          });

          // Delete booking slots
          await tx.bookingSlot.deleteMany({
            where: { bookingId: booking.id },
          });

          // Restore coupon usage
          if (booking.couponId) {
            await tx.coupon.update({
              where: { id: booking.couponId },
              data: {
                usedCount: {
                  decrement: 1,
                },
              },
            });
          }
        });

        console.log(`[BookingExpiry] ✅ Expired: ${booking.bookingCode}`);
      } catch (innerError) {
        console.error(
          `[BookingExpiry] ❌ Failed to expire ${booking.bookingCode}:`,
          innerError,
        );
      }
    }

    console.log(
      `[BookingExpiry] Processed all ${expiredBookings.length} expired bookings.`,
    );
  } catch (error) {
    console.error("[BookingExpiry] Global Error:", error);
  } finally {
    isProcessing = false;
  }
}

/**
 *  background job
 */
export function startBookingExpiryJob() {
  console.log("[BookingExpiry] Cron job initialized (runs every 5 hours)");

  // Run every 5 hours
  cron.schedule("0 */5 * * *", async () => {
    console.log("[BookingExpiry] Running scheduled cleanup...");
    await expirePendingBookings();
  });

  // Run once immediately on startup to catch any missed expirations
  expirePendingBookings();
}
