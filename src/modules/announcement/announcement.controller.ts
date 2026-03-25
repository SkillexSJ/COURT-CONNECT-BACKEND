import { Request, Response, RequestHandler } from "express";
import catchAsync from "../../helpers/catchAsync";
import { sendSuccess, sendCreated } from "../../helpers/sendResponse";
import AnnouncementService from "./announcement.service";
import type { QueryParams } from "../../helpers/QueryBuilder";

const AnnouncementController: Record<
  | "createAnnouncement"
  | "getAllAnnouncements"
  | "getHomeAnnouncements"
  | "getVenueAnnouncements"
  | "getAnnouncementBySlug"
  | "updateAnnouncement"
  | "deleteAnnouncement",
  RequestHandler
> = {
  createAnnouncement: catchAsync(async (req: Request, res: Response) => {
    const result = await AnnouncementService.createAnnouncement(
      req.user!.id,
      req.user!.role as "ADMIN" | "ORGANIZER",
      req.body,
    );
    sendCreated(res, result, "Announcement created successfully");
  }),

  getAllAnnouncements: catchAsync(async (req: Request, res: Response) => {
    const { announcements, meta } =
      await AnnouncementService.getAllAnnouncements(
        req.query as unknown as QueryParams,
        req.user?.role,
        req.user?.id,
      );
    sendSuccess(
      res,
      { data: announcements, meta },
      "Announcements retrieved successfully",
    );
  }),

  getHomeAnnouncements: catchAsync(async (req: Request, res: Response) => {
    const { announcements, meta } =
      await AnnouncementService.getHomeAnnouncements(
        req.query as unknown as QueryParams,
      );
    sendSuccess(
      res,
      { data: announcements, meta },
      "Home announcements retrieved successfully",
    );
  }),

  getVenueAnnouncements: catchAsync(async (req: Request, res: Response) => {
    const { announcements, meta } =
      await AnnouncementService.getVenueAnnouncements(
        req.params.courtId as string,
        req.query as unknown as QueryParams,
      );
    sendSuccess(
      res,
      { data: announcements, meta },
      "Venue announcements retrieved successfully",
    );
  }),

  getAnnouncementBySlug: catchAsync(async (req: Request, res: Response) => {
    const result = await AnnouncementService.getAnnouncementBySlug(
      req.params.slug as string,
      req.user?.role,
    );
    sendSuccess(res, { data: result }, "Announcement retrieved successfully");
  }),

  updateAnnouncement: catchAsync(async (req: Request, res: Response) => {
    const result = await AnnouncementService.updateAnnouncement(
      req.user!.id,
      req.user!.role as "ADMIN" | "ORGANIZER",
      req.params.announcementId as string,
      req.body,
    );
    sendSuccess(res, { data: result }, "Announcement updated successfully");
  }),

  deleteAnnouncement: catchAsync(async (req: Request, res: Response) => {
    await AnnouncementService.deleteAnnouncement(
      req.user!.id,
      req.user!.role as "ADMIN" | "ORGANIZER",
      req.params.announcementId as string,
    );
    sendSuccess(res, { data: null }, "Announcement deleted successfully");
  }),
};

export default AnnouncementController;
