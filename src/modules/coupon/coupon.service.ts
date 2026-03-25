import { prisma } from "../../lib/prisma";
import AppError from "../../helpers/AppError";
import { QueryBuilder, type QueryParams } from "../../helpers/QueryBuilder";
import { asNumber, roundMoney } from "../../helpers/utils";
import {
  normalizeCouponCode,
  validateDiscountConfig,
  assertCouponRules,
  calculateDiscount,
} from "./coupon.helper";
import type {
  CreateCouponInput,
  UpdateCouponInput,
  ValidateCouponResult,
  CouponShape,
} from "./coupon.type";

const CouponService = {
  /**
   * Create a new coupon (Admin only).
   */
  async createCoupon(data: CreateCouponInput) {
    const code = normalizeCouponCode(data.code);

    validateDiscountConfig({
      discountType: data.discountType,
      discountValue: data.discountValue,
      maxDiscountAmount: data.maxDiscountAmount ?? null,
    });

    const existing = await prisma.coupon.findFirst({
      where: {
        code: {
          equals: code,
          mode: "insensitive",
        },
      },
      select: { id: true },
    });

    if (existing) {
      throw new AppError(409, "Coupon code already exists");
    }

    const expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;

    if (expiresAt && Number.isNaN(expiresAt.getTime())) {
      throw new AppError(400, "Invalid expiry date");
    }

    return prisma.coupon.create({
      data: {
        code,
        discountType: data.discountType,
        discountValue: data.discountValue,
        minBookingAmount: data.minBookingAmount ?? null,
        maxDiscountAmount: data.maxDiscountAmount ?? null,
        usageLimit: data.usageLimit ?? null,
        expiresAt,
        isActive: data.isActive ?? true,
      },
    });
  },

  /**
   * List all coupons.
   */
  async getAllCoupons(query: QueryParams) {
    const qb = new QueryBuilder(query, { defaultSort: "-createdAt" })
      .search(["code"])
      .filter(["discountType", "isActive"])
      .sort()
      .paginate();

    const { where, orderBy, skip, take } = qb.build();

    const [coupons, total] = await prisma.$transaction([
      prisma.coupon.findMany({
        where,
        orderBy,
        skip,
        take,
      }),
      prisma.coupon.count({ where }),
    ]);

    return { coupons, meta: qb.countMeta(total) };
  },

  /**
   * Get coupon details by ID.
   */
  async getCouponById(couponId: string) {
    const coupon = await prisma.coupon.findUnique({
      where: { id: couponId },
    });

    if (!coupon) {
      throw new AppError(404, "Coupon not found");
    }

    return coupon;
  },

  /**
   * Update coupon configuration.
   */
  async updateCoupon(couponId: string, data: UpdateCouponInput) {
    const existing = await prisma.coupon.findUnique({
      where: { id: couponId },
    });
    if (!existing) {
      throw new AppError(404, "Coupon not found");
    }

    const nextType = data.discountType ?? existing.discountType;
    const nextValue = data.discountValue ?? asNumber(existing.discountValue);
    const nextMaxDiscount =
      data.maxDiscountAmount !== undefined
        ? data.maxDiscountAmount
        : existing.maxDiscountAmount === null
          ? null
          : asNumber(existing.maxDiscountAmount);

    validateDiscountConfig({
      discountType: nextType,
      discountValue: nextValue,
      maxDiscountAmount: nextMaxDiscount,
    });

    if (data.code) {
      const normalizedCode = normalizeCouponCode(data.code);
      const duplicate = await prisma.coupon.findFirst({
        where: {
          id: { not: couponId },
          code: {
            equals: normalizedCode,
            mode: "insensitive",
          },
        },
        select: { id: true },
      });

      if (duplicate) {
        throw new AppError(409, "Coupon code already exists");
      }

      data.code = normalizedCode;
    }

    if (
      data.usageLimit !== undefined &&
      data.usageLimit !== null &&
      data.usageLimit < existing.usedCount
    ) {
      throw new AppError(
        400,
        "Usage limit cannot be less than current used count",
      );
    }

    const updateData: Record<string, unknown> = {
      ...data,
    };

    if (data.expiresAt !== undefined) {
      if (data.expiresAt === null) {
        updateData.expiresAt = null;
      } else {
        const parsed = new Date(data.expiresAt);
        if (Number.isNaN(parsed.getTime())) {
          throw new AppError(400, "Invalid expiry date");
        }
        updateData.expiresAt = parsed;
      }
    }

    return prisma.coupon.update({
      where: { id: couponId },
      data: updateData,
    });
  },

  /**
   * Delete coupon (only if never used).
   */
  async deleteCoupon(couponId: string) {
    const existing = await prisma.coupon.findUnique({
      where: { id: couponId },
      select: {
        id: true,
        _count: {
          select: { bookings: true },
        },
      },
    });

    if (!existing) {
      throw new AppError(404, "Coupon not found");
    }

    if (existing._count.bookings > 0) {
      throw new AppError(
        400,
        "Coupon cannot be deleted because it is already used in bookings",
      );
    }

    return prisma.coupon.delete({ where: { id: couponId } });
  },

  /**
   * Validate a coupon code for a specific booking amount.
   */
  async validateCouponForBooking(
    code: string,
    bookingAmount: number,
  ): Promise<ValidateCouponResult> {
    const normalizedCode = normalizeCouponCode(code);

    const coupon = await prisma.coupon.findUnique({
      where: { code: normalizedCode },
    });

    if (!coupon) {
      throw new AppError(404, "Coupon not found");
    }

    const numericBookingAmount = roundMoney(bookingAmount);
    if (!Number.isFinite(numericBookingAmount) || numericBookingAmount <= 0) {
      throw new AppError(400, "Booking amount must be greater than 0");
    }

    assertCouponRules(coupon as unknown as CouponShape, numericBookingAmount);

    const pricing = calculateDiscount(
      coupon as unknown as CouponShape,
      numericBookingAmount,
    );

    if (pricing.discountAmount <= 0) {
      throw new AppError(400, "Coupon does not provide any discount");
    }

    return {
      coupon: coupon as unknown as CouponShape,
      bookingAmount: numericBookingAmount,
      discountAmount: pricing.discountAmount,
      finalAmount: pricing.finalAmount,
    };
  },
};

export default CouponService;
