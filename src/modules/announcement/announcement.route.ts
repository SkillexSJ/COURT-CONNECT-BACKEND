import { Router } from "express";
import authMiddleware, { optionalAuth } from "../../middlewares/auth";
import authorize from "../../middlewares/authorize";
import { validateRequest } from "../../middlewares/validateRequest";
import {
  createAnnouncementSchema,
  updateAnnouncementSchema,
} from "./announcement.validation";
import AnnouncementController from "./announcement.controller";

const router: Router = Router();

// Public
router.get("/", optionalAuth, AnnouncementController.getAllAnnouncements);
router.get("/home", AnnouncementController.getHomeAnnouncements);
router.get("/venue/:courtId", AnnouncementController.getVenueAnnouncements);
router.get("/:slug", AnnouncementController.getAnnouncementBySlug);

// Admin and Organizer
router.post(
  "/",
  authMiddleware(),
  authorize("ADMIN", "ORGANIZER"),
  validateRequest(createAnnouncementSchema),
  AnnouncementController.createAnnouncement,
);
router.patch(
  "/:announcementId",
  authMiddleware(),
  authorize("ADMIN", "ORGANIZER"),
  validateRequest(updateAnnouncementSchema),
  AnnouncementController.updateAnnouncement,
);
router.delete(
  "/:announcementId",
  authMiddleware(),
  authorize("ADMIN", "ORGANIZER"),
  AnnouncementController.deleteAnnouncement,
);

export const AnnouncementRoutes = router;
