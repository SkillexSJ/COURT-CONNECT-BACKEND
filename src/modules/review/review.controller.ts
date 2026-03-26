import { Request, Response, RequestHandler } from "express";
import catchAsync from "../../helpers/catchAsync.js";
import { sendSuccess, sendCreated } from "../../helpers/sendResponse.js";
import ReviewService from "./review.service.js";
import type { QueryParams } from "../../helpers/QueryBuilder.js";

const ReviewController: Record<
  "createReview" | "getReviews" | "updateReview" | "deleteReview",
  RequestHandler
> = {
  createReview: catchAsync(async (req: Request, res: Response) => {
    const result = await ReviewService.createReview(req.user!.id, req.body);
    sendCreated(res, result, "Review submitted successfully");
  }),

  getReviews: catchAsync(async (req: Request, res: Response) => {
    const { reviews, meta } = await ReviewService.getReviews(
      req.query as unknown as QueryParams,
    );
    sendSuccess(res, { data: reviews, meta }, "Reviews retrieved successfully");
  }),

  updateReview: catchAsync(async (req: Request, res: Response) => {
    const result = await ReviewService.updateReview(
      req.params.id as string,
      req.user!.id,
      req.body,
    );
    sendSuccess(res, { data: result }, "Review updated successfully");
  }),

  deleteReview: catchAsync(async (req: Request, res: Response) => {
    const result = await ReviewService.deleteReview(
      req.params.id as string,
      req.user!.id,
      req.user!.role,
    );
    sendSuccess(res, { data: result }, "Review deleted successfully");
  }),
};

export default ReviewController;
