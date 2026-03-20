import { Request, Response, RequestHandler } from "express";
import catchAsync from "../../helpers/catchAsync.js";
import { sendSuccess, sendCreated, sendError } from "../../helpers/sendResponse.js";
import ScheduleService from "./schedule.service.js";

const ScheduleController: Record<
  | "createSlotTemplate"
  | "getSlotTemplates"
  | "getAvailableSlots"
  | "updateSlotTemplate"
  | "deleteSlotTemplate",
  RequestHandler
> = {
  createSlotTemplate: catchAsync(async (req: Request, res: Response) => {
    const result = await ScheduleService.createSlotTemplate(
      req.params.courtId as string,
      req.user!.id,
      req.body,
    );
    sendCreated(res, result, "Slot template created successfully");
  }),

  getSlotTemplates: catchAsync(async (req: Request, res: Response) => {
    const result = await ScheduleService.getSlotTemplates(req.params.courtId as string);
    sendSuccess(res, { data: result }, "Slot templates retrieved successfully");
  }),

  getAvailableSlots: catchAsync(async (req: Request, res: Response) => {
    const date = req.query.date as string;
    if (!date) {
      return sendError(res, "Query parameter 'date' is required (YYYY-MM-DD)", 400);
    }
    const result = await ScheduleService.getAvailableSlots(req.params.courtId as string, date);
    sendSuccess(res, { data: result }, "Available slots retrieved successfully");
  }),

  updateSlotTemplate: catchAsync(async (req: Request, res: Response) => {
    const result = await ScheduleService.updateSlotTemplate(
      req.params.templateId as string,
      req.user!.id,
      req.body,
    );
    sendSuccess(res, { data: result }, "Slot template updated successfully");
  }),

  deleteSlotTemplate: catchAsync(async (req: Request, res: Response) => {
    const result = await ScheduleService.deleteSlotTemplate(
      req.params.templateId as string,
      req.user!.id,
    );
    sendSuccess(res, { data: result }, "Slot template deactivated successfully");
  }),
};

export default ScheduleController;
