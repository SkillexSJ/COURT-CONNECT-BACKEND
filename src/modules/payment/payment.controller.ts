import type { Request, Response, RequestHandler } from "express";
import catchAsync from "../../helpers/catchAsync.js";
import { sendSuccess } from "../../helpers/sendResponse.js";
import PaymentService from "./payment.service.js";

const PaymentController: Record<
  "initiatePayment" | "handleWebhook",
  RequestHandler
> = {
  initiatePayment: catchAsync(async (req: Request, res: Response) => {
    const result = await PaymentService.initiatePayment(
      req.body.bookingId as string,
      req.user!.id,
    );

    sendSuccess(res, { data: result }, "Payment intent created successfully");
  }),

  handleWebhook: catchAsync(async (req: Request, res: Response) => {
    const signature = req.headers["stripe-signature"];

    if (typeof signature !== "string") {
      return res
        .status(400)
        .json({ success: false, message: "Missing Stripe signature" });
    }

    const payload = req.body as Buffer;
    const result = await PaymentService.handleWebhook(signature, payload);

    res.status(200).json(result);
  }),
};

export default PaymentController;
