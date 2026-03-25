export type SlotWindowKey =
  | "LATE_NIGHT"
  | "EARLY_MORNING"
  | "MORNING"
  | "AFTERNOON"
  | "EVENING";

export interface SlotWindow {
  key: SlotWindowKey;
  label: string;
  startMinute: number;
  endMinute: number;
}

export interface OrganizerProfileCreateInput {
  businessName: string;
  bio?: string;
  website?: string;
  phoneNumber?: string;
  address?: string;
}

export interface OrganizerProfileUpdateInput {
  businessName?: string;
  bio?: string;
  website?: string;
  phoneNumber?: string;
  address?: string;
}

export interface RevenueBreakdownResult {
  rangeDays: number;
  summary: {
    totalRevenue: number;
    paidBookings: number;
    avgBookingValue: number;
  };
  venueBreakdown: any[];
  dayOfWeekBreakdown: any[];
  slotWindowBreakdown: any[];
  heatmap: any[];
}
