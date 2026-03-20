import { Router } from "express";
import authMiddleware from "../../middlewares/auth.js";
import authorize from "../../middlewares/authorize.js";
import BookingController from "./booking.controller.js";

const router: Router = Router();

// User
router.post("/", authMiddleware(), BookingController.createBooking);
router.get("/my", authMiddleware(), BookingController.getUserBookings);
router.get("/:bookingId", authMiddleware(), BookingController.getBookingById);
router.patch(
  "/:bookingId/cancel",
  authMiddleware(),
  BookingController.cancelBooking,
);

// Organizer / Admin
router.patch(
  "/:bookingId/approve",
  authMiddleware(),
  authorize("ORGANIZER", "ADMIN"),
  BookingController.approveBooking,
);
router.patch(
  "/:bookingId/reject",
  authMiddleware(),
  authorize("ORGANIZER", "ADMIN"),
  BookingController.rejectBooking,
);
router.get(
  "/court/:courtId",
  authMiddleware(),
  authorize("ORGANIZER", "ADMIN"),
  BookingController.getCourtBookings,
);

export const BookingRoutes = router;
