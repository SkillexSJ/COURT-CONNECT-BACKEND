import type { Request, Response, RequestHandler } from "express";
import catchAsync from "../../helpers/catchAsync.js";
import { sendSuccess } from "../../helpers/sendResponse.js";
import AdminService from "./admin.service.js";

const AdminController: Record<"getAllUsers" | "changeUserRole" | "getDashboardStats", RequestHandler> = {
  getAllUsers: catchAsync(async (req: Request, res: Response) => {
    const { users, meta } = await AdminService.getAllUsers(req.query as any);
    sendSuccess(res, { data: users, meta }, "Users retrieved successfully");
  }),

  changeUserRole: catchAsync(async (req: Request, res: Response) => {
    const result = await AdminService.changeUserRole(
      req.params.userId as string,
      req.body.role,
    );
    sendSuccess(res, { data: result }, "User role updated successfully");
  }),

  getDashboardStats: catchAsync(async (_req: Request, res: Response) => {
    const result = await AdminService.getDashboardStats();
    sendSuccess(res, { data: result }, "Dashboard stats retrieved successfully");
  }),
};

export default AdminController;
