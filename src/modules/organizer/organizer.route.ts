import { Router } from "express";
import authMiddleware from "../../middlewares/auth.js";
import authorize from "../../middlewares/authorize.js";
import OrganizerController from "./organizer.controller.js";

const router: Router = Router();

// All organizer routes require authentication + ORGANIZER or ADMIN role
router.post(
  "/profile",
  authMiddleware(),
  authorize("ORGANIZER", "ADMIN"),
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
  OrganizerController.updateProfile,
);

export const OrganizerRoutes = router;
