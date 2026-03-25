import { Request, Response, RequestHandler } from "express";
import catchAsync from "../../helpers/catchAsync.js";
import { sendSuccess } from "../../helpers/sendResponse.js";
import UserService from "./user.service.js";

const UserController: Record<
  "getProfile" | "updateProfile" | "uploadAvatar",
  RequestHandler
> = {
  getProfile: catchAsync(async (req: Request, res: Response) => {
    const result = await UserService.getProfile(req.user!.id);
    sendSuccess(res, { data: result }, "Profile retrieved successfully");
  }),

  updateProfile: catchAsync(async (req: Request, res: Response) => {
    const result = await UserService.updateProfile(req.user!.id, req.body);
    sendSuccess(res, { data: result }, "Profile updated successfully");
  }),

  uploadAvatar: catchAsync(async (req: Request, res: Response) => {
    const result = await UserService.uploadAvatar(req.user!.id, req.file);
    sendSuccess(res, { data: result }, "Profile image uploaded successfully");
  }),
};

export default UserController;
