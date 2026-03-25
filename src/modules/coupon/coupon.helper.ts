import AppError from "../../helpers/AppError";
import { roundMoney, asNumber } from "../../helpers/utils";
import { DISCOUNT_TYPE } from "../../shared/constants";
import { CouponShape } from "./coupon.type";

/**
 * Normalizes a coupon code
 */
export const normalizeCouponCode = (code: string): string =>
  code.trim().toUpperCase();

/**
 * Checks if a coupon can be applied to a specific amount.
 */
export const assertCouponRules = (
  coupon: CouponShape,
  bookingAmount: number,
  now: Date = new Date(),
) => {
  if (!coupon.isActive) {
    throw new AppError(400, "Coupon is inactive");
  }

  if (coupon.expiresAt && coupon.expiresAt < now) {
    throw new AppError(400, "Coupon has expired");
  }

  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
    throw new AppError(400, "Coupon usage limit reached");
  }

  const minAmount = asNumber(coupon.minBookingAmount);
  if (coupon.minBookingAmount !== null && bookingAmount < minAmount) {
    throw new AppError(
      400,
      `Minimum booking amount for this coupon is ${minAmount.toFixed(2)}`,
    );
  }
};

/**
 *  pricing calculation for discounts.
 */
export const calculateDiscount = (
  coupon: CouponShape,
  bookingAmount: number,
) => {
  const subtotal = roundMoney(bookingAmount);
  const discountValue = asNumber(coupon.discountValue);

  let discountAmount = 0;

  if (coupon.discountType === DISCOUNT_TYPE.PERCENTAGE) {
    discountAmount = (subtotal * discountValue) / 100;

    if (coupon.maxDiscountAmount !== null) {
      discountAmount = Math.min(
        discountAmount,
        asNumber(coupon.maxDiscountAmount),
      );
    }
  } else {
    discountAmount = discountValue;
  }

  const normalizedDiscount = Math.min(subtotal, roundMoney(discountAmount));
  const finalAmount = roundMoney(subtotal - normalizedDiscount);

  return {
    discountAmount: normalizedDiscount,
    finalAmount,
  };
};

/**
 * Validates  configuration before saving.
 */
export const validateDiscountConfig = (input: {
  discountType: string;
  discountValue: number;
  maxDiscountAmount?: number | null;
}) => {
  if (
    input.discountType === DISCOUNT_TYPE.PERCENTAGE &&
    input.discountValue > 100
  ) {
    throw new AppError(400, "Percentage discount cannot be greater than 100");
  }

  if (
    input.discountType === DISCOUNT_TYPE.FIXED &&
    input.maxDiscountAmount !== undefined &&
    input.maxDiscountAmount !== null
  ) {
    throw new AppError(
      400,
      "maxDiscountAmount is only supported for PERCENTAGE coupons",
    );
  }
};
