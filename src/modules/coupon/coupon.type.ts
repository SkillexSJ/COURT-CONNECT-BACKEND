import { DiscountType } from "../../generated/prisma/enums.js";

export type CouponDiscountType = "PERCENTAGE" | "FIXED";

export interface CouponShape {
  id: string;
  code: string;
  discountType: DiscountType;
  discountValue: any; // Decimal
  minBookingAmount: any; // Decimal
  maxDiscountAmount: any; // Decimal
  usageLimit: number | null;
  usedCount: number;
  expiresAt: Date | null;
  isActive: boolean;
}

export interface CreateCouponInput {
  code: string;
  discountType: CouponDiscountType;
  discountValue: number;
  minBookingAmount?: number;
  maxDiscountAmount?: number;
  usageLimit?: number;
  expiresAt?: string;
  isActive?: boolean;
}

export interface UpdateCouponInput {
  code?: string;
  discountType?: CouponDiscountType;
  discountValue?: number;
  minBookingAmount?: number | null;
  maxDiscountAmount?: number | null;
  usageLimit?: number | null;
  expiresAt?: string | null;
  isActive?: boolean;
}

export interface ValidateCouponResult {
  coupon: CouponShape;
  bookingAmount: number;
  discountAmount: number;
  finalAmount: number;
}
