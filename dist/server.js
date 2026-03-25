import {
  app_default,
  envVars,
  prisma
} from "./chunk-77MO5WKK.js";

// src/scripts/booking-expiry-job.ts
import cron from "node-cron";
var isProcessing = false;
async function expirePendingBookings() {
  if (isProcessing) {
    console.warn(
      "[BookingExpiry] Previous job still running, skipping this cycle."
    );
    return;
  }
  isProcessing = true;
  try {
    const now = /* @__PURE__ */ new Date();
    const expiredBookings = await prisma.booking.findMany({
      where: {
        status: "PENDING",
        expiresAt: {
          lt: now
          // expiry time is in the past
        }
      },
      select: {
        id: true,
        bookingCode: true,
        couponId: true
      }
    });
    if (expiredBookings.length === 0) {
      return;
    }
    console.log(
      `[BookingExpiry] Found ${expiredBookings.length} bookings to expire...`
    );
    for (const booking of expiredBookings) {
      try {
        await prisma.$transaction(async (tx) => {
          await tx.booking.update({
            where: { id: booking.id },
            data: { status: "CANCELLED" }
          });
          await tx.bookingSlot.deleteMany({
            where: { bookingId: booking.id }
          });
          if (booking.couponId) {
            await tx.coupon.update({
              where: { id: booking.couponId },
              data: {
                usedCount: {
                  decrement: 1
                }
              }
            });
          }
        });
        console.log(`[BookingExpiry] \u2705 Expired: ${booking.bookingCode}`);
      } catch (innerError) {
        console.error(
          `[BookingExpiry] \u274C Failed to expire ${booking.bookingCode}:`,
          innerError
        );
      }
    }
    console.log(
      `[BookingExpiry] Processed all ${expiredBookings.length} expired bookings.`
    );
  } catch (error) {
    console.error("[BookingExpiry] Global Error:", error);
  } finally {
    isProcessing = false;
  }
}
function startBookingExpiryJob() {
  console.log("[BookingExpiry] Cron job initialized (runs every 5 hours)");
  cron.schedule("0 */5 * * *", async () => {
    console.log("[BookingExpiry] Running scheduled cleanup...");
    await expirePendingBookings();
  });
  expirePendingBookings();
}

// src/server.ts
var PORT = envVars.PORT;
var server;
async function main() {
  try {
    await prisma.$connect();
    console.log("Connected to the database successfully.");
    startBookingExpiryJob();
    server = app_default.listen(PORT, () => {
      console.log(`CourtConnect Server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("An error occurred:", error);
    await prisma.$disconnect();
    process.exit(1);
  }
}
main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection detected:", err);
  if (server) {
    server.close(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception detected:", err);
  process.exit(1);
});
var gracefulShutdown = async () => {
  console.log("Shutting down gracefully...");
  await prisma.$disconnect();
  if (server) {
    server.close(() => {
      console.log("Server closed.");
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};
process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);
