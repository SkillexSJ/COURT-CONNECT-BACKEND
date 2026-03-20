import { Router } from "express";
import authMiddleware, { optionalAuth } from "../../middlewares/auth.js";
import authorize from "../../middlewares/authorize.js";
import { validateRequest } from "../../middlewares/validateRequest.js";
import { createAnnouncementSchema, updateAnnouncementSchema } from "./announcement.validation.js";
import AnnouncementController from "./announcement.controller.js";

const router: Router = Router();

// Public
router.get("/", optionalAuth, AnnouncementController.getAllAnnouncements);
router.get("/:slug", AnnouncementController.getAnnouncementBySlug);

// Admin
router.post(
  "/",
  authMiddleware(),
  authorize("ADMIN"),
  validateRequest(createAnnouncementSchema),
  AnnouncementController.createAnnouncement,
);
router.patch(
  "/:announcementId",
  authMiddleware(),
  authorize("ADMIN"),
  validateRequest(updateAnnouncementSchema),
  AnnouncementController.updateAnnouncement,
);
router.delete(
  "/:announcementId",
  authMiddleware(),
  authorize("ADMIN"),
  AnnouncementController.deleteAnnouncement,
);

export const AnnouncementRoutes = router;
