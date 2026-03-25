import { z } from "zod";

export const initiatePaymentSchema = z.object({
  bookingId: z.uuid("Booking ID must be a valid UUID format"),
});

export const PaymentValidation = {
  initiatePaymentSchema,
};
