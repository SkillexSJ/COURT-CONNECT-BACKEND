import type { Request, Response, RequestHandler } from "express";
import catchAsync from "../../helpers/catchAsync.js";
import { sendSuccess } from "../../helpers/sendResponse.js";
import AdminService from "./admin.service.js";

const AdminController: Record<
  | "getAllUsers"
  | "changeUserRole"
  | "getDashboardStats"
  | "getPendingCourts"
  | "approveCourt"
  | "getAmenities"
  | "createAmenity"
  | "updateAmenity"
  | "deleteAmenity",
  RequestHandler
> = {
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
    sendSuccess(
      res,
      { data: result },
      "Dashboard stats retrieved successfully",
    );
  }),

  getPendingCourts: catchAsync(async (req: Request, res: Response) => {
    const { courts, meta } = await AdminService.getPendingCourts(
      req.query as any,
    );
    sendSuccess(
      res,
      { data: courts, meta },
      "Pending courts retrieved successfully",
    );
  }),

  approveCourt: catchAsync(async (req: Request, res: Response) => {
    const result = await AdminService.approveCourt(
      req.params.courtId as string,
    );
    sendSuccess(res, { data: result }, "Court approved successfully");
  }),

  getAmenities: catchAsync(async (_req: Request, res: Response) => {
    const result = await AdminService.getAmenities();
    sendSuccess(res, { data: result }, "Amenities retrieved successfully");
  }),

  createAmenity: catchAsync(async (req: Request, res: Response) => {
    const result = await AdminService.createAmenity(req.body);
    sendSuccess(res, { data: result }, "Amenity created successfully", 201);
  }),

  updateAmenity: catchAsync(async (req: Request, res: Response) => {
    const result = await AdminService.updateAmenity(
      req.params.amenityId as string,
      req.body,
    );
    sendSuccess(res, { data: result }, "Amenity updated successfully");
  }),

  deleteAmenity: catchAsync(async (req: Request, res: Response) => {
    const result = await AdminService.deleteAmenity(
      req.params.amenityId as string,
    );
    sendSuccess(res, { data: result }, "Amenity deleted successfully");
  }),
};

export default AdminController;
