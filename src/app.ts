/**
 * NODE PACKAGES
 */
import express, { Application } from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";

/**
 * LIBS
 */
import { auth } from "./lib/auth.js";

/**
 * ROUTES
 */
import { UserRoutes } from "./modules/user/user.route.js";
import { CourtRoutes } from "./modules/court/court.route.js";
import { ScheduleRoutes } from "./modules/schedule/schedule.route.js";
import { BookingRoutes } from "./modules/booking/booking.route.js";
import { CouponRoutes } from "./modules/coupon/coupon.route.js";

import { AnnouncementRoutes } from "./modules/announcement/announcement.route.js";
import { AdminRoutes } from "./modules/admin/admin.route.js";
import { OrganizerRoutes } from "./modules/organizer/organizer.route.js";
import { ReviewRoutes } from "./modules/review/review.route.js";

/**
 * MIDDLEWARES
 */
import { errorHandler } from "./middlewares/errorHandler.js";
import { envVars } from "./config/env.js";
import { PaymentRoutes } from "./modules/payment/payment.route.js";

/**
 * CONFIG
 */

const app: Application = express();

app.set("trust proxy", true);

app.use(
  cors({
    origin: [
      envVars.CLIENT_URL,
      "http://192.168.9.142:3000",
      "https://court-connect-frontend.vercel.app",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
  }),
);

// Stripe webhook must receive raw request body for signature verification
app.use("/api/payments/webhook", express.raw({ type: "application/json" }));

app.use(express.json());

// BetterAuth handler
app.all("/api/auth/{*any}", toNodeHandler(auth));

// Module routes
app.use("/api/users", UserRoutes);
app.use("/api/courts", CourtRoutes);
app.use("/api", ScheduleRoutes);
app.use("/api/bookings", BookingRoutes);
app.use("/api/coupons", CouponRoutes);
app.use("/api/payments", PaymentRoutes);
app.use("/api/announcements", AnnouncementRoutes);
app.use("/api/admin", AdminRoutes);
app.use("/api/organizer", OrganizerRoutes);
app.use("/api/reviews", ReviewRoutes);

// Health check
app.get("/health", (_req, res) => {
  res.status(200).send("OK");
});

app.get("/", (_req, res) => {
  res.send("CourtConnect API is running");
});

// Error handler (must be last)
app.use(errorHandler);

export default app;
