import { Router } from "express";
import authMiddleware from "../../middlewares/auth.js";
import authorize from "../../middlewares/authorize.js";
import { validateRequest } from "../../middlewares/validateRequest.js";
import {
  changeUserRoleSchema,
  createAmenitySchema,
  updateAmenitySchema,
} from "./admin.validation.js";
import AdminController from "./admin.controller.js";

const router: Router = Router();

// All admin routes require ADMIN role
router.use(authMiddleware(), authorize("ADMIN"));

router.get("/users", AdminController.getAllUsers);
router.patch(
  "/users/:userId/role",
  validateRequest(changeUserRoleSchema),
  AdminController.changeUserRole,
);
router.get("/dashboard", AdminController.getDashboardStats);
router.get("/courts/pending", AdminController.getPendingCourts);
router.patch("/courts/:courtId/approve", AdminController.approveCourt);
router.get("/amenities", AdminController.getAmenities);
router.post(
  "/amenities",
  validateRequest(createAmenitySchema),
  AdminController.createAmenity,
);
router.patch(
  "/amenities/:amenityId",
  validateRequest(updateAmenitySchema),
  AdminController.updateAmenity,
);
router.delete("/amenities/:amenityId", AdminController.deleteAmenity);

export const AdminRoutes = router;
