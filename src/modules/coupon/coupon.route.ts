import { Router } from "express";
import authMiddleware from "../../middlewares/auth";
import authorize from "../../middlewares/authorize";
import { validateRequest } from "../../middlewares/validateRequest";
import CouponController from "./coupon.controller";
import {
  createCouponSchema,
  updateCouponSchema,
  validateCouponSchema,
} from "./coupon.validation";

const router: Router = Router();

// User booking helper: validate a coupon against an amount.
router.post(
  "/validate",
  authMiddleware(),
  validateRequest(validateCouponSchema),
  CouponController.validateCoupon,
);

// Admin coupon management.
router.get(
  "/",
  authMiddleware(),
  authorize("ADMIN"),
  CouponController.getAllCoupons,
);
router.post(
  "/",
  authMiddleware(),
  authorize("ADMIN"),
  validateRequest(createCouponSchema),
  CouponController.createCoupon,
);
router.get(
  "/:couponId",
  authMiddleware(),
  authorize("ADMIN"),
  CouponController.getCouponById,
);
router.patch(
  "/:couponId",
  authMiddleware(),
  authorize("ADMIN"),
  validateRequest(updateCouponSchema),
  CouponController.updateCoupon,
);
router.delete(
  "/:couponId",
  authMiddleware(),
  authorize("ADMIN"),
  CouponController.deleteCoupon,
);

export const CouponRoutes = router;
