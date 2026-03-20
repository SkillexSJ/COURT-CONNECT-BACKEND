import { Router } from "express";
import authMiddleware from "../../middlewares/auth.js";
import authorize from "../../middlewares/authorize.js";
import { validateRequest } from "../../middlewares/validateRequest.js";
import { createSlotTemplateSchema, updateSlotTemplateSchema } from "./schedule.validation.js";
import ScheduleController from "./schedule.controller.js";

const router: Router = Router();

// Public — get schedules & availability
router.get("/courts/:courtId/schedules", ScheduleController.getSlotTemplates);
router.get(
  "/courts/:courtId/availability",
  ScheduleController.getAvailableSlots,
);

// Organizer — manage templates
router.post(
  "/courts/:courtId/schedules",
  authMiddleware(),
  authorize("ORGANIZER", "ADMIN"),
  validateRequest(createSlotTemplateSchema),
  ScheduleController.createSlotTemplate,
);

router.patch(
  "/schedules/:templateId",
  authMiddleware(),
  authorize("ORGANIZER", "ADMIN"),
  validateRequest(updateSlotTemplateSchema),
  ScheduleController.updateSlotTemplate,
);

router.delete(
  "/schedules/:templateId",
  authMiddleware(),
  authorize("ORGANIZER", "ADMIN"),
  ScheduleController.deleteSlotTemplate,
);

export const ScheduleRoutes = router;
