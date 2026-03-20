import { Request, Response, RequestHandler } from "express";
import catchAsync from "../../helpers/catchAsync.js";
import { sendSuccess, sendCreated } from "../../helpers/sendResponse.js";
import AnnouncementService from "./announcement.service.js";

const AnnouncementController: Record<
  "createAnnouncement" | "getAllAnnouncements" | "getAnnouncementBySlug" | "updateAnnouncement" | "deleteAnnouncement",
  RequestHandler
> = {
  createAnnouncement: catchAsync(async (req: Request, res: Response) => {
    const result = await AnnouncementService.createAnnouncement(req.user!.id, req.body);
    sendCreated(res, result, "Announcement created successfully");
  }),

  getAllAnnouncements: catchAsync(async (req: Request, res: Response) => {
    const { announcements, meta } = await AnnouncementService.getAllAnnouncements(
      req.query as any,
      req.user?.role,
    );
    sendSuccess(res, { data: announcements, meta }, "Announcements retrieved successfully");
  }),

  getAnnouncementBySlug: catchAsync(async (req: Request, res: Response) => {
    const result = await AnnouncementService.getAnnouncementBySlug(req.params.slug as string);
    sendSuccess(res, { data: result }, "Announcement retrieved successfully");
  }),

  updateAnnouncement: catchAsync(async (req: Request, res: Response) => {
    const result = await AnnouncementService.updateAnnouncement(
      req.params.announcementId as string,
      req.body,
    );
    sendSuccess(res, { data: result }, "Announcement updated successfully");
  }),

  deleteAnnouncement: catchAsync(async (req: Request, res: Response) => {
    await AnnouncementService.deleteAnnouncement(req.params.announcementId as string);
    sendSuccess(res, { data: null }, "Announcement deleted successfully");
  }),
};

export default AnnouncementController;
