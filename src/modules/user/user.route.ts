import { Router } from "express";
import authMiddleware from "../../middlewares/auth.js";
import { validateRequest } from "../../middlewares/validateRequest.js";
import { updateUserProfileSchema } from "../admin/admin.validation.js";
import UserController from "./user.controller.js";

const router: Router = Router();

router.get("/me", authMiddleware(), UserController.getProfile);
router.patch(
  "/me",
  authMiddleware(),
  validateRequest(updateUserProfileSchema),
  UserController.updateProfile,
);

export const UserRoutes = router;
