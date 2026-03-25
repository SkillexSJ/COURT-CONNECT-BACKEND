import { CourtStatus } from "../../generated/prisma/enums";

export interface CreateCourtInput {
  name: string;
  type: string;
  locationLabel: string;
  description?: string;
  basePrice: number;
  latitude?: number;
  longitude?: number;
  amenityIds?: string[];
}

export interface UpdateCourtInput {
  name?: string;
  type?: string;
  locationLabel?: string;
  description?: string;
  basePrice?: number;
  latitude?: number;
  longitude?: number;
  status?: CourtStatus;
  amenityIds?: string[];
}

export interface CourtMediaUploadResult {
  id: string;
  courtId: string;
  url: string;
  publicId: string;
  isPrimary: boolean;
}

export interface CourtMemberResult {
  id: string;
  bookingCode: string;
  bookingDate: Date;
  status: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
}
