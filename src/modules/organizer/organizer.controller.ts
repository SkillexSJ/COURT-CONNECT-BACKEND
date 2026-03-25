import { Request, Response, RequestHandler } from "express";
import catchAsync from "../../helpers/catchAsync.js";
import { sendSuccess, sendCreated } from "../../helpers/sendResponse.js";
import OrganizerService from "./organizer.service.js";

const OrganizerController: Record<
  | "createProfile"
  | "getProfile"
  | "updateProfile"
  | "getPublicDirectory"
  | "getPublicProfile"
  | "getRevenueBreakdown",
  RequestHandler
> = {
  getPublicDirectory: catchAsync(async (req: Request, res: Response) => {
    const { organizers, meta } = await OrganizerService.getPublicDirectory(
      req.query as any,
    );
    sendSuccess(
      res,
      { data: organizers, meta },
      "Organizers retrieved successfully",
    );
  }),

  getPublicProfile: catchAsync(async (req: Request, res: Response) => {
    const organizerId = String(req.params.organizerId || "");
    const result = await OrganizerService.getPublicProfile(organizerId);

    sendSuccess(
      res,
      { data: result },
      "Organizer profile retrieved successfully",
    );
  }),

  createProfile: catchAsync(async (req: Request, res: Response) => {
    const result = await OrganizerService.createProfile(req.user!.id, req.body);
    sendCreated(res, result, "Organizer profile created successfully");
  }),

  getProfile: catchAsync(async (req: Request, res: Response) => {
    const result = await OrganizerService.getProfile(req.user!.id);
    sendSuccess(
      res,
      { data: result },
      "Organizer profile retrieved successfully",
    );
  }),

  updateProfile: catchAsync(async (req: Request, res: Response) => {
    const result = await OrganizerService.updateProfile(req.user!.id, req.body);
    sendSuccess(
      res,
      { data: result },
      "Organizer profile updated successfully",
    );
  }),

  getRevenueBreakdown: catchAsync(async (req: Request, res: Response) => {
    const days = Number(req.query.days ?? 90);
    const result = await OrganizerService.getRevenueBreakdown(
      req.user!.id,
      Number.isFinite(days) ? days : 90,
    );
    sendSuccess(
      res,
      { data: result },
      "Revenue breakdown retrieved successfully",
    );
  }),
};

export default OrganizerController;
