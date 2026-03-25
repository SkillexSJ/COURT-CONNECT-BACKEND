import { Request, Response, RequestHandler } from "express";
import catchAsync from "../../helpers/catchAsync.js";
import { sendSuccess, sendCreated } from "../../helpers/sendResponse.js";
import BookingService from "./booking.service.js";
import type { QueryParams } from "../../helpers/QueryBuilder.js";

const BookingController: Record<
  | "createBooking"
  | "getUserBookings"
  | "getBookingById"
  | "approveBooking"
  | "rejectBooking"
  | "cancelBooking"
  | "getCourtBookings",
  RequestHandler
> = {
  createBooking: catchAsync(async (req: Request, res: Response) => {
    const result = await BookingService.createBooking(req.user!.id, req.body);
    sendCreated(res, result, "Booking created successfully");
  }),

  getUserBookings: catchAsync(async (req: Request, res: Response) => {
    const { bookings, meta } = await BookingService.getUserBookings(
      req.user!.id,
      req.query as unknown as QueryParams,
    );
    sendSuccess(
      res,
      { data: bookings, meta },
      "Bookings retrieved successfully",
    );
  }),

  getBookingById: catchAsync(async (req: Request, res: Response) => {
    const result = await BookingService.getBookingById(
      req.params.bookingId as string,
      req.user!.id,
      req.user!.role,
    );
    sendSuccess(res, { data: result }, "Booking retrieved successfully");
  }),

  approveBooking: catchAsync(async (req: Request, res: Response) => {
    const result = await BookingService.approveBooking(
      req.params.bookingId as string,
      req.user!.id,
    );
    sendSuccess(res, { data: result }, "Booking approved successfully");
  }),

  rejectBooking: catchAsync(async (req: Request, res: Response) => {
    const result = await BookingService.rejectBooking(
      req.params.bookingId as string,
      req.user!.id,
      req.body.reason,
    );
    sendSuccess(res, { data: result }, "Booking rejected");
  }),

  cancelBooking: catchAsync(async (req: Request, res: Response) => {
    const result = await BookingService.cancelBooking(
      req.params.bookingId as string,
      req.user!.id,
      req.user!.role,
    );
    sendSuccess(res, { data: result }, "Booking cancelled");
  }),

  getCourtBookings: catchAsync(async (req: Request, res: Response) => {
    const { bookings, meta } = await BookingService.getCourtBookings(
      req.params.courtId as string,
      req.user!.id,
      req.user!.role,
      req.query as unknown as QueryParams,
    );
    sendSuccess(
      res,
      { data: bookings, meta },
      "Court bookings retrieved successfully",
    );
  }),
};

export default BookingController;
