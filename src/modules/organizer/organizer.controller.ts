import { Request, Response, RequestHandler } from "express";
import catchAsync from "../../helpers/catchAsync.js";
import { sendSuccess, sendCreated } from "../../helpers/sendResponse.js";
import OrganizerService from "./organizer.service.js";

const OrganizerController: Record<
  "createProfile" | "getProfile" | "updateProfile",
  RequestHandler
> = {
  createProfile: catchAsync(async (req: Request, res: Response) => {
    const result = await OrganizerService.createProfile(req.user!.id, req.body);
    sendCreated(res, result, "Organizer profile created successfully");
  }),

  getProfile: catchAsync(async (req: Request, res: Response) => {
    const result = await OrganizerService.getProfile(req.user!.id);
    sendSuccess(res, { data: result }, "Organizer profile retrieved successfully");
  }),

  updateProfile: catchAsync(async (req: Request, res: Response) => {
    const result = await OrganizerService.updateProfile(req.user!.id, req.body);
    sendSuccess(res, { data: result }, "Organizer profile updated successfully");
  }),
};

export default OrganizerController;
