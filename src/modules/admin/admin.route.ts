import { Router } from "express";
import {
  changeUserRoleSchema,
  createAmenitySchema,
  updateAmenitySchema,
} from "./admin.validation";
import authorize from "../../middlewares/authorize";
import authMiddleware from "../../middlewares/auth";
import AdminController from "./admin.controller";
import { validateRequest } from "../../middlewares/validateRequest";

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
router.get("/reports", AdminController.getReports);
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
