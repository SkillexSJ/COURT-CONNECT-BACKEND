import { Router } from "express";
import authMiddleware from "../../middlewares/auth.js";
import { validateRequest } from "../../middlewares/validateRequest.js";
import PaymentController from "./payment.controller.js";
import { initiatePaymentSchema } from "./payment.validation.js";

const router: Router = Router();

router.post(
  "/initiate",
  authMiddleware(),
  validateRequest(initiatePaymentSchema),
  PaymentController.initiatePayment,
);

router.post("/webhook", PaymentController.handleWebhook);

export const PaymentRoutes = router;
