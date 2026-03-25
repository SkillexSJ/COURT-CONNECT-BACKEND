import type { Request, Response, RequestHandler } from "express";
import catchAsync from "../../helpers/catchAsync.js";
import { sendCreated, sendSuccess } from "../../helpers/sendResponse.js";
import CouponService from "./coupon.service.js";
import type { QueryParams } from "../../helpers/QueryBuilder.js";

const CouponController: Record<
  | "createCoupon"
  | "getAllCoupons"
  | "getCouponById"
  | "updateCoupon"
  | "deleteCoupon"
  | "validateCoupon",
  RequestHandler
> = {
  createCoupon: catchAsync(async (req: Request, res: Response) => {
    const result = await CouponService.createCoupon(req.body);
    sendCreated(res, result, "Coupon created successfully");
  }),

  getAllCoupons: catchAsync(async (req: Request, res: Response) => {
    const { coupons, meta } = await CouponService.getAllCoupons(
      req.query as unknown as QueryParams,
    );
    sendSuccess(res, { data: coupons, meta }, "Coupons retrieved successfully");
  }),

  getCouponById: catchAsync(async (req: Request, res: Response) => {
    const result = await CouponService.getCouponById(
      req.params.couponId as string,
    );
    sendSuccess(res, { data: result }, "Coupon retrieved successfully");
  }),

  updateCoupon: catchAsync(async (req: Request, res: Response) => {
    const result = await CouponService.updateCoupon(
      req.params.couponId as string,
      req.body,
    );
    sendSuccess(res, { data: result }, "Coupon updated successfully");
  }),

  deleteCoupon: catchAsync(async (req: Request, res: Response) => {
    const result = await CouponService.deleteCoupon(
      req.params.couponId as string,
    );
    sendSuccess(res, { data: result }, "Coupon deleted successfully");
  }),

  validateCoupon: catchAsync(async (req: Request, res: Response) => {
    const result = await CouponService.validateCouponForBooking(
      req.body.code,
      req.body.bookingAmount,
    );

    sendSuccess(
      res,
      {
        data: {
          coupon: {
            id: result.coupon.id,
            code: result.coupon.code,
            discountType: result.coupon.discountType,
            discountValue: result.coupon.discountValue,
          },
          bookingAmount: result.bookingAmount,
          discountAmount: result.discountAmount,
          finalAmount: result.finalAmount,
        },
      },
      "Coupon validated successfully",
    );
  }),
};

export default CouponController;
