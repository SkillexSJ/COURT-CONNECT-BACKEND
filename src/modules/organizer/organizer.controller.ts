import { Request, Response, RequestHandler } from "express";
import catchAsync from "../../helpers/catchAsync";
import { sendSuccess, sendCreated } from "../../helpers/sendResponse";
import OrganizerService from "./organizer.service";

const OrganizerController: Record<
  | "createProfile"
  | "getProfile"
  | "updateProfile"
  | "getPublicDirectory"
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
