import { Router } from "express";
import authMiddleware from "../../middlewares/auth.js";
import authorize from "../../middlewares/authorize.js";
import { validateRequest } from "../../middlewares/validateRequest.js";
import { createOrganizerProfileSchema, updateOrganizerProfileSchema } from "./organizer.validation.js";
import OrganizerController from "./organizer.controller.js";

const router: Router = Router();

router.post(
  "/profile",
  authMiddleware(),
  authorize("ORGANIZER", "ADMIN"),
  validateRequest(createOrganizerProfileSchema),
  OrganizerController.createProfile,
);

router.get(
  "/profile",
  authMiddleware(),
  authorize("ORGANIZER", "ADMIN"),
  OrganizerController.getProfile,
);

router.patch(
  "/profile",
  authMiddleware(),
  authorize("ORGANIZER", "ADMIN"),
  validateRequest(updateOrganizerProfileSchema),
  OrganizerController.updateProfile,
);

export const OrganizerRoutes = router;
