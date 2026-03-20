import { Request, Response, RequestHandler } from "express";
import catchAsync from "../../helpers/catchAsync.js";
import { sendSuccess, sendCreated } from "../../helpers/sendResponse.js";
import CourtService from "./court.service.js";

const CourtController: Record<
  | "createCourt"
  | "getAllCourts"
  | "getCourtBySlug"
  | "getOrganizerCourts"
  | "getCourtMembers"
  | "updateCourt"
  | "deleteCourt",
  RequestHandler
> = {
  createCourt: catchAsync(async (req: Request, res: Response) => {
    const result = await CourtService.createCourt(req.user!.id, req.body);
    sendCreated(res, result, "Court created successfully");
  }),

  getAllCourts: catchAsync(async (req: Request, res: Response) => {
    const { courts, meta } = await CourtService.getAllCourts(req.query as any);
    sendSuccess(res, { data: courts, meta }, "Courts retrieved successfully");
  }),

  getCourtBySlug: catchAsync(async (req: Request, res: Response) => {
    const result = await CourtService.getCourtBySlug(req.params.slug as string);
    sendSuccess(res, { data: result }, "Court retrieved successfully");
  }),

  getOrganizerCourts: catchAsync(async (req: Request, res: Response) => {
    const { courts, meta } = await CourtService.getOrganizerCourts(
      req.user!.id,
      req.query as any,
    );
    sendSuccess(res, { data: courts, meta }, "Organizer courts retrieved successfully");
  }),

  getCourtMembers: catchAsync(async (req: Request, res: Response) => {
    const { members, meta } = await CourtService.getCourtMembers(
      req.params.courtId as string,
      req.query as any,
    );
    sendSuccess(res, { data: members, meta }, "Court members retrieved successfully");
  }),

  updateCourt: catchAsync(async (req: Request, res: Response) => {
    const result = await CourtService.updateCourt(
      req.params.courtId as string,
      req.user!.id,
      req.body,
    );
    sendSuccess(res, { data: result }, "Court updated successfully");
  }),

  deleteCourt: catchAsync(async (req: Request, res: Response) => {
    const result = await CourtService.softDeleteCourt(
      req.params.courtId as string,
      req.user!.id,
      req.user!.role,
    );
    sendSuccess(res, { data: result }, "Court deleted successfully");
  }),
};

export default CourtController;
