import {
  AnnouncementAudience,
  AnnouncementType,
} from "../../generated/prisma/enums.js";

export interface CreateAnnouncementInput {
  title: string;
  content: string;
  type?: AnnouncementType;
  imageUrl?: string;
  isPublished?: boolean;
  audience?: AnnouncementAudience;
  courtId?: string;
}

export interface UpdateAnnouncementInput {
  title?: string;
  content?: string;
  type?: AnnouncementType;
  imageUrl?: string | null;
  isPublished?: boolean;
}

export interface AnnouncementResult {
  id: string;
  title: string;
  content: string;
  type: AnnouncementType;
  audience: AnnouncementAudience;
  createdByRole: string;
  organizerId: string | null;
  courtId: string | null;
  imageUrl: string | null;
  isPublished: boolean;
  publishedAt: Date | null;
  createdAt: Date;
}
