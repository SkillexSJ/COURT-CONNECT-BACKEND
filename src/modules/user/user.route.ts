import { Router } from "express";
import { singleImageUpload } from "../../config/cloudinary.js";
import authMiddleware from "../../middlewares/auth.js";
import { validateRequest } from "../../middlewares/validateRequest.js";

import UserController from "./user.controller.js";
import { updateUserProfileSchema } from "./user.validation.js";

const router: Router = Router();

router.get("/me", authMiddleware(), UserController.getProfile);
router.patch(
  "/me",
  authMiddleware(),
  validateRequest(updateUserProfileSchema),
  UserController.updateProfile,
);
router.patch(
  "/me/avatar",
  authMiddleware(),
  singleImageUpload("avatar", "users"),
  UserController.uploadAvatar,
);

export const UserRoutes = router;
