import { Router } from "express";
import authMiddleware from "../../middlewares/auth.js";
import authorize from "../../middlewares/authorize.js";
import { validateRequest } from "../../middlewares/validateRequest.js";
import { changeUserRoleSchema } from "./admin.validation.js";
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

export const AdminRoutes = router;
