import { Router } from "express";
import authMiddleware, { optionalAuth } from "../../middlewares/auth.js";
import authorize from "../../middlewares/authorize.js";
import { validateRequest } from "../../middlewares/validateRequest.js";
import { createReviewSchema, updateReviewSchema } from "./review.validation.js";
import ReviewController from "./review.controller.js";

const router: Router = Router();

// Publicly accessible
router.get("/", optionalAuth, ReviewController.getReviews);

router.post(
  "/",
  authMiddleware(),
  validateRequest(createReviewSchema),
  ReviewController.createReview,
);

router.patch(
  "/:id",
  authMiddleware(),
  validateRequest(updateReviewSchema),
  ReviewController.updateReview,
);

router.delete("/:id", authMiddleware(), ReviewController.deleteReview);

export const ReviewRoutes = router;
