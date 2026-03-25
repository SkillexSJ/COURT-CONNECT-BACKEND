import { Router } from "express";
import authMiddleware from "../../middlewares/auth";
import { validateRequest } from "../../middlewares/validateRequest";
import PaymentController from "./payment.controller";
import { initiatePaymentSchema } from "./payment.validation";

const router: Router = Router();

router.post(
  "/initiate",
  authMiddleware(),
  validateRequest(initiatePaymentSchema),
  PaymentController.initiatePayment,
);

router.post("/webhook", PaymentController.handleWebhook);

export const PaymentRoutes = router;
