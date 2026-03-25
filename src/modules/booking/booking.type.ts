import { BookingStatus, DiscountType } from "../../generated/prisma/enums.js";
export interface CreateBookingInput {
  courtId: string;
  bookingDate: string;
  slotTemplateIds: string[];
  couponCode?: string;
}

export interface BookingSlotResult {
  id: string;
  bookingId: string;
  courtId: string;
  bookingDate: Date;
  startMinute: number;
  endMinute: number;
}

export interface BookingResult {
  id: string;
  bookingCode: string;
  userId: string;
  courtId: string;
  couponId: string | null;
  bookingDate: Date;
  status: BookingStatus;
  totalAmount: any; // Decimal
  paymentId: string | null;
  paidAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  slots?: BookingSlotResult[];
  court?: {
    id: string;
    name: string;
    slug: string;
    type?: string;
    media?: { url: string; isPrimary: boolean }[];
  };
  user?: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
  };
  coupon?: {
    id: string;
    code: string;
    discountType: DiscountType;
    discountValue: any;
  } | null;
}
