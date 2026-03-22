import { Router } from "express";
import authMiddleware, { optionalAuth } from "../../middlewares/auth.js";
import authorize from "../../middlewares/authorize.js";
import { validateRequest } from "../../middlewares/validateRequest.js";
import { multipleImageUpload } from "../../config/cloudinary.js";
import { createCourtSchema, updateCourtSchema } from "./court.validation.js";
import CourtController from "./court.controller.js";

const router: Router = Router();

// Public
router.get("/", optionalAuth, CourtController.getAllCourts);
router.get("/amenities", optionalAuth, CourtController.getAmenities);
router.get("/:slug", optionalAuth, CourtController.getCourtBySlug);

// Organizer
router.get(
  "/organizer/my-courts",
  authMiddleware(),
  authorize("ORGANIZER", "ADMIN"),
  CourtController.getOrganizerCourts,
);
router.post(
  "/",
  authMiddleware(),
  authorize("ORGANIZER", "ADMIN"),
  validateRequest(createCourtSchema),
  CourtController.createCourt,
);
router.patch(
  "/:courtId",
  authMiddleware(),
  authorize("ORGANIZER", "ADMIN"),
  validateRequest(updateCourtSchema),
  CourtController.updateCourt,
);
router.post(
  "/:courtId/media",
  authMiddleware(),
  authorize("ORGANIZER", "ADMIN"),
  multipleImageUpload("images", 7, "court-connect/courts"),
  CourtController.uploadCourtMedia,
);
router.delete(
  "/:courtId",
  authMiddleware(),
  authorize("ORGANIZER", "ADMIN"),
  CourtController.deleteCourt,
);

// Court members
router.get(
  "/:courtId/members",
  authMiddleware(),
  authorize("ORGANIZER", "ADMIN"),
  CourtController.getCourtMembers,
);

export const CourtRoutes = router;
